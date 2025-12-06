![Total Specific Solutions](TSS_logo.png)

# TSS PPM Generator

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
│   │   ├── whisper_server.py    # Flask server
│   │   ├── setup_whisper.bat    # One-time setup
│   │   └── start_whisper.bat    # Start server
│   └── package.json
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
- **Voice**: Python Flask + Hugging Face Whisper

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

Current version: **1.0.0**

See the version label in the top-right corner of the application.

## License

Proprietary - Total Specific Solutions
