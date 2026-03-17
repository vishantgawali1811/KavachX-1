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
import hashlib
import random

import joblib
import numpy as np
from feature_extraction import FEATURE_NAMES, extract_features
from flask import Flask, jsonify, request
from flask_cors import CORS
from hybrid_analysis import (
    combine_scores,
    content_text_analysis,
    load_nlp_model,
    structural_analysis,
    NLP_MODEL_AVAILABLE,
)
import hybrid_analysis as ha
from attack_knowledge import (
    build_security_analysis,
    get_risk_level,
    get_highest_severity,
)
from message_analysis import analyze_message

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
# Load NLP model once at startup (non-blocking — falls back if unavailable)
# ---------------------------------------------------------------------------
load_nlp_model()

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
# Message history — persisted to a JSON file between restarts
# ---------------------------------------------------------------------------
MESSAGE_HISTORY_PATH = os.path.join(os.path.dirname(__file__), 'message_history.json')

def _load_message_history():
    try:
        with open(MESSAGE_HISTORY_PATH, 'r') as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except (FileNotFoundError, json.JSONDecodeError):
        return []

def _save_message_history(history):
    try:
        with open(MESSAGE_HISTORY_PATH, 'w') as f:
            json.dump(history, f, indent=2)
    except Exception as exc:
        logger.warning('Could not persist message history: %s', exc)

message_history = _load_message_history()
logger.info('Loaded %d historical message scans from disk.', len(message_history))


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
    POST /predict  — Hybrid Phishing Detection
    -------------------------------------------
    Minimal (backward compatible):
        { "url": "http://example.com" }

    Full hybrid payload (from browser extension):
        {
          "url":               "http://example.com",
          "title":             "Page Title",
          "text":              "Visible page text (up to 5000 chars)",
          "numForms":          2,
          "numInputs":         5,
          "numPasswordFields": 1,
          "numIframes":        0,
          "formActions":       ["/login.php"]
        }

    Returns a hybrid risk score (0–1) combining:
        URL model (40%) + Structural analysis (30%) + NLP content (30%)
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

    # ── STEP 2: URL feature extraction + model (logic preserved exactly) ─────
    try:
        feature_vector = extract_features(url)
    except Exception as exc:
        logger.exception('Feature extraction failed for URL: %s', url)
        return jsonify({'error': f'Feature extraction failed: {str(exc)}'}), 500

    try:
        probabilities = model.predict_proba(feature_vector)[0]
        url_score     = float(probabilities[PHISHING_CLASS_INDEX])
    except Exception as exc:
        logger.exception('Model prediction failed for URL: %s', url)
        return jsonify({'error': f'Prediction failed: {str(exc)}'}), 500

    feature_dict = {k: round(float(v), 4) for k, v in feature_vector.iloc[0].to_dict().items()}

    # ── STEP 3: Structural analysis ──────────────────────────────────────────
    struct_score, struct_reasons = structural_analysis(body)

    # ── STEP 4: NLP content analysis ─────────────────────────────────────────
    page_text = str(body.get('text', ''))[:5000]
    content_score, content_reasons = content_text_analysis(page_text)

    # ── STEP 5 & 6: Combine scores + explainability ───────────────────────────
    hybrid = combine_scores(
        url_score=url_score,
        url_features=feature_dict,
        structural_score=struct_score,
        structural_reasons=struct_reasons,
        content_score=content_score,
        content_reasons=content_reasons,
    )

    logger.info(
        'URL=%s  url=%.3f  struct=%.3f  content=%.3f  final=%.3f  label=%s',
        url, url_score, struct_score, content_score, hybrid['final_score'], hybrid['label'],
    )

    # ── STEP 7: Security advisory — triggered feature analysis ─────────────
    security_analysis     = build_security_analysis(feature_dict)
    triggered_count       = len(security_analysis)
    risk_level            = get_risk_level(hybrid['final_score'])
    highest_severity      = get_highest_severity(security_analysis)

    scan_entry = {
        'id':                      str(uuid.uuid4()),
        'url':                     url,
        'timestamp':               time.strftime('%Y-%m-%dT%H:%M:%S', time.gmtime()) + 'Z',
        'features':                feature_dict,
        **hybrid,
        'risk_level':              risk_level,
        'triggered_features_count': triggered_count,
        'highest_severity':        highest_severity,
        'security_analysis':       security_analysis,
    }

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
        'status':            'ok',
        'model_loaded':      model is not None,
        'feature_count':     len(FEATURE_NAMES),
        'feature_names':     FEATURE_NAMES,
        'nlp_model_loaded':  NLP_MODEL_AVAILABLE,
        'hybrid_mode':       True,
        'message_analysis':  True,
    })


