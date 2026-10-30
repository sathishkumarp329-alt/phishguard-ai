# PhishGuard AI — Advanced Phishing Website Detection & Protection Platform

<div align="center">

**"Detect Threats. Browse with Confidence."**

An enterprise-grade cybersecurity web application and real-time navigation defense engine designed to identify phishing websites, fraudulent login pages, lookalike domains, malicious redirects, and weaponized links embedded in PDFs, Word documents, images, and QR codes.

</div>

---

## 📸 System Architecture & Visual Identity

The interface follows a modern dark cybersecurity theme:
- **Dark Navy / Deep Blue Backgrounds**: `#0a0e27`, `#0d1137`, `#111540`, `#161b40`
- **Cyan & Violet Accents**: `#00d4ff` (cyan) and `#7c3aed` (violet)
- **Real-Time Defense Warning**: Full-screen red barrier with glowing shield alert matching the **"DANGEROUS WEBSITE DETECTED"** design.
- **Cross-Platform Responsive**: Flawless layout across desktops, laptops, tablets, and Android mobile browsers.

```
phishguard-ai/
├── backend/                     # Python 3.10+ FastAPI detection & API server
│   ├── app/
│   │   ├── api/v1/              # Versioned API routes (auth, scans, dashboard, users, admin, feedback)
│   │   ├── core/                # Configuration, Argon2id security, JWT, rate limiters
│   │   ├── db/                  # SQLAlchemy 2.0 async engine & session management
│   │   ├── detection/           # 10 modular inspection engines (SSRF, heuristics, rules, threat intel)
│   │   ├── file_processing/     # Document & QR decoders (PDF, DOCX, TXT, CSV, Images)
│   │   ├── ml/                  # Random Forest ML classifier, feature extraction & model card
│   │   ├── models/              # SQLAlchemy models (User, Scan, ScanFinding, FileScan, AuditLog)
│   │   ├── schemas/             # Pydantic v2 schemas
│   │   └── services/            # Business logic orchestration
│   ├── alembic/                 # Database migrations
│   └── tests/                   # Automated pytest suite (detection, SSRF, auth, scans)
│
├── frontend/                    # React 18 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/          # Reusable UI library (UrlScanner, Navbar, Footer, DashboardLayout, Cards)
│   │   ├── contexts/            # AuthContext (session state & httpOnly cookie integration)
│   │   ├── pages/               # 13 complete pages (Home, Login, Signup, Dashboard, Scanner, Batch, History, etc.)
│   │   └── services/            # Axios API client
│
├── extension/                   # Chromium / Edge Manifest V3 Browser Extension
│   ├── manifest.json
│   ├── background.js            # Pre-navigation interception & heuristic cache
│   ├── warning/                 # Full-page "DANGEROUS WEBSITE DETECTED" screen
│   ├── popup/                   # Protection toggle, telemetry stats, quick scan
│   └── options/                 # Backend endpoint & managed allowlist
│
├── docs/                        # Architecture guides
│   ├── ANDROID_PLAN.md          # Mobile PWA, Share-to-Scan, and VPN DNS architecture
│   └── EXTENSION.md            # Browser extension installation & testing guide
│
├── render.yaml                  # 1-Click Render Cloud Blueprint (API + React + PostgreSQL)
├── Dockerfile.backend           # Containerized FastAPI server
├── Dockerfile.frontend          # Multi-stage Nginx container
├── docker-compose.yml           # Full-stack local orchestration
├── .env.example                 # Environment template
└── .github/workflows/ci.yml     # Automated CI testing pipeline
```

---

## 🚀 Quickstart: Local Development

### 1. Prerequisites
- **Python**: 3.10 or higher
- **Node.js**: v18 or higher (with npm)
- **Git**

### 2. Backend Setup
```bash
# Navigate to backend directory
cd phishguard-ai/backend

# Create and activate virtual environment
python -m venv venv
# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# On macOS / Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI development server (defaults to local SQLite database)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Backend API will be live at: `http://localhost:8000`  
Interactive OpenAPI documentation: `http://localhost:8000/docs`

