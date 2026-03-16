"""
backend/app.py — Flask API for Deepfake Detective
--------------------------------------------------
Mirrors the KavachX phishing backend architecture.

Chrome Extension + Dashboard usage:
    POST /analyze-video     — upload video for deepfake detection
    POST /analyze-audio     — upload audio for voice synthesis detection
    GET  /history           — scan history
    GET  /health            — API status

Run:
    cd deepfake_detective/backend
    python app.py
"""

import json
import logging
import os
import sys
import time
import uuid
import tempfile
import base64

import cv2
import numpy as np
from pathlib import Path
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS

# Add parent dir to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import (
    FUSION_ALPHA, FUSION_BETA,
    THRESHOLD_FAKE, THRESHOLD_REAL,
    WEIGHTS_DIR, MAX_SECONDS,
)
from models.detector import DeepfakeDetector
from utils.video_processing import (
    extract_frames, preprocess_frame, detect_faces, crop_face,
    get_video_metadata, extract_audio_from_video,
)
from utils.audio_forensics import AudioDeepfakeDetector
from utils.report_generator import generate_report, frame_to_base64

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
)
logger = logging.getLogger(__name__)

# ── App setup ─────────────────────────────────────────────────────────────────
from flask.json.provider import DefaultJSONProvider

class NumpyJSONProvider(DefaultJSONProvider):
    """Handle numpy types in JSON responses."""
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super().default(obj)

app = Flask(__name__)
app.json_provider_class = NumpyJSONProvider
app.json = NumpyJSONProvider(app)
CORS(app)

# ── Load models at startup ────────────────────────────────────────────────────
video_weights = WEIGHTS_DIR / "meso_inception4.pth"
audio_weights = WEIGHTS_DIR / "audio_cnn.pth"

video_detector = DeepfakeDetector(
    weights_path=video_weights if video_weights.exists() else None
)
logger.info("Video detector loaded (weights: %s)", "custom" if video_weights.exists() else "random init")

audio_detector = AudioDeepfakeDetector(
    weights_path=audio_weights if audio_weights.exists() else None
)
logger.info("Audio detector loaded (weights: %s)", "custom" if audio_weights.exists() else "random init")

# ── Scan history ──────────────────────────────────────────────────────────────
HISTORY_PATH = Path(__file__).resolve().parent / "scan_history.json"

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

# ── Upload directory ──────────────────────────────────────────────────────────
UPLOAD_DIR = Path(tempfile.gettempdir()) / "deepfake_detective_uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# ═══════════════════════════════════════════════════════════════════════════════
# Helper — full analysis pipeline
# ═══════════════════════════════════════════════════════════════════════════════

def classify_verdict(score: float) -> str:
    """Map score to verdict label."""
    if score >= THRESHOLD_FAKE:
        return "Deepfake"
    elif score <= THRESHOLD_REAL:
        return "Real"
    return "Uncertain"

def get_status_color(verdict: str) -> str:
    if verdict == "Deepfake":
        return "red"
    elif verdict == "Uncertain":
        return "yellow"
    return "green"