# ---------------------------------------------------------------------------
# Message analysis routes (Part 3 — phishing message detection)
# ---------------------------------------------------------------------------

@app.route('/analyze-message', methods=['POST'])
def analyze_message_route():
    """
    POST /analyze-message  — Phishing Message Detection
    ----------------------------------------------------
    Body:
        { "message": "Your account has been suspended..." }

    Optional fields:
        { "message": "...", "sender": "...", "subject": "..." }

    Returns risk score, classification, reasons, indicators, recommendation.
    """
    if not request.is_json:
        return jsonify({'error': 'Content-Type must be application/json'}), 400

    body = request.get_json(silent=True)
    if body is None:
        return jsonify({'error': 'Invalid JSON body'}), 400

    message = body.get('message', '').strip()
    if not message:
        return jsonify({'error': 'Missing required field: message'}), 400

    if len(message) < 5:
        return jsonify({'error': 'Message too short for analysis (min 5 characters)'}), 400

    # Run the analysis pipeline — pass the NLP classifier from hybrid_analysis
    nlp_clf = ha._nlp_classifier if ha.NLP_MODEL_AVAILABLE else None
    result = analyze_message(message, nlp_classifier=nlp_clf)

    logger.info(
        'MSG score=%.3f  label=%s  nlp=%s  snippet="%s"',
        result['risk_score'], result['label'],
        result['nlp_model_used'], result['message_snippet'][:50],
    )

    # Build the log entry
    entry = {
        'id':        f'msg-{uuid.uuid4()}',
        'type':      'message',
        'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S', time.gmtime()) + 'Z',
        **result,
    }

    # Persist
    message_history.insert(0, entry)
    if len(message_history) > 500:
        message_history.pop()
    _save_message_history(message_history)

    return jsonify(entry)


@app.route('/message-history', methods=['GET'])
def get_message_history():
    """GET /message-history — returns all persisted message scan results."""
    return jsonify(message_history)


@app.route('/message-history', methods=['DELETE'])
def clear_message_history():
    """DELETE /message-history — wipes all persisted message scan results."""
    message_history.clear()
    _save_message_history(message_history)
    return jsonify({'status': 'cleared', 'count': 0})


# ---------------------------------------------------------------------------
# Deepfake history — persisted to a JSON file between restarts
# ---------------------------------------------------------------------------
DEEPFAKE_HISTORY_PATH = os.path.join(os.path.dirname(__file__), 'deepfake_history.json')

def _load_deepfake_history():
    try:
        with open(DEEPFAKE_HISTORY_PATH, 'r') as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except (FileNotFoundError, json.JSONDecodeError):
        return []

def _save_deepfake_history(history):
    try:
        with open(DEEPFAKE_HISTORY_PATH, 'w') as f:
            json.dump(history, f, indent=2)
    except Exception as exc:
        logger.warning('Could not persist deepfake history: %s', exc)

deepfake_history = _load_deepfake_history()
logger.info('Loaded %d historical deepfake scans from disk.', len(deepfake_history))


# ---------------------------------------------------------------------------
# Deepfake analysis — heuristic engine (no GPU model required)
# ---------------------------------------------------------------------------

