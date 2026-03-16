"""
MesoInception4 deepfake detector with Grad-CAM explainability and
Monte Carlo Dropout uncertainty quantification.

Architecture reference: MesoNet (Afchar et al., 2018) — a compact network
specifically designed for face-tampering detection.
"""

from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
import cv2
from pathlib import Path
from typing import Tuple, Optional

from config import MC_DROPOUT_RUNS, WEIGHTS_DIR


# ═══════════════════════════════════════════════════════════════════════
# Inception Block
# ═══════════════════════════════════════════════════════════════════════

class InceptionBlock(nn.Module):
    """Simplified Inception module with 4 parallel branches."""

    def __init__(self, in_channels: int, out_1: int, out_3: int,
                 out_5: int, out_pool: int) -> None:
        super().__init__()
        self.branch1 = nn.Conv2d(in_channels, out_1, kernel_size=1)
        self.branch3 = nn.Sequential(
            nn.Conv2d(in_channels, out_3, kernel_size=1),
            nn.Conv2d(out_3, out_3, kernel_size=3, padding=1),
        )
        self.branch5 = nn.Sequential(
            nn.Conv2d(in_channels, out_5, kernel_size=1),
            nn.Conv2d(out_5, out_5, kernel_size=5, padding=2),
        )
        self.branch_pool = nn.Sequential(
            nn.MaxPool2d(kernel_size=3, stride=1, padding=1),
            nn.Conv2d(in_channels, out_pool, kernel_size=1),
        )
        self.bn = nn.BatchNorm2d(out_1 + out_3 + out_5 + out_pool)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        b1 = self.branch1(x)
        b3 = self.branch3(x)
        b5 = self.branch5(x)
        bp = self.branch_pool(x)
        out = torch.cat([b1, b3, b5, bp], dim=1)
        return F.relu(self.bn(out))


# ═══════════════════════════════════════════════════════════════════════
# MesoInception4
# ═══════════════════════════════════════════════════════════════════════

class MesoInception4(nn.Module):
    """
    MesoInception4 — lightweight deepfake face detector.

    Input:  (B, 3, 256, 256)
    Output: (B, 1)  probability of being a deepfake.
    """

    def __init__(self, dropout_rate: float = 0.5) -> None:
        super().__init__()

        # ── Convolutional backbone with Inception blocks ─────────
        self.inception1 = InceptionBlock(3, 1, 4, 4, 2)    # → 11 ch
        self.pool1 = nn.MaxPool2d(2, 2)                      # 256→128

        self.inception2 = InceptionBlock(11, 2, 4, 4, 2)   # → 12 ch
        self.pool2 = nn.MaxPool2d(2, 2)                      # 128→64

        self.conv3 = nn.Conv2d(12, 16, kernel_size=5, padding=2)
        self.bn3 = nn.BatchNorm2d(16)
        self.pool3 = nn.MaxPool2d(2, 2)                      # 64→32

        # This is the last conv layer — Grad-CAM hooks go here
        self.conv4 = nn.Conv2d(16, 16, kernel_size=5, padding=2)
        self.bn4 = nn.BatchNorm2d(16)
        self.pool4 = nn.MaxPool2d(4, 4)                      # 32→8

        # ── Classifier head ──────────────────────────────────────
        self.dropout = nn.Dropout2d(dropout_rate)
        self.fc1 = nn.Linear(16 * 8 * 8, 16)
        self.fc2 = nn.Linear(16, 1)

        # ── Grad-CAM storage ─────────────────────────────────────
        self._gradients: Optional[torch.Tensor] = None
        self._activations: Optional[torch.Tensor] = None

    # ── Grad-CAM hook helpers ────────────────────────────────────────

    def _save_gradient(self, grad: torch.Tensor) -> None:
        self._gradients = grad

    def _hook_activations(self, x: torch.Tensor) -> torch.Tensor:
        """Register hook on the last conv layer output."""
        self._activations = x
        if x.requires_grad:
            x.register_hook(self._save_gradient)
        return x

    # ── Forward ──────────────────────────────────────────────────────

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.pool1(self.inception1(x))
        x = self.pool2(self.inception2(x))
        x = self.pool3(F.relu(self.bn3(self.conv3(x))))
        x = F.relu(self.bn4(self.conv4(x)))

        # Grad-CAM: capture activations + gradient hook
        x = self._hook_activations(x)

        x = self.pool4(x)
        x = self.dropout(x)
        x = x.view(x.size(0), -1)
        x = F.relu(self.fc1(x))
        x = torch.sigmoid(self.fc2(x))
        return x


# ═══════════════════════════════════════════════════════════════════════
# Deepfake Detector (wrapper with Grad-CAM + MC Dropout)
# ═══════════════════════════════════════════════════════════════════════

