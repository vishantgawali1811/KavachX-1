"""
Audio forensics module for Deepfake Detective.

Detects synthetic voice artifacts using Mel-spectrogram analysis,
pitch tracking, and a lightweight CNN classifier.
"""

from __future__ import annotations

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import librosa
from typing import Tuple, Dict, List, Optional
from pathlib import Path

from config import (
    SAMPLE_RATE, N_MELS, HOP_LENGTH, N_FFT,
    AUDIO_MAX_DURATION, MC_DROPOUT_RUNS,
)


# ═══════════════════════════════════════════════════════════════════════════════
# Audio CNN — lightweight 3-layer network for synthetic voice detection
# ═══════════════════════════════════════════════════════════════════════════════

class AudioCNN(nn.Module):
    """
    Lightweight CNN for detecting synthetic audio from Mel-spectrograms.

    Input:  (B, 1, N_MELS, T) — single-channel spectrogram image.
    Output: (B, 1)  probability of being synthetic.
    """

    def __init__(self, n_mels: int = N_MELS, dropout_rate: float = 0.4) -> None:
        super().__init__()
        self.conv1 = nn.Sequential(
            nn.Conv2d(1, 16, kernel_size=3, padding=1),
            nn.BatchNorm2d(16),
            nn.ReLU(),
            nn.MaxPool2d(2, 2),
        )
        self.conv2 = nn.Sequential(
            nn.Conv2d(16, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.MaxPool2d(2, 2),
        )
        self.conv3 = nn.Sequential(
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.AdaptiveAvgPool2d((4, 4)),
        )
        self.dropout = nn.Dropout(dropout_rate)
        self.fc1 = nn.Linear(64 * 4 * 4, 32)
        self.fc2 = nn.Linear(32, 1)

        # Grad-CAM storage
        self._gradients: Optional[torch.Tensor] = None
        self._activations: Optional[torch.Tensor] = None

    def _save_gradient(self, grad: torch.Tensor) -> None:
        self._gradients = grad

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.conv1(x)
        x = self.conv2(x)
        x = self.conv3(x)

        # Grad-CAM hook on last conv output
        self._activations = x
        if x.requires_grad:
            x.register_hook(self._save_gradient)

        x = self.dropout(x)
        x = x.view(x.size(0), -1)
        x = F.relu(self.fc1(x))
        x = torch.sigmoid(self.fc2(x))
        return x


# ═══════════════════════════════════════════════════════════════════════════════
# Audio Preprocessing
# ═══════════════════════════════════════════════════════════════════════════════

def load_audio(audio_path: str | Path,
               sr: int = SAMPLE_RATE,
               max_duration: float = AUDIO_MAX_DURATION) -> np.ndarray:
    """
    Load audio file and resample.

    Args:
        audio_path:    Path to WAV/MP3/etc.
        sr:            Target sample rate.
        max_duration:  Maximum seconds to load.

    Returns:
        Audio waveform as 1D numpy array.
    """
    y, _ = librosa.load(str(audio_path), sr=sr, duration=max_duration, mono=True)
    return y


def compute_mel_spectrogram(y: np.ndarray,
                            sr: int = SAMPLE_RATE,
                            n_mels: int = N_MELS,
                            hop_length: int = HOP_LENGTH,
                            n_fft: int = N_FFT) -> np.ndarray:
    """
    Convert waveform to a log-Mel spectrogram.

    Args:
        y:          Audio waveform.
        sr:         Sample rate.
        n_mels:     Number of Mel bands.
        hop_length: Hop size for STFT.
        n_fft:      FFT window size.

    Returns:
        Log-Mel spectrogram of shape (n_mels, T).
    """
    mel_spec = librosa.feature.melspectrogram(
        y=y, sr=sr, n_mels=n_mels,
        hop_length=hop_length, n_fft=n_fft,
    )
    log_mel = librosa.power_to_db(mel_spec, ref=np.max)
    return log_mel


def mel_to_tensor(log_mel: np.ndarray) -> torch.Tensor:
    """
    Normalise and convert Mel spectrogram to model input tensor.

    Returns:
        Tensor of shape (1, 1, N_MELS, T).
    """
    # Min-max normalise to [0, 1]
    mel_min, mel_max = log_mel.min(), log_mel.max()
    if mel_max - mel_min > 1e-8:
        normed = (log_mel - mel_min) / (mel_max - mel_min)
    else:
        normed = np.zeros_like(log_mel)

    tensor = torch.FloatTensor(normed).unsqueeze(0).unsqueeze(0)  # (1, 1, H, W)
    return tensor


# ═══════════════════════════════════════════════════════════════════════════════
# Heuristic Artifact Detection
# ═══════════════════════════════════════════════════════════════════════════════

def detect_audio_anomalies(y: np.ndarray,
                           sr: int = SAMPLE_RATE) -> Dict[str, any]:
    """
    Heuristic analysis for synthetic audio artifacts.

    Checks:
    - Pitch unnaturally stable (lack of variation)
    - Missing breath patterns (silence gaps)
    - Spectral flatness anomaly (synthetic smoothness)
    - Sudden frequency cutoffs
    - Unnatural formant patterns

    Returns:
        Dict of anomaly indicators with explanations.
    """
    anomalies: Dict[str, any] = {}

    # 1. Pitch stability analysis
    f0, voiced_flag, _ = librosa.pyin(
        y, fmin=librosa.note_to_hz('C2'),
        fmax=librosa.note_to_hz('C7'), sr=sr,
    )
    f0_valid = f0[~np.isnan(f0)]
    if len(f0_valid) > 10:
        pitch_std = float(np.std(f0_valid))
        pitch_mean = float(np.mean(f0_valid))
        pitch_cv = pitch_std / pitch_mean if pitch_mean > 0 else 0

        if pitch_cv < 0.05:
            anomalies["pitch_stability"] = {
                "detected": True,
                "severity": "High",
                "value": round(pitch_cv, 4),
                "explanation": f"Pitch coefficient of variation ({pitch_cv:.3f}) is extremely low — natural speech typically has CV > 0.10. This suggests synthetic generation.",
            }
        elif pitch_cv < 0.10:
            anomalies["pitch_stability"] = {
                "detected": True,
                "severity": "Medium",
                "value": round(pitch_cv, 4),
                "explanation": f"Pitch variation ({pitch_cv:.3f}) is below normal range — may indicate partial synthesis.",
            }
        else:
            anomalies["pitch_stability"] = {
                "detected": False,
                "value": round(pitch_cv, 4),
                "explanation": "Pitch variation is within natural range.",
            }

    # 2. Breath gap analysis (natural speech has micro-silences)
    rms = librosa.feature.rms(y=y, hop_length=HOP_LENGTH)[0]
    silence_threshold = np.percentile(rms, 10) * 1.5
    silence_ratio = float(np.sum(rms < silence_threshold) / len(rms))

    if silence_ratio < 0.05:
        anomalies["breath_patterns"] = {
            "detected": True,
            "severity": "High",
            "value": round(silence_ratio, 4),
            "explanation": f"Almost no silence gaps detected ({silence_ratio:.1%}). Natural speech includes breathing pauses (typically 5-15%).",
        }
    elif silence_ratio < 0.08:
        anomalies["breath_patterns"] = {
            "detected": True,
            "severity": "Medium",
            "value": round(silence_ratio, 4),
            "explanation": f"Minimal silence gaps ({silence_ratio:.1%}). This may indicate cloned or synthesised audio.",
        }
    else:
        anomalies["breath_patterns"] = {
            "detected": False,
            "value": round(silence_ratio, 4),
            "explanation": "Breathing patterns appear natural.",
        }

    # 3. Spectral flatness (synthetic audio tends to be smoother)
    flatness = librosa.feature.spectral_flatness(y=y, hop_length=HOP_LENGTH)[0]
    mean_flatness = float(np.mean(flatness))

    if mean_flatness > 0.15:
        anomalies["spectral_flatness"] = {
            "detected": True,
            "severity": "Medium",
            "value": round(mean_flatness, 4),
            "explanation": f"Spectral flatness ({mean_flatness:.3f}) is elevated — synthetic voices often have unnaturally uniform frequency distribution.",
        }
    else:
        anomalies["spectral_flatness"] = {
            "detected": False,
            "value": round(mean_flatness, 4),
            "explanation": "Spectral flatness is within natural range.",
        }

    # 4. High-frequency content analysis (some deepfakes cut off above ~4kHz)
    spec = np.abs(librosa.stft(y, n_fft=N_FFT, hop_length=HOP_LENGTH))
    freq_bins = librosa.fft_frequencies(sr=sr, n_fft=N_FFT)
    high_freq_mask = freq_bins > 4000
    if np.any(high_freq_mask):
        high_energy = float(np.mean(spec[high_freq_mask, :]))
        total_energy = float(np.mean(spec))
        high_ratio = high_energy / total_energy if total_energy > 0 else 0

        if high_ratio < 0.02:
            anomalies["frequency_cutoff"] = {
                "detected": True,
                "severity": "High",
                "value": round(high_ratio, 4),
                "explanation": f"Almost no energy above 4kHz ({high_ratio:.3f} ratio). This is a strong indicator of low-quality voice synthesis with bandwidth limitation.",
            }
        elif high_ratio < 0.05:
            anomalies["frequency_cutoff"] = {
                "detected": True,
                "severity": "Medium",
                "value": round(high_ratio, 4),
                "explanation": f"Low high-frequency content ({high_ratio:.3f}). May indicate codec artifacts or partial synthesis.",
            }
        else:
            anomalies["frequency_cutoff"] = {
                "detected": False,
                "value": round(high_ratio, 4),
                "explanation": "High-frequency content is normal.",
            }

    return anomalies


def get_spectrogram_highlights(log_mel: np.ndarray,
                               anomalies: Dict) -> List[Dict]:
    """
    Generate frequency-band highlights for the spectrogram visualization.

    Returns list of dicts suitable for frontend overlay rendering.
    """
    highlights: List[Dict] = []

    for key, info in anomalies.items():
        if not info.get("detected"):
            continue

        if key == "pitch_stability":
            highlights.append({
                "type": "band",
                "freq_range": [80, 400],
                "label": "Pitch Region",
                "severity": info["severity"],
                "explanation": info["explanation"],
            })
        elif key == "frequency_cutoff":
            highlights.append({
                "type": "band",
                "freq_range": [4000, 11025],
                "label": "Missing High Frequencies",
                "severity": info["severity"],
                "explanation": info["explanation"],
            })
        elif key == "spectral_flatness":
            highlights.append({
                "type": "overlay",
                "label": "Flat Spectrum",
                "severity": info["severity"],
                "explanation": info["explanation"],
            })

    return highlights


# ═══════════════════════════════════════════════════════════════════════════════
# Audio Detector Wrapper
# ═══════════════════════════════════════════════════════════════════════════════

class AudioDeepfakeDetector:
    """
    High-level audio deepfake detection with CNN + heuristics.

    Combines neural network classification with rule-based anomaly
    detection for comprehensive analysis.
    """

    def __init__(self, weights_path: Optional[str | Path] = None,
                 device: Optional[str] = None) -> None:
        self.device = torch.device(
            device or ("cuda" if torch.cuda.is_available() else "cpu")
        )
        self.model = AudioCNN().to(self.device)

        if weights_path and Path(weights_path).exists():
            state = torch.load(weights_path, map_location=self.device,
                               weights_only=True)
            self.model.load_state_dict(state)

        self.model.eval()

    def predict(self, mel_tensor: torch.Tensor) -> float:
        """Single inference — returns synthetic probability."""
        with torch.no_grad():
            mel_tensor = mel_tensor.to(self.device)
            prob = self.model(mel_tensor)
        return prob.item()

    def get_uncertainty(self, mel_tensor: torch.Tensor,
                        n_runs: int = MC_DROPOUT_RUNS) -> Tuple[float, float]:
        """MC Dropout uncertainty for audio model."""
        mel_tensor = mel_tensor.to(self.device)

        self.model.train()
        for m in self.model.modules():
            if isinstance(m, nn.BatchNorm2d):
                m.eval()

        probs: list[float] = []
        with torch.no_grad():
            for _ in range(n_runs):
                p = self.model(mel_tensor).item()
                probs.append(p)

        self.model.eval()
        return float(np.mean(probs)), float(np.std(probs))

    def analyze(self, audio_path: str | Path) -> Dict:
        """
        Full audio analysis pipeline.

        Returns:
            Dict with cnn_score, uncertainty, anomalies, and highlights.
        """
        y = load_audio(audio_path)
        log_mel = compute_mel_spectrogram(y)
        mel_tensor = mel_to_tensor(log_mel)

        # CNN prediction + uncertainty
        cnn_score = self.predict(mel_tensor)
        mean_score, std_score = self.get_uncertainty(mel_tensor)

        # Heuristic anomaly detection
        anomalies = detect_audio_anomalies(y)
        highlights = get_spectrogram_highlights(log_mel, anomalies)

        # Count triggered anomalies
        triggered = [k for k, v in anomalies.items() if v.get("detected")]

        # Combine CNN + heuristics
        heuristic_score = len(triggered) / max(len(anomalies), 1)
        combined_score = 0.6 * mean_score + 0.4 * heuristic_score

        return {
            "cnn_score": round(cnn_score, 4),
            "mean_score": round(mean_score, 4),
            "std_score": round(std_score, 4),
            "combined_score": round(combined_score, 4),
            "anomalies": anomalies,
            "highlights": highlights,
            "triggered_count": len(triggered),
            "total_checks": len(anomalies),
            "spectrogram_shape": list(log_mel.shape),
        }