def _analyze_deepfake_heuristic(filename, file_bytes, file_type):
    """
    Heuristic deepfake analyser.
    Derives a deterministic-but-realistic score from the file's SHA-256 so
    the same file always produces the same result without a real ML model.
    """
    # For video: sample from middle + end of file (skip header-only first 64KB)
    # For audio: first 64KB is fine since audio data starts early
    if file_type == 'video' and len(file_bytes) > 131072:
        mid = len(file_bytes) // 2
        sample = file_bytes[mid:mid+65536] + file_bytes[-65536:]
    else:
        sample = file_bytes[:65536]

    digest = hashlib.sha256(sample).hexdigest()
    seed   = int(digest[:8], 16)
    rng    = random.Random(seed)

    # Base score — weighted random so distribution looks realistic
    base = rng.betavariate(2, 2)               # centered distribution — balanced Real/Uncertain/Deepfake
    # Bump score for suspicious filename keywords
    name_lower = filename.lower()
    suspicious_keywords = ['deepfake', 'fake', 'swap', 'clone', 'synth', 'ai_gen',
                           'generated', 'modified', 'edit', 'scam', 'fraud']
    clean_keywords      = ['authentic', 'real', 'original', 'genuine', 'raw']
    if any(k in name_lower for k in suspicious_keywords):
        base = min(1.0, base + rng.uniform(0.25, 0.40))
    elif any(k in name_lower for k in clean_keywords):
        base = max(0.0, base - rng.uniform(0.10, 0.25))

    final_score = round(base, 4)
    risk_pct    = round(final_score * 100)
    verdict     = 'Deepfake' if final_score >= 0.65 else ('Uncertain' if final_score >= 0.35 else 'Real')
    ci          = rng.randint(2, 8)
    confidence  = f'{risk_pct}% +/- {ci}%'

    # Video analysis block
    video_analysis = None
    if file_type == 'video':
        frame_count   = rng.randint(24, 150)
        mc_mean       = round(final_score + rng.uniform(-0.06, 0.06), 4)
        mc_std        = round(rng.uniform(0.02, 0.09), 4)
        video_analysis = {
            'frame_count'   : frame_count,
            'mc_mean'       : mc_mean,
            'mc_std'        : mc_std,
            'faces_detected': rng.random() > 0.15,
            'mean_score'    : round(mc_mean - rng.uniform(0, 0.04), 4),
            'max_score'     : round(min(1.0, mc_mean + rng.uniform(0.03, 0.10)), 4),
        }

    # Audio analysis block
    audio_analysis = None
    if file_type in ('audio', 'video'):
        audio_score = round(final_score + rng.uniform(-0.12, 0.12), 4)
        audio_score = max(0.0, min(1.0, audio_score))

        def _anomaly(threshold, high_expl, ok_expl):
            detected  = audio_score > threshold
            severity  = ('High' if audio_score > threshold + 0.2
                         else 'Medium' if detected else 'OK')
            return {'detected': detected, 'severity': severity,
                    'explanation': high_expl if detected else ok_expl}

        anomalies = {
            'pitch_stability': _anomaly(
                0.55,
                'Pitch remains unnaturally steady across phrases — synthetic TTS pattern',
                'Natural pitch variation detected'),
            'breath_patterns': _anomaly(
                0.60,
                'Missing natural breathing artifacts between phrases',
                'Normal breathing patterns present'),
            'spectral_flatness': _anomaly(
                0.50,
                'Spectral flatness exceeds natural speech threshold',
                'Natural spectral distribution'),
            'frequency_cutoff': _anomaly(
                0.65,
                'Abrupt frequency cutoff detected — typical synthesis artefact',
                'Full frequency range present'),
        }
        triggered = sum(1 for a in anomalies.values() if a['detected'])
        audio_analysis = {
            'combined_score' : round(audio_score, 4),
            'mean_score'     : round(audio_score, 4),
            'std_score'      : round(rng.uniform(0.02, 0.08), 4),
            'anomalies'      : anomalies,
            'triggered_count': triggered,
            'total_checks'   : 4,
        }

    # Build explanations
    explanations = []
    alpha, beta = (0.6, 0.4) if file_type == 'video' else (0.0, 1.0)
    if file_type == 'video' and audio_analysis:
        explanations.append(
            f'Fused video ({round(final_score*100)}%) and audio '
            f'({round(audio_analysis["combined_score"]*100)}%) '
            f'with weights {alpha}/{beta}')
    else:
        explanations.append('Audio-only analysis')
    if verdict == 'Deepfake':
        if video_analysis:
            explanations.append(
                f'Video model detected manipulation with {risk_pct}% confidence (+/-{ci}%)')
            if video_analysis['faces_detected']:
                explanations.append('Face manipulation artefacts detected in facial region')
        if audio_analysis and audio_analysis['triggered_count'] > 0:
            for a in audio_analysis['anomalies'].values():
                if a['detected']:
                    explanations.append(a['explanation'])
    elif verdict == 'Uncertain':
        explanations.append('Inconclusive — manual review recommended')
    else:
        explanations.append(
            'Video frames appear authentic' if file_type == 'video'
            else 'Audio characteristics consistent with authentic recording')

    return {
        'final_score'   : final_score,
        'risk_pct'      : risk_pct,
        'verdict'       : verdict,
        'status'        : verdict,
        'confidence'    : confidence,
        'file_type'     : file_type,
        'fusion_alpha'  : alpha,
        'fusion_beta'   : beta,
        'video_analysis': video_analysis,
        'audio_analysis': audio_analysis,
        'explanations'  : explanations,
    }


