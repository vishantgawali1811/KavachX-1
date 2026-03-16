#!/bin/bash
# Deepfake Detective - Quick Diagnostics
# Checks if backend API is running and reachable

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Deepfake Detective - Backend Health Check                    ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check if port 5002 is in use
echo "[1] Checking if port 5002 is open..."
if netstat -ano | findstr :5002 > /dev/null 2>&1; then
    echo "✓ Port 5002 is OPEN (something is listening)"
else
    echo "✗ Port 5002 is CLOSED"
    echo "   → Backend API is NOT running"
    echo "   → Start it with: ./run_backend.sh"
    exit 1
fi

echo ""

# Try to reach the API
echo "[2] Attempting to connect to API..."
if curl -s http://localhost:5002/health > /dev/null 2>&1; then
    echo "✓ API is REACHABLE"

    # Get health status
    echo ""
    echo "[3] Checking API status..."
    curl -s http://localhost:5002/health | python -m json.tool

    echo ""
    echo "✓✓✓ Backend API is healthy and ready to use!"
    echo ""
    echo "Next steps:"
    echo "  1. Reload the Chrome extension (chrome://extensions/)"
    echo "  2. Click Deepfake Detective icon"
    echo "  3. Upload a video or audio file"
    echo "  4. Click 'Analyze'"
else
    echo "✗ API is NOT REACHABLE"
    echo "   → Port 5002 is open but API not responding"
    echo "   → Possible fixes:"
    echo "     a) Restart backend: ./run_backend.sh"
    echo "     b) Check firewall settings"
    echo "     c) Ensure Python dependencies are installed"
    exit 1
fi
