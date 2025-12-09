# Security Assessment Report

**Application**: HR Performance Scoring Web Application (TSS PPM)
**Version**: 1.2.1
**Analysis Date**: 2025-12-08
**Repository**: https://github.com/SimonvanAs/tss_ppm

---

## 1. Architecture Overview

This is a client-side React 19 application built with Vite that provides an HR Performance Scoring interface. The application architecture is entirely browser-based with the following key characteristics:

- **Frontend-only architecture**: No backend database or authentication server
- **Browser localStorage**: Primary data persistence mechanism
- **Optional server component**: Python-based Whisper transcription service for voice input
- **DOCX generation**: Client-side document generation using the `docx` npm package
- **Dual voice input modes**: Web Speech API (browser) OR Transformers.js Whisper (browser) OR Faster-Whisper server

### Deployment Architecture

```
┌─────────────────────────────────────────────┐
│  Caddy Reverse Proxy (HTTPS/TLS)            │
│  - SSL/TLS termination via Let's Encrypt    │
│  - Domain: configurable via env             │
└──────────────┬──────────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
┌──────▼─────┐   ┌──────▼──────────────┐
│  Frontend  │   │  Whisper Service     │
│  (Nginx)   │   │  (Python/Flask)      │
│  Port: 80  │   │  Port: 3001          │
└────────────┘   └─────────────────────┘
     │
     │ Serves static files & proxies /transcribe
     │
┌────▼──────────────────────┐
│  Browser                  │
│  - React App              │
│  - localStorage           │
│  - Web Speech API         │
│  - Transformers.js        │
└───────────────────────────┘
```

The application replaces an Excel-based performance review process with a web interface featuring:
- 9-grid performance scoring (WHAT-axis × HOW-axis)
- Multi-language support (English, Spanish, Dutch)
- Session-based auto-save with 14-day retention
- DOCX report generation
- Advanced voice input with ML-based transcription

## 2. Technology Stack

### Frontend Dependencies (package.json v1.2.1)
- **React 19.2.0**: UI framework (latest major version)
- **Vite 7.2.7**: Build tool and dev server
- **docx 9.5.1**: DOCX file generation
- **file-saver 2.0.5**: File download utility
- **uuid 13.0.0**: Session ID generation (UUID v4)
- **@huggingface/transformers 3.8.1**: Browser-based ML models (500MB+ Whisper models)
- Testing: Vitest 4.0.15, Playwright 1.57.0

### Backend Services (Optional Whisper Transcription)
- **Python 3.11-slim**: Runtime environment
- **Flask + Gunicorn**: HTTP server (production deployment)
- **faster-whisper**: Optimized speech-to-text (4x faster than PyTorch Whisper)
- **Model**: Whisper-small with int8 quantization
- **Resource Limits**: 4GB memory, 2GB reserved
- **Health Check**: `/health` endpoint with 30s interval

### Deployment Stack
- **Caddy 2**: Automatic HTTPS via Let's Encrypt, reverse proxy
- **Nginx Alpine**: Static file serving, /transcribe proxy
- **Docker Compose**: Multi-container orchestration
- **Networks**: Bridge network isolation between services
- **Volumes**: whisper-cache, caddy-data, caddy-config

### External Services
- **Web Speech API**: Browser-native speech recognition (no external data)
- **Plausible Analytics**: Privacy-focused analytics at `plausible.io/js/pa-OVp2RFVy8CfsubEwNvi3F.js`
- **Hugging Face CDN**: Whisper model downloads (browser mode only)

## 3. Data Flow Analysis

### Input Flow
1. User enters performance review data via forms (text inputs, textareas, dropdowns)
2. Voice input: Web Speech API (primary) → text or Whisper server (fallback) → text
3. Input validation: Client-side validation for required fields, weight percentages
4. Sanitization: `sanitizeInput()` function encodes HTML entities before storage

### Processing Flow
1. Form data stored in React state (FormContext)
2. Auto-save triggers after 2.5 seconds of inactivity
3. Scoring calculations performed client-side (WHAT/HOW axes, 9-grid mapping)
4. Session data serialized to JSON

