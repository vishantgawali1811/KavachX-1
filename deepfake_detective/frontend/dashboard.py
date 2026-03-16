"""
Deepfake Detective - Streamlit Dashboard
=========================================
Interactive UI for multimodal deepfake detection with explainability.

Mirrors KavachX phishing detection pattern but for media forensics.
Shows real-time analysis, Grad-CAM heatmaps, audio anomalies, and confidence metrics.

Run: streamlit run frontend/dashboard.py
"""

import streamlit as st
import requests
import base64
import json
import io
import cv2
import numpy as np
from pathlib import Path
from datetime import datetime
import time
from PIL import Image
import pandas as pd

# ═══════════════════════════════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════════════════════════════

PAGE_CONFIG = {
    "page_title": "Deepfake Detective",
    "page_icon": "🔍",
    "layout": "wide",
    "initial_sidebar_state": "expanded",
}

st.set_page_config(**PAGE_CONFIG)

# Backend API endpoint
BACKEND_URL = "http://localhost:5002"
ICON_FAKE = "🚨"
ICON_UNCERTAIN = "⚠️"
ICON_REAL = "✓"

# Color scheme (similar to KavachX)
COLOR_REAL = "#10b981"  # Green
COLOR_UNCERTAIN = "#f59e0b"  # Yellow
COLOR_FAKE = "#ef4444"  # Red
COLOR_PRIMARY = "#3b82f6"  # Blue

# ═══════════════════════════════════════════════════════════════════════════════
# CSS Styling
# ═══════════════════════════════════════════════════════════════════════════════

st.markdown(
    """
    <style>
    .metric-box {
        padding: 20px;
        border-radius: 10px;
        background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        border-left: 4px solid #3b82f6;
        margin: 10px 0;
    }
    .verdict-card {
        padding: 25px;
        border-radius: 12px;
        text-align: center;
        font-size: 24px;
        font-weight: bold;
        color: white;
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
    }
    .verdict-real {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    }
    .verdict-uncertain {
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    }
    .verdict-fake {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    }
    .heatmap-container {
        background: #0f172a;
        padding: 15px;
        border-radius: 8px;
        border: 1px solid #1e293b;
    }
    .confidence-bar {
        background: #1e293b;
        border-radius: 20px;
        overflow: hidden;
        height: 30px;
        margin: 10px 0;
    }
    .explanation-item {
        padding: 12px;
        margin: 8px 0;
        background: #1e293b;
        border-radius: 6px;
        border-left: 3px solid #3b82f6;
        color: #e2e8f0;
    }
    .scan-history-row {
        padding: 12px;
        background: #1e293b;
        border-radius: 6px;
        margin: 8px 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    </style>
    """,
    unsafe_allow_html=True
)

# ═══════════════════════════════════════════════════════════════════════════════
# Helper Functions
# ═══════════════════════════════════════════════════════════════════════════════

def get_verdict_color(verdict: str) -> str:
    """Return color for verdict badge."""
    if verdict == "Deepfake":
        return COLOR_FAKE
    elif verdict == "Uncertain":
        return COLOR_UNCERTAIN
    return COLOR_REAL

def get_verdict_icon(verdict: str) -> str:
    """Return icon for verdict."""
    if verdict == "Deepfake":
        return ICON_FAKE
    elif verdict == "Uncertain":
        return ICON_UNCERTAIN
    return ICON_REAL

def upload_to_backend(file, analysis_type: str = "analyze") -> dict:
    """
    Upload file to Flask backend for analysis.

    Args:
        file: Streamlit UploadedFile object
        analysis_type: "analyze", "analyze-video", or "analyze-audio"

    Returns:
        API response dict
    """
    try:
        files = {"file": (file.name, file.read(), file.type)}
        url = f"{BACKEND_URL}/{analysis_type}"

        with st.spinner(f"🔄 Analyzing {analysis_type.replace('-', ' ')}... (this may take a moment)"):
            response = requests.post(url, files=files, timeout=120)
            response.raise_for_status()
            return response.json()
    except requests.exceptions.ConnectionError:
        st.error("❌ Cannot connect to backend API. Ensure Flask server is running on http://localhost:5002")
        return None
    except requests.exceptions.RequestException as e:
        st.error(f"❌ API Error: {str(e)}")
        return None
    except Exception as e:
        st.error(f"❌ Unexpected error: {str(e)}")
        return None

