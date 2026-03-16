"""Global configuration constants for Deepfake Detective."""

from pathlib import Path

# ── Paths ────────────────────────────────────────────────────────────
ROOT_DIR = Path(__file__).resolve().parent
WEIGHTS_DIR = ROOT_DIR / "weights"

# ── Video preprocessing ──────────────────────────────────────────────
FRAME_SIZE = (256, 256)
FRAMES_PER_SECOND = 1  # Extract 1 frame per second
MAX_SECONDS = 10        # Cap for demo mode — process first N seconds
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

# ── Audio preprocessing ──────────────────────────────────────────────
SAMPLE_RATE = 22050
N_MELS = 128
HOP_LENGTH = 512
N_FFT = 2048
AUDIO_MAX_DURATION = 10.0  # seconds — demo cap

# ── MC Dropout ───────────────────────────────────────────────────────
MC_DROPOUT_RUNS = 10

# ── Detection thresholds ─────────────────────────────────────────────
THRESHOLD_FAKE = 0.65   # above → Deepfake
THRESHOLD_REAL = 0.35   # below → Real
# between → Uncertain

# ── Fusion weights (video vs audio) ─────────────────────────────────
FUSION_ALPHA = 0.6  # video weight
FUSION_BETA = 0.4   # audio weight