### Storage Flow
1. Session data saved to browser localStorage
2. Session key format: `ppm_session_[10-char-alphanumeric]`
3. Timestamp stored for 14-day expiration check
4. No encryption applied to stored data

### Output Flow
1. User triggers DOCX download
2. Client-side DOCX generation using `docx` package
3. File downloaded directly to user's device
4. No server-side storage or transmission

## 4. Authentication & Authorization

**CRITICAL FINDING**: The application has NO authentication or authorization mechanisms.

- No user login/registration system
- No access controls
- No role-based permissions
- No session authentication beyond localStorage keys
- Anyone with the URL can create/access review sessions
- Anyone with physical access to device can read localStorage data

Session management:
- 10-character alphanumeric session codes (random, not cryptographically secure)
- Session codes used only for localStorage key generation
- No server-side session validation
- 14-day expiration based on client-side timestamp

## 5. Data Storage & Persistence

### localStorage Implementation
**Location**: `hr-performance-app/src/utils/session.js`

Stored data includes:
- Employee name and role
- TOV level (A/B/C/D)
- Up to 9 goals with titles, descriptions, scores, and weights
- 6 competency scores per TOV level
- Competency strengths, improvements, and goal comments (multi-line text)
- Self-assessment text
- Language preference
- Last modified timestamp

**Security Concerns**:
- ❌ No encryption at rest
- ❌ Plaintext storage of potentially sensitive performance data
- ❌ Accessible via browser DevTools or file system access
- ❌ No data integrity checks (HMAC, signatures)
- ✅ Input sanitization prevents XSS in stored data
- ✅ 14-day auto-expiration reduces data exposure window

### Privacy Policy
**Location**: `hr-performance-app/PRIVACY_POLICY.md`

Documents that:
- No personal data sent to external servers (except optional Whisper transcription)
- Data stored locally in browser
- No cookies beyond analytics
- Users responsible for securing their devices

## 6. External Dependencies & APIs

### npm Packages (24 total)
**High-risk dependencies**:
- `@huggingface/transformers` (3.2.2): Large ML library, potential supply chain risk
- `onnxruntime-web` (1.20.2): WebAssembly runtime for ML models
- `docx` (8.5.0): DOCX generation - handles user input in document creation
- `file-saver` (2.0.5): File download utility

**Security Controls**:
- Weekly `npm audit` via GitHub Actions (`.github/workflows/security.yml`)
- Dependabot enabled for automated dependency updates

### External APIs
1. **Web Speech API**: Browser-native, no data leaves browser
2. **Whisper Server** (optional):
   - Endpoint: `http://localhost:5000/transcribe`
   - Sends audio files for transcription
   - CORS enabled for localhost:5173
3. **Plausible Analytics**: External script (`https://plausible.io/js/script.js`)
   - Privacy-focused, GDPR-compliant
   - Optional (can be disabled)

## 7. Input/Output Mechanisms

### User Inputs
1. **Text fields**: Employee name, role, goal titles, descriptions
2. **Textareas**: Competency comments, self-assessment
3. **Dropdowns**: TOV level selection, language selection
4. **Number inputs**: Goal scores (1-3), competency scores (1-3)
5. **Percentage inputs**: Goal weight percentages
6. **Voice input**: Microphone audio → text transcription

### Input Validation
**Location**: `hr-performance-app/src/utils/session.js` (`sanitizeInput` function)

```javascript
const sanitizeInput = (value) => {
  if (typeof value !== 'string') return value;
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};
```

**Strengths**:
- ✅ HTML entity encoding prevents stored XSS
- ✅ Applied to all string inputs before localStorage storage

**Weaknesses**:
- ❌ No input length limits (potential DoS via localStorage quota exhaustion)
- ❌ No content security policy (CSP) headers
- ❌ No rate limiting on voice transcription endpoint
- ❌ File upload validation relies on extension-based detection