### 3. Frontend Setup
In a new terminal window:
```bash
# Navigate to frontend directory
cd phishguard-ai/frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 📦 How to Push to Your GitHub Repository

Follow these step-by-step commands to push this codebase to your own GitHub account:

### Step 1: Create a New Repository on GitHub
1. Go to [github.com/new](https://github.com/new).
2. Set Repository name to `phishguard-ai`.
3. Choose **Public** or **Private**.
4. Leave "Add a README", ".gitignore", and "License" unchecked (we have already created them).
5. Click **"Create repository"**.

### Step 2: Initialize Git and Push from Local Machine
In your terminal at the project root (`phishguard-ai`):
```bash

# Initialize git repository
git init

# Add all files to staging
git add .

# Create the initial commit
git commit -m "feat: initial commit of PhishGuard AI platform with real-time browser extension and render blueprint"

# Rename branch to main
git branch -M main

# Add your GitHub repository as remote origin (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/phishguard-ai.git

# Push the codebase to GitHub
git push -u origin main
```

---

## ☁️ How to Deploy on Render Cloud

This project includes a native `render.yaml` Blueprint that automatically provisions:
1. **`phishguard-db`**: Managed PostgreSQL database.
2. **`phishguard-api`**: FastAPI Web Service with automated migrations, rate limiting, and CORS.
3. **`phishguard-frontend`**: React Single Page Application (SPA) with automatic URL rewriting.

### Method A: 1-Click Render Blueprint (Recommended)
1. Push your code to GitHub (as outlined above).
2. Log in to [dashboard.render.com](https://dashboard.render.com/).
3. In the top navigation, click **"New +"** and select **"Blueprint"**.
4. Connect your GitHub account and select your `phishguard-ai` repository.
5. Render will automatically detect the `render.yaml` file and display the planned resources (`phishguard-db`, `phishguard-api`, and `phishguard-frontend`).
6. Click **"Apply"**.
7. Render will build and deploy the entire stack automatically!

### Method B: Manual Service Creation on Render
If you prefer creating services individually:

#### 1. PostgreSQL Database
- **New +** -> **PostgreSQL**
- Name: `phishguard-db`
- Plan: Free
- Copy the **Internal Database URL** once created.

#### 2. Backend Web Service
- **New +** -> **Web Service** -> Connect GitHub repo
- Root Directory: `backend`
- Environment: `Python 3`
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Environment Variables:
  - `DATABASE_URL`: Paste your PostgreSQL connection URL
  - `SECRET_KEY`: Generate a random 64-char string (e.g. `openssl rand -hex 32`)
  - `ENVIRONMENT`: `production`
  - `COOKIE_SECURE`: `true`
  - `COOKIE_SAMESITE`: `none`
  - `CORS_ORIGINS`: `["https://phishguard-frontend.onrender.com", "http://localhost:5173"]`

#### 3. Frontend Static Site
- **New +** -> **Static Site** -> Connect GitHub repo
- Root Directory: `frontend`
- Build Command: `npm install && npm run build`
- Publish Directory: `dist`
- Redirects/Rewrites:
  - Add Rule: `/*` -> `/index.html` (Rewrite)
- Environment Variables:
  - `VITE_API_BASE_URL`: `https://phishguard-api.onrender.com/api/v1`

---

## 🛡️ Desktop Browser Extension Installation

1. Open **Google Chrome**, **Microsoft Edge**, or **Brave**.
2. Navigate to:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
3. Enable **"Developer mode"** toggle in the top right.
4. Click **"Load unpacked"**.
5. Select the `phishguard-ai/extension` folder.
6. The extension is now active! Test navigation to:
   - `http://192.168.1.1/login` or `http://paypal-fake-login.xyz`
   - PhishGuard AI will immediately halt navigation and display the full-page **DANGEROUS WEBSITE DETECTED** warning screen.

---

## 🧪 Running Automated Tests

Run the backend test suite:
```bash
cd backend
pytest -v tests/test_detection.py tests/test_ssrf.py
```

### Verified Test Cases:
- **SSRF Defenses**: Detects and blocks loopback (`127.0.0.1`), RFC 1918 private subnets (`10.x`, `172.16-31.x`, `192.168.x`), and cloud instance metadata (`169.254.169.254`).
- **Detection Heuristics**: Validates URL lexical feature vectors, homoglyphs, brand spoofing, and multi-vector risk synthesis.
- **Threat Intelligence**: Overrides risk score to `known_malicious` when external threat engines report confirmed detections.

---

## 📄 License & Security Disclaimers
This project is open-source under the MIT License. Read [SECURITY.md](SECURITY.md) and [PRIVACY.md](PRIVACY.md) for vulnerability reporting and data handling protocols.
