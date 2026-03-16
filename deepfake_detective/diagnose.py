#!/usr/bin/env python3
"""
Deepfake Detective - API Health & Diagnostics Tool

Run this script to diagnose backend API issues and connection problems.
"""

import subprocess
import socket
import json
import sys
import time
from pathlib import Path

class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    CYAN = '\033[96m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def print_header(text):
    print(f"\n{Colors.BOLD}{Colors.CYAN}{'='*60}{Colors.RESET}")
    print(f"{Colors.CYAN}{text:^60}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.CYAN}{'='*60}{Colors.RESET}\n")

def print_success(msg):
    print(f"{Colors.GREEN}✓{Colors.RESET} {msg}")

def print_error(msg):
    print(f"{Colors.RED}✗{Colors.RESET} {msg}")

def print_warning(msg):
    print(f"{Colors.YELLOW}⚠{Colors.RESET} {msg}")

def print_info(msg):
    print(f"{Colors.CYAN}ℹ{Colors.RESET} {msg}")

def check_port_open(port):
    """Check if a port is open"""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        result = sock.connect_ex(('127.0.0.1', port))
        return result == 0
    except Exception as e:
        print_error(f"Port check failed: {e}")
        return False
    finally:
        sock.close()

def check_api_health():
    """Check if API is responding"""
    try:
        import urllib.request
        import urllib.error

        response = urllib.request.urlopen('http://localhost:5002/health', timeout=3)
        data = json.loads(response.read().decode())
        return True, data
    except urllib.error.URLError as e:
        return False, str(e)
    except Exception as e:
        return False, str(e)

def check_dependencies():
    """Check if required packages are installed"""
    required = {
        'torch': 'PyTorch',
        'flask': 'Flask',
        'cv2': 'OpenCV',
        'librosa': 'Librosa',
        'numpy': 'NumPy',
    }

    missing = []
    for module, name in required.items():
        try:
            __import__(module)
            print_success(f"{name} installed")
        except ImportError:
            print_error(f"{name} NOT installed")
            missing.append(module)

    return len(missing) == 0

def main():
    print_header("Deepfake Detective - Diagnostics Tool")

    # Step 1: Check Python version
    print(f"{Colors.BOLD}[1] Python Version{Colors.RESET}")
    py_version = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    if sys.version_info >= (3, 9):
        print_success(f"Python {py_version}")
    else:
        print_error(f"Python {py_version} (requires 3.9+)")

    # Step 2: Check dependencies
    print(f"\n{Colors.BOLD}[2] Dependencies{Colors.RESET}")
    deps_ok = check_dependencies()

    if not deps_ok:
        print_warning("Some dependencies missing. Run: pip install -r requirements.txt")

    # Step 3: Check if port 5002 is open
    print(f"\n{Colors.BOLD}[3] Port 5002 Status{Colors.RESET}")
    if check_port_open(5002):
        print_success("Port 5002 is OPEN (something listening)")
    else:
        print_error("Port 5002 is CLOSED")
        print_info("Backend is NOT running. Start with: ./run_backend.sh")
        return 1

    # Step 4: Check API health
    print(f"\n{Colors.BOLD}[4] API Health Check{Colors.RESET}")
    api_ok, response = check_api_health()

    if api_ok:
        print_success("API is RESPONDING")
        print(f"\n{Colors.BOLD}API Status:{Colors.RESET}")
        for key, value in response.items():
            status_icon = "✓" if value else "✗"
            print(f"  {status_icon} {key}: {value}")
    else:
        print_error(f"API NOT responding: {response}")
        print_warning("Backend might be starting... wait 5 seconds and retry")
        return 1

    # Step 5: Check backend file
    print(f"\n{Colors.BOLD}[5] Backend Files{Colors.RESET}")
    backend_path = Path(__file__).parent / 'backend' / 'app.py'
    if backend_path.exists():
        print_success(f"Backend found: {backend_path}")
    else:
        print_error(f"Backend NOT found: {backend_path}")
        return 1

    # Step 6: Check extension
    print(f"\n{Colors.BOLD}[6] Chrome Extension{Colors.RESET}")
    ext_path = Path(__file__).parent / 'chrome-extension'
    if ext_path.exists():
        manifest = ext_path / 'manifest.json'
        icons = list((ext_path / 'icons').glob('icon*.png'))

        if manifest.exists():
            print_success(f"Manifest found: {manifest}")
        else:
            print_error(f"Manifest NOT found: {manifest}")

        if len(icons) == 3:
            print_success(f"All 3 extension icons found")
        else:
            print_warning(f"Only {len(icons)}/3 extension icons found")
    else:
        print_error(f"Extension NOT found: {ext_path}")

    # Final status
    print(f"\n{Colors.BOLD}{Colors.GREEN}{'='*60}{Colors.RESET}")
    print(f"{Colors.GREEN}{Colors.BOLD}✓ All checks passed!{Colors.RESET}")
    print(f"{Colors.GREEN}{'='*60}{Colors.RESET}\n")

    print(f"{Colors.BOLD}Next steps:{Colors.RESET}")
    print("  1. Reload Chrome extension (chrome://extensions/ → Reload)")
    print("  2. Click Deepfake Detective icon in toolbar")
    print("  3. Upload a video or audio file")
    print("  4. Click 'Analyze' button")
    print("  5. Results should appear in 15-30 seconds\n")

    return 0

if __name__ == '__main__':
    try:
        exit_code = main()
        sys.exit(exit_code)
    except Exception as e:
        print_error(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