### Outputs
1. **DOCX file generation**: Client-side, uses user input directly
2. **9-grid visualization**: SVG rendering with calculated scores
3. **Session code display**: 10-character alphanumeric code

## 8. Key Security-Relevant Components

### Critical Components
1. **FormContext** (`src/contexts/FormContext.jsx`)
   - Manages all application state
   - Handles auto-save logic
   - Stores sensitive performance data

2. **session.js** (`src/utils/session.js`)
   - Generates session codes
   - Saves/loads localStorage data
   - Input sanitization
   - Session expiration logic

3. **docxGenerator.js** (`src/utils/docxGenerator.js`)
   - Creates DOCX files with user input
   - No additional sanitization before document generation
   - Potential injection risk if sanitization bypassed

4. **useVoiceInput.jsx** (`src/hooks/useVoiceInput.jsx`)
   - Handles microphone permissions
   - Web Speech API integration
   - Fallback to Whisper server with file uploads

5. **whisper_server_faster.py** (`server/whisper_server_faster.py`)
   - Accepts file uploads without robust validation
   - No authentication required
   - CORS enabled for localhost only

### Sensitive Data Handlers
- Employee personal information (name, role)
- Performance scores and ratings
- Manager comments on competencies
- Self-assessment narratives
- TOV level classifications

## 9. Initial Security Observations

### High-Risk Findings

1. **No Authentication/Authorization** ⚠️ CRITICAL
   - Zero access controls
   - Anyone can create or access sessions
   - Unsuitable for confidential performance data

2. **Unencrypted Data Storage** ⚠️ HIGH
   - Plaintext localStorage exposes sensitive employee data
   - Physical device access = full data access
   - Browser sync features could leak data across devices

3. **File Upload Vulnerability** ⚠️ MEDIUM
   - Whisper server accepts arbitrary files
   - Extension-based validation can be spoofed
   - No file size limits enforced
   - No authentication on upload endpoint

4. **No Content Security Policy** ⚠️ MEDIUM
   - Missing CSP headers increase XSS risk
   - External script (Plausible) not integrity-checked

5. **Supply Chain Risks** ⚠️ MEDIUM
   - 24 npm dependencies, some large (Hugging Face transformers)
   - Automated scanning present but not sufficient

### Positive Security Features

1. **Input Sanitization** ✅
   - HTML entity encoding prevents stored XSS
   - Consistently applied across all text inputs

2. **Client-Side Processing** ✅
   - DOCX generation happens locally
   - No sensitive data transmitted to servers (except optional Whisper)

3. **Data Expiration** ✅
   - 14-day auto-deletion reduces exposure window
   - Old sessions automatically cleaned up

4. **Privacy-Focused Design** ✅
   - Minimal external dependencies
   - Privacy policy clearly documents data handling
   - Web Speech API keeps voice data local

5. **Automated Security Scanning** ✅
   - GitHub Actions workflow runs npm audit weekly
   - Dependabot enabled for dependency updates

### Risk Assessment

**Current Security Posture**: LOW-MEDIUM

This application is appropriate for:
- Non-confidential performance reviews
- Internal use within trusted environments
- Scenarios where physical device security is ensured
- Users who understand data is stored locally unencrypted

**NOT appropriate for**:
- Highly confidential performance data
- Multi-tenant environments
- Compliance-regulated industries (HIPAA, SOX, etc.)
- Public-facing deployment without authentication

## 10. Attack Surface Mapping

### 10.1 Client-Side Attack Vectors

#### localStorage Manipulation (HIGH RISK)
**Entry Points**:
- Browser DevTools → Application → Local Storage
- Malicious browser extensions
- XSS attacks leading to localStorage access
- Physical device access

**Attack Scenarios**:
1. Direct modification of session data to alter scores/comments
2. Injection of XSS payloads into stored text fields
3. Timestamp manipulation to extend session beyond 14 days
4. Session enumeration by iterating UUID-based codes
5. Data exfiltration by reading all stored sessions

**Current Controls**:
- HTML entity encoding in `sanitizeInput()`
- 14-day expiration cleanup
- Session code entropy (UUID v4 substring)

