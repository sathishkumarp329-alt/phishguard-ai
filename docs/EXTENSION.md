# PhishGuard AI — Browser Extension Installation & Developer Guide

## 1. Overview
The PhishGuard AI Browser Extension provides **Automatic Real-Time Phishing Protection** for Google Chrome, Microsoft Edge, Brave, and other Chromium-based browsers using **Manifest V3**.

It actively intercepts suspicious navigations before the destination website loads, analyzes destination threat vectors against the PhishGuard AI detection engine, and displays a full-page **"DANGEROUS WEBSITE DETECTED"** barrier.

---

## 2. Key Capabilities
- **Pre-Navigation Interception**: Leverages `chrome.webNavigation.onBeforeNavigate` to inspect URLs before pages render.
- **Sub-Millisecond Heuristic Cache**: High-performance in-memory cache + local heuristic rules ensure zero browsing slowdown on safe websites.
- **Full-Page Warning Screen**: Renders the exact cybersecurity alert layout with:
  - Red pulsing shield alert
  - Detected risk tier (Known Malicious, High Risk)
  - Forensic reasoning
  - "Return to Safety", "View Detection Details", and "Report Mistake" buttons.
- **User-Managed Allowlist**: Manage trusted domains directly in options.
- **Zero Credential / Data Storage**: Does not store or inspect web page content, passwords, or cookies.

---

## 3. Installation Guide (Developer Mode)

### Step 1: Locate the Extension Directory
The extension source files are situated in:
```
phishguard-ai/extension/
├── manifest.json
├── background.js
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── warning/
│   ├── warning.html
│   ├── warning.css
│   └── warning.js
├── options/
│   ├── options.html
│   ├── options.css
│   └── options.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Step 2: Load into Google Chrome / Microsoft Edge
1. Open your browser and navigate to:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
2. Toggle on **"Developer mode"** in the top right corner.
3. Click the **"Load unpacked"** button.
4. Select the `phishguard-ai/extension` folder.
5. The extension will appear with the PhishGuard AI shield icon in your browser toolbar!

---

## 4. Configuration & Settings
1. Click the PhishGuard AI extension icon in your browser toolbar to open the popup.
2. Click the gear icon (**⚙️**) to access the Options Page.
3. Configure your API endpoint:
   - Local Development: `http://localhost:8000/api/v1`
   - Render Cloud Deployment: `https://<your-backend-app>.onrender.com/api/v1`
4. Set your sensitivity threshold (Strict: 50, Balanced: 70, Relaxed: 85).
5. Click **"Save Changes"**.

---

## 5. Verification & Testing
To safely test the extension without visiting real malicious websites:
1. Open your browser and navigate to: `http://192.168.1.1/login` or `http://secure-login-fake-bank.xyz`
2. PhishGuard AI will intercept navigation immediately and display the **DANGEROUS WEBSITE DETECTED** warning screen.
3. Click **"View Detection Details"** to view risk telemetry.
4. Click **"Return to Safety"** to safely exit.