class DeepfakeDetector:
    """
    High-level inference wrapper around MesoInception4.

    Provides:
    - Single-frame prediction
    - Grad-CAM heatmap generation
    - Monte Carlo Dropout uncertainty estimation
    """

    def __init__(self, weights_path: Optional[str | Path] = None,
                 device: Optional[str] = None) -> None:
        self.device = torch.device(
            device or ("cuda" if torch.cuda.is_available() else "cpu")
        )
        self.model = MesoInception4().to(self.device)

        if weights_path and Path(weights_path).exists():
            state = torch.load(weights_path, map_location=self.device,
                               weights_only=True)
            self.model.load_state_dict(state)

        self.model.eval()

    # ── Single prediction ────────────────────────────────────────────

    def predict(self, tensor: torch.Tensor) -> float:
        """
        Run inference on a single preprocessed frame tensor.

        Args:
            tensor: (1, 3, 256, 256) normalised image tensor.
        Returns:
            Deepfake probability (0.0 = real, 1.0 = fake).
        """
        with torch.no_grad():
            tensor = tensor.to(self.device)
            prob = self.model(tensor)
        return prob.item()

    # ── Grad-CAM ─────────────────────────────────────────────────────

    def get_grad_cam(self, tensor: torch.Tensor,
                     target_size: Tuple[int, int] = (256, 256)
                     ) -> np.ndarray:
        """
        Generate a Grad-CAM heatmap for the input frame.

        Steps:
        1. Forward pass with gradients enabled.
        2. Backward pass from the output neuron.
        3. Global-average-pool the gradients → channel weights.
        4. Weighted sum of activation maps → heatmap.
        5. ReLU + normalise + resize to target_size.

        Args:
            tensor: (1, 3, 256, 256) normalised image tensor.
            target_size: (H, W) to resize the heatmap.
        Returns:
            heatmap: np.ndarray (H, W) float32 in [0, 1].
        """
        self.model.eval()
        tensor = tensor.to(self.device).requires_grad_(True)

        # Forward
        output = self.model(tensor)

        # Backward from fake-class neuron
        self.model.zero_grad()
        output.backward(retain_graph=True)

        # Retrieve stored activations & gradients
        gradients = self.model._gradients   # (1, C, H, W)
        activations = self.model._activations  # (1, C, H, W)

        if gradients is None or activations is None:
            return np.zeros(target_size, dtype=np.float32)

        # Channel weights via global average pooling of gradients
        weights = gradients.mean(dim=(2, 3), keepdim=True)  # (1, C, 1, 1)

        # Weighted combination
        cam = (weights * activations).sum(dim=1, keepdim=True)  # (1, 1, H, W)
        cam = F.relu(cam)
        cam = cam.squeeze().cpu().detach().numpy()

        # Normalise to [0, 1]
        cam_min, cam_max = cam.min(), cam.max()
        if cam_max - cam_min > 1e-8:
            cam = (cam - cam_min) / (cam_max - cam_min)
        else:
            cam = np.zeros_like(cam)

        # Resize to target
        cam = cv2.resize(cam, (target_size[1], target_size[0]))
        return cam.astype(np.float32)

    # ── MC Dropout Uncertainty ───────────────────────────────────────

    def get_uncertainty(self, tensor: torch.Tensor,
                        n_runs: int = MC_DROPOUT_RUNS
                        ) -> Tuple[float, float]:
        """
        Estimate prediction uncertainty via Monte Carlo Dropout.

        Keeps dropout active during inference and aggregates N forward passes.

        Args:
            tensor: (1, 3, 256, 256) normalised image tensor.
            n_runs:  number of stochastic forward passes.
        Returns:
            (mean_prob, std_prob) — predicted probability ± uncertainty.
        """
        tensor = tensor.to(self.device)

        # Enable dropout during inference
        self.model.train()  # activates dropout
        # Freeze batchnorm layers so they use running stats, not batch stats
        for m in self.model.modules():
            if isinstance(m, nn.BatchNorm2d):
                m.eval()

        probs: list[float] = []
        with torch.no_grad():
            for _ in range(n_runs):
                p = self.model(tensor).item()
                probs.append(p)

        self.model.eval()

        mean_p = float(np.mean(probs))
        std_p = float(np.std(probs))
        return mean_p, std_p

    # ── Heatmap overlay helper ───────────────────────────────────────

    @staticmethod
    def overlay_heatmap(frame_bgr: np.ndarray, heatmap: np.ndarray,
                        alpha: float = 0.4) -> np.ndarray:
        """
        Blend a Grad-CAM heatmap onto an original BGR frame.

        Args:
            frame_bgr: Original frame (H, W, 3) uint8.
            heatmap:   Grad-CAM output (H, W) float32 in [0, 1].
            alpha:     Blending weight for the heatmap.
        Returns:
            Blended image (H, W, 3) uint8.
        """
        heatmap_uint8 = np.uint8(255 * heatmap)
        colormap = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
        colormap = cv2.resize(colormap, (frame_bgr.shape[1], frame_bgr.shape[0]))
        blended = cv2.addWeighted(frame_bgr, 1 - alpha, colormap, alpha, 0)
        return blended
