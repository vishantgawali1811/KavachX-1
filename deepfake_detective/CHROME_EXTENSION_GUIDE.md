# 🔍 Deepfake Detective Chrome Extension Guide

**Installation & Usage Instructions**

---

## 🚀 Installation

### Step 1: Open Chrome Extensions Manager
1. Open **Google Chrome** or **Chromium-based browser**
2. Go to: `chrome://extensions/`
3. Enable **"Developer mode"** (toggle in top-right corner)

### Step 2: Load the Extension
1. Click **"Load unpacked"**
2. Navigate to: `e:/projects/kavach/kavach-main/deepfake_detective/chrome-extension/`
3. Select the **chrome-extension** folder
4. Click **"Open"** / **"Select Folder"**

### Step 3: Verify Installation
✅ You should see **"Deepfake Detective"** in your extensions list
✅ A new icon appears in your Chrome toolbar (top-right)

---

## 📊 How to Use

### Prerequisites
Make sure the backend API is running:
```bash
cd deepfake_detective/backend
python app.py
# Or from root:
./run_backend.sh
```

You should see: `API running on http://localhost:5002`

---

### Scanning a Video File

1. **Click the extension icon** 🔍 in your Chrome toolbar
2. The **Deepfake Detective popup** opens
3. Select **"Video Scan"** tab (default)
4. **Drop or upload** a video file:
   - Click the drop zone or drag-and-drop
   - Supported: MP4, AVI, MOV, MKV, WebM, FLV
   - Max: 50 MB (larger files will be chunked)
5. Click **"Analyze Video"** button
6. **Wait 15-30 seconds** for results

---

### Scanning an Audio File

1. Click the extension icon 🔍
2. Select **"Audio Scan"** tab
3. Upload an audio file:
   - Supported: WAV, MP3, FLAC, OGG, M4A
   - Max: 50 MB
4. Click **"Analyze Audio"**
5. Wait for results

---

## 📈 Reading the Results

### Visual Verdict

- 🟢 **Green + "Authentic Media"** — Real/genuine content
- 🟡 **Yellow + "Uncertain"** — Ambiguous, needs human review
- 🔴 **Red + "Deepfake Detected"** — High confidence it's manipulated

### Deepfake Risk Meter

Shows percentage risk (0-100%):
- **0-35%:** Real content ✓
- **35-65%:** Uncertain ⚠️
- **65-100%:** Likely deepfake 🚨

### Confidence Display

Shows uncertainty range:
- **Example:** `92% ± 3%` means 92% confidence with ±3% margin of error
- Wider ranges (e.g., ±20%) = less confident, recommend human review

---

## 🔬 Analysis Details

### For Video Files
Shows:
- **Frames Analyzed** — Number of frames processed
- **Faces Detected** — Whether faces were found (required for analysis)
- **Video Score** — Deepfake probability from video model
- **MC Uncertainty** — Uncertainty range (±%)
- **Audio Score** — Deepfake probability from audio model (if audio track exists)
- **Audio Anomalies** — Count of detected speech artifacts
- **Fusion** — How video and audio scores are combined

### For Audio Files
Shows:
- **Pitch Stability** — Is pitch unnaturally consistent?
- **Breath Patterns** — Are breathing gaps normal?
- **Spectral Flatness** — Is frequency distribution smooth (synthetic)?
- **Frequency Cutoff** — Does audio stop abruptly above 4 kHz?
- **CNN Score** — Raw model confidence
- **Combined Score** — Final deepfake probability

---

## 🔥 Grad-CAM Heatmap (Video Only)

For video analysis, the extension shows:

**Two view modes:**

1. **Heatmap** (default) — Red/yellow overlay showing which facial regions triggered the "fake" detection
2. **Original** — The original video frame for comparison

**Colors:**
- 🔴 **Red/Hot areas** — Strong deepfake indicators
- 🟡 **Yellow areas** — Moderate indicators
- 🔵 **Blue areas** — Low confidence regions

---

## 📋 Scan History

The extension keeps a **local history** of all scans (max 200 most recent):

**Stored information:**
- Filename
- File type (video/audio)
- Verdict (Real/Uncertain/Deepfake)
- Risk percentage
- Confidence level
- Timestamp

**Access history:**
- Open the dashboard: Click **"📊 Dashboard"** button in popup
- Opens Streamlit dashboard: `http://localhost:8501/`
- View all scans with filtering

**Clear history:**
- Click **"🗑️ Clear History"** button
- Confirmation required (changes button briefly to "✓ Cleared")

