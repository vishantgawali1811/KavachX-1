from flask import Flask, request, jsonify
from flask_cors import CORS
from classification_model import load_model
import feature_extractor as fe
import pandas as pd

app = Flask(__name__)
CORS(app)

# Load model and define features once at startup
tuned_trained_model = load_model('models/tuned_model.joblib')

structural_features = [
    'ip',
    'https_token',
    'prefix_suffix',
    'shortening_service',
    'suspicious_tld',
    'statistical_report'
]

statistical_features = [
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
    'phish_hints'
]

all_features = structural_features + statistical_features

# Pre-compute feature importances once
feature_importances = dict(zip(all_features, tuned_trained_model.feature_importances_.tolist()))

# Human-readable labels for features
FEATURE_LABELS = {
    'ip': 'IP Address in URL',
    'https_token': 'HTTPS Token in Domain',
    'prefix_suffix': 'Prefix/Suffix (-) in Domain',
    'shortening_service': 'URL Shortening Service',
    'suspicious_tld': 'Suspicious TLD',
    'statistical_report': 'Listed in Blacklist',
    'length_url': 'URL Length',
    'length_hostname': 'Hostname Length',
    'nb_dots': 'Number of Dots',
    'nb_hyphens': 'Number of Hyphens',
    'nb_qm': 'Number of ? Chars',
    'nb_percent': 'Number of % Chars',
    'nb_slash': 'Number of Slashes',
    'nb_www': 'Number of www',
    'ratio_digits_url': 'Digit Ratio in URL',
    'ratio_digits_host': 'Digit Ratio in Hostname',
    'char_repeat': 'Repeated Characters',
    'avg_words_raw': 'Avg Word Length (URL)',
    'avg_word_host': 'Avg Word Length (Host)',
    'avg_word_path': 'Avg Word Length (Path)',
    'phish_hints': 'Phishing Hint Words',
}

@app.route('/classify', methods=['POST'])
def classify():
    data = request.get_json()
    url = data.get('url', '').strip()

    if not url:
        return jsonify({'error': 'No URL provided'}), 400

    if not url.startswith('http://') and not url.startswith('https://'):
        return jsonify({'error': "URL must start with 'http://' or 'https://'"}), 400

    vector = fe.extract_features(url, structural_features, statistical_features)

    if vector is None or len(vector) == 0:
        return jsonify({'error': 'Could not extract features from this URL'}), 400

    prediction = tuned_trained_model.predict(vector)[0]
    result = 'Phishing' if prediction == 'phishing' else 'Legitimate'

    # Phishing probability (class order is alphabetical: legitimate=0, phishing=1)
    proba = tuned_trained_model.predict_proba(vector)[0]
    classes = list(tuned_trained_model.classes_)
    phishing_index = classes.index('phishing') if 'phishing' in classes else 1
    risk_score = round(float(proba[phishing_index]) * 100, 1)

    # Build feature breakdown: value + importance for each feature
    feature_values = vector.iloc[0].to_dict()
    breakdown = []
    for feat in all_features:
        breakdown.append({
            'key': feat,
            'label': FEATURE_LABELS.get(feat, feat),
            'value': round(float(feature_values.get(feat, 0)), 4),
            'importance': round(float(feature_importances.get(feat, 0)), 4),
            'type': 'structural' if feat in structural_features else 'statistical',
        })

    # Sort by importance descending
    breakdown.sort(key=lambda x: x['importance'], reverse=True)

    return jsonify({'url': url, 'result': result, 'risk_score': risk_score, 'breakdown': breakdown})

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
