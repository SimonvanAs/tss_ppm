# TSS PPM v2.0 - Implementation Roadmap

Multi-tenant, multi-stage performance review system with Keycloak/EntraID authentication.

---

## Phase 1: Infrastructure Setup ✅

**Goal:** Set up the foundational backend services and database.

- [x] Create `api/` directory with Fastify + TypeScript project structure
- [x] Set up Prisma ORM with PostgreSQL schema
- [x] Create `Dockerfile.api` for the backend service
- [x] Update `docker-compose.yml` with new services:
  - PostgreSQL 16
  - Keycloak 25+
  - API (Fastify)
- [x] Update `Caddyfile` for `/api` and `/auth` routes
- [x] Create database seed script with default competencies

**Key Deliverables:**
- `api/` project with build/run scripts
- `prisma/schema.prisma` with all entities
- Working Docker stack with all 6 services

---

## Phase 2: Core Backend API ✅

**Goal:** Implement authentication, authorization, and core CRUD operations.

- [x] Implement JWT validation middleware (Keycloak token verification)
- [x] Implement tenant context middleware (OpCo isolation)
- [x] Port `scoring.js` logic to TypeScript backend
- [x] Implement User CRUD endpoints
- [x] Implement Review Cycle CRUD endpoints
- [x] Implement Goals endpoints (CRUD + reorder)
- [x] Implement Competency scoring endpoints
- [x] Add request validation with Zod schemas
- [x] Add audit logging middleware

**Key Deliverables:**
- Working API with Swagger documentation
- All CRUD endpoints functional
- Multi-tenant data isolation verified

---

## Phase 3: Multi-Stage Workflow ✅

**Goal:** Implement the 3-stage review workflow with state machine.

- [x] Implement review cycle state machine:
  - DRAFT → GOAL_SETTING → GOAL_SETTING_COMPLETE
  - → MID_YEAR_REVIEW → MID_YEAR_COMPLETE
  - → END_YEAR_REVIEW → COMPLETED
- [x] Goal locking after goal-setting stage completion
- [x] Goal change request workflow:
  - Employee submits request
  - Manager approves/rejects
  - Goal updated on approval
- [x] Stage transition permissions (who can advance stages)
- [x] Mid-year scores visible during end-year review
- [x] Stage-specific field editability rules

**Key Deliverables:**
- State machine with guards and validations
- Goal change request API
- Stage transition API

---

## Phase 4: Frontend Auth Integration ✅

**Goal:** Integrate Keycloak authentication into the React frontend.

- [x] Add Keycloak JS adapter (`keycloak-js` v26)
- [x] Create `AuthContext` with:
  - Login/logout methods
  - Token management (auto-refresh)
  - User profile state
  - Development mode for local testing without Keycloak
- [x] Create API client with automatic token injection (`src/services/api.js`)
- [x] Add `ProtectedRoute` wrapper component with role guards
- [x] Handle token refresh and session expiry
- [x] Add auth loading/error screens
- [x] Add user menu with role display and logout
- [x] Create environment variables example file
- [x] Create silent SSO check file for Keycloak
- [ ] Refactor `FormContext` to use API instead of localStorage (deferred to Phase 5)

**Key Files Created:**
- `src/services/api.js` - API client with token injection
- `src/config/auth.js` - Keycloak configuration
- `src/contexts/AuthContext.jsx` - Auth state management
- `src/components/ProtectedRoute.jsx` - Route protection + role guards
- `public/silent-check-sso.html` - Keycloak silent SSO
- `.env.example` - Environment variables template

**Key Files Modified:**
- `src/main.jsx` - Wrapped with AuthProvider
- `src/App.jsx` - Added auth screens and ProtectedRoute
- `src/components/Header.jsx` - Added user menu
- `src/App.css` - Auth screen styles
- `src/components/Header.css` - User menu styles
- `package.json` - Added keycloak-js dependency

**Key Deliverables:**
- Working SSO with EntraID via Keycloak
- API calls authenticated with JWT
- Session management in frontend
- Role-based access control infrastructure

---

## Phase 5: Role-Based UI ✅

**Goal:** Implement role-specific views and navigation.

- [x] Create `RoleGuard` component for conditional rendering (in ProtectedRoute.jsx)
- [x] Add role-based navigation menu:
  - Employee: My Reviews
  - Manager: Team, Approvals
  - HR: Dashboard, All Reviews
  - Admin: Admin Portal link
- [x] Create Manager team overview page
- [x] Create HR dashboard with OpCo statistics
- [x] Create approval workflows UI:
  - Pending goal change requests
  - Approve/reject functionality
- [x] Add React Router for navigation
- [x] Create ReviewContext for API-backed reviews
- [ ] Implement stage-aware form editing (deferred - requires API backend):
  - Show/hide fields based on stage
  - Enable/disable based on role

