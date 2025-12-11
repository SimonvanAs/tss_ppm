# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **HR Performance Scoring Web Application** (v2.0.0) for Total Specific Solutions. The application replaces an Excel-based annual employee performance review process with a web-based interface featuring:
- 9-grid performance scoring (WHAT-axis × HOW-axis)
- Multi-language support (English, Spanish, Dutch)
- Browser-based and server-based speech-to-text via Whisper
- Automatic DOCX report generation
- Session-based auto-save with 14-day retention
- Sessions list page for managing multiple reviews
- **Keycloak authentication** with role-based access control (Phase 4)
- **Role-based UI** with navigation for Employee, Manager, HR, and Admin roles (Phase 5)

## Development Commands

```bash
# Navigate to the app directory
cd hr-performance-app

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run unit tests
npm run test        # Watch mode
npm run test:run    # Single run

# Run E2E tests
npm run test:e2e    # Headless
npm run test:e2e:ui # Interactive UI
```

## Docker Deployment

```bash
# Build and run all services
docker compose up --build

# Services:
# - caddy: Reverse proxy with auto-HTTPS (ports 80, 443)
# - frontend: React app served via nginx
# - whisper: Python server with faster-whisper for speech-to-text
```

## Technology Stack

- **Frontend**: React 19 with Vite 7
- **Routing**: React Router v7
- **Styling**: Custom CSS with Tahoma font
- **Brand Colors**: Magenta `#CC0E70`, Navy Blue `#004A91` (as accents)
- **Storage**: Browser localStorage (14-day max retention) + API (when backend connected)
- **Authentication**: Keycloak JS adapter v26 (OIDC/EntraID federation)
- **Output**: DOCX generation via `docx` package
- **Voice Input**:
  - **Browser**: Transformers.js with Whisper (WebGPU/WASM)
  - **Server**: faster-whisper Python service (Docker)
- **Testing**: Vitest (unit) + Playwright (E2E)
- **CI/CD**: GitHub Actions (security scanning, Docker builds)
- **Backend** (Phase 1-3): Fastify + Prisma + PostgreSQL (in `api/` directory)

## Project Structure

```
tss_ppm/
├── hr-performance-app/
│   ├── src/
│   │   ├── components/       # React components (Header, Navigation, ProtectedRoute, etc.)
│   │   ├── contexts/         # React contexts (Auth, Form, Language, Whisper, Review)
│   │   ├── pages/            # Page components (MyReviews, Team, Approvals, HRDashboard)
│   │   ├── services/         # API client (api.js)
│   │   ├── config/           # Configuration (auth.js)
│   │   ├── hooks/            # Custom hooks (useVoiceInput, useBrowserWhisper, useWhisper)
│   │   ├── languages/        # i18n translations (en.json, nl.json, es.json)
│   │   ├── utils/            # Utilities (scoring, session, competencies, docxGenerator)
│   │   ├── test/             # Test setup and utilities
│   │   ├── App.jsx           # Main app with React Router
│   │   └── App.css           # Global styles
│   ├── public/               # Static assets (silent-check-sso.html for Keycloak)
│   ├── e2e/                  # Playwright E2E tests
│   ├── server/               # Whisper server (Python)
│   └── package.json
├── api/                      # Backend API (Fastify + Prisma) - Phase 1-3
│   ├── src/                  # API source code
│   └── prisma/               # Database schema and migrations
├── Dockerfile.frontend       # Frontend container
├── Dockerfile.whisper        # Whisper server container
├── docker-compose.yml        # Multi-service orchestration
├── Caddyfile                 # Reverse proxy config
├── ROADMAP.md                # Implementation roadmap
└── .github/workflows/        # CI/CD pipelines
```

## Key Components

| Component | Purpose |
|-----------|---------|
| `Header.jsx` | App header with logo, language selector, version, user menu |
| `Navigation.jsx` | Role-based navigation menu with icon links |
| `ProtectedRoute.jsx` | Route protection and role guards (RoleGuard, ManagerGuard, etc.) |
| `EmployeeInfo.jsx` | Employee details form |
| `WhatAxis.jsx` | Goals & results scoring (up to 9 goals) |
| `HowAxis.jsx` | Competency scoring based on TOV-Level |
| `PerformanceGrid.jsx` | 9-grid visualization |
| `SelfAssessment.jsx` | Employee self-assessment section |
| `Comments.jsx` | Manager comments section |
| `Actions.jsx` | Download DOCX, session management |
| `SessionsList.jsx` | View/manage all saved sessions |
| `VoiceInputButton.jsx` | Hold-to-dictate voice input |
| `WhisperLoadingBanner.jsx` | Model download progress indicator |

## Key Pages (Phase 5)

