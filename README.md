![Total Specific Solutions](TSS_logo.png)

# TSS PPM Generator

> **Inspired by an idea from Graciela, Group Head HR at Groep Piek**

A web-based HR Performance Review application for Total Specific Solutions. This tool replaces the Excel-based annual employee performance review process with a modern, user-friendly web interface.

## Features

- **9-Grid Performance Scoring** - WHAT-axis (Goals & Results) × HOW-axis (Competencies)
- **Multi-Language Support** - English, Dutch, and Spanish
- **Voice Input** - Hold-to-dictate functionality using local Whisper AI (browser or server)
- **Auto-Save** - Session-based with 14-day retention
- **DOCX Report Generation** - Professional, editable Word documents
- **Drag & Drop** - Reorder goals easily
- **Authentication** - Keycloak integration with EntraID federation support
- **Role-Based Access** - Employee, Manager, HR, and Admin roles with specific views

## Quick Start

### Prerequisites

- Node.js 20+ (LTS recommended)
- PostgreSQL 16+ (for API backend)
- Docker & Docker Compose (optional, for full stack deployment)

### Option 1: Local Development (Frontend Only - No Auth)

Quickest way to run the app for UI development without backend services:

```bash
# Clone and install
git clone https://github.com/SimonvanAs/tss_ppm.git
cd tss_ppm/hr-performance-app
npm install

# Create local environment (disables auth)
cat > .env.local << 'EOF'
VITE_AUTH_ENABLED=false
VITE_AUTH_ALLOW_ANONYMOUS=true
VITE_API_URL=http://localhost:3000/api/v1
VITE_BROWSER_WHISPER_DEFAULT=true
VITE_DEBUG=true
EOF

# Start frontend
npm run dev
```

Opens at http://localhost:5173 with a mock user (all roles enabled).

### Option 2: Local Development (Full Stack)

Run frontend, API, and database locally for full development:

**1. Start PostgreSQL** (via Docker or local install):
```bash
# Using Docker
docker run -d --name tss-postgres \
  -e POSTGRES_USER=ppm \
  -e POSTGRES_PASSWORD=devpassword \
  -e POSTGRES_DB=tss_ppm \
  -p 5432:5432 \
  postgres:16-alpine
```

**2. Set up the API**:
```bash
cd api

# Install dependencies
npm install

# Create .env file
cat > .env << 'EOF'
DATABASE_URL=postgresql://ppm:devpassword@localhost:5432/tss_ppm
NODE_ENV=development
PORT=3000
JWT_SECRET=dev-secret-change-in-production
AUTH_ENABLED=false
EOF

# Run database migrations
npx prisma migrate dev

# Seed initial data (optional)
npx prisma db seed

# Start API server
npm run dev
```

**3. Set up the Frontend**:
```bash
cd hr-performance-app

# Install dependencies
npm install

# Create .env.local
cat > .env.local << 'EOF'
VITE_AUTH_ENABLED=false
VITE_AUTH_ALLOW_ANONYMOUS=true
VITE_API_URL=http://localhost:3000/api/v1
VITE_BROWSER_WHISPER_DEFAULT=true
EOF

# Start frontend
npm run dev
```

### Option 3: Docker Compose (Production-Like)

Full stack with PostgreSQL, Keycloak, API, Frontend, and Whisper:

```bash
# Clone repository
git clone https://github.com/SimonvanAs/tss_ppm.git
cd tss_ppm

# Create production .env file
cat > .env << 'EOF'
DOMAIN=localhost
DB_PASSWORD=your-secure-password
KC_ADMIN=admin
KC_ADMIN_PASSWORD=your-keycloak-password
EOF

# Build and start all services
docker compose up -d --build

# Check status
docker compose ps

# View logs
docker compose logs -f
```

Services will be available at:
- **Frontend**: https://localhost (via Caddy)
- **API**: https://localhost/api/v1
- **Keycloak Admin**: https://localhost/auth/admin

**First-time Keycloak Setup:**
1. Access https://localhost/auth/admin
2. Login with admin credentials from .env
3. Import the realm: Administration → Import → select `keycloak/tss-ppm-realm.json`
4. Create test users in the `tss-ppm` realm

### Option 4: Development with Keycloak

Run Keycloak for authentication testing while developing locally:

```bash
# Start only PostgreSQL and Keycloak via Docker
docker compose up postgres keycloak -d

# Wait for Keycloak to be healthy (~90 seconds)
docker compose logs -f keycloak

# Run API locally
cd api
npm run dev

# Run frontend with auth enabled
cd hr-performance-app
cat > .env.local << 'EOF'
VITE_AUTH_ENABLED=true
VITE_KEYCLOAK_URL=http://localhost:8080
VITE_KEYCLOAK_REALM=tss-ppm
VITE_KEYCLOAK_CLIENT_ID=tss-ppm-frontend
VITE_API_URL=http://localhost:3000/api/v1
EOF

npm run dev
```

**Note:** You'll need to expose Keycloak's port by uncommenting in docker-compose.yml:
```yaml
keycloak:
  ports:
    - "8080:8080"
```

