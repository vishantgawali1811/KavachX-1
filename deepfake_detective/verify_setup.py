"""
Quick Setup Verification Script for Deepfake Detective

Run this before the hackathon to ensure all dependencies are installed
and models can be loaded without errors.
"""

import sys
import subprocess
from pathlib import Path

def print_header(text):
    print(f"\n{'='*60}")
    print(f"  {text}")
    print(f"{'='*60}\n")

def check_python_version():
    print_header("1. Python Version Check")
    py_version = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    if sys.version_info >= (3, 9):
        print(f"✓ Python {py_version} (compatible)")
        return True
    else:
        print(f"✗ Python {py_version} (requires 3.9+)")
        return False

def check_imports():
    print_header("2. Core Dependencies Check")
    required = {
        "torch": "PyTorch",
        "torchvision": "TorchVision",
        "cv2": "OpenCV",
        "librosa": "Librosa",
        "streamlit": "Streamlit",
        "flask": "Flask",
        "numpy": "NumPy",
        "PIL": "Pillow",
    }

    failed = []
    for module, name in required.items():
        try:
            __import__(module)
            print(f"✓ {name}")
        except ImportError:
            print(f"✗ {name} NOT INSTALLED")
            failed.append(module)

    return len(failed) == 0, failed

def check_models():
    print_header("3. Model Files Check")
    weights_dir = Path(__file__).parent / "weights"
    weights_dir.mkdir(exist_ok=True)

    models = {
        "meso_inception4.pth": "Video Model",
        "audio_cnn.pth": "Audio Model",
    }

    print(f"Weights directory: {weights_dir}")
    print("Note: Models can be randomly initialized or pre-trained weights can be added.\n")

    for model_file, model_name in models.items():
        model_path = weights_dir / model_file
        if model_path.exists():
            print(f"✓ {model_name} ({model_file}) - {model_path.stat().st_size / 1e6:.1f}MB")
        else:
            print(f"ℹ {model_name} ({model_file}) - NOT FOUND (will use random init)")

    return True

def check_config():
    print_header("4. Configuration Check")
    try:
        from config import (
            FRAME_SIZE, FRAMES_PER_SECOND, MAX_SECONDS,
            SAMPLE_RATE, N_MELS, THRESHOLD_FAKE, THRESHOLD_REAL,
            FUSION_ALPHA, FUSION_BETA, MC_DROPOUT_RUNS
        )
        print(f"✓ config.py loaded successfully")
        print(f"  - Frame size: {FRAME_SIZE}")
        print(f"  - FPS extraction: {FRAMES_PER_SECOND}")
        print(f"  - Max seconds: {MAX_SECONDS}")
        print(f"  - Sample rate: {SAMPLE_RATE} Hz")
        print(f"  - Mel bands: {N_MELS}")
        print(f"  - MC Dropout runs: {MC_DROPOUT_RUNS}")
        print(f"  - Fake threshold: {THRESHOLD_FAKE}")
        print(f"  - Real threshold: {THRESHOLD_REAL}")
        print(f"  - Fusion weights: {FUSION_ALPHA}V + {FUSION_BETA}A")
        return True
    except Exception as e:
        print(f"✗ config.py error: {e}")
        return False

def check_models_load():
    print_header("5. Model Loading Check")
    try:
        from models.detector import DeepfakeDetector
        print("✓ MesoInception4 class imported")

        video_det = DeepfakeDetector()
        print("✓ Video detector initialized (random weights)")

        from utils.audio_forensics import AudioDeepfakeDetector
        print("✓ AudioCNN class imported")

        audio_det = AudioDeepfakeDetector()
        print("✓ Audio detector initialized (random weights)")

        return True
    except Exception as e:
        print(f"✗ Model loading error: {e}")
        import traceback
        traceback.print_exc()
        return False

def check_flask():
    print_header("6. Flask Backend Check")
    try:
        from backend.app import app
        print("✓ Flask app imported successfully")
        print(f"✓ Routes available: {[str(rule) for rule in app.url_map.iter_rules()][:3]}... (and more)")
        return True
    except Exception as e:
        print(f"✗ Flask app error: {e}")
        return False

def check_streamlit():
    print_header("7. Streamlit Frontend Check")
    frontend_path = Path(__file__).parent / "frontend" / "dashboard.py"
    if frontend_path.exists():
        print(f"✓ Streamlit dashboard found: {frontend_path}")
        return True
    else:
        print(f"✗ Streamlit dashboard not found at {frontend_path}")
        return False

def print_summary(all_checks):
    print_header("SETUP VERIFICATION SUMMARY")
    if all(all_checks):
        print("✓✓✓ All checks passed! Ready for hackathon!\n")
        print("Next steps:")
        print("1. Start backend:  cd backend && python app.py")
        print("2. Start dashboard: streamlit run frontend/dashboard.py")
        print("3. Open http://localhost:8501 in your browser")
        print("\nGood luck! 🚀")
    else:
        print("✗✗✗ Some checks failed. Fix errors above before proceeding.\n")
        print("Run: pip install -r requirements.txt")

if __name__ == "__main__":
    checks = [
        check_python_version(),
        check_imports()[0],
        check_models(),
        check_config(),
        check_models_load(),
        check_flask(),
        check_streamlit(),
    ]

    print_summary(checks)
