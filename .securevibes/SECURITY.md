# Security Architecture

## Overview

The TSS PPM (Total Specific Solutions Performance Management) application is an HR performance review system that replaces Excel-based annual employee performance reviews with a web-based interface. The application enables managers to conduct structured performance evaluations using a 9-grid scoring matrix (WHAT-axis for goals/results × HOW-axis for competencies), supports multi-language input (English, Spanish, Dutch), includes browser and server-based speech-to-text capabilities via Whisper, and generates professional DOCX reports.

**Current Version:** 1.2.1

**Architecture Style:** Multi-tier web application with planned migration from client-side-only to multi-tenant server-based architecture

## Architecture

The application is transitioning between two architectural phases:

### Phase 1 Architecture (Current Production)
```
┌─────────────────────────────────────────────────────────────┐
│                        User Browser                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  React 19 SPA (Vite 7)                                 │ │
│  │  - Form State Management (FormContext)                 │ │
│  │  - localStorage (14-day retention, unencrypted)        │ │
│  │  - DOCX Generation (client-side via docx library)     │ │
│  │  - Browser Whisper (transformers.js, WebGPU/WASM)     │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────┬───────────────────────────────────────┘
                      │ (Optional)
                      ▼
        ┌─────────────────────────────┐
        │   Caddy Reverse Proxy       │
        │   - Auto HTTPS               │
        │   - Security Headers         │
        └─────────────┬─────────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │   Whisper Server (Docker)   │
        │   - Python Flask API        │
        │   - faster-whisper (CPU)    │
        │   - Audio transcription     │
        └─────────────────────────────┘
```

### Phase 2/3 Architecture (Planned - Under Development)
```
┌──────────────────────────────────────────────────────────────────┐
│                          Internet                                 │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │   Caddy Reverse Proxy         │
         │   - Auto HTTPS                 │
         │   - Security Headers           │
         │   - Path-based Routing         │
         └─┬────────┬───────────┬────────┘
           │        │           │
    ┌──────▼──┐  ┌─▼────────┐  ┌▼──────────────┐
    │Frontend │  │Keycloak  │  │  API Backend  │
    │ (nginx) │  │ (Auth)   │  │  (Fastify +   │
    │         │  │          │  │   Prisma)     │
    └─────────┘  └──────────┘  └───────┬───────┘
                                        │
                         ┌──────────────▼──────────────┐
                         │   PostgreSQL 16              │
                         │   - Application DB           │
                         │   - Keycloak DB              │
                         │   - Multi-tenant isolation   │
                         └─────────────────────────────┘
```

## Technology Stack