## Project Structure

```
tss_ppm/
├── hr-performance-app/          # React frontend
│   ├── src/
│   │   ├── components/          # React components (Header, Navigation, etc.)
│   │   ├── contexts/            # React contexts (Auth, Form, Language, Whisper)
│   │   ├── pages/               # Page components (MyReviews, Team, HR Dashboard)
│   │   ├── services/            # API client
│   │   ├── config/              # Configuration (auth.js)
│   │   ├── hooks/               # Custom hooks (useVoiceInput)
│   │   ├── languages/           # i18n translations (en, nl, es)
│   │   └── utils/               # Utilities (scoring, session, docx)
│   ├── server/                  # Python Whisper server
│   │   ├── whisper_server_faster.py  # Production Faster-Whisper server
│   │   ├── requirements-faster.txt   # Production dependencies
│   │   └── test_whisper.py      # Test script
│   └── package.json
├── api/                         # Backend API (Fastify + Prisma)
│   ├── src/                     # API source code
│   └── prisma/                  # Database schema
├── docker-compose.yml           # Production deployment
├── Dockerfile.whisper           # Faster-Whisper container
├── Dockerfile.frontend          # React app container
├── nginx.conf                   # Frontend nginx config
├── Caddyfile                    # Reverse proxy config
├── ROADMAP.md                   # Implementation roadmap
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

### Frontend
- **Framework**: React 19 + Vite 7
- **Routing**: React Router v7 with protected routes
- **Styling**: Custom CSS with Tahoma font
- **Brand Colors**: Magenta `#CC0E70`, Navy Blue `#004A91`
- **Authentication**: Keycloak JS v26 (OIDC/EntraID federation)
- **Reports**: DOCX via `docx` package, Excel via `exceljs`, PDF via `jspdf`
- **Voice**: Browser Whisper (WebGPU/WASM) or Faster-Whisper server

### Backend
- **API Framework**: Fastify 5 with TypeScript
- **ORM**: Prisma 6 with PostgreSQL
- **Database**: PostgreSQL 16
- **Authentication**: Keycloak 25 (OIDC/OAuth 2.0)
- **Validation**: Zod schemas

### Infrastructure
- **Reverse Proxy**: Caddy (automatic HTTPS)
- **Containers**: Docker & Docker Compose
- **CI/CD**: GitHub Actions

## Environment Variables

### Frontend (`hr-performance-app/.env.local`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_AUTH_ENABLED` | `true` | Enable/disable Keycloak authentication |
| `VITE_AUTH_ALLOW_ANONYMOUS` | `false` | Allow anonymous access (dev only) |
| `VITE_KEYCLOAK_URL` | `http://localhost:8080` | Keycloak server URL |
| `VITE_KEYCLOAK_REALM` | `tss-ppm` | Keycloak realm name |
| `VITE_KEYCLOAK_CLIENT_ID` | `tss-ppm-frontend` | Keycloak client ID |
| `VITE_API_URL` | `/api/v1` | Backend API base URL |
| `VITE_BROWSER_WHISPER_DEFAULT` | `true` | Use browser Whisper by default |
| `VITE_DEBUG` | `false` | Enable debug logging |

### Backend API (`api/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | - | PostgreSQL connection string |
| `NODE_ENV` | `development` | Environment (development/production) |
| `PORT` | `3000` | API server port |
| `AUTH_ENABLED` | `true` | Enable JWT authentication |
| `KEYCLOAK_URL` | `http://localhost:8080` | Keycloak server URL |
| `KEYCLOAK_REALM` | `tss-ppm` | Keycloak realm name |
| `KEYCLOAK_CLIENT_ID` | `tss-ppm-api` | Keycloak client ID for API |
| `CORS_ORIGINS` | `http://localhost:5173` | Allowed CORS origins |
| `LOG_LEVEL` | `info` | Logging level |

### Docker Compose (`.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `DOMAIN` | `localhost` | Domain for Caddy SSL |
| `DB_PASSWORD` | `changeme` | PostgreSQL password |
| `KC_ADMIN` | `admin` | Keycloak admin username |
| `KC_ADMIN_PASSWORD` | `changeme` | Keycloak admin password |
| `WHISPER_MODEL` | `small` | Whisper model size |
| `WHISPER_COMPUTE_TYPE` | `int8` | Compute precision |
| `WHISPER_WORKERS` | `2` | Gunicorn workers |

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

### Architecture (v2.0)

