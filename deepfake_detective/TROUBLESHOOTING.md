# ❌ "Cannot reach API" Troubleshooting Guide

**Error Message:** "Cannot reach API — is backend running on http://localhost:5002?"

This error appears when the Chrome extension cannot connect to the Flask backend API. Let's fix it step-by-step.

---

## 🔧 Quick Fix (5 minutes)

### Step 1: Check if Backend is Running

Open **Command Prompt** or **PowerShell** and run:

```bash
# Check if port 5002 is being used
netstat -ano | findstr :5002
```

**If you see output:** Port 5002 is in use ✓ (skip to Step 2)
**If no output:** Backend is NOT running (go to Step 3)

---

### Step 2: Verify API is Responding

If port 5002 is open, test the API:

```bash
curl http://localhost:5002/health
```

**Expected response:**
```json
{
  "status": "ok",
  "video_model_loaded": true,
  "audio_model_loaded": true,
  "fusion_mode": true,
  "demo_max_seconds": 10
}
```

**If you get a response:** API is OK ✓ (problem is elsewhere)
**If error or no response:** API is stuck (restart it)

---

### Step 3: Start the Backend

**Option A: Using the startup script**

1. Open **PowerShell** or **Command Prompt**
2. Navigate to project:
   ```bash
   cd e:\projects\kavach\kavach-main\deepfake_detective
   ```
3. Run:
   ```bash
   .\run_backend.sh
   ```

**Option B: Manual startup**

```bash
cd e:\projects\kavach\kavach-main\deepfake_detective\backend
python app.py
```

**Expected output:**
```
[INFO] Starting Deepfake Detective API on port 5002...
[INFO] Video detector initialized
[INFO] Audio detector initialized
[INFO] Flask app running on http://localhost:5002
* Running on http://127.0.0.1:5002
```

**If you see this:**
✅ Backend is running successfully!
Continue to Step 4.

---

### Step 4: Reload Chrome Extension

1. Open Chrome
2. Go to: `chrome://extensions/`
3. Find **"Deepfake Detective"**
4. Click the **Reload** button (circular arrow)

After reloading, the extension should connect to the API.

---

### Step 5: Test the Extension

1. Click the **Deepfake Detective** icon (🔍) in your toolbar
2. Upload a test video or audio file
3. Click **"Analyze Video"** or **"Analyze Audio"**

**Success!** ✓ You should see results in 15-30 seconds

---

## 🐛 Detailed Troubleshooting

### Problem: Port 5002 Already in Use

**Error message:**
```
OSError: [Errno 10048] Only one usage of each socket address...
```

**Solution:**

Find and stop the process using port 5002:

1. Find the process:
   ```bash
   netstat -ano | findstr :5002
   ```

2. Get the PID (number at the end of the line)

3. Kill the process:
   ```bash
   taskkill /PID <PID> /F
   ```
   (Replace `<PID>` with the actual number)

4. Restart the backend:
   ```bash
   .\run_backend.sh
   ```

---

### Problem: "ModuleNotFoundError: No module named 'torch'"

**Solution:**

Install dependencies:

```bash
pip install -r requirements.txt
```

This installs PyTorch, Flask, OpenCV, and all other ML libraries.

Wait 5-10 minutes for installation to complete.

---

### Problem: Extension Still Shows "Cannot reach API"

**Checklist:**

- [ ] Backend is running in a terminal window (shows `Running on http://127.0.0.1:5002`)
- [ ] Port 5002 is open: `netstat -ano | findstr :5002`
- [ ] API responds: `curl http://localhost:5002/health`
- [ ] Chrome extension is reloaded: `chrome://extensions/` → Reload button
- [ ] Firewall allows localhost:5002 (Windows Defender → Allow app through firewall)
- [ ] No VPN/proxy blocking localhost

If all checks pass but still getting error:

```bash
# Check Chrome console for detailed error
# Right-click extension popup → "Inspect"
# Look for JavaScript errors in Console tab
```

---

### Problem: API Starts but Crashes

**Error in terminal:**
```
RuntimeError: CUDA error: out of memory
```

**Solution:**

Models require GPU memory. If you don't have GPU:

1. Edit `config.py`:
   ```python
   # Change this line:
   # (It should already be set to auto-detect)
   ```

