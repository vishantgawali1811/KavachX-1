"""
backend/app.py
--------------
Production-ready Flask API for phishing URL detection.

Chrome Extension usage:
    fetch("http://localhost:5000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: currentUrl })
    });

Run:
    cd backend
    python app.py
"""

import json
import logging
import os
import time
import uuid

import joblib
import numpy as np
from feature_extraction import FEATURE_NAMES, extract_features
from flask import Flask, jsonify, request
from flask_cors import CORS

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
app = Flask(__name__)
CORS(app)  # Required for Chrome Extension cross-origin requests

# ---------------------------------------------------------------------------
# Load model once at startup
# ---------------------------------------------------------------------------
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model.pkl')

try:
    model = joblib.load(MODEL_PATH)
    logger.info(f'Model loaded from {MODEL_PATH}')
    logger.info(f'Model classes: {model.classes_}')
    logger.info(f'Model features expected: {model.n_features_in_}')
except FileNotFoundError:
    logger.error(
        f'model.pkl not found at {MODEL_PATH}. '
        'Run training/train.py first to generate the model.'
    )
    model = None

# Determine which index corresponds to "phishing"
PHISHING_CLASS_INDEX = (
    list(model.classes_).index('phishing')
    if model is not None and 'phishing' in list(model.classes_)
    else 1
)

# ---------------------------------------------------------------------------
# Scan history — persisted to a JSON file between restarts
# ---------------------------------------------------------------------------
HISTORY_PATH = os.path.join(os.path.dirname(__file__), 'scan_history.json')

def _load_history():
    try:
        with open(HISTORY_PATH, 'r') as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except (FileNotFoundError, json.JSONDecodeError):
        return []

def _save_history(history):
    try:
        with open(HISTORY_PATH, 'w') as f:
            json.dump(history, f, indent=2)
    except Exception as exc:
        logger.warning('Could not persist scan history: %s', exc)

scan_history = _load_history()
logger.info('Loaded %d historical scans from disk.', len(scan_history))


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route('/', methods=['GET'])
def index():
    """Root endpoint — usage info."""
    return jsonify({
        'service': 'Phishing URL Detector',
        'status': 'running',
        'endpoints': {
            'GET  /health': 'Model status and feature list',
            'POST /predict': 'Classify a URL — body: {"url": "https://example.com"}',
        },
        'example': {
            'method': 'POST',
            'url': 'http://localhost:5001/predict',
            'body': {'url': 'https://example.com'},
        },
    })


@app.route('/predict', methods=['POST'])
def predict():
    """
    POST /predict
    Body:  { "url": "http://example.com" }
    Returns: {
        "prediction": 0 or 1,
        "risk_score": 0.0–1.0,
        "label": "legitimate" | "phishing",
        "features": { ... }   (optional debug info)
    }
    """
    if model is None:
        return jsonify({'error': 'Model not loaded. Run training/train.py first.'}), 503

    # ── Validate input ───────────────────────────────────────────────────────
    if not request.is_json:
        return jsonify({'error': 'Content-Type must be application/json'}), 400

    body = request.get_json(silent=True)
    if body is None:
        return jsonify({'error': 'Invalid JSON body'}), 400

    url = body.get('url', '').strip()
    if not url:
        return jsonify({'error': 'Missing required field: url'}), 400

    if not (url.startswith('http://') or url.startswith('https://')):
        return jsonify({
            'error': "URL must start with 'http://' or 'https://'",
            'received': url,
        }), 400

    # ── Extract features ─────────────────────────────────────────────────────
    try:
        feature_vector = extract_features(url)
    except Exception as exc:
        logger.exception('Feature extraction failed for URL: %s', url)
        return jsonify({'error': f'Feature extraction failed: {str(exc)}'}), 500

    # ── Predict ──────────────────────────────────────────────────────────────
    try:
        prediction_label = model.predict(feature_vector)[0]        # 'phishing' | 'legitimate'
        probabilities    = model.predict_proba(feature_vector)[0]  # array of class probs
        risk_score       = float(probabilities[PHISHING_CLASS_INDEX])
        prediction_int   = 1 if prediction_label == 'phishing' else 0
    except Exception as exc:
        logger.exception('Model prediction failed for URL: %s', url)
        return jsonify({'error': f'Prediction failed: {str(exc)}'}), 500

    logger.info('URL=%s  label=%s  risk=%.3f', url, prediction_label, risk_score)

    # ── Build response ───────────────────────────────────────────────────────
    feature_dict = {k: round(float(v), 4) for k, v in feature_vector.iloc[0].to_dict().items()}

    # Derive a risk status for the frontend (matches frontend getStatus() thresholds)
    if risk_score >= 0.70:
        status = 'Phishing'
    elif risk_score >= 0.40:
        status = 'Suspicious'
    else:
        status = 'Safe'

    scan_entry = {
        'id':         str(uuid.uuid4()),
        'url':        url,
        'prediction': prediction_int,
        'risk_score': round(risk_score, 4),
        'risk_pct':   round(risk_score * 100),
        'label':      prediction_label,
        'status':     status,
        'features':   feature_dict,
        'timestamp':  time.strftime('%Y-%m-%dT%H:%M:%S', time.gmtime()) + 'Z',
    }

    # Persist — cap history at 500 entries
    scan_history.insert(0, scan_entry)
    if len(scan_history) > 500:
        scan_history.pop()
    _save_history(scan_history)

    return jsonify(scan_entry)


@app.route('/history', methods=['GET'])
def get_history():
    """GET /history — returns all persisted scan results, newest first."""
    return jsonify(scan_history)


@app.route('/history', methods=['DELETE'])
def clear_history():
    """DELETE /history — wipes all persisted scan results."""
    scan_history.clear()
    _save_history(scan_history)
    return jsonify({'status': 'cleared', 'count': 0})


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({
        'status':         'ok',
        'model_loaded':   model is not None,
        'feature_count':  len(FEATURE_NAMES),
        'feature_names':  FEATURE_NAMES,
    })


@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({'error': 'Method not allowed'}), 405


@app.errorhandler(500)
def internal_error(e):
    return jsonify({'error': 'Internal server error'}), 500


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    logger.info(f'Starting phishing detection API on port {port} ...')
    app.run(host='0.0.0.0', port=port, debug=debug)
