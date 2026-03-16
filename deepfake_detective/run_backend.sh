#!/bin/bash
# Start Deepfake Detective Backend API
# Run in terminal before starting Streamlit dashboard

cd "$(dirname "$0")/backend"
python app.py