**Gaps**:
- No encryption at rest
- No HMAC or signature validation
- No integrity checks
- No Content Security Policy

#### Cross-Site Scripting (XSS) (MEDIUM-HIGH RISK)
**Potential Injection Points**:
1. Employee Name field → appears in DOCX header
2. Goal titles/descriptions → 9 fields, rendered in grid
3. Competency notes → 6 notes per TOV level
4. Self-assessment textarea → large text field
5. Additional comments → large text field
6. Voice transcription results → ML-generated text

**Attack Vectors**:
- Stored XSS via localStorage
- DOM-based XSS if sanitization bypassed
- XSS via DOCX generation (docx library)
- Adversarial audio to produce XSS strings via Whisper

**Current Mitigations**:
- React JSX auto-escaping
- HTML entity encoding before storage
- No dangerouslySetInnerHTML usage detected

**Gaps**:
- No Content Security Policy headers
- No Subresource Integrity for external scripts
- Plausible Analytics script not SRI-protected

#### Voice Input Vulnerabilities (MEDIUM RISK)
**Browser Mode (Transformers.js)**:
- Model downloaded from Hugging Face CDN without integrity checks
- 500MB Whisper-small model could be MITM'd
- Cache poisoning risk for model files
- Adversarial audio examples could fool model

**Server Mode (Faster-Whisper)**:
- POST /transcribe endpoint has no authentication
- Max upload 50MB enforced by nginx
- No rate limiting visible
- Audio files not validated beyond size
- Potential ffmpeg exploits via malicious audio

**Current Controls**:
- Nginx upload limit (50MB)
- Gunicorn timeout (300s)
- Docker resource limits (4GB memory)
- Browser-side WAV conversion

**Gaps**:
- No authentication on /transcribe
- No rate limiting
- No audio file magic number validation
- No model checksum verification

### 10.2 Network Attack Vectors

#### Man-in-the-Middle (MITM) (LOW RISK - if HTTPS enforced)
**Attack Scenarios**:
- Intercept audio uploads to /transcribe
- Inject malicious Whisper models during download
- Steal session codes from network traffic
- Modify DOCX before download

**Current Mitigations**:
- Caddy automatic HTTPS via Let's Encrypt
- TLS termination at reverse proxy

**Gaps**:
- No HSTS header detected in nginx config
- No HTTP → HTTPS redirect enforcement
- No certificate pinning

#### Cross-Origin Attacks (LOW RISK)
**CORS Configuration**:
- Nginx proxies /transcribe to whisper:3001 (same-origin)
- No explicit CORS policy in nginx.conf
- Default same-origin policy applies

**Risk**: Minimal (SPA architecture, same-origin)

### 10.3 Dependency Vulnerabilities (MEDIUM RISK)

**High-Risk Dependencies**:

| Package | Version | Risk Level | Attack Surface |
|---------|---------|-----------|----------------|
| @huggingface/transformers | 3.8.1 | HIGH | 500MB+ models, WASM/WebGPU execution, CDN downloads |
| docx | 9.5.1 | MEDIUM | DOCX generation from user input, XML parsing |
| react | 19.2.0 | LOW | Latest version, auto-escaping |
| vite | 7.2.7 | LOW | Dev tool, not in production bundle |
| file-saver | 2.0.5 | LOW | Older package, simple file download |
| uuid | 13.0.0 | LOW | Crypto functions, session IDs |

**Supply Chain Risks**:
- Transformers.js has large dependency tree
- No npm package signature verification
- No lockfile checksum validation in CI/CD

**Current Controls**:
- GitHub Actions `npm audit` (if configured)
- Dependabot alerts enabled
- `npm ci` in Dockerfile (uses package-lock.json)

**Gaps**:
- No SCA (Software Composition Analysis) tool
- No SBOM (Software Bill of Materials)
- No package integrity checks

### 10.4 Docker Security (MEDIUM RISK)

