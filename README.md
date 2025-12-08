![Total Specific Solutions](TSS_logo.png)

# TSS PPM Generator

> **Inspired by an idea from Graciela, Group Head HR at Groep Piek**

A web-based HR Performance Review application for Total Specific Solutions. This tool replaces the Excel-based annual employee performance review process with a modern, user-friendly web interface.

## Features

- **9-Grid Performance Scoring** - WHAT-axis (Goals & Results) × HOW-axis (Competencies)
- **Multi-Language Support** - English, Dutch, and Spanish
- **Voice Input** - Hold-to-dictate functionality using local Whisper AI
- **Auto-Save** - Session-based with 14-day retention
- **DOCX Report Generation** - Professional, editable Word documents
- **Drag & Drop** - Reorder goals easily

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.8+ (for voice input)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd tss_ppm
   ```

2. **Install frontend dependencies**
   ```bash
   cd hr-performance-app
   npm install
   ```

3. **Set up voice input server** (optional but recommended)
   ```bash
   cd server
   setup_whisper.bat
   ```

### Running the Application

1. **Start the React app**
   ```bash
   cd hr-performance-app
   npm run dev
   ```
   Opens at http://localhost:5173

2. **Start the Whisper server** (for voice input)
   ```bash
   cd hr-performance-app/server
   start_whisper.bat
   ```
   Runs on http://localhost:3001

## Project Structure

```
tss_ppm/
├── hr-performance-app/          # React frontend
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── contexts/            # React contexts (Form, Language)
│   │   ├── hooks/               # Custom hooks (useVoiceInput)
│   │   ├── languages/           # i18n translations (en, nl, es)
│   │   └── utils/               # Utilities (scoring, session, docx)
│   ├── server/                  # Python Whisper server
│   │   ├── whisper_server_faster.py  # Production Faster-Whisper server
│   │   ├── requirements-faster.txt   # Production dependencies
│   │   ├── test_whisper.py      # Test script
│   │   ├── setup_whisper.bat    # One-time setup (legacy)
│   │   └── start_whisper.bat    # Start server (legacy)
│   └── package.json
├── docker-compose.yml           # Production deployment
├── Dockerfile.whisper           # Faster-Whisper container
├── Dockerfile.frontend          # React app container
├── nginx.conf                   # Frontend nginx config
├── Caddyfile                    # Reverse proxy config
├── HR-Scoring-App-Prompt.md     # Detailed requirements
├── IDE-Competency-Framework-Complete.md  # HOW-axis competencies
├── CLAUDE.md                    # Development guidelines
└── README.md                    # This file
```

## Scoring System

### WHAT-Axis (Goals & Results)
- Up to 9 flexible goals with drag-and-drop reordering
- Each goal: Title, Description, Score (1-3), Weight %
- Weights must sum to exactly 100%
- Score: Weighted average (1.00 - 3.00)

### HOW-Axis (Competencies)
- Based on TOV-Level selection (A/B/C/D)
- 6 competencies per level, each scored 1-3
- **VETO Rule**: If ANY competency = 1, HOW Score = 1.00

### 9-Grid Visualization
| | WHAT 1 | WHAT 2 | WHAT 3 |
|---|--------|--------|--------|
| **HOW 3** | Orange | Green | Dark Green |
| **HOW 2** | Orange | Green | Green |
| **HOW 1** | Red | Orange | Orange |

## Voice Input

The application uses a local Whisper AI server for privacy-focused speech-to-text:

- **Hold to speak** - Press and hold the microphone button
- **Release to transcribe** - Audio is processed locally
- **Multi-language** - Supports EN, NL, ES
- **Privacy** - No audio data sent to external services

First-time transcription may be slow as the model loads (~500MB).

## Technology Stack

- **Frontend**: React 18 + Vite
- **Styling**: Custom CSS with Tahoma font
- **Brand Colors**: Magenta `#CC0E70`, Navy Blue `#004A91`
- **Storage**: Browser localStorage
- **Reports**: DOCX via `docx` package
- **Voice**: Faster-Whisper + Gunicorn (4x faster than standard Whisper)

## Session Management

> **⚠️ IMPORTANT: Browser-Based Storage**
>
> Session data is stored in the **browser's localStorage**, not on the server.
>
> - ✅ Data survives browser refreshes and container restarts
> - ✅ Data persists for 14 days
> - ❌ Data is **lost** if user clears browser data
> - ❌ Data is **not shared** between browsers or devices
> - ❌ Data is **not backed up** on the server
>
> **Recommendation:** Users should download their report (DOCX) before clearing browser data or switching devices.

