#!/bin/bash
# Start Deepfake Detective Streamlit Dashboard
# Make sure backend is running first!

cd "$(dirname "$0")"
streamlit run frontend/dashboard.py -- --logger.level=warning
