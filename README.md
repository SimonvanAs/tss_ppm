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

- Sessions are saved automatically every 2.5 seconds
- Each session has a unique 10-character code
- Sessions expire after 14 days
- Users can resume sessions using the session code

## Building for Production

```bash
cd hr-performance-app
npm run build
```

Output will be in the `dist/` folder.

## Docker Deployment

Deploy the full stack with Docker Compose:

### Prerequisites
- Docker and Docker Compose
- At least 4GB RAM (Whisper model requires ~2GB)

### Quick Deploy

```bash
# Clone and deploy
git clone <repository-url>
cd tss_ppm
docker-compose up -d --build
```

The application will be available at `http://your-server:80`

### Architecture

```
┌─────────────────────────────────────────────────┐
│                   nginx (port 80)                │
│  ┌─────────────────┐    ┌────────────────────┐  │
│  │  Static Files   │    │  /transcribe proxy │  │
│  │  (React App)    │    │  → whisper:3001    │  │
│  └─────────────────┘    └────────────────────┘  │
└─────────────────────────────────────────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │   Whisper Container     │
              │   (Python + AI Model)   │
              │   Internal port: 3001   │
              └─────────────────────────┘
```

### Docker Commands

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild after changes
docker-compose up -d --build
```

### GPU Support (Optional)

For faster transcription with NVIDIA GPU:

1. Install [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html)
2. Uncomment the GPU section in `docker-compose.yml`
3. Rebuild and restart

### GitHub Actions Auto-Deploy

The repository includes a GitHub Actions workflow for automatic deployment on push to `master`/`main`.

**Setup required secrets in GitHub repository settings:**

| Secret | Description |
|--------|-------------|
| `VPS_HOST` | Your VPS IP address or hostname |
| `VPS_USER` | SSH username (e.g., `root` or `deploy`) |
| `VPS_SSH_KEY` | Private SSH key for authentication |
| `VPS_PORT` | SSH port (optional, defaults to 22) |

**VPS prerequisites:**
```bash
# Install Docker and Docker Compose on your VPS
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Git
sudo apt-get install git
```

**Generate SSH key for deployment:**
```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-deploy" -f ~/.ssh/github_deploy

# Copy public key to VPS
ssh-copy-id -i ~/.ssh/github_deploy.pub user@your-vps

# Add private key content to GitHub secret VPS_SSH_KEY
cat ~/.ssh/github_deploy
```

## Version

Current version: **1.0.0**

See the version label in the top-right corner of the application.

## License

Proprietary - Total Specific Solutions