- Sessions are saved automatically every 2.5 seconds
- Each session has a unique 10-character code
- Sessions expire after 14 days
- Users can resume sessions using the session code (same browser only)

## Building for Production

```bash
cd hr-performance-app
npm run build
```

Output will be in the `dist/` folder.

## VPS Deployment with Docker

Step-by-step guide to deploy the application on a VPS using Docker.

### Prerequisites

- A VPS with Ubuntu 20.04+ (or similar Linux distribution)
- At least 4GB RAM (Whisper model requires ~2GB)
- SSH access to your VPS

### Step 1: Install Docker on your VPS

SSH into your VPS and run:

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Add your user to the docker group (avoids needing sudo)
sudo usermod -aG docker $USER

# Log out and back in for group changes to take effect
exit
```

SSH back in and verify Docker is working:

```bash
docker --version
docker compose version
```

### Step 2: Clone the repository

```bash
# Create a directory for the app
mkdir -p ~/apps
cd ~/apps

# Clone the repository
git clone https://github.com/SimonvanAs/tss_ppm.git
cd tss_ppm
```

### Step 3: Configure your domain

Create a `.env` file with your domain:

```bash
echo "DOMAIN=your-domain.com" > .env
```

> **Note:** Replace `your-domain.com` with your actual domain. Make sure your domain's DNS A record points to your VPS IP address.

For local testing without a domain, you can skip this step (defaults to `localhost`).

### Step 4: Build and start the containers

```bash
# Build and start in detached mode
docker compose up -d --build
```

This will:
1. Start Caddy (reverse proxy with automatic HTTPS)
2. Build the frontend container (React app served by nginx)
3. Build the Whisper container (Python speech-to-text server)
4. Download the Whisper AI model (~500MB, first time only)
5. Automatically obtain SSL certificate from Let's Encrypt

**Note:** First build takes 5-10 minutes. The Whisper model download happens during the build.

### Step 5: Verify deployment

```bash
# Check container status
docker compose ps

# View logs (Ctrl+C to exit)
docker compose logs -f

# Test the application
curl https://your-domain.com
```

The application is now available at `https://your-domain.com` with automatic HTTPS!

### Architecture

```
┌─────────────────────────────────────────────────────┐
│              Caddy (ports 80/443)                   │
│         Automatic HTTPS + Reverse Proxy             │
└─────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────┐
│                   nginx (internal)                   │
│  ┌─────────────────┐    ┌────────────────────┐      │
│  │  Static Files   │    │  /transcribe proxy │      │
│  │  (React App)    │    │  → whisper:3001    │      │
│  └─────────────────┘    └────────────────────┘      │
└─────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │   Whisper Container     │
              │   (Python + AI Model)   │
              │   Internal port: 3001   │
              └─────────────────────────┘
```

### Useful Docker Commands

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f

# View logs for specific service
docker compose logs -f frontend
docker compose logs -f whisper

# Rebuild after code changes
docker compose up -d --build

# Restart a specific service
docker compose restart frontend

# Check resource usage
docker stats
```

### Updating the Application

When you want to deploy a new version:

```bash
cd ~/apps/tss_ppm

# Pull latest changes
git pull origin master

# Rebuild and restart
docker compose up -d --build