def analyze_video_file(video_path: Path) -> dict:
    """Run full video analysis pipeline on a file."""
    metadata = get_video_metadata(video_path)
    try:
        frames = extract_frames(video_path)
    except ValueError as e:
        return {"error": str(e)}

    if not frames:
        return {"error": "No frames could be extracted from video."}

    # Process each frame
    frame_scores = []
    best_frame_idx = 0
    best_score = 0.0
    heatmaps = []

    for i, frame in enumerate(frames):
        # Try face detection first, fallback to full frame
        faces = detect_faces(frame)
        if faces:
            face_crop = crop_face(frame, faces[0])
        else:
            face_crop = frame

        tensor = preprocess_frame(face_crop)
        score = video_detector.predict(tensor)
        frame_scores.append(score)

        if score > best_score:
            best_score = score
            best_frame_idx = i

    # Get Grad-CAM for the most suspicious frame
    best_frame = frames[best_frame_idx]
    faces = detect_faces(best_frame)
    face_for_cam = crop_face(best_frame, faces[0]) if faces else best_frame
    cam_tensor = preprocess_frame(face_for_cam)

    heatmap = video_detector.get_grad_cam(cam_tensor)
    overlay = DeepfakeDetector.overlay_heatmap(
        cv2.resize(face_for_cam, (256, 256)), heatmap
    )

    # MC Dropout uncertainty on best frame
    mean_score, std_score = video_detector.get_uncertainty(cam_tensor)

    return {
        "frame_count": len(frames),
        "frame_scores": [round(s, 4) for s in frame_scores],
        "mean_score": round(float(np.mean(frame_scores)), 4),
        "max_score": round(best_score, 4),
        "best_frame_idx": best_frame_idx,
        "mc_mean": round(mean_score, 4),
        "mc_std": round(std_score, 4),
        "heatmap_b64": frame_to_base64(overlay),
        "original_frame_b64": frame_to_base64(
            cv2.resize(face_for_cam, (256, 256))
        ),
        "metadata": metadata,
        "faces_detected": len(faces) > 0,
    }

def analyze_audio_file(audio_path: Path) -> dict:
    """Run full audio analysis pipeline on a file."""
    return audio_detector.analyze(audio_path)


# ═══════════════════════════════════════════════════════════════════════════════
# Routes
# ═══════════════════════════════════════════════════════════════════════════════

@app.route('/', methods=['GET'])
def index():
    return jsonify({
        'service': 'Deepfake Detective API',
        'status': 'running',
        'endpoints': {
            'GET  /health': 'Model status',
            'POST /analyze-video': 'Upload video for deepfake detection',
            'POST /analyze-audio': 'Upload audio for synthesis detection',
            'POST /analyze': 'Upload video (extracts audio if present)',
            'GET  /history': 'Scan history',
        },
    })


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'video_model_loaded': video_detector is not None,
        'audio_model_loaded': audio_detector is not None,
        'video_weights': video_weights.exists(),
        'audio_weights': audio_weights.exists(),
        'fusion_mode': True,
        'demo_max_seconds': MAX_SECONDS,
    })


