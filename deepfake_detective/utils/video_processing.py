"""
Video preprocessing utilities for Deepfake Detective.

Handles frame extraction, face detection, and tensor preprocessing
for the MesoInception4 model.
"""

from __future__ import annotations

import cv2
import numpy as np
import torch
from torchvision import transforms
from typing import List, Tuple, Optional
from pathlib import Path

from config import FRAME_SIZE, FRAMES_PER_SECOND, MAX_SECONDS, IMAGENET_MEAN, IMAGENET_STD


# ── ImageNet-normalised transform ─────────────────────────────────────────────
_transform = transforms.Compose([
    transforms.ToTensor(),
    transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
])


def extract_frames(video_path: str | Path,
                   fps: int = FRAMES_PER_SECOND,
                   max_seconds: int = MAX_SECONDS) -> List[np.ndarray]:
    """
    Extract frames from a video file at the specified rate.

    Args:
        video_path:  Path to the video file.
        fps:         Frames to extract per second.
        max_seconds: Maximum duration to process (demo cap).

    Returns:
        List of BGR frames as numpy arrays (original resolution).

    Raises:
        ValueError: If the video cannot be opened.
    """
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise ValueError(f"Cannot open video: {video_path}")

    video_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    max_frames = int(min(total_frames, video_fps * max_seconds))

    # Calculate frame interval (extract `fps` frames per second)
    interval = max(1, int(video_fps / fps))

    frames: List[np.ndarray] = []
    frame_idx = 0

    while frame_idx < max_frames:
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ret, frame = cap.read()
        if not ret:
            break
        frames.append(frame)
        frame_idx += interval

    cap.release()
    return frames


def extract_audio_from_video(video_path: str | Path,
                             output_path: str | Path) -> bool:
    """
    Extract audio track from video using OpenCV + temp WAV.

    Falls back to ffmpeg subprocess if available.

    Args:
        video_path:  Path to the source video.
        output_path: Destination WAV file path.

    Returns:
        True if audio was extracted successfully.
    """
    import subprocess
    try:
        result = subprocess.run(
            ["ffmpeg", "-y", "-i", str(video_path),
             "-vn", "-acodec", "pcm_s16le",
             "-ar", "22050", "-ac", "1",
             str(output_path)],
            capture_output=True, timeout=30
        )
        return result.returncode == 0 and Path(output_path).exists()
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False


def preprocess_frame(frame_bgr: np.ndarray,
                     size: Tuple[int, int] = FRAME_SIZE) -> torch.Tensor:
    """
    Resize + normalise a single BGR frame for MesoInception4.

    Args:
        frame_bgr: Raw BGR frame from OpenCV.
        size:      Target (H, W).

    Returns:
        Tensor of shape (1, 3, H, W) normalised with ImageNet stats.
    """
    frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    frame_resized = cv2.resize(frame_rgb, (size[1], size[0]))
    tensor = _transform(frame_resized)  # (3, H, W)
    return tensor.unsqueeze(0)          # (1, 3, H, W)


def detect_faces(frame_bgr: np.ndarray) -> List[Tuple[int, int, int, int]]:
    """
    Detect faces in a frame using OpenCV's Haar cascade.

    Args:
        frame_bgr: BGR frame.

    Returns:
        List of (x, y, w, h) bounding boxes.
    """
    gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
    cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    face_cascade = cv2.CascadeClassifier(cascade_path)
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1,
                                          minNeighbors=5, minSize=(60, 60))
    return [tuple(f) for f in faces] if len(faces) > 0 else []


def crop_face(frame_bgr: np.ndarray,
              bbox: Tuple[int, int, int, int],
              margin: float = 0.2) -> np.ndarray:
    """
    Crop a face region with margin from the frame.

    Args:
        frame_bgr: BGR frame.
        bbox:      (x, y, w, h) face bounding box.
        margin:    Fractional expansion around the face.

    Returns:
        Cropped face region as BGR numpy array.
    """
    h_img, w_img = frame_bgr.shape[:2]
    x, y, w, h = bbox
    mx, my = int(w * margin), int(h * margin)
    x1 = max(0, x - mx)
    y1 = max(0, y - my)
    x2 = min(w_img, x + w + mx)
    y2 = min(h_img, y + h + my)
    return frame_bgr[y1:y2, x1:x2]


def get_video_metadata(video_path: str | Path) -> dict:
    """
    Extract basic metadata from a video file.

    Returns:
        Dict with fps, frame_count, duration, width, height.
    """
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        return {}

    meta = {
        "fps": cap.get(cv2.CAP_PROP_FPS),
        "frame_count": int(cap.get(cv2.CAP_PROP_FRAME_COUNT)),
        "width": int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
        "height": int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
    }
    meta["duration"] = meta["frame_count"] / meta["fps"] if meta["fps"] > 0 else 0
    cap.release()
    return meta