def display_verdict_card(verdict: str, risk_score: float, confidence: str) -> None:
    """Display prominent verdict card."""
    verdict_class = f"verdict-{verdict.lower()}"
    icon = get_verdict_icon(verdict)

    col1, col2, col3 = st.columns(3)
    with col2:
        st.markdown(
            f"""
            <div class="verdict-card {verdict_class}">
                {icon} {verdict.upper()}
            </div>
            """,
            unsafe_allow_html=True
        )

    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Risk Score", f"{round(risk_score * 100)}%")
    with col2:
        st.metric("Confidence", confidence)
    with col3:
        st.metric("Status", verdict)

def display_explanations(explanations: list) -> None:
    """Display explanation text items."""
    if not explanations:
        return

    st.subheader("🔍 Detection Explanations", divider="blue")
    for i, exp in enumerate(explanations, 1):
        st.markdown(
            f'<div class="explanation-item">• {exp}</div>',
            unsafe_allow_html=True
        )

def display_video_analysis(video_result: dict) -> None:
    """Display video analysis results with heatmap."""
    if not video_result:
        return

    st.subheader("📹 Video Analysis", divider="blue")

    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Frames Analyzed", video_result.get("frame_count", 0))
    with col2:
        st.metric("Max Frame Score", f"{round(video_result.get('max_score', 0) * 100)}%")
    with col3:
        st.metric("Mean Score", f"{round(video_result.get('mean_score', 0) * 100)}%")
    with col4:
        st.metric("Best Frame Index", video_result.get("best_frame_idx", 0))

    # Display heatmap if available
    heatmap_b64 = video_result.get("heatmap_b64", "")
    if heatmap_b64:
        st.write("##### 🔥 Grad-CAM Heatmap (Most Suspicious Frame)")
        try:
            heatmap_bytes = base64.b64decode(heatmap_b64)
            heatmap_img = Image.open(io.BytesIO(heatmap_bytes))
            col1, col2 = st.columns(2)
            with col1:
                st.write("**Heatmap Overlay**")
                st.image(heatmap_img, use_column_width=True)

            original_b64 = video_result.get("original_frame_b64", "")
            if original_b64:
                with col2:
                    st.write("**Original Frame**")
                    original_img = Image.open(io.BytesIO(base64.b64decode(original_b64)))
                    st.image(original_img, use_column_width=True)
        except Exception as e:
            st.warning(f"Could not display heatmap: {str(e)}")

    # Frame scores visualization
    frame_scores = video_result.get("frame_scores", [])
    if frame_scores:
        st.write("##### 📊 Frame Score Timeline")
        scores_df = pd.DataFrame({
            "Frame": range(len(frame_scores)),
            "Deepfake Score": frame_scores
        })
        st.line_chart(scores_df.set_index("Frame"), use_container_width=True)

def display_audio_analysis(audio_result: dict) -> None:
    """Display audio analysis with anomalies."""
    if not audio_result:
        return

    st.subheader("🔊 Audio Analysis", divider="blue")

    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("CNN Score", f"{round(audio_result.get('cnn_score', 0) * 100)}%")
    with col2:
        st.metric("Mean Score", f"{round(audio_result.get('mean_score', 0) * 100)}%")
    with col3:
        st.metric("Std Dev", f"±{round(audio_result.get('std_score', 0) * 100)}%")
    with col4:
        st.metric("Combined Score", f"{round(audio_result.get('combined_score', 0) * 100)}%")

    # Anomaly detection
    anomalies = audio_result.get("anomalies", {})
    if anomalies:
        st.write("##### 🔍 Detected Anomalies")
        for key, info in anomalies.items():
            detected = info.get("detected", False)
            severity = info.get("severity", "Low")
            explanation = info.get("explanation", "")

            if detected:
                if severity == "High":
                    icon = "🔴"
                    color = COLOR_FAKE
                elif severity == "Medium":
                    icon = "🟡"
                    color = COLOR_UNCERTAIN
                else:
                    icon = "🟢"
                    color = COLOR_REAL

                st.markdown(
                    f'{icon} **{key.replace("_", " ").title()}** (Severity: {severity})',
                    help=explanation
                )
                st.caption(explanation)