```
┌─────────────────────────────────────────────────────────────┐
│                    Caddy (ports 80/443)                     │
│              Automatic HTTPS + Reverse Proxy                │
└─────────────────────────────────────────────────────────────┘
           │              │              │              │
           ▼              ▼              ▼              ▼
      /static        /api/v1         /auth       /transcribe
           │              │              │              │
           ▼              ▼              ▼              ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Frontend   │  │     API      │  │   Keycloak   │  │   Whisper    │
│  (React/Vite)│  │  (Fastify)   │  │   (OIDC)     │  │ (Python AI)  │
│    nginx     │  │   Prisma     │  │  EntraID SSO │  │ faster-whisper│
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
                         │                  │
                         ▼                  ▼
                  ┌─────────────────────────────────┐
                  │         PostgreSQL 16           │
                  │   tss_ppm DB  │  keycloak DB    │
                  └─────────────────────────────────┘
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

The application implements defense-in-depth security measures for enterprise HR data.

### Authentication & Authorization (v2.0)

| Aspect | Implementation |
|--------|----------------|
| **Identity Provider** | Keycloak with OIDC/OAuth 2.0 |
| **SSO Integration** | EntraID (Azure AD) federation support |
| **Token Management** | JWT with automatic refresh |
| **Session Handling** | Silent SSO with secure token storage |
| **Role-Based Access** | Five roles with hierarchical permissions |

### User Roles

| Role | Permissions |
|------|-------------|
| **Employee** | View/edit own reviews, self-assessment |
| **Manager** | Score team reviews, approve goal changes, view team |
| **HR** | View all reviews, organization statistics, calibration |
| **OpCo Admin** | Manage OpCo users, settings, competencies |
| **TSS Super Admin** | Cross-OpCo management, global configuration |

### Data Protection

| Aspect | Implementation |
|--------|----------------|
| **Storage** | PostgreSQL with tenant isolation |
| **Encryption** | TLS in transit, database encryption at rest |
| **Multi-Tenancy** | OpCo-level data isolation |
| **Audit Trail** | All changes logged with user and timestamp |
| **Retention** | Configurable per organization |

### OWASP Top 10 Compliance

| Vulnerability | Status | Notes |
|---------------|--------|-------|
| A01 Broken Access Control | ✅ Protected | RBAC + route guards + API authorization |
| A02 Cryptographic Failures | ✅ Protected | TLS, JWT signing, secure password storage |
| A03 Injection (XSS/SQLi) | ✅ Protected | React escaping + Prisma parameterized queries |
| A04 Insecure Design | ✅ Safe | Defense in depth, principle of least privilege |
| A05 Security Misconfiguration | ✅ Safe | Secure defaults, environment-based config |
| A06 Vulnerable Components | ✅ Monitored | Regular `npm audit`, Dependabot alerts |
| A07 Auth Failures | ✅ Protected | Keycloak handles auth with industry standards |
| A08 Data Integrity Failures | ✅ Safe | JWT verification, signed tokens |
| A09 Logging Failures | ✅ Implemented | Structured logging with audit trail |
| A10 SSRF | ✅ Protected | Allowlisted internal services only |

### API Security

- **JWT Validation**: All API requests require valid JWT token
- **Tenant Isolation**: Users can only access data within their OpCo
- **Rate Limiting**: Protection against abuse (configurable)
- **CORS**: Strict origin validation
- **Input Validation**: Schema validation on all endpoints

### Privacy Features

- **Plausible Analytics**: Cookie-free, GDPR compliant (optional)
- **Voice Input**: Browser-based Whisper (no audio sent to external services)
- **Data Minimization**: Only necessary data collected
- **GDPR Rights**: Export, deletion, and portability supported

### Dependencies

- All dependencies regularly audited with `npm audit`
- Dependabot enabled for automated security updates
- No known vulnerabilities as of the current version
- GitHub Actions security scanning on every push

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

Current version: **2.0.0**

See the version label in the top-right corner of the application.

## Changelog

### v2.0.0 - Multi-Tenant Enterprise Release

Major release introducing enterprise authentication, role-based access control, and multi-tenant architecture preparation.

#### Authentication & Security
- **Keycloak Integration**: Full OIDC authentication with EntraID/Azure AD federation support
- **JWT Token Management**: Automatic token refresh, secure session handling
- **Role-Based Access Control**: Five user roles (Employee, Manager, HR, OpCo Admin, TSS Super Admin)
- **Protected Routes**: Route-level and component-level access guards
- **Silent SSO**: Seamless single sign-on experience

#### Role-Based UI
- **React Router v7**: Client-side routing with role-protected routes
- **Navigation Component**: Role-aware menu with icon-based navigation
- **My Reviews Page**: Employee view of their performance reviews
- **Team Overview**: Manager view of direct reports and their reviews
- **Approvals Page**: Manager interface for goal change request approvals
- **HR Dashboard**: Organization-wide statistics and metrics
- **All Reviews Page**: HR view with filtering and search capabilities

#### API Integration
- **API Client**: Centralized client with automatic JWT injection
- **Review Context**: API-backed state management for reviews
- **Full API Coverage**: Endpoints for users, reviews, goals, competencies, approvals

#### Developer Experience
- **Environment Configuration**: `.env.example` with all configuration options
- **Test Utilities**: Updated with router and auth mocks
- **Documentation**: Updated CLAUDE.md and README.md

#### Previous Changes (v1.x)
- Browser-based Whisper transcription with WebGPU/WASM
- Dictation toggle for browser vs server transcription
- HOW-axis explanation boxes with voice input
- Preview improvements and bug fixes

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