**Key Files Created:**
- `src/components/Navigation.jsx` - Role-based navigation component
- `src/components/Navigation.css` - Navigation styles
- `src/pages/MyReviews.jsx` - Employee reviews list
- `src/pages/TeamOverview.jsx` - Manager team view
- `src/pages/Approvals.jsx` - Pending approvals for managers
- `src/pages/HRDashboard.jsx` - HR statistics dashboard
- `src/pages/AllReviews.jsx` - All reviews with filters
- `src/pages/Pages.css` - Shared page styles
- `src/contexts/ReviewContext.jsx` - API-backed review state management

**Key Files Modified:**
- `src/App.jsx` - Added React Router with role-protected routes
- `src/test/test-utils.jsx` - Added MemoryRouter and AuthContext mock
- `src/languages/en.json` - Added nav and page translations
- `src/languages/nl.json` - Added Dutch translations
- `src/languages/es.json` - Added Spanish translations
- `package.json` - Added react-router-dom v7.1.1

**Key Deliverables:**
- Role-specific navigation with icon menu
- Manager team overview and approvals page
- HR dashboard with statistics
- All reviews page with filters

---

## Phase 6: Admin Portal

**Goal:** Build the OpCo and TSS admin interfaces.

### OpCo Admin Features:
- [ ] Admin dashboard with OpCo statistics
- [ ] Function title management (CRUD)
- [ ] TOV/IDE level management (CRUD)
- [ ] Competency customization per level
- [ ] User management:
  - View/search users
  - Assign roles
  - Set manager hierarchy
- [ ] Workflow settings (optional date defaults)

### TSS Super Admin Features:
- [ ] Cross-OpCo dashboard
- [ ] OpCo management (create, activate, deactivate)
- [ ] Global settings
- [ ] System health monitoring

**Key Deliverables:**
- Complete admin portal
- OpCo self-service configuration
- TSS oversight capabilities

---

## Phase 7: Testing & Quality

**Goal:** Ensure system reliability and security.

- [ ] API unit tests (Vitest)
- [ ] API integration tests
- [ ] Update E2E tests (Playwright) for new auth flow
- [ ] Security audit:
  - OWASP top 10 review
  - Penetration testing
  - Token security verification
- [ ] Load testing with multiple tenants
- [ ] Documentation:
  - API documentation (Swagger)
  - Deployment guide
  - User guide per role

**Key Deliverables:**
- 80%+ test coverage on API
- Security audit report
- Production-ready documentation

---

## Phase 8: Email Notifications (Future)

**Goal:** Add email notifications for workflow events.

- [ ] Email service integration (SMTP or SendGrid)
- [ ] Notification templates (multilingual)
- [ ] Notification triggers:
  - Review cycle created
  - Stage opened/due
  - Goal change request submitted
  - Approval required
  - Review completed
- [ ] User notification preferences
- [ ] Email queue with retry logic

**Status:** Nice to have - not blocking initial release

---

## Security & Privacy Requirements

### Data Protection

| Measure | Implementation | Priority |
|---------|----------------|----------|
| **Database Encryption at Rest** | PostgreSQL TDE or Azure/AWS disk encryption | P0 |
| **Column-Level Encryption** | Encrypt sensitive PII fields (performance scores, comments) with application-level encryption | P1 |
| **Data in Transit** | TLS 1.3 for all connections (Caddy auto-HTTPS, internal mTLS) | P0 |
| **Backup Encryption** | Encrypted backups with separate key management | P0 |

### Infrastructure Security

| Measure | Implementation | Priority |
|---------|----------------|----------|
| **Network Segmentation** | PostgreSQL/Keycloak on internal-only network, no public exposure | P0 |
| **Container Security** | Non-root users, minimal Alpine images, no privileged containers | P0 |
| **Image Scanning** | Trivy/Snyk scanning in CI/CD pipeline | P1 |
| **Secrets Management** | HashiCorp Vault or Azure Key Vault for all credentials | P1 |
| **Firewall Rules** | Allow only necessary ports, deny by default | P0 |

### Application Security

| Measure | Implementation | Priority |
|---------|----------------|----------|
| **Authentication** | Keycloak + EntraID with MFA enforcement | P0 |
| **Authorization** | Role-based access control (RBAC) with least privilege | P0 |
| **Session Security** | Short-lived JWTs (15min), secure refresh tokens, idle timeout | P0 |
| **Input Validation** | JSON Schema validation, parameterized queries (Prisma) | P0 |
| **Rate Limiting** | API rate limits per user/IP to prevent abuse | P1 |
| **Security Headers** | CSP, HSTS, X-Frame-Options, X-Content-Type-Options | P0 |
| **CORS** | Strict origin whitelist, no wildcards | P0 |

### Vulnerability Management

| Measure | Implementation | Frequency |
|---------|----------------|-----------|
| **Dependency Scanning** | npm audit, Snyk, Dependabot | Continuous |
| **SAST (Static Analysis)** | CodeQL, SonarQube | Per PR |
| **DAST (Dynamic Analysis)** | OWASP ZAP scans | Weekly |
| **Container Scanning** | Trivy for Docker images | Per build |
| **Penetration Testing** | Third-party security assessment | Annually |
| **Patch Management** | Security updates within 72h (critical), 30d (other) | Ongoing |