# Clean up old images (optional)
docker image prune -f
```

### GPU Support (Optional)

For faster transcription with NVIDIA GPU:

1. Install [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html)
2. Uncomment the GPU section in `docker-compose.yml`
3. Rebuild: `docker compose up -d --build`

### Troubleshooting

**Containers not starting:**
```bash
docker compose logs
```

**Out of memory:**
- Ensure your VPS has at least 4GB RAM
- The Whisper model needs ~2GB RAM

**Port 80 already in use:**
```bash
sudo lsof -i :80
# Stop the conflicting service or change the port in docker-compose.yml
```

**Permission denied:**
```bash
# Make sure your user is in the docker group
groups $USER
# Should show: ... docker ...
```

## Security

The application implements defense-in-depth security measures appropriate for a client-side HR tool.

### Data Protection

| Aspect | Implementation |
|--------|----------------|
| **Storage** | Browser localStorage only - data never leaves user's device |
| **Encryption** | Not encrypted at rest (documented in Privacy Policy) |
| **Retention** | Automatic 14-day expiration with cleanup |
| **Session codes** | 10-character alphanumeric, not guessable |

### OWASP Top 10 Compliance

| Vulnerability | Status | Notes |
|---------------|--------|-------|
| A01 Broken Access Control | N/A | No server-side auth, client-only |
| A02 Cryptographic Failures | Documented | No encryption, disclosed in Privacy Policy |
| A03 Injection (XSS) | ✅ Protected | React escapes output + `sanitizeInput()` on save |
| A04 Insecure Design | ✅ Safe | Simple client-side app, minimal attack surface |
| A05 Security Misconfiguration | ✅ Safe | Secure Vite/React defaults |
| A06 Vulnerable Components | ✅ Monitored | Regular `npm audit` checks |
| A07 Auth Failures | N/A | No authentication system |
| A08 Data Integrity Failures | ✅ Safe | No deserialization of untrusted data |
| A09 Logging Failures | N/A | Client-side only |
| A10 SSRF | N/A | Only local Whisper server call |

### XSS Prevention

- **React's default escaping**: All JSX content is automatically escaped
- **Input sanitization**: All form data is sanitized before localStorage save
- **No `dangerouslySetInnerHTML`**: Codebase does not use unsafe HTML injection
- **DOCX generation**: Uses `docx` library which doesn't interpret HTML

### Dependencies

- All dependencies are regularly audited with `npm audit`
- No known vulnerabilities as of the current version
- Dev dependencies are not included in production builds

### Privacy Features

- No external data transmission (except optional Plausible analytics)
- Plausible analytics is cookie-free and GDPR compliant
- Voice input processed locally via Whisper AI
- Users can use incognito mode for sessions that leave no trace

### Recommendations for Users

- Download DOCX reports before clearing browser data
- Use incognito mode for sensitive reviews
- Don't share session codes via insecure channels
- Clear browser data after completing reviews on shared computers

## Testing

Run tests locally before deploying:

```bash
cd hr-performance-app

# Unit tests
npm run test:run

# E2E tests (requires Playwright browsers)
npx playwright install
npm run test:e2e
```

## Version

Current version: **1.1.1**

See the version label in the top-right corner of the application.

## Changelog

### v1.1.1
- Replace Vite favicon with TSS favicon from totalspecificsolutions.com

### v1.1.0
- **Major upgrade: Faster-Whisper** - Replace PyTorch/Transformers with CTranslate2 backend
- 4x faster transcription on CPU
- ~50% less RAM usage per worker
- Add Gunicorn with 2 workers for concurrent request handling
- Use int8 quantization for optimal CPU performance
- Add VAD (Voice Activity Detection) filter to skip silence
- Add memory limits in docker-compose (3G max, 1G reserved)
- Add test script for local Whisper server verification
- Support 8-12 simultaneous voice users (up from 1-2)

### v1.0.14
- Add Dependabot for automated dependency updates (npm, pip, docker, actions)
- Add GitHub Actions security audit workflow (runs on push, PR, and weekly)
- Dependency review on PRs with license checking

### v1.0.13
- Add `security.txt` for responsible disclosure (RFC 9116)
- Contact via GitHub Security Advisories
- Expires December 2026

### v1.0.12
- Apply `sanitizeInput()` to all form data before localStorage save
- Add comprehensive Security section to README
- Document OWASP Top 10 compliance

### v1.0.11
- Add disclaimer and limitation of liability to Privacy Policy
- Add issue reporting section (GitHub Issues)
- Translations in EN, NL, ES

### v1.0.10
- Fix Privacy Policy date from 2024 to 2025

### v1.0.9
- Add E2E tests for Plausible analytics script
- Add E2E tests for Privacy Policy page

### v1.0.8
- Add Privacy Policy page with full translations (EN, NL, ES)
- Covers: local storage, session codes, voice input, Plausible analytics
- Link in footer next to GitHub link

### v1.0.7
- Rename "Notes" to "Explanation" for competency fields
- Updated labels in all languages and DOCX export

### v1.0.6
- Include competency explanation notes in DOCX export

### v1.0.5
- Add optional explanation text boxes for all 6 HOW-Axis competencies
- Store notes per competency in session data

### v1.0.4
- Hide session bar on scroll down (mobile only, ≤768px)
- Reappears when scrolling up

### v1.0.3
- Add cache clearing warning to storage message
- Warns users that clearing browser data removes all sessions

### v1.0.2
- Rename "Resume Session" button to "Resume Another Session"

### v1.0.1
- Add AI attribution footer with robot icon
- Add GitHub repository link in footer
- Rename draft button and add autosave indicator
- Set DOCX export font to Verdana 9pt
- Remove gray fill from employee info table in DOCX
- Fix storage warning state persistence on page refresh

### v1.0.0
- Initial release
- 9-grid performance scoring (WHAT × HOW)
- Multi-language support (EN, NL, ES)
- Voice input with local Whisper AI
- DOCX report generation
- Session-based auto-save (14-day retention)
- Drag-and-drop goal reordering

## License

Proprietary - Total Specific Solutions