### Frontend
- **Framework:** React 19.2.0 with React DOM 19.2.0
- **Build Tool:** Vite 7.2.7
- **Language:** JavaScript (ES modules)
- **UI:** Custom CSS with Tahoma font, brand colors (Magenta #CC0E70, Navy Blue #004A91)
- **State Management:** React Context API (FormContext, LanguageContext, WhisperContext)
- **Storage:** Browser localStorage (unencrypted, client-side only)
- **Document Generation:** docx 9.5.1 (client-side DOCX creation)
- **File Handling:** file-saver 2.0.5
- **Session IDs:** uuid 13.0.0
- **Speech Recognition:** @huggingface/transformers 3.8.1 (ONNX models, WebGPU/WASM)

### Backend Services

#### Whisper Speech-to-Text Server
- **Runtime:** Python 3.11 (slim container)
- **Framework:** Flask 3.1.2 with Flask-CORS 6.0.1
- **Server:** Gunicorn 23.0.0
- **ML Model:** faster-whisper 1.2.1 (CTranslate2 backend)
- **Audio Processing:** librosa 0.11.0, soundfile 0.13.1, pydub 0.25.1
- **System Dependencies:** ffmpeg, libsndfile1

#### API Backend (Phase 2/3 - Under Development)
- **Runtime:** Node.js 22 (Alpine Linux)
- **Framework:** Fastify (TypeScript)
- **ORM:** Prisma
- **Authentication:** Keycloak integration
- **Process Manager:** dumb-init (signal handling)

### Infrastructure
- **Reverse Proxy:** Caddy 2 (Alpine Linux)
- **Database:** PostgreSQL 16 (Alpine Linux)
- **Identity Provider:** Keycloak 25.0
- **Containerization:** Docker with multi-stage builds
- **Orchestration:** Docker Compose

### Development & Testing
- **Testing Framework:** Vitest 4.0.15 with @vitest/coverage-v8
- **E2E Testing:** Playwright 1.57.0
- **Code Quality:** ESLint 9.39.1 with React-specific plugins
- **CI/CD:** GitHub Actions (security scanning, Docker builds)

## Entry Points

### Phase 1 (Current Production)

#### 1. Frontend Web Application (Port 80/443)
- **Path:** `/*` (all routes)
- **Protocol:** HTTP/HTTPS
- **Access:** Public, unauthenticated
- **Input Vectors:**
  - Text input fields (employee info, goals, comments, self-assessment)
  - Numeric input (scores 1-3, weight percentages)
  - File selection (voice recording via MediaRecorder API)
  - Session codes (10 alphanumeric characters)
  - Language selection (en/nl/es)

#### 2. Whisper Transcription Endpoint
- **Path:** `/transcribe` (proxied through Caddy or nginx)
- **Protocol:** HTTP POST (multipart/form-data)
- **Access:** Public, no authentication
- **Input Vectors:**
  - Audio files (webm, mp3, wav, up to 50MB)
  - Language parameter (en/nl/es)

#### 3. Health Check Endpoint
- **Path:** `/health`
- **Protocol:** HTTP GET
- **Access:** Public, no authentication
- **Purpose:** Container health monitoring

### Phase 2/3 (Planned - Under Development)

#### 4. API Backend Endpoints
- **Base Path:** `/api/v1/*`
- **Protocol:** HTTP/HTTPS
- **Authentication:** Keycloak OAuth2/OIDC tokens
- **Input Vectors:**
  - JSON payloads (review data, user profiles)
  - Query parameters (filters, pagination)
  - JWT tokens (authentication)

#### 5. Keycloak Authentication
- **Base Path:** `/auth/*`
- **Protocol:** HTTP/HTTPS
- **Purpose:** User authentication, token issuance, user management
- **Input Vectors:**
  - Credentials (username/password)
  - OAuth2 flows (authorization code, refresh tokens)
  - SAML assertions (future SSO integration)

## Authentication & Authorization

### Phase 1 (Current - No Authentication)
- **Authentication:** None - fully client-side application
- **Authorization:** None - all data stored locally in user's browser
- **Session Management:**
  - 10-character alphanumeric session codes generated via UUID v4
  - Session codes stored in localStorage, valid for 14 days
  - Session codes are client-side only, cannot transfer data between browsers/devices
  - No server-side session validation

### Phase 2/3 (Planned - Keycloak Integration)
- **Identity Provider:** Keycloak 25.0 with PostgreSQL backend
- **Authentication Protocol:** OAuth2 + OpenID Connect (OIDC)
- **Token Type:** JWT (JSON Web Tokens)
- **Token Storage:** Frontend securely stores access/refresh tokens
- **Authorization Model:**
  - Role-Based Access Control (RBAC)
  - Tenant-based data isolation (multi-tenancy)
  - User roles: Employee, Manager, Admin, Super Admin
- **Session Management:**
  - Server-side session tracking in PostgreSQL
  - Token refresh mechanism
  - Configurable session timeouts

### Trust Boundaries

**Phase 1 Trust Boundaries:**
1. **User Browser ↔ Whisper Server:** Unauthenticated, public endpoint (audio transcription)
2. **User Browser ↔ localStorage:** No encryption, vulnerable to XSS/device access

**Phase 2/3 Trust Boundaries:**
1. **Internet ↔ Caddy:** HTTPS termination, public entry point
2. **Caddy ↔ Backend Services:** Internal Docker network, HTTP within container network
3. **API ↔ Keycloak:** Internal authentication verification
4. **API ↔ PostgreSQL:** Database credentials via environment variables
5. **User Browser ↔ API:** JWT bearer tokens in Authorization header

## Data Flow

### Phase 1 Data Flow (Current Production)

#### 1. User Input → Browser Storage
```
User types in form fields
  → React state (FormContext)
  → Auto-save after 2.5s inactivity
  → XSS sanitization (HTML entities escaped)
  → localStorage (hr_performance_sessions key)
  → Data stored unencrypted in plain text
```

#### 2. Voice Input → Transcription (Browser Whisper)
```
User holds voice button
  → MediaRecorder API captures audio (WebM/Opus)
  → Audio converted to WAV (16kHz mono PCM) in browser
  → transformers.js Whisper model (WebGPU or WASM)
  → Model downloads once (whisper-small ~500MB or whisper-base ~150MB)
  → Transcription happens locally in browser
  → Text appended to form field
```

#### 3. Voice Input → Transcription (Server Whisper)
```
User holds voice button (mobile or fallback)
  → MediaRecorder API captures audio (WebM/Opus)
  → Audio converted to WAV (16kHz mono PCM) in browser
  → HTTP POST to /transcribe (multipart/form-data)
  → Caddy/nginx proxies to Whisper container
  → faster-whisper processes audio (CPU, int8 quantization)
  → Temporary file created, processed, deleted
  → Text returned in JSON response
  → Text appended to form field
```

#### 4. Document Generation
```
User clicks "Download Report"
  → Form validation checks (all goals scored, weights sum to 100%)
  → Form data retrieved from FormContext
  → docx library generates DOCX in browser memory
  → file-saver triggers browser download
  → File saved directly to user's device
  → No server upload, fully client-side
```

#### 5. Session Management
```
On form load:
  → Generate UUID v4 session code (10 chars)
  → Auto-save form data every 2.5s to localStorage
  → Cleanup expired sessions (>14 days) on mount

User resumes session:
  → User enters session code
  → Code looked up in localStorage
  → Session expiry checked (14 days)
  → If valid, data loaded into FormContext
  → If expired, session deleted
```

### Phase 2/3 Data Flow (Planned)

#### Server-Side Review Persistence
```
User submits review form
  → JWT validated by API
  → Tenant ID extracted from token
  → Data validated against schema
  → Prisma ORM transaction
  → PostgreSQL stores review (row-level tenant isolation)
  → Response returned to frontend
```

## Sensitive Data

### Data Classification

#### Highly Sensitive (Personal Performance Data)
- **Employee Names:** Stored in localStorage (Phase 1) or PostgreSQL (Phase 2/3)
- **Role/Function Titles:** Job position information
- **Business Unit:** Organizational structure data
- **Performance Goals:** Detailed descriptions of work objectives
- **Performance Scores:** Numeric ratings (1-3) for goals and competencies
- **Manager Comments:** Subjective performance assessments
- **Self-Assessments:** Employee's personal reflections on performance
- **TOV/IDE Level:** Employee classification level (A/B/C/D)
- **Review Dates:** Temporal performance tracking

#### Sensitive (System Data)
- **Session Codes:** 10-character session identifiers
- **Language Preferences:** User's selected language (en/nl/es)
- **Voice Recordings:** Temporary audio captured during speech-to-text (deleted after processing)
- **JWT Tokens:** (Phase 2/3) Authentication credentials

#### Low Sensitivity
- **Competency Definitions:** Standard competency framework (static data)
- **UI State:** Form progress, collapsed sections
- **Usage Analytics:** Anonymous aggregate statistics (Plausible Analytics)

### Data Storage Locations

#### Phase 1
- **localStorage:** All review data stored unencrypted as JSON strings
  - Key: `hr_performance_sessions`
  - Retention: 14 days (automatic cleanup)
  - Encryption: None
  - Backup: None (user's device only)

- **Whisper Server Temporary Storage:**
  - Audio files written to `/app/uploads/` during processing
  - Files immediately deleted after transcription
  - No persistent audio storage
  - Memory-resident during processing only

#### Phase 2/3
- **PostgreSQL Database:**
  - Multi-tenant architecture with tenant isolation
  - Row-level security enforced by Prisma
  - Database credentials in environment variables
  - Backups not yet implemented
  - Encryption at rest: depends on deployment

- **Keycloak Database:**
  - User credentials (hashed passwords)
  - OAuth tokens
  - User profile information
  - Separate PostgreSQL database

### Data Transmission

#### Phase 1
- **In Production:** HTTPS enforced by Caddy (Let's Encrypt auto-certificates)
- **In Development:** HTTP to localhost (secure context for MediaRecorder API)
- **Audio Upload:** Multipart form-data over HTTP/HTTPS (up to 50MB)

#### Phase 2/3
- **All External Traffic:** HTTPS with TLS 1.2+ (Caddy handles termination)
- **Internal Traffic:** HTTP within Docker bridge network (trusted network)

## External Dependencies

### Frontend Dependencies (npm)
- **@huggingface/transformers:** Client-side ML models (ONNX runtime)
- **docx:** DOCX file generation
- **file-saver:** Browser download triggering
- **uuid:** Session code generation
- **react & react-dom:** UI framework

### Backend Dependencies (Python)
- **flask & flask-cors:** HTTP server and CORS handling
- **gunicorn:** Production WSGI server
- **faster-whisper:** Speech recognition model (CTranslate2)
- **librosa, soundfile, pydub:** Audio processing libraries

### Backend Dependencies (Node.js - Phase 2/3)
- **fastify:** HTTP framework
- **prisma:** Database ORM
- **keycloak client libraries:** Authentication integration

### External Services
- **Hugging Face CDN:** Downloads ONNX models for transformers.js
  - whisper-small (~500MB) for WebGPU
  - whisper-base (~150MB) for WASM
  - Models cached in browser (IndexedDB)

- **Plausible Analytics:** Privacy-friendly web analytics
  - Anonymous, cookieless tracking
  - GDPR/CCPA compliant
  - No personal data collection

- **Let's Encrypt:** (Production) TLS certificate authority via Caddy
  - Automatic certificate issuance and renewal
  - HTTP-01 ACME challenge

### Container Base Images
- **node:25-alpine:** Frontend build
- **nginx:alpine:** Static file serving
- **python:3.11-slim:** Whisper server
- **postgres:16-alpine:** Database
- **quay.io/keycloak/keycloak:25.0:** Identity provider
- **caddy:2-alpine:** Reverse proxy

## Security Controls

### Input Validation

#### Frontend Sanitization
- **XSS Prevention:** All string inputs sanitized before saving to localStorage
  - HTML entities escaped: `&<>"'/`
  - Implemented in `sanitizeFormData()` function
  - Applied recursively to all form data
- **Numeric Validation:** Scores limited to 1-3, weights to 0-100%
- **Weight Sum Validation:** Goals weights must sum exactly to 100%
- **Session Code Validation:** 10 alphanumeric characters, case-insensitive

#### Backend Validation (Whisper Server)
- **File Type Validation:** Audio MIME types checked (webm, mp3, wav, ogg)
- **File Size Limit:** 50MB enforced by nginx/Caddy
- **Language Validation:** Limited to en/nl/es with mapping to Whisper language codes
- **Temporary File Cleanup:** Automatic deletion in finally block

### Security Headers (Caddy Configuration)

```
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
Referrer-Policy: strict-origin-when-cross-origin
X-XSS-Protection: 1; mode=block
Server: (removed)
```

**Not Currently Implemented (Commented Out):**
- HSTS (Strict-Transport-Security)
- Content-Security-Policy

### Transport Security

#### HTTPS Configuration
- **Production:** Automatic HTTPS via Caddy with Let's Encrypt
- **Development:** HTTP to localhost (secure context maintained)
- **Certificate Management:** Fully automated renewal
- **TLS Version:** Modern defaults (TLS 1.2+)

#### CORS Configuration
- **Whisper Server:** Flask-CORS enabled (permissive in current configuration)
- **Phase 2/3 API:** CORS_ORIGINS environment variable restricts origins

### Container Security

#### Docker Security Measures
- **Non-Root User:** API backend runs as nodejs:nodejs (UID 1001)
- **Multi-Stage Builds:** Reduced attack surface, no build tools in production images
- **Alpine Base Images:** Minimal OS footprint
- **Read-Only Filesystems:** Not currently implemented
- **Resource Limits:** Whisper container limited to 4GB memory
- **Health Checks:** Automated container restart on failure

#### Network Isolation
- **Docker Bridge Network:** Internal communication isolated from host
- **No Direct Database Exposure:** PostgreSQL ports not exposed externally
- **No Direct Keycloak Exposure:** Keycloak only accessible via Caddy proxy

### Session Security

#### Phase 1 (Current)
- **No Server Sessions:** Fully client-side state
- **Session Expiry:** 14-day automatic cleanup
- **No Cross-Device Sync:** Sessions are device/browser-specific
- **localStorage Vulnerabilities:**
  - No encryption at rest
  - Vulnerable to XSS (mitigated by sanitization)
  - Vulnerable to physical device access
  - Vulnerable to browser extensions with broad permissions

#### Phase 2/3 (Planned)
- **JWT Tokens:** Short-lived access tokens, longer-lived refresh tokens
- **Token Storage:** Secure httpOnly cookies or browser memory
- **Token Validation:** Every API request validates JWT signature and expiry
- **Revocation:** Keycloak supports token revocation

### Authentication Security (Phase 2/3)

- **Password Hashing:** Keycloak uses bcrypt/PBKDF2
- **Brute Force Protection:** Keycloak configurable lockout policies
- **Multi-Factor Authentication:** Keycloak supports TOTP, SMS, email
- **OAuth2 Flows:** Authorization code flow with PKCE
- **Token Security:** JWT signed with RS256 or HS256

### Vulnerability Management

#### CI/CD Security Scanning
- **npm audit:** Weekly scheduled scans via GitHub Actions
- **Dependency Review:** GitHub's advisory database on pull requests
- **Severity Thresholds:** Critical vulnerabilities block builds
- **License Compliance:** GPL/AGPL licenses denied

#### Update Strategy
- **Security Patches:** Manual review and update of package.json
- **Base Image Updates:** Alpine and Node images updated periodically
- **CVE Monitoring:** Automated weekly reports uploaded as artifacts

### Logging & Monitoring

#### Current Logging
- **Caddy Access Logs:** stdout (console format, INFO level)
- **Whisper Server Logs:** Python print statements (transcription events, errors)
- **Frontend Logs:** Browser console.log/console.error
- **No Centralized Logging:** Logs not aggregated or persisted

#### Phase 2/3 Logging (Planned)
- **Structured Logging:** JSON format with correlation IDs
- **Audit Trails:** User actions logged to database
- **Security Events:** Failed authentication, authorization failures
- **Performance Metrics:** API response times, database query performance

## Notes

### Known Security Limitations

#### Phase 1 (Current Production)
1. **No Data Encryption at Rest:** localStorage stores data in plain text
2. **No Authentication:** Application fully client-side, no user login
3. **No Authorization:** All data accessible to anyone with device access
4. **No Audit Logging:** No record of who accessed or modified data
5. **No Data Backup:** User responsible for exporting DOCX backups
6. **Limited Session Security:** Session codes provide minimal security
7. **Unauthenticated Whisper API:** Open for abuse without rate limiting
8. **No Content Security Policy:** XSS attacks rely solely on input sanitization
9. **Permissive CORS:** Whisper server accepts requests from any origin
10. **No HTTPS in Development:** localhost uses HTTP (mitigated by secure context)

#### Phase 2/3 (Planned - Under Development)
1. **Database Encryption:** Encryption at rest depends on PostgreSQL configuration
2. **Secret Management:** Environment variables for secrets (not production-grade)
3. **No WAF:** Web Application Firewall not implemented
4. **No Rate Limiting:** API rate limiting not yet implemented
5. **No MFA by Default:** Multi-factor authentication optional in Keycloak
6. **Limited Audit Logging:** Audit trail implementation incomplete

### Deployment Model

#### Development Deployment
```bash
cd hr-performance-app
npm install
npm run dev  # Vite dev server on http://localhost:5173
```
- **Hot Reload:** Enabled via Vite HMR
- **Source Maps:** Enabled for debugging
- **Whisper Server:** Optional (can run separately on port 3001)

#### Production Deployment (Docker Compose)

**Phase 1 Services:**
```yaml
services:
  - caddy:      ports 80, 443 (reverse proxy, HTTPS)
  - frontend:   nginx serving React SPA
  - whisper:    port 3001 (speech-to-text API)
```

**Phase 2/3 Services (Full Stack):**
```yaml
services:
  - caddy:      ports 80, 443 (reverse proxy, HTTPS)
  - frontend:   nginx serving React SPA
  - api:        port 3000 (Fastify backend)
  - whisper:    port 3001 (speech-to-text API)
  - postgres:   port 5432 (internal only)
  - keycloak:   port 8080 (internal only)
```

#### Environment Configuration
- **Domain:** Set via `DOMAIN` environment variable
- **Database Credentials:** `DB_PASSWORD` (must be changed from default)
- **Keycloak Admin:** `KC_ADMIN`, `KC_ADMIN_PASSWORD` (must be changed)
- **Whisper Model Size:** `WHISPER_MODEL` (tiny/base/small/medium/large)
- **Compute Type:** `WHISPER_COMPUTE_TYPE` (int8/int16/float32)

#### Persistent Data Volumes
- `postgres-data`: Database persistence
- `keycloak-data`: Identity provider data
- `whisper-cache`: ML model cache (reduces startup time)
- `caddy-data`: TLS certificates
- `caddy-config`: Caddy configuration cache

### Privacy & Compliance

#### Privacy Model (Phase 1)
- **Data Residency:** All data remains on user's device
- **No Server Storage:** Zero data transmitted to servers (except optional voice transcription)
- **No Cookies:** Application does not use cookies
- **No User Tracking:** Anonymous analytics via Plausible only
- **User Control:** Users can delete all data via browser localStorage clear

#### GDPR Considerations
- **Lawful Basis:** Legitimate interest (employment relationship)
- **Data Minimization:** Only necessary performance data collected
- **Purpose Limitation:** Data used only for performance reviews
- **Storage Limitation:** 14-day retention (Phase 1), configurable (Phase 2/3)
- **Data Portability:** DOCX export provides human-readable format
- **Right to Erasure:** Users can clear localStorage or request deletion

### Security Contacts

- **Source Code:** https://github.com/SimonvanAs/tss_ppm
- **Security Issues:** Report via GitHub Issues (private security advisories recommended)
- **Maintainer:** TSS (Total Specific Solutions)

### Document Revision History

- **Version 1.0** - Initial security architecture documentation
- **Date:** 2025-12-09
- **Application Version:** 1.2.1