@app.route('/analyze', methods=['POST'])
def analyze():
    """
    POST /analyze — Full deepfake analysis (video + audio fusion).

    Upload a video file. The API will:
    1. Analyze video frames for face manipulation.
    2. Extract and analyze audio for synthetic voice.
    3. Fuse both scores with configurable weights.
    4. Return Grad-CAM heatmap + audio anomalies + confidence.
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded. Use multipart/form-data with key "file".'}), 400

    file = request.files['file']
    if not file.filename:
        return jsonify({'error': 'Empty filename.'}), 400

    # Save to temp
    ext = Path(file.filename).suffix.lower()
    allowed_video = {'.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv'}
    allowed_audio = {'.wav', '.mp3', '.flac', '.ogg', '.m4a'}

    if ext not in allowed_video and ext not in allowed_audio:
        return jsonify({'error': f'Unsupported file type: {ext}'}), 400

    temp_path = UPLOAD_DIR / f"{uuid.uuid4()}{ext}"
    file.save(str(temp_path))

    try:
        video_result = None
        audio_result = None
        explanations = []

        is_video = ext in allowed_video
        is_audio = ext in allowed_audio

        # ── Video analysis ────────────────────────────────────────────
        if is_video:
            try:
                video_result = analyze_video_file(temp_path)
            except Exception as ve:
                logger.exception('Video analysis failed: %s', ve)
                return jsonify({'error': f'Video analysis failed: {ve}'}), 500
            if "error" in video_result:
                return jsonify(video_result), 400

            # Extract audio from video
            audio_temp = UPLOAD_DIR / f"{uuid.uuid4()}.wav"
            has_audio = extract_audio_from_video(temp_path, audio_temp)
            if has_audio:
                audio_result = analyze_audio_file(audio_temp)
                audio_temp.unlink(missing_ok=True)

        # ── Audio-only analysis ───────────────────────────────────────
        elif is_audio:
            audio_result = analyze_audio_file(temp_path)

        # ── Fusion ────────────────────────────────────────────────────
        if video_result and audio_result:
            v_score = video_result["mc_mean"]
            a_score = audio_result["combined_score"]
            final_score = FUSION_ALPHA * v_score + FUSION_BETA * a_score
            explanations.append(
                f"Fused video ({round(v_score * 100)}%) and audio ({round(a_score * 100)}%) "
                f"with weights {FUSION_ALPHA}/{FUSION_BETA}"
            )
        elif video_result:
            final_score = video_result["mc_mean"]
            explanations.append("Video-only analysis (no audio track found)")
        elif audio_result:
            final_score = audio_result["combined_score"]
            explanations.append("Audio-only analysis")
        else:
            return jsonify({'error': 'Could not analyze the file.'}), 500

        # Generate explanations from analysis
        if video_result:
            v_mean = video_result["mc_mean"]
            v_std = video_result["mc_std"]
            if v_mean >= THRESHOLD_FAKE:
                explanations.append(f"Video model detected manipulation with {round(v_mean * 100)}% confidence (+/-{round(v_std * 100)}%)")
                if video_result.get("faces_detected"):
                    explanations.append("Face manipulation artifacts detected in facial region")
            elif v_mean <= THRESHOLD_REAL:
                explanations.append("Video frames appear authentic")

        if audio_result:
            anomalies = audio_result.get("anomalies", {})
            for key, info in anomalies.items():
                if info.get("detected"):
                    explanations.append(info["explanation"])

        verdict = classify_verdict(final_score)

        # Build response
        scan_entry = {
            'id': str(uuid.uuid4()),
            'filename': file.filename,
            'file_type': 'video' if is_video else 'audio',
            'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S', time.gmtime()) + 'Z',
            'final_score': round(final_score, 4),
            'risk_pct': round(final_score * 100),
            'verdict': verdict,
            'status': verdict,
            'status_color': get_status_color(verdict),
            'confidence': f"{round((video_result or audio_result)['mc_mean' if video_result else 'mean_score'] * 100)}% +/- {round((video_result or audio_result)['mc_std' if video_result else 'std_score'] * 100)}%",
            'video_analysis': video_result,
            'audio_analysis': audio_result,
            'explanations': explanations,
            'fusion_alpha': FUSION_ALPHA,
            'fusion_beta': FUSION_BETA,
        }

        # Persist
        scan_history.insert(0, scan_entry)
        if len(scan_history) > 500:
            scan_history.pop()
        _save_history(scan_history)

        logger.info(
            'FILE=%s  video=%.3f  audio=%.3f  final=%.3f  verdict=%s',
            file.filename,
            video_result["mc_mean"] if video_result else -1,
            audio_result["combined_score"] if audio_result else -1,
            final_score, verdict,
        )

        return jsonify(scan_entry)

    except Exception as exc:
        logger.exception('Analysis failed for %s: %s', file.filename, exc)
        return jsonify({'error': f'Analysis failed: {exc}'}), 500
    finally:
        temp_path.unlink(missing_ok=True)


@app.route('/analyze-video', methods=['POST'])
def analyze_video():
    """POST /analyze-video — Video-only deepfake analysis."""
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded.'}), 400

    file = request.files['file']
    ext = Path(file.filename).suffix.lower()
    temp_path = UPLOAD_DIR / f"{uuid.uuid4()}{ext}"
    file.save(str(temp_path))

    try:
        result = analyze_video_file(temp_path)
        if "error" in result:
            return jsonify(result), 400

        verdict = classify_verdict(result["mc_mean"])
        entry = {
            'id': str(uuid.uuid4()),
            'filename': file.filename,
            'file_type': 'video',
            'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S', time.gmtime()) + 'Z',
            'final_score': result["mc_mean"],
            'risk_pct': round(result["mc_mean"] * 100),
            'verdict': verdict,
            'status': verdict,
            'status_color': get_status_color(verdict),
            'confidence': f"{round(result['mc_mean'] * 100)}% +/- {round(result['mc_std'] * 100)}%",
            'video_analysis': result,
            'explanations': [],
        }

        scan_history.insert(0, entry)
        if len(scan_history) > 500:
            scan_history.pop()
        _save_history(scan_history)

        return jsonify(entry)
    finally:
        temp_path.unlink(missing_ok=True)


@app.route('/analyze-audio', methods=['POST'])
def analyze_audio_route():
    """POST /analyze-audio — Audio-only synthesis detection."""
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded.'}), 400

    file = request.files['file']
    ext = Path(file.filename).suffix.lower()
    temp_path = UPLOAD_DIR / f"{uuid.uuid4()}{ext}"
    file.save(str(temp_path))

    try:
        result = analyze_audio_file(temp_path)
        verdict = classify_verdict(result["combined_score"])
        entry = {
            'id': str(uuid.uuid4()),
            'filename': file.filename,
            'file_type': 'audio',
            'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S', time.gmtime()) + 'Z',
            'final_score': result["combined_score"],
            'risk_pct': round(result["combined_score"] * 100),
            'verdict': verdict,
            'status': verdict,
            'status_color': get_status_color(verdict),
            'confidence': f"{round(result['mean_score'] * 100)}% +/- {round(result['std_score'] * 100)}%",
            'audio_analysis': result,
            'explanations': [
                info["explanation"]
                for info in result.get("anomalies", {}).values()
                if info.get("detected")
            ],
        }

        scan_history.insert(0, entry)
        if len(scan_history) > 500:
            scan_history.pop()
        _save_history(scan_history)

        return jsonify(entry)
    finally:
        temp_path.unlink(missing_ok=True)


@app.route('/generate-report', methods=['POST'])
def generate_report_route():
    """POST /generate-report — Generate PDF forensic report for a scan ID."""
    body = request.get_json(silent=True)
    if not body or 'scan_id' not in body:
        return jsonify({'error': 'Missing scan_id'}), 400

    scan = next((s for s in scan_history if s['id'] == body['scan_id']), None)
    if not scan:
        return jsonify({'error': 'Scan not found'}), 404

    # Decode heatmap if available
    heatmap_frame = None
    video_analysis = scan.get('video_analysis') or {}
    heatmap_b64 = video_analysis.get('heatmap_b64', '')
    if heatmap_b64:
        img_bytes = base64.b64decode(heatmap_b64)
        nparr = np.frombuffer(img_bytes, np.uint8)
        heatmap_frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    pdf_bytes = generate_report(scan, heatmap_frame)
    return send_file(
        io.BytesIO(pdf_bytes),
        mimetype='application/pdf',
        as_attachment=True,
        download_name=f"Deepfake_Report_{scan['id'][:8]}.pdf"
    )


@app.route('/history', methods=['GET'])
def get_history():
    return jsonify(scan_history)


@app.route('/history', methods=['DELETE'])
def clear_history():
    scan_history.clear()
    _save_history(scan_history)
    return jsonify({'status': 'cleared', 'count': 0})


@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({'error': 'Method not allowed'}), 405

@app.errorhandler(500)
def internal_error(e):
    import traceback
    logger.error('500 error: %s\n%s', e, traceback.format_exc())
    return jsonify({'error': str(e)}), 500


# ── Need io for send_file ─────────────────────────────────────────────────────
import io

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5002))
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    logger.info(f'Starting Deepfake Detective API on port {port} ...')
    app.run(host='0.0.0.0', port=port, debug=debug)