| Page | Route | Access | Purpose |
|------|-------|--------|---------|
| `MyReviews.jsx` | `/my-reviews` | All users | Employee's review list |
| `TeamOverview.jsx` | `/team` | Manager+ | Direct reports overview |
| `Approvals.jsx` | `/approvals` | Manager+ | Pending goal change approvals |
| `HRDashboard.jsx` | `/hr/dashboard` | HR+ | Organization statistics |
| `AllReviews.jsx` | `/hr/reviews` | HR+ | All reviews with filters |

## Key Contexts

| Context | Purpose |
|---------|---------|
| `AuthContext` | Keycloak authentication, login/logout, user state, role checks |
| `FormContext` | Form state management, auto-save, session handling (localStorage) |
| `ReviewContext` | API-backed review state management (for future use) |
| `LanguageContext` | i18n translations, language switching |
| `WhisperContext` | Shared Whisper model loading, transcription |

## Key Services

| Service | Purpose |
|---------|---------|
| `api.js` | API client with automatic token injection, all endpoint methods |
| `auth.js` | Keycloak configuration, role helpers |

## Scoring System Architecture

### WHAT-Axis (Goals & Results)
- Up to 9 flexible goals with drag-and-drop reordering
- Each goal: Title, Description, Score (1-3), Weight percentage
- Weights must sum to exactly 100%
- Weighted average calculation: `WHAT Score = Σ(Score × Weight) / 100`

### HOW-Axis (Competencies)
- Based on TOV-Level selection (A/B/C/D)
- 6 competencies per level, each scored 1-3
- **VETO RULE**: If ANY competency = 1, HOW Score = 1.00
- Competencies defined in `src/utils/competencies.js`

### 9-Grid Visualization (3×3)
- Grid mapping: A=1, B=2, C=3, D=3
- Colors: Red (1,1), Orange (edges), Green (center), Dark Green (3,3)

## Voice Input System

The app supports two speech-to-text backends:

### Browser Whisper (Default on Desktop)
- Uses `@huggingface/transformers` with ONNX models
- WebGPU backend: `whisper-small` (~500MB)
- WASM fallback: `whisper-base` (~150MB)
- Auto-preloads model when browser backend selected
- Progress tracking via `WhisperLoadingBanner`

### Server Whisper (Mobile/Fallback)
- faster-whisper Python service in Docker
- Configurable model size via `WHISPER_MODEL` env var
- VAD (Voice Activity Detection) enabled
- 4GB memory limit in Docker

### Backend Selection
- Auto-detected based on device capabilities
- Mobile devices always use server backend
- Toggle in header to switch between browser/server

## Key Business Rules

- All goals with content must be scored AND weighted before download
- Weight percentages must sum to exactly 100%
- Session codes: 10 alphanumeric characters, 14-day expiration
- Voice input appends to existing text (does not replace)
- Only selected TOV-level description shown in app and report
- Auto-save triggers after 2.5 seconds of inactivity

## Multi-Language Support

- UI and reports: English (en), Spanish (es), Dutch (nl)
- Translations in `src/languages/` directory
- Voice input supports all three languages
- Language selector with flag icons persists with session

## Testing

### Unit Tests (Vitest)
- Component tests: `*.test.jsx`
- Utility tests: `*.test.js`
- Run: `npm run test:run`

### E2E Tests (Playwright)
- Full user flow tests in `e2e/`
- Run: `npm run test:e2e`

## Environment Variables

### Docker/Server
| Variable | Default | Description |
|----------|---------|-------------|
| `DOMAIN` | localhost | Domain for Caddy SSL |
| `WHISPER_MODEL` | small | Whisper model size |
| `WHISPER_COMPUTE_TYPE` | int8 | Compute precision |
| `WHISPER_WORKERS` | 2 | Gunicorn workers |

### Frontend (Vite)
| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_KEYCLOAK_URL` | http://localhost:8080 | Keycloak server URL |
| `VITE_KEYCLOAK_REALM` | tss-ppm | Keycloak realm name |
| `VITE_KEYCLOAK_CLIENT_ID` | tss-ppm-frontend | Keycloak client ID |
| `VITE_AUTH_ENABLED` | true | Enable/disable authentication |
| `VITE_API_URL` | /api/v1 | Backend API base URL |

See `.env.example` for full list.

## User Roles

| Role | Permissions |
|------|-------------|
| `EMPLOYEE` | View/edit own reviews, self-assessment |
| `MANAGER` | Score team reviews, approve goal changes |
| `HR` | View all reviews, organization statistics |
| `OPCO_ADMIN` | Manage OpCo settings, users, competencies |
| `TSS_SUPER_ADMIN` | Cross-OpCo management, global settings |

## Implementation Phases

See `ROADMAP.md` for detailed implementation plan.

- **Phase 1**: Infrastructure (API, Database, Keycloak) ✅
- **Phase 2**: Core Backend API ✅
- **Phase 3**: Multi-Stage Workflow ✅
- **Phase 4**: Frontend Auth Integration ✅
- **Phase 5**: Role-Based UI ✅
- **Phase 6**: Admin Portal (pending)
- **Phase 7**: Testing & Quality (pending)
