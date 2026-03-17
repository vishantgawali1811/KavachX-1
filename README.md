# KavachX — AI-Powered Cybersecurity Intelligence Platform

KavachX is a comprehensive cybersecurity platform that combines **phishing URL detection**, **phishing message/email analysis**, and **deepfake media detection** into a unified intelligence dashboard. It is delivered through a React web dashboard and a Chrome browser extension with real-time protection and voice alert capabilities.

---

## Features

### 1. URL Phishing Detection
- **Random Forest ML Model** trained on 11,430 URLs with 21 extracted features (structural + statistical)
- **Hybrid three-layer scoring**: URL model (40%) + DOM structural analysis (30%) + NLP content analysis (30%)
- **DistilBERT NLP** (`cybersectony/phishing-email-detection-distilbert_v2.4.3`) for page content classification
- Real-time scanning with detailed threat breakdown and feature-level explanations

### 2. Message / Email Phishing Analysis
- **DistilBERT NLP** + keyword heuristic fusion scoring
- Detects: urgency language, credential harvesting, brand impersonation, financial scams, AI-generated content, suspicious links
- Actionable recommendations with severity-based steps

### 3. Deepfake Media Detection
- Upload video (`.mp4`, `.avi`, `.mov`, `.mkv`, `.webm`) or audio (`.wav`, `.mp3`, `.ogg`, `.flac`, `.aac`) files
- Heuristic analysis engine with video frame analysis and audio anomaly detection
- Audio anomaly checks: pitch stability, breath patterns, spectral flatness, frequency cutoff
- Fusion scoring with configurable video/audio weights

### 4. Chrome Extension — Real-Time Browser Protection
- **Manifest V3** extension injected into every page
- Automatic page analysis on navigation (extracts URL, DOM features, page content)
- Color-coded badge (green/yellow/red) based on threat level
- Phishing warning banner for medium-risk pages
- **Form guard** — intercepts password submissions on high-risk pages with a confirmation overlay
- **Security lock** — full-screen page lockdown for confirmed threats
- **Vapi voice alert** — automated phone call warning when URL risk >= 70%
- Built-in popup with URL scan + message scan + settings

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, Chart.js, html2canvas, jsPDF |
| **Backend** | Python, Flask, Flask-CORS |
| **ML/AI** | scikit-learn (Random Forest), HuggingFace Transformers (DistilBERT), PyTorch |
| **Extension** | Chrome Manifest V3, Vapi.ai voice API |
| **Data** | JSON file persistence, joblib model serialization |

---

## Project Structure

```
kavach-main/
├── backend/                          # Flask API server (port 5001)
│   ├── app.py                        # Main application — all API routes
│   ├── feature_extraction.py         # 21-feature URL extractor
│   ├── hybrid_analysis.py            # Three-layer hybrid scoring engine
│   ├── message_analysis.py           # Phishing message detection
│   ├── attack_knowledge.py           # Feature-to-explanation knowledge base
│   ├── model.pkl                     # Trained Random Forest model
│   ├── requirements.txt              # Python dependencies
│   ├── scan_history.json             # URL scan history
│   ├── message_history.json          # Message scan history
│   └── deepfake_history.json         # Deepfake scan history
│
├── frontend/                         # React dashboard (Vite)
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── App.jsx                   # Main app — 3-tab dashboard
│       ├── style.css                 # Global styles (dark/light themes)
│       └── components/
│           ├── MetricCards.jsx        # URL scan KPI cards
│           ├── DfMetricCards.jsx      # Deepfake scan KPI cards
│           ├── TrendChart.jsx         # Risk trend line chart
│           ├── DistributionChart.jsx  # Threat classification chart
│           ├── ActivityLog.jsx        # URL scan history table
│           ├── MessageActivityLog.jsx # Message scan history table
│           ├── DeepfakeActivityLog.jsx# Deepfake scan history table
│           ├── ScanModal.jsx          # URL scan detail modal
│           ├── MessageDetailModal.jsx # Message scan detail modal
│           ├── DeepfakeDetailModal.jsx# Deepfake scan detail modal
│           ├── MessageScanner.jsx     # Message input scanner
│           ├── DeepfakeScanner.jsx    # File upload deepfake scanner
│           ├── ThreatIntel.jsx        # Threat intelligence view
│           ├── demoData.js            # Demo URL scan data
│           ├── dfDemoData.js          # Demo deepfake scan data
│           └── featureMeta.js         # Feature metadata definitions
│
├── chrome-extension/                 # Chrome Extension (Manifest V3)
│   ├── manifest.json
│   ├── background.js                 # Service worker — analysis + Vapi calls
│   ├── content.js                    # Content script — banners, form guard, lock
│   ├── popup.html / popup.js         # Extension popup UI
│   ├── log.html / log.js             # Activity log page
│   └── icons/
│
├── datasets/                         # Training datasets
│   ├── raw_dataset.csv
│   ├── testing_dataset.csv
│   ├── train_validation_dataset.csv
│   └── transformed_dataset.csv
│
├── models/                           # Trained model files
│   └── tuned_model.joblib
│
├── training/                         # Model training scripts
│   └── train.py
│
└── visualizations/                   # Feature distribution & correlation plots
```

---

## API Endpoints

All endpoints are served by the Flask backend on `http://localhost:5001`.

### URL Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/predict` | Analyze a URL for phishing risk. Accepts JSON `{ "url": "...", "dom": {...} }` |
| `GET` | `/history` | Retrieve all URL scan history |
| `DELETE` | `/history` | Clear URL scan history |

