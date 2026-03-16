@echo off
REM Deepfake Detective - Backend API Startup (Windows)
REM Starts the Flask backend server on port 5002

setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║  Deepfake Detective - Backend API Server                       ║
echo ║  Starting Flask on http://localhost:5002                       ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

REM Navigate to backend directory
cd /d "%~dp0backend"

if not exist "app.py" (
    echo ERROR: app.py not found in backend directory!
    echo Current directory: %cd%
    echo Expected location: %~dp0backend\app.py
    pause
    exit /b 1
)

echo [INFO] Backend directory: %cd%
echo [INFO] Starting Python Flask server...
echo.

REM Start the backend
python app.py

if errorlevel 1 (
    echo.
    echo ERROR: Backend failed to start!
    echo.
    echo Possible issues:
    echo   1. Python not installed or not in PATH
    echo   2. Dependencies missing - run: pip install -r requirements.txt
    echo   3. Port 5002 already in use
    echo.
    echo To fix port 5002 conflicts:
    echo   netstat -ano ^| findstr :5002
    echo   Then kill the process: taskkill /PID [number] /F
    echo.
    pause
    exit /b 1
)