**Container Risks**:
1. **Running as root**: No USER directive in Dockerfiles
2. **Secrets in images**: Hardcoded model names in ENV vars
3. **Base image vulnerabilities**: Using Alpine/Slim images (good) but no scanning
4. **Volume permissions**: whisper-cache volume accessible

**Current Controls**:
- Multi-stage builds (frontend)
- Official base images (node:25-alpine, python:3.11-slim, nginx:alpine)
- Bridge network isolation
- Resource limits on Whisper container
- Health checks

**Gaps**:
- No image vulnerability scanning (Trivy, Snyk)
- Containers run as root
- No read-only filesystems
- No AppArmor/SELinux profiles
- No secrets management (Docker secrets)

### 10.5 Third-Party Service Risks (LOW RISK)

#### Plausible Analytics
- Script loaded from `plausible.io/js/pa-OVp2RFVy8CfsubEwNvi3F.js`
- No Subresource Integrity (SRI)
- GDPR-compliant, privacy-focused
- Risk: Script compromise at Plausible could inject malicious code

#### Hugging Face CDN (Browser Mode Only)
- Whisper models downloaded on-demand
- No checksum validation
- Risk: MITM model replacement

## 11. Critical Security Files

### High-Priority Review Files

| File Path | Security Relevance | Key Functions |
|-----------|-------------------|---------------|
| `src/utils/session.js` | XSS prevention, session security | `sanitizeInput()`, `saveSession()`, `loadSession()` |
| `src/contexts/FormContext.jsx` | Data flow control, auto-save | `sanitizeFormData()`, `manualSave()` |
| `src/utils/docxGenerator.js` | Output encoding | `generateReport()`, DOCX creation |
| `src/hooks/useWhisper.js` | Voice transcription | `transcribeWithServer()`, `transcribeWithBrowser()` |
| `src/contexts/WhisperContext.jsx` | ML model loading | `loadModel()`, `transcribe()` |
| `nginx.conf` | HTTP security headers | Proxy config, upload limits |
| `docker-compose.yml` | Service isolation | Network config, resource limits |
| `Dockerfile.whisper` | Server security | Python dependencies, model download |
| `index.html` | CSP, external scripts | Plausible Analytics script tag |

### Input Validation Files
- `src/components/EmployeeInfo.jsx` - Employee data
- `src/components/WhatAxis.jsx` - Goal scoring
- `src/components/HowAxis.jsx` - Competency assessment
- `src/components/VoiceInputButton.jsx` - Voice input handling

## 12. Threat Model Summary (STRIDE)

| Threat | Scenario | Likelihood | Impact | Risk | Current Mitigation |
|--------|----------|-----------|--------|------|-------------------|
| **Spoofing** | Session code guessing | Low | Medium | MEDIUM | UUID v4 entropy |
| **Tampering** | localStorage modification | High | High | HIGH | HTML encoding only |
| **Repudiation** | No audit logs | N/A | Low | LOW | None (by design) |
| **Info Disclosure** | localStorage theft | Medium | High | HIGH | 14-day expiration |
| **DoS** | Audio upload flood | Medium | Medium | MEDIUM | 50MB upload limit |
| **Elevation** | XSS → full DOM access | Medium | High | HIGH | React escaping |

## 13. Compliance Considerations

### GDPR Alignment
- ✅ Data minimization (local storage only)
- ✅ Storage limitation (14-day auto-delete)
- ✅ Privacy by design (no central database)
- ⚠️ Consent management (privacy policy present but no consent banner)
- ⚠️ Right to erasure (manual session deletion available)
- ⚠️ Data portability (DOCX export available)
- ❌ Breach notification (no audit trail)
- ❌ Data encryption (localStorage is plaintext)

### Data Classification

| Data Type | Sensitivity | PII | Storage Location | Retention |
|-----------|------------|-----|-----------------|-----------|
| Employee Name | HIGH | Yes | localStorage | 14 days |
| Performance Scores | HIGH | No | localStorage | 14 days |
| Manager Comments | HIGH | No | localStorage | 14 days |
| Competency Assessments | MEDIUM | No | localStorage | 14 days |
| Voice Audio | HIGH | No | Memory only | Immediate deletion |
| Session Code | LOW | No | localStorage | 14 days |
| Generated DOCX | HIGH | Yes | User download | User-controlled |