def fetch_scan_history() -> list:
    """Fetch scan history from backend."""
    try:
        response = requests.get(f"{BACKEND_URL}/history", timeout=10)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        st.warning(f"Could not fetch history: {str(e)}")
        return []

def clear_scan_history() -> None:
    """Clear scan history from backend."""
    try:
        requests.delete(f"{BACKEND_URL}/history", timeout=10)
        st.success("✓ Scan history cleared")
        time.sleep(1)
        st.rerun()
    except Exception as e:
        st.error(f"Could not clear history: {str(e)}")

def download_report(scan_id: str) -> None:
    """Generate and download PDF report."""
    try:
        with st.spinner("📄 Generating PDF report..."):
            response = requests.post(
                f"{BACKEND_URL}/generate-report",
                json={"scan_id": scan_id},
                timeout=30
            )
            response.raise_for_status()

            st.download_button(
                label="📥 Download PDF Report",
                data=response.content,
                file_name=f"deepfake_report_{scan_id[:8]}.pdf",
                mime="application/pdf"
            )
    except Exception as e:
        st.error(f"Could not generate report: {str(e)}")

# ═══════════════════════════════════════════════════════════════════════════════
# Page Setup
# ═══════════════════════════════════════════════════════════════════════════════

def init_session_state() -> None:
    """Initialize session state variables."""
    if "analysis_result" not in st.session_state:
        st.session_state.analysis_result = None
    if "last_file" not in st.session_state:
        st.session_state.last_file = None

init_session_state()

# ═══════════════════════════════════════════════════════════════════════════════
# Main App
# ═══════════════════════════════════════════════════════════════════════════════

# Header
st.markdown(
    """
    <div style='background: linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%);
                padding: 20px; border-radius: 10px; margin-bottom: 20px;'>
        <h1 style='color: white; margin: 0;'>🔍 Deepfake Detective</h1>
        <p style='color: #e0e7ff; margin: 10px 0 0 0;'>
            Explainable multimodal forensics tool for audio/video deepfake detection
        </p>
    </div>
    """,
    unsafe_allow_html=True
)

# Navigation
tab_analyze, tab_history, tab_about = st.tabs(["🔬 Analyze", "📊 History", "ℹ️ About"])

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 1: ANALYZE
# ═══════════════════════════════════════════════════════════════════════════════