2. Run backend with CPU explicitly:
   ```bash
   set CUDA_VISIBLE_DEVICES=-1
   python backend/app.py
   ```

If still crashing, reduce model complexity in `config.py`:
```python
MC_DROPOUT_RUNS = 5  # Instead of 10 (faster, less memory)
MAX_SECONDS = 5      # Instead of 10 (faster analysis)
```

---

### Problem: Analysis Hangs (No Response After 60+ seconds)

**Cause:** Usually happens with large files or slow hardware

**Solution:**

1. **Stop the current analysis:** Close the extension popup
2. **Use a smaller file:** Test with a 5-second video instead
3. **Increase timeout** in `popup.js`:
   ```javascript
   // Around line 137, change fetch timeout:
   timeout: 180000  // 3 minutes instead of default
   ```

---

## 🔍 Advanced Diagnostics

### Test API Endpoints Directly

```bash
# Test video analysis with a file
curl -X POST http://localhost:5002/analyze -F "file=@your_video.mp4"

# Test audio analysis with a file
curl -X POST http://localhost:5002/analyze-audio -F "file=@your_audio.wav"

# Get scan history
curl http://localhost:5002/history

# Clear history
curl -X DELETE http://localhost:5002/history
```

---

### Check API Logs

The backend terminal shows detailed logs:

```
[INFO] Analyzing video...
[DEBUG] Frame count: 10
[DEBUG] Faces detected: True
[DEBUG] Video score: 0.87
[DEBUG] Generating Grad-CAM...
[INFO] Analysis complete (took 18.5 seconds)
```

Look for `[ERROR]` or `[WARNING]` messages:

- `[ERROR] Model not loaded` → Run `python verify_setup.py`
- `[ERROR] CUDA out of memory` → Reduce batch size or use CPU
- `[ERROR] File corrupted` → Test with different file format

---

## 📋 Pre-Demo Checklist

Before using in hackathon:

```
□ Dependencies installed: pip install -r requirements.txt
□ Setup verified: python verify_setup.py
□ Backend runs: ./run_backend.sh (no errors)
□ API healthy: curl http://localhost:5002/health
□ Extension loads: chrome://extensions (no red errors)
□ Extension connects: Click icon → no "Cannot reach" error
□ Test file ready: MP4 video or WAV audio (5-30 MB)
□ Test analysis works: Upload → Analyze → Get results (15-30s)
□ Chrome reloads:Just in case, know how to reload extension
```

---

## 🆘 Still Having Issues?

If nothing above works:

1. **Full reset:**
   ```bash
   # Kill all Python processes
   taskkill /F /IM python.exe

   # Clear Chrome cache
   chrome://settings/clearBrowserData (check "All time")

   # Reinstall dependencies
   pip install -r requirements.txt --force-reinstall

   # Restart backend
   ./run_backend.sh
   ```

2. **Check system resources:**
   - Open Task Manager (Ctrl+Shift+Esc)
   - Check CPU usage (should still have >20% available)
   - Check RAM usage (should have >1GB free)
   - Check Disk space (need >500MB free)

3. **Check network:**
   - Firewalls/Antivirus blocking localhost
   - VPN active (disable while testing)
   - Network drive issues (run from C: drive, not network path)

---

## ✅ Success Indicators

When everything is working:

✓ Backend terminal shows: `Running on http://127.0.0.1:5002`
✓ `curl http://localhost:5002/health` returns JSON
✓ Extension popup loads without errors
✓ Upload form appears
✓ Analyze button works
✓ Results appear after 15-30 seconds
✓ Browser notification pops up
✓ Extension badge updates (green/yellow/red)

---

## 🎯 Quick Commands Reference

```bash
# Start backend
./run_backend.sh

# Check if API is running
curl http://localhost:5002/health

# Kill process on port 5002
lsof -i :5002 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Reinstall dependencies
pip install -r requirements.txt --upgrade --force-reinstall

# Verify setup
python verify_setup.py

# Check API logs (in separate terminal)
curl -v http://localhost:5002/health

# Test extension connection
python -c "import urllib.request; urllib.request.urlopen('http://localhost:5002/health')"
```

---

**Still stuck?** Check the backend terminal for detailed error messages — they tell you exactly what's wrong! 🚀
