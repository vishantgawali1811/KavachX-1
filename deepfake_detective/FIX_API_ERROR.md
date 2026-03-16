# 🔴 CHROME EXTENSION: "Cannot reach API" - QUICK FIX

**Getting error?** "Cannot reach API — is backend running on http://localhost:5002?"

**Don't worry!** The extension is working, the backend just isn't running yet. **Follow these 3 steps:**

---

## ✅ FIX #1: START THE BACKEND (30 seconds)

### On Windows:

**Option A: Double-click the batch file (EASIEST)**

1. Navigate to: `e:\projects\kavach\kavach-main\deepfake_detective\`
2. **Double-click** `run_backend.bat` ← This opens the server in a new window

Wait for the output to show:
```
Running on http://127.0.0.1:5002
```

**Option B: Use PowerShell/Command Prompt**

```bash
cd e:\projects\kavach\kavach-main\deepfake_detective
.\run_backend.sh
```

Or manually:
```bash
cd e:\projects\kavach\kavach-main\deepfake_detective\backend
python app.py
```

**Expected output:**
```
[INFO] Starting Deepfake Detective API on port 5002 ...
[INFO] Video detector loaded
[INFO] Audio detector loaded
 * Running on http://127.0.0.1:5002
```

✅ **Backend is now running!**

---

## ✅ FIX #2: RELOAD THE CHROME EXTENSION (15 seconds)

1. Open Chrome
2. Go to: `chrome://extensions/`
3. Find **"Deepfake Detective"**
4. Click the **Reload** button (↻ circular arrow)

---

## ✅ FIX #3: TEST THE EXTENSION (60 seconds)

1. Click the **Deepfake Detective icon** 🔍 in your toolbar (top-right)
2. The popup should open with **NO error message**
3. Drop/upload a video or audio file
4. Click **"Analyze Video"** or **"Analyze Audio"**
5. Wait 15-30 seconds for results

**Success!** ✓ You should see the deepfake risk score and verdict

---

## 🆘 BACKEND WON'T START?

### Error: "Python not found" or "python: command not found"

**Solution:** Make sure Python is installed

```bash
python --version
```

If not installed:
1. Download Python 3.10+ from https://www.python.org
2. During installation, **CHECK** "Add Python to PATH"
3. Restart terminal/Command Prompt
4. Try starting the backend again

---

### Error: "Port 5002 already in use"

**Solution:** Kill the existing process

```bash
# Find what's using port 5002
netstat -ano | findstr :5002

# Note the PID number (rightmost column)

# Kill it
taskkill /PID YOUR_PID_HERE /F
```

Then restart the backend.

---

### Error: "ModuleNotFoundError: No module named 'torch'"

**Solution:** Install dependencies

```bash
cd e:\projects\kavach\kavach-main\deepfake_detective
pip install -r requirements.txt
```

This must complete successfully before backend can run.

---

## 🔍 VERIFY EVERYTHING IS WORKING

Run this diagnostic script to check everything at once:

```bash
cd e:\projects\kavach\kavach-main\deepfake_detective
python diagnose.py
```

This will show:
- Python version ✓
- Dependencies installed ✓
- Port 5002 status ✓
- API health ✓
- File checks ✓

---

## ⚡ COMPLETE CHECKLIST

Before opening the extension:

```
[ ] Backend is running (you can see terminal/CMD window)
[ ] Backend shows: "Running on http://127.0.0.1:5002"
[ ] No errors in backend terminal
[ ] Chrome extension is reloaded (refresh button clicked)
[ ] You clicked the Deepfake Detective icon
[ ] No "Cannot reach API" error appears
```

---

## 🎯 THE MOST COMMON FIX

**99% of "Cannot reach API" errors are solved by:**

```
1. Open PowerShell/Command Prompt
2. cd e:\projects\kavach\kavach-main\deepfake_detective
3. Run:  .\run_backend.bat
4. Wait 5 seconds for "Running on http://127.0.0.1:5002"
5. Go to chrome://extensions/ and reload extension
6. Click extension icon → should work now!
```

That's it! 🚀

---

## 📞 STILL STUCK?

1. **Backend won't start?**
   - Check: `pip install -r requirements.txt`
   - Check: Port 5002 is free
   - Check: Python is installed (`python --version`)

2. **Extension still shows error?**
   - Backend terminal must be OPEN (don't close it)
   - Try: Hard refresh Chrome (Ctrl+Shift+R)
   - Try: Reload extension from `chrome://extensions/`

3. **Get detailed errors:**
   - Run: `python diagnose.py`
   - Check backend terminal for error messages
   - Share those errors and we can fix them

---

## 🎓 Understanding the Setup

```
Chrome Extension
    ↓ (calls)
Backend API (Port 5002)
    ↓ (loads)
ML Models (video + audio detection)
    ↓ (returns)
Analysis Results
    ↓ (displays)
Chrome Extension Shows Verdict
```

If the extension can't reach the API, **nothing else works**. So that's step #1.

---

**Need help?** Check the terminal where you started the backend — it shows detailed error messages that explain exactly what's wrong! 🔍

Good luck! 🚀