---

## 🔔 Browser Notifications

The extension sends desktop notifications when:

- ✅ **Real content detected** — Green notification
- ⚠️ **Uncertain result** — Yellow notification (medium priority)
- 🚨 **Deepfake detected** — Red notification (high priority, may pop up)

---

## 🎨 Extension Icon Badge

The toolbar icon shows **real-time status**:

| Badge | Meaning |
|-------|---------|
| ✓ (Green) | Last scan: Real/authentic |
| ! (Orange) | Last scan: Uncertain |
| ‼ (Red) | Last scan: Deepfake detected |
| (Empty) | No scans yet |

---

## ⚙️ Configuration

### Change API URL
If your Flask backend runs on a different port:

1. Open `popup.js`
2. Find line 4: `const API_URL = 'http://localhost:5002';`
3. Change to your API URL
4. Reload extension (Chrome → Extensions → Reload)

---

## ❌ Troubleshooting

### "Cannot reach API" Error

**Problem:** Popup shows "Cannot reach API — is backend running on port 5002?"

**Solutions:**
1. Check Flask backend is running: `./run_backend.sh`
2. Verify it's running on port 5002: `http://localhost:5002/health`
3. Check firewall isn't blocking localhost
4. Restart both Chrome and backend

### Extension Icon Not Showing

**Problem:** Deepfake Detective icon missing from toolbar

**Solutions:**
1. Go to: `chrome://extensions/`
2. Search for "Deepfake Detective"
3. Verify it's enabled (toggle on)
4. Pin extension to toolbar: Click 📌 icon next to extension name

### Analysis Takes Too Long

**Problem:** Waiting > 30 seconds for results

**Solutions:**
1. Reduce video duration: Use first 10 seconds only
2. Check file size: Smaller files analyze faster
3. Check GPU is available: CUDA speeds up inference 10x
4. Try audio-only analysis (faster than video+audio fusion)

### Heatmap Not Showing

**Problem:** Video analysis completes but no heatmap overlay

**Solutions:**
1. Ensure video has detectable faces
2. Try a different video file
3. Check backend logs for errors
4. Use original frame view instead

---

## 📞 Support & Tips

### Quick Demo

1. Use a short test video (5-10 seconds)
2. Upload via extension
3. Results appear in ~15-20 seconds
4. View heatmap and analysis details
5. Check confidence range for uncertainty

### Best Results

- **Video:** Clear faces, good lighting, MP4 format
- **Audio:** Clear speech, no background noise, WAV/MP3 format
- **Files:** 5-30 MB size range works best
- **Connection:** Local (localhost) fastest, minimal latency

### Batch Analysis

To scan multiple files:
1. Don't clear history between scans
2. Re-open popup for each file
3. All results saved in local history
4. View all at once in dashboard

---

## 🔒 Privacy & Security

✅ **Local Processing** — All analysis happens on your machine
✅ **No Cloud Upload** — Backend runs locally on port 5002
✅ **History Stored Locally** — Chrome local storage (your device only)
✅ **No Data Collection** — Deepfake Detective doesn't collect telemetry

**Note:** If backend is exposed to internet, files ARE sent to that server.

---

## 🎯 Use Cases

**Detection:**
- Verify video authenticity before sharing on social media
- Check audio for deepfake artifacts in conversations
- Investigate suspected manipulated media

**Forensics:**
- Generate evidence-grade reports on suspicious media
- Document deepfake detection with heatmaps
- Explain to non-technical users why content is fake

**Research:**
- Test your own deepfake samples
- Understand model confidence ranges
- Analyze failure cases

---

## 📚 Advanced: Reading Anomaly Descriptions

### Audio Anomalies Explained

| Anomaly | What It Means | Real Audio | Fake Audio |
|---------|---------------|-----------|-----------|
| **Pitch Stability** | CV of pitch over time | CV > 0.10 | CV < 0.05 |
| **Breath Patterns** | Silence gaps in speech | 5-15% silence | < 5% or > 30% |
| **Spectral Flatness** | Distribution of frequencies | Low flatness | High flatness |
| **Frequency Cutoff** | High frequency content | Present > 4 kHz | Absent / Cut off |

Higher anomaly counts = more likely synthetic

---

## 📞 Questions or Issues?

- Check Flask API health: `http://localhost:5002/health`
- View backend logs for detailed error messages
- Test with provided sample files
- Verify Chrome version is up-to-date

---

**Happy detecting! 🔍✨**

Deepfake Detective Chrome Extension v1.0