### Audit & Monitoring

| Measure | Implementation | Priority |
|---------|----------------|----------|
| **Audit Logging** | Immutable logs for all PII access/modifications | P0 |
| **Centralized Logging** | ELK Stack, Loki, or Azure Monitor | P1 |
| **Anomaly Detection** | Alert on unusual access patterns, failed logins | P1 |
| **MDR Integration** | Managed Detection & Response service integration | P1 |
| **Log Retention** | Security logs retained 1 year minimum | P0 |

### Backup & Recovery

| Measure | Implementation | Priority |
|---------|----------------|----------|
| **Automated Backups** | Daily full backup, hourly incremental | P0 |
| **Point-in-Time Recovery** | PostgreSQL WAL archiving for PITR | P1 |
| **Backup Encryption** | AES-256 encryption with separate key | P0 |
| **Offsite Storage** | Geo-redundant backup storage | P0 |
| **Restore Testing** | Monthly backup restore verification | P1 |
| **RTO/RPO Targets** | RTO: 4 hours, RPO: 1 hour | P0 |

### GDPR Compliance

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| **Legal Basis** | Determine: Consent vs Legitimate Interest (employer relationship) | LEGAL REVIEW REQUIRED |
| **Privacy Notice** | Clear notice on data collection, processing, retention | Required |
| **Data Minimization** | Only collect necessary data for performance reviews | Design principle |
| **Purpose Limitation** | Data used only for stated purposes | Policy + technical controls |
| **Right to Access** | Export own data (already have DOCX export) | Extend to full data export |
| **Right to Erasure** | Soft-delete with hard-delete after retention period | Implement |
| **Right to Rectification** | Users can correct their own data | Already supported |
| **Data Portability** | Machine-readable export (JSON/CSV) | Implement |
| **Data Retention** | Define retention periods, automatic deletion | Implement |
| **DPA with Processors** | Data Processing Agreements with cloud providers | Required |
| **DPIA** | Data Protection Impact Assessment for high-risk processing | LEGAL REVIEW REQUIRED |
| **Breach Notification** | Process for 72-hour notification to authorities | Document procedure |

#### GDPR Legal Questions (Requires Legal Review)

1. **Consent vs Legitimate Interest**: Is employee consent required, or does the employer's legitimate interest in performance management suffice?
2. **Cross-border transfers**: If using cloud services outside EU, are SCCs or adequacy decisions in place?
3. **Special categories**: Do performance reviews contain "special category" data (health, etc.)?
4. **Automated decision-making**: Does the 9-grid scoring constitute automated decision-making under Art. 22?
5. **Works council**: In some EU countries (e.g., Germany, Netherlands), works council approval may be required.

### Security Checklist for Go-Live

- [ ] All P0 security measures implemented
- [ ] Security audit completed
- [ ] Penetration test passed (no critical/high findings)
- [ ] GDPR legal review completed
- [ ] DPAs signed with all processors
- [ ] Privacy notice published
- [ ] Incident response procedure documented
- [ ] Backup/restore procedure tested
- [ ] MDR service onboarded
- [ ] Security training for administrators

---

## Technology Stack Summary

| Component | Technology |
|-----------|------------|
| Frontend | React 19 + Vite 7 |
| Backend API | Node.js + Fastify |
| Database | PostgreSQL 16 |
| ORM | Prisma |
| Auth | Keycloak 25+ with EntraID |
| Voice Input | Whisper (browser + server) |
| Proxy | Caddy 2 |
| Containers | Docker Compose |

---

## Key Decisions

| Decision | Choice |
|----------|--------|
| Multi-tenancy | Row-level security with `opco_id` |
| Workflow timing | Flexible per employee |
| Goal changes | Editable with manager approval |
| Admin portal | Integrated in same React app |
| Voice input | Keep both browser + server options |
| Data migration | Fresh start (no localStorage import) |

---

## Success Criteria

### Functional
- [ ] Users can authenticate via EntraID through Keycloak
- [ ] Each OpCo has isolated data and configuration
- [ ] 3-stage workflow functions correctly with proper permissions
- [ ] Goal change requests work with approval flow
- [ ] Mid-year scores visible during end-year review
- [ ] Admin portal allows OpCo self-service configuration
- [ ] All existing functionality (voice input, DOCX export) preserved
- [ ] System handles 50+ concurrent users per OpCo

### Security & Compliance
- [ ] All P0 security measures implemented and verified
- [ ] Data encrypted at rest and in transit
- [ ] Audit logging captures all PII access/modifications
- [ ] Penetration test completed with no critical/high findings
- [ ] GDPR legal review completed and requirements implemented
- [ ] Backup/restore procedures tested successfully
- [ ] MDR integration active and alerting
- [ ] Incident response procedure documented and tested
- [ ] Privacy notice and data processing documentation complete