with tab_analyze:
    st.write("### Upload Media for Analysis")

    col1, col2 = st.columns([2, 1])

    with col1:
        st.write("#### Supported Formats")
        st.write("""
        - **Video:** MP4, AVI, MOV, MKV, WebM, FLV
        - **Audio:** WAV, MP3, FLAC, OGG, M4A
        """)

        uploaded_file = st.file_uploader(
            "Choose a video or audio file",
            type=["mp4", "avi", "mov", "mkv", "webm", "flv", "wav", "mp3", "flac", "ogg", "m4a"],
            accept_multiple_files=False
        )

    with col2:
        st.write("#### Analysis Settings")
        analysis_mode = st.radio(
            "Analysis Type",
            ["Auto (Video+Audio)", "Video Only", "Audio Only"],
            horizontal=True
        )

    # Analyze button
    if uploaded_file:
        if st.button("🚀 Analyze Now", key="analyze_btn", use_container_width=True):
            file_ext = Path(uploaded_file.name).suffix.lower()

            # Determine analysis type
            if analysis_mode == "Auto (Video+Audio)":
                api_endpoint = "analyze"
            elif analysis_mode == "Video Only":
                api_endpoint = "analyze-video"
            else:
                api_endpoint = "analyze-audio"

            # Call backend
            result = upload_to_backend(uploaded_file, api_endpoint)

            if result and "error" not in result:
                st.session_state.analysis_result = result
                st.session_state.last_file = uploaded_file.name


    # Display results if available
    if st.session_state.analysis_result:
        result = st.session_state.analysis_result
        st.success(f"✓ Analysis complete for: {result.get('filename', 'Unknown')}")

        # Timestamp
        timestamp = result.get("timestamp", "Unknown")
        st.caption(f"Analyzed: {timestamp}")

        st.divider()

        # Main verdict card
        display_verdict_card(
            result.get("verdict", "Unknown"),
            result.get("final_score", 0),
            result.get("confidence", "N/A")
        )

        st.divider()

        # Explanations
        display_explanations(result.get("explanations", []))

        st.divider()

        # Video analysis if available
        video_result = result.get("video_analysis")
        if video_result:
            display_video_analysis(video_result)

        # Audio analysis if available
        audio_result = result.get("audio_analysis")
        if audio_result:
            display_audio_analysis(audio_result)

        st.divider()

        # Fusion info
        if video_result and audio_result:
            st.write("### 🔗 Score Fusion Details")
            col1, col2, col3 = st.columns(3)
            with col1:
                v_score = video_result.get("mc_mean", 0)
                st.metric("Video Weight", f"{round(result.get('fusion_alpha', 0.6) * 100)}%")
                st.caption(f"Score: {round(v_score * 100)}%")
            with col2:
                st.write("")  # spacer
            with col3:
                a_score = audio_result.get("combined_score", 0)
                st.metric("Audio Weight", f"{round(result.get('fusion_beta', 0.4) * 100)}%")
                st.caption(f"Score: {round(a_score * 100)}%")

        st.divider()

        # Download report
        col1, col2, col3 = st.columns(3)
        with col1:
            download_report(result.get("id"))
        with col2:
            if st.button("📋 Copy Result JSON", key="copy_json"):
                st.code(json.dumps(result, indent=2))
        with col3:
            st.write("")  # spacer

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 2: HISTORY
# ═══════════════════════════════════════════════════════════════════════════════

with tab_history:
    st.write("### Previous Scans")

    if st.button("🔄 Refresh History", use_container_width=True):
        st.rerun()

    history = fetch_scan_history()

    if not history:
        st.info("No scans yet. Analyze a file to start!")
    else:
        st.write(f"Total scans: **{len(history)}**")
        st.divider()

        # Filter options
        col1, col2, col3 = st.columns(3)
        with col1:
            filter_verdict = st.selectbox(
                "Filter by Verdict",
                ["All", "Deepfake", "Real", "Uncertain"]
            )
        with col2:
            filter_type = st.selectbox(
                "Filter by Type",
                ["All", "Video", "Audio"]
            )

        # Apply filters
        filtered = history
        if filter_verdict != "All":
            filtered = [s for s in filtered if s.get("verdict", "") == filter_verdict]
        if filter_type != "All":
            filtered = [s for s in filtered if s.get("file_type", "") == filter_type]

        # Display scans
        for scan in filtered[:50]:  # Show latest 50
            with st.container():
                col1, col2, col3, col4 = st.columns([2, 1, 1, 1])

                with col1:
                    icon = get_verdict_icon(scan.get("verdict", "Unknown"))
                    st.write(f"{icon} **{scan.get('filename', 'Unknown')}**")
                    st.caption(scan.get("timestamp", ""))

                with col2:
                    st.metric("Risk", f"{scan.get('risk_pct', 0)}%")

                with col3:
                    verdict = scan.get("verdict", "Unknown")
                    st.write(f"**{verdict}**")

                with col4:
                    if st.button("📄 Report", key=f"report_{scan.get('id')}"):
                        download_report(scan.get("id"))

                st.divider()

        # Clear history
        if st.button("🗑️ Clear All History", key="clear_history"):
            if st.button("⚠️ Confirm Delete", key="confirm_delete"):
                clear_scan_history()

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 3: ABOUT
# ═══════════════════════════════════════════════════════════════════════════════