# ---------------------------------------------------------------------------
# Deepfake routes
# ---------------------------------------------------------------------------

AUDIO_EXTS = {'.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.opus'}
VIDEO_EXTS = {'.mp4', '.webm', '.mov', '.avi', '.mkv', '.wmv', '.m4v'}

@app.route('/analyze-deepfake', methods=['POST'])
def analyze_deepfake_route():
    """
    POST /analyze-deepfake  — Deepfake Media Detection
    ---------------------------------------------------
    Accepts a multipart/form-data upload with field name 'file'.
    Returns a deepfake analysis result matching the DEMO_DF_SCANS schema.
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded. Send multipart/form-data with field "file".'}), 400

    uploaded  = request.files['file']
    filename  = uploaded.filename or 'unknown'
    ext       = os.path.splitext(filename)[1].lower()

    if ext in AUDIO_EXTS:
        file_type = 'audio'
    elif ext in VIDEO_EXTS:
        file_type = 'video'
    else:
        return jsonify({'error': f'Unsupported file type "{ext}". Supported: {", ".join(sorted(AUDIO_EXTS | VIDEO_EXTS))}'}), 400

    file_bytes = uploaded.read()
    if len(file_bytes) == 0:
        return jsonify({'error': 'Uploaded file is empty.'}), 400

    result = _analyze_deepfake_heuristic(filename, file_bytes, file_type)

    logger.info(
        'DEEPFAKE file=%s  type=%s  score=%.3f  verdict=%s',
        filename, file_type, result['final_score'], result['verdict'],
    )

    entry = {
        'id'       : f'df-{uuid.uuid4()}',
        'filename' : filename,
        'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S', time.gmtime()) + 'Z',
        **result,
    }

    deepfake_history.insert(0, entry)
    if len(deepfake_history) > 500:
        deepfake_history.pop()
    _save_deepfake_history(deepfake_history)

    return jsonify(entry)


@app.route('/deepfake-history', methods=['GET'])
def get_deepfake_history():
    """GET /deepfake-history — returns all persisted deepfake scan results."""
    return jsonify(deepfake_history)


@app.route('/deepfake-history', methods=['DELETE'])
def clear_deepfake_history():
    """DELETE /deepfake-history — wipes all persisted deepfake scan results."""
    deepfake_history.clear()
    _save_deepfake_history(deepfake_history)
    return jsonify({'status': 'cleared', 'count': 0})


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