## 14. Security Recommendations

### Immediate Actions (High Priority)

1. **Implement Content Security Policy**
   ```nginx
   add_header Content-Security-Policy "default-src 'self'; script-src 'self' https://plausible.io; connect-src 'self' https://cdn.huggingface.co; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';" always;
   ```

2. **Add HTTP Security Headers** (nginx.conf)
   - `X-Frame-Options: DENY`
   - `X-Content-Type-Options: nosniff`
   - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
   - `Referrer-Policy: no-referrer`
   - `Permissions-Policy: microphone=(self)`

3. **Add Subresource Integrity (SRI)** for Plausible script
   ```html
   <script src="..." integrity="sha384-..." crossorigin="anonymous"></script>
   ```

4. **Implement Rate Limiting** on /transcribe endpoint
   - Use nginx `limit_req` module
   - Max 10 requests per minute per IP

5. **Add Audio File Validation** in Whisper server
   - Magic number validation (WAV header check)
   - File type whitelist (audio/wav only)
   - Virus scanning integration

### Short-Term Actions (Medium Priority)

6. **Encrypt localStorage Data**
   - Use Web Crypto API (SubtleCrypto)
   - Encrypt session data with user-derived key
   - Add HMAC signatures for integrity

7. **Enhance Session Security**
   - Use cryptographically secure session codes
   - Add session signature validation
   - Implement session binding to browser fingerprint

8. **Dependency Security**
   - Set up automated npm audit in CI/CD
   - Enable Dependabot
   - Add SCA tool (Snyk, Sonatype)
   - Generate SBOM

9. **Docker Hardening**
   - Run containers as non-root user
   - Add image vulnerability scanning (Trivy)
   - Implement read-only filesystems where possible
   - Use Docker secrets for sensitive config

10. **Model Integrity Checks**
    - Validate Whisper model checksums
    - Implement SRI for model downloads
    - Pin model versions

### Long-Term Actions (Lower Priority)

11. **Authentication & Authorization**
    - Add user authentication system
    - Implement role-based access control
    - Session-based or JWT authentication

12. **Backend Security**
    - Move to persistent backend database
    - Implement server-side encryption
    - Add comprehensive audit logging

13. **Compliance**
    - Add GDPR consent management
    - Implement data export/deletion workflows
    - Create audit trail for compliance

14. **Monitoring & Detection**
    - Add security event logging
    - Implement anomaly detection
    - Set up alerting for suspicious activity

15. **Penetration Testing**
    - Conduct XSS testing across all inputs
    - Test session enumeration/hijacking
    - Validate localStorage injection vectors
    - Test audio-based injection attacks

---

## 15. Conclusion

The HR Performance Scoring Application demonstrates a **privacy-first architecture** with strong data retention policies and minimal server dependencies. However, the lack of authentication, unencrypted localStorage, and missing security headers present significant risks for handling sensitive employee performance data.

**Overall Security Posture**: MODERATE (improved from LOW-MEDIUM)

**Key Strengths**:
- Privacy-by-design architecture
- Client-side processing minimizes data exposure
- Input sanitization implemented
- Auto-expiration reduces data retention risks
- Docker isolation for services

**Key Weaknesses**:
- No authentication or authorization
- Unencrypted localStorage storage
- Missing Content Security Policy
- Unauthenticated /transcribe endpoint
- No localStorage integrity checks
- Limited dependency vulnerability scanning

**Recommended Next Steps**:
1. Implement CSP and security headers (immediate)
2. Add rate limiting and audio validation (short-term)
3. Encrypt localStorage data (short-term)
4. Add authentication system (long-term)

**Risk Level**: MEDIUM - Suitable for internal use with trusted users and non-sensitive data. Requires significant hardening before handling highly confidential performance reviews or deployment in regulated environments.

---

**Document Version**: 2.0
**Last Updated**: 2025-12-08
**Next Review**: Q1 2026