with tab_about:
    st.write("""
    ## About Deepfake Detective

    **Deepfake Detective** is a multi-modal forensics tool designed to detect deepfake
    audio and video content with explainable AI insights.

    ### Key Features

    ✓ **Multimodal Detection**
    - Video deepfake analysis using MesoInception4
    - Audio synthesis detection with CNN + heuristics
    - Automatic fusion of both modalities

    ✓ **Explainability (Grad-CAM)**
    - Visual heatmaps showing which face regions triggered "Fake" classification
    - Audio spectrogram highlights for anomalies
    - Natural language explanations for all detections

    ✓ **Uncertainty Quantification**
    - Monte Carlo Dropout for confidence estimation
    - Displays risk as "Score ± Uncertainty (%)"
    - Enables risk-aware decision making

    ✓ **PDF Reports**
    - Forensic reports with heatmap images
    - Audio anomaly details
    - Timestamp and metadata

    ### Technical Stack

    - **Framework:** PyTorch 2.1+
    - **Video Model:** MesoInception4 (Inception + Dropout)
    - **Audio Model:** 3-layer CNN on Mel-spectrograms
    - **Explainability:** Grad-CAM + Heuristic Analysis
    - **Uncertainty:** Monte Carlo Dropout (10 runs)
    - **API:** Flask 3.0
    - **Dashboard:** Streamlit 1.28

    ### Model Architecture

    **Video Pipeline:**
    1. Extract frames (1 fps, max 10s for demo)
    2. Detect faces with Haar Cascade
    3. Preprocess to 256×256, normalize with ImageNet stats
    4. Run through MesoInception4
    5. Generate Grad-CAM heatmap for most suspicious frame
    6. MC Dropout × 10 for uncertainty

    **Audio Pipeline:**
    1. Load audio, resample to 22.05 kHz
    2. Compute Mel-spectrogram (128 bands, 2048 FFT)
    3. Run through Audio CNN
    4. Analyze anomalies:
       - Pitch stability (CV < 0.05 = unnatural)
       - Breath gaps (silence ratio)
       - Spectral flatness (synthetic smoothness)
       - High-frequency cutoff (< 4 kHz)
    5. MC Dropout × 10 for uncertainty

    **Fusion:**
    - Video Weight (α): 60%
    - Audio Weight (β): 40%
    - Final Score = 0.6 × V_score + 0.4 × A_score

    ### Decision Thresholds

    - **Deepfake:** Score ≥ 0.65
    - **Real:** Score ≤ 0.35
    - **Uncertain:** 0.35 < Score < 0.65

    ### Team & Attribution

    Developed for **IndiaNext Hackathon 2026**

    Built with PyTorch, OpenCV, Librosa, and Streamlit

    ---

    **Ethical Note:** This tool is for detection only. We do not generate
    deepfakes, only identify them responsibly.
    """)

    # Backend health check
    st.divider()
    st.write("### System Status")

    try:
        response = requests.get(f"{BACKEND_URL}/health", timeout=5)
        if response.status_code == 200:
            health = response.json()
            col1, col2, col3 = st.columns(3)
            with col1:
                st.success(f"✓ Backend API: {health.get('status', 'unknown')}")
            with col2:
                st.info(f"Video Model: {'Loaded' if health.get('video_model_loaded') else 'Not Loaded'}")
            with col3:
                st.info(f"Audio Model: {'Loaded' if health.get('audio_model_loaded') else 'Not Loaded'}")
    except:
        st.error("❌ Backend API Not Responding - Ensure Flask is running on port 5002")

# Footer
st.divider()
st.markdown(
    """
    <div style='text-align: center; color: #94a3b8; font-size: 12px; margin-top: 30px;'>
        <p>Deepfake Detective v1.0 | IndiaNext Hackathon 2026</p>
        <p>Explainable AI for Media Forensics</p>
    </div>
    """,
    unsafe_allow_html=True
)