### Message Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/analyze-message` | Analyze a message/email for phishing. Accepts JSON `{ "message": "..." }` |
| `GET` | `/message-history` | Retrieve message scan history |
| `DELETE` | `/message-history` | Clear message scan history |

### Deepfake Detection
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/analyze-deepfake` | Analyze a media file. Accepts `multipart/form-data` with a `file` field |
| `GET` | `/deepfake-history` | Retrieve deepfake scan history |
| `DELETE` | `/deepfake-history` | Clear deepfake scan history |

### Utility
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Service info and available endpoints |
| `GET` | `/health` | Health check (model status, NLP status) |

---

## Scoring System

### URL Phishing Score
```
final_score = 0.40 × url_model_score      (Random Forest)
            + 0.30 × structural_score      (DOM analysis: forms, passwords, iframes)
            + 0.30 × content_nlp_score      (DistilBERT or keyword fallback)
```
- **>= 70%** → High Risk (red)
- **40–69%** → Medium Risk (yellow)
- **< 40%** → Low Risk (green)

### Message Phishing Score
```
final_score = 0.70 × nlp_score + 0.30 × heuristic_keyword_score
```

### Deepfake Score
```
final_score = fusion_alpha × video_score + fusion_beta × audio_score
```
- **>= 65%** → Deepfake
- **35–64%** → Uncertain
- **< 35%** → Authentic (Real)

---

## Getting Started

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** and npm
- **Google Chrome** (for the extension)

### 1. Backend Setup

```bash
cd backend

# Create virtual environment (recommended)
python -m venv .venv
source .venv/bin/activate      # Linux/Mac
# .venv\Scripts\activate       # Windows

# Install dependencies
pip install -r requirements.txt

# Start the server
python app.py
```

The backend starts on `http://localhost:5001`. On first launch it loads the Random Forest model and optionally downloads the DistilBERT NLP model (requires internet).

> **Note:** The system works without PyTorch/Transformers installed — it falls back to keyword-based heuristic analysis for NLP scoring.

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The dashboard opens at `http://localhost:5173` (Vite default).

### 3. Chrome Extension Setup

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked** and select the `chrome-extension/` folder
4. The KavachX shield icon appears in your toolbar
5. (Optional) Click the extension icon → Settings → Enter your phone number for Vapi voice alerts

---

## Dashboard Tabs

### URL Analysis
- Enter a URL in the scanner to get a hybrid phishing risk score
- View KPI metrics: Total Scans, Threats Detected, Safe URLs, Average Risk
- Risk trend chart and threat distribution breakdown
- Sortable activity log with detailed scan modals
- Threat intelligence panel with feature-level explanations

### Message Analysis
- Paste a suspicious message, email, or SMS text
- Detects urgency, credential harvesting, impersonation, financial scams, AI-generated content
- Shows detected indicators with actionable recommendations
- Full history with filterable activity log

### Deepfake Detective
- Upload video or audio files for deepfake analysis
- Video analysis: frame-level manipulation scoring, face detection
- Audio analysis: pitch stability, breath patterns, spectral flatness, frequency cutoff
- Fusion scoring with configurable video/audio weights
- Detailed modal with anomaly cards and key findings

---

## Chrome Extension Features

### Automatic Page Protection
The extension automatically analyzes every page you visit:
- **Green badge** — Safe page
- **Yellow badge** — Medium risk, warning banner displayed
- **Red badge** — High risk, form guard activated

### Form Guard
When a page scores >= 70% phishing risk, the extension intercepts password form submissions and shows a full-screen confirmation overlay before allowing credentials to be entered.

### Security Lock
After a Vapi voice call confirms a high-risk page, a full-screen security lock overlay blocks all interaction with the page. Users can choose to go back to safety or bypass the lock.

### Vapi Voice Alert
When a URL scores >= 70%, the extension triggers an automated phone call via Vapi.ai to warn the user about the phishing threat in real time.

---

## ML Model Details

### URL Classifier — Random Forest
- **Algorithm**: Random Forest Classification (scikit-learn)
- **Training data**: 11,430 URLs (50% phishing, 50% legitimate)
- **Split**: 70% training, 30% testing
- **Features**: 21 total (6 structural + 15 statistical)
- **Performance**:
  ```
  Accuracy:  90.26%
  Precision: 89.89%
  Recall:    90.73%
  ```
- **Structural features**: IP address, HTTPS token, prefix/suffix, shortening service, domain brand match, suspicious TLD, statistical report
- **Statistical features**: URL length, hostname length, path length, query length, number of dots/hyphens/underscores/slashes/query params, path-level/host-level word averages, character continuity

### NLP Classifier — DistilBERT
- **Model**: `cybersectony/phishing-email-detection-distilbert_v2.4.3` (HuggingFace)
- **Task**: Binary text classification (phishing vs legitimate)
- **Fallback**: Keyword-based heuristic scoring when the model is unavailable

---

## Data Source

The URL training dataset is sourced from the open-source research by Abdelhakim Hannousse and Salima Yahiouche (2021): [Web page phishing detection](https://data.mendeley.com/datasets/c2gw7fy2j4/3) ([study](https://arxiv.org/abs/2010.12847)).

---

## Theme Support

The dashboard supports both **dark mode** and **light mode**, togglable via the theme switch in the header. All components, charts, and modals adapt to the selected theme.

---

## License

This project is for educational and research purposes.

## Acknowledgements

- URL dataset: [Hannousse & Yahiouche (2021)](https://data.mendeley.com/datasets/c2gw7fy2j4/3)
- NLP model: [cybersectony/phishing-email-detection-distilbert](https://huggingface.co/cybersectony/phishing-email-detection-distilbert_v2.4.3)
- Voice alerts: [Vapi.ai](https://vapi.ai)
