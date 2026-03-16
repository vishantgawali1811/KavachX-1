"""
training/train.py
-----------------
Standalone training script.

Run from the project root:
    python training/train.py

Outputs:
    training/model.pkl          <- used by training evaluation
    backend/model.pkl           <- copied here for the API to consume
"""

import sys
import os

# Allow imports from the parent directory (url_features, content_features, etc.)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import joblib
import pandas as pd
from scipy.stats import randint
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import RandomizedSearchCV

# ── Paths ─────────────────────────────────────────────────────────────────────
ROOT            = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_CSV         = os.path.join(ROOT, 'datasets', 'raw_dataset.csv')
TRANSFORMED_CSV = os.path.join(ROOT, 'datasets', 'transformed_dataset.csv')
TRAIN_VAL_CSV   = os.path.join(ROOT, 'datasets', 'train_validation_dataset.csv')
TEST_CSV        = os.path.join(ROOT, 'datasets', 'testing_dataset.csv')
MODEL_OUT       = os.path.join(ROOT, 'training', 'model.pkl')
BACKEND_MODEL   = os.path.join(ROOT, 'backend', 'model.pkl')
EVAL_OUT        = os.path.join(ROOT, 'training', 'evaluation_results.txt')

# ── Feature lists (MUST match what was used when building the dataset) ────────
STRUCTURAL_FEATURES = [
    'ip',
    'https_token',
    'prefix_suffix',
    'shortening_service',
    'suspicious_tld',
    'statistical_report',
]

STATISTICAL_FEATURES = [
    'length_url',
    'length_hostname',
    'nb_dots',
    'nb_hyphens',
    'nb_qm',
    'nb_percent',
    'nb_slash',
    'nb_www',
    'ratio_digits_url',
    'ratio_digits_host',
    'char_repeat',
    'avg_words_raw',
    'avg_word_host',
    'avg_word_path',
    'phish_hints',
]

TARGET          = 'status'
SELECTED        = STRUCTURAL_FEATURES + STATISTICAL_FEATURES


# ── Step 1 – Preprocess ───────────────────────────────────────────────────────
def preprocess():
    print('[1/4] Preprocessing dataset...')
    df = pd.read_csv(RAW_CSV).reset_index(drop=True)
    df.to_csv(TRANSFORMED_CSV, columns=SELECTED + [TARGET], index=False)
    df = pd.read_csv(TRANSFORMED_CSV)

    phishing   = df[df[TARGET] == 'phishing']
    legitimate = df[df[TARGET] == 'legitimate']

    ph_train  = phishing.sample(frac=0.7, random_state=0)
    ph_test   = phishing.drop(ph_train.index)
    le_train  = legitimate.sample(frac=0.7, random_state=0)
    le_test   = legitimate.drop(le_train.index)

    train_val = pd.concat([ph_train, le_train])
    test      = pd.concat([ph_test, le_test])

    train_val.to_csv(TRAIN_VAL_CSV, index=False)
    test.to_csv(TEST_CSV, index=False)
    print(f'    Train/val rows: {len(train_val)}  |  Test rows: {len(test)}')
    return train_val, test


# ── Step 2 – Tune hyperparameters ─────────────────────────────────────────────
def tune(train_val: pd.DataFrame):
    print('[2/4] Tuning hyperparameters (RandomizedSearchCV)...')
    X = train_val.drop(columns=[TARGET])
    y = train_val[TARGET]
    dist = {'n_estimators': randint(5, 500), 'max_depth': randint(1, 20)}
    search = RandomizedSearchCV(
        RandomForestClassifier(), param_distributions=dist, n_iter=5, cv=5, n_jobs=-1
    )
    search.fit(X, y)
    params = search.best_estimator_.get_params()
    print(f'    Best params: max_depth={params["max_depth"]}, n_estimators={params["n_estimators"]}')
    return params


# ── Step 3 – Train final model ─────────────────────────────────────────────────
def train(train_val: pd.DataFrame, params: dict):
    print('[3/4] Training final model...')
    X = train_val.drop(columns=[TARGET])
    y = train_val[TARGET]
    model = RandomForestClassifier(
        max_depth=params['max_depth'],
        n_estimators=params['n_estimators'],
    )
    model.fit(X, y)
    return model


# ── Step 4 – Evaluate & save ───────────────────────────────────────────────────
def evaluate_and_save(model, test: pd.DataFrame):
    print('[4/4] Evaluating...')
    X_test = test.drop(columns=[TARGET])
    y_test = test[TARGET]
    y_pred = model.predict(X_test)

    acc  = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, pos_label='legitimate')
    rec  = recall_score(y_test, y_pred, pos_label='legitimate')
    f1   = f1_score(y_test, y_pred, pos_label='legitimate')
    cm   = confusion_matrix(y_test, y_pred)

    print(f'    Accuracy : {acc:.4f}')
    print(f'    Precision: {prec:.4f}')
    print(f'    Recall   : {rec:.4f}')
    print(f'    F1-Score : {f1:.4f}')
    print(f'    Confusion Matrix:\n{cm}')

    os.makedirs(os.path.dirname(EVAL_OUT), exist_ok=True)
    with open(EVAL_OUT, 'w') as f:
        f.write(f'Accuracy : {acc}\n')
        f.write(f'Precision: {prec}\n')
        f.write(f'Recall   : {rec}\n')
        f.write(f'F1-Score : {f1}\n')
        f.write(f'Confusion Matrix:\n{cm}\n')
        f.write(f'\nFeature order:\n{SELECTED}\n')

    # Save to training/
    joblib.dump(model, MODEL_OUT)
    print(f'    Saved → {MODEL_OUT}')

    # Copy to backend/ so the API always has the latest model
    os.makedirs(os.path.dirname(BACKEND_MODEL), exist_ok=True)
    joblib.dump(model, BACKEND_MODEL)
    print(f'    Saved → {BACKEND_MODEL}')


# ── Entry point ────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    train_val, test = preprocess()
    params          = tune(train_val)
    model           = train(train_val, params)
    evaluate_and_save(model, test)
    print('\nTraining complete.')
