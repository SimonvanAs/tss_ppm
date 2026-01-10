# User Authentication

## Title

Secure User Authentication with Role-Based Access Control via Keycloak SSO

---

## User Story

**As a** TSS PPM system user (Employee, Manager, HR, or Admin),
**I want to** authenticate securely using my corporate identity (EntraID/OIDC) via a branded login experience,
**So that** I can access role-appropriate features while my personal data remains protected and my actions are auditable.

---

## Problem / Goal

**Problem:**
- Excel-based reviews have no access control, audit trail, or identity verification
- HR data requires strict access controls to protect PII and ensure GDPR compliance
- Different user roles need varying levels of access to review data
- Organizations need a unified login experience across multiple OpCos (operating companies)

**Goal:**
- Provide enterprise-grade authentication with single sign-on (SSO) capability
- Enforce role-based access control (RBAC) across all application features
- Enable full audit trail of authentication events for compliance
- Deliver a branded login experience consistent with TSS PPM styling

---

## Users & Context

### Personas/Roles

| Role | Description | Authentication Context |
|------|-------------|------------------------|
| **EMPLOYEE** | Regular employee accessing own reviews | Login to view/edit own goals and reviews |
| **MANAGER** | Team lead managing direct reports | Login to score team reviews and approve goal changes |
| **HR** | Human Resources staff | Login to view all reviews and manage calibration |
| **ADMIN** | System administrator | Login to configure OpCo settings (no access to review content) |

### Preconditions

- User must have an account provisioned in Keycloak (or federated via EntraID)
- User must be assigned to at least one OpCo (Operating Company)
- User must have at least the `employee` role assigned
- Keycloak v26 instance must be running and accessible
- TLS/HTTPS must be configured for production environments

### Environment Support

- Corporate SSO via EntraID/Azure AD federation (OIDC)
- Direct Keycloak authentication for development/testing
- Multi-tenant architecture with OpCo isolation

---

## In Scope

- Keycloak JS adapter v26 integration with Vue 3 frontend
- Custom TSS-PPM branded login theme (Magenta #CC0E70, Navy Blue #004A91, Tahoma font)
- OIDC/OAuth 2.0 standard flow authentication
- EntraID federation support for corporate SSO
- JWT token-based API authentication with automatic refresh
- Role-based route protection (frontend)
- Role-based API authorization (backend)
- OpCo claim in JWT tokens for multi-tenant isolation
- Brute force protection (5 failed attempts = 15 minute lockout)
- Password reset functionality
- Session timeout handling
- Audit logging for authentication events
- Logout functionality with token invalidation

## Out of Scope

- User provisioning/self-registration (disabled by design)
- Multi-factor authentication configuration (deferred to Keycloak admin)
- SAML authentication support
- Social login providers (Google, Facebook, etc.)
- Custom password policies (managed in Keycloak admin)
- User profile editing beyond basic fields
- AFAS HRIS integration for user sync (Phase 4+)

---

## User Journey

### Happy Path: Login Flow

```
User                    Frontend               Keycloak              Backend API
  |                         |                      |                      |
  |---(1) Access app------->|                      |                      |
  |                         |                      |                      |
  |                         |---(2) Check auth---->|                      |
  |                         |                      |                      |
  |<----(3) Redirect to branded login page--------|                      |
  |                         |                      |                      |
  |---(4) Enter credentials------------------->---|                      |
  |                         |                      |                      |
  |<---(5) Redirect with auth code----------------|                      |
  |                         |                      |                      |
  |                         |---(6) Exchange code->|                      |
  |                         |                      |                      |
  |                         |<--(7) JWT tokens-----|                      |
  |                         |                      |                      |
  |                         |-------(8) API call with Bearer token------->|
  |                         |                      |                      |
  |                         |<------(9) Protected resource---------------|
  |                         |                      |                      |
  |<----(10) Render dashboard based on role--------|                      |
```

### UX States

#### 1. Unauthenticated State
- User attempts to access any protected route
- Automatic redirect to Keycloak login page
- TSS-PPM branded login form displayed
- Language selector available (EN/NL/ES)

#### 2. Login Form State
- TSS logo prominently displayed
- Branded color scheme (magenta gradient background)
- Email/username input field
- Password input field
- "Remember me" checkbox
- "Forgot password" link
- Submit button with hover state
- Error message area (initially hidden)

#### 3. Loading State (During Authentication)
- Subtle loading indicator
- Disabled form fields during submission
- "Authenticating..." message

#### 4. Error State
- Invalid credentials: "Invalid username or password"
- Account locked: "Account temporarily locked. Try again in X minutes."
- Network error: "Unable to connect. Please check your connection."
- Session expired: "Your session has expired. Please log in again."
- Error messages in magenta/red color (#DC3545)
- Clear action to retry

#### 5. Authenticated State
- Redirect to role-appropriate dashboard:
  - EMPLOYEE: Personal review dashboard
  - MANAGER: Team management dashboard
  - HR: Organization analytics dashboard
  - ADMIN: System administration dashboard
- User info visible in header (name, role indicator)
- Logout option accessible

#### 6. Token Refresh State (Background)
- Automatic token refresh before expiration
- No user interaction required
- Graceful degradation if refresh fails (redirect to login)

#### 7. Logout State
- "Logging out..." transition message
- Token invalidation
- Redirect to login page
- Optional: "You have been logged out successfully" message

---

## Acceptance Criteria

### AC1: Initial Authentication

```gherkin
Feature: User Login

Scenario: Successful login with valid credentials
  Given a user with email "manager@tss.eu" exists in Keycloak
  And the user has roles ["employee", "manager"]
  And the user is assigned to OpCo "tss"
  When the user navigates to the TSS PPM application
  And the user is redirected to the Keycloak login page
  And the user enters valid credentials
  And the user submits the login form
  Then the user is authenticated successfully
  And the user is redirected to the Manager dashboard
  And a valid JWT access token is stored
  And the token contains the user's roles ["employee", "manager"]
  And the token contains the opco_id claim "tss"
  And an authentication success event is logged

Scenario: Failed login with invalid credentials
  Given a user attempts to log in
  When the user enters an invalid password
  Then an "Invalid username or password" error message is displayed
  And the user remains on the login page
  And a failed login attempt is recorded
  And no JWT token is issued

Scenario: Account lockout after multiple failed attempts
  Given brute force protection is enabled with failureFactor=5
  When a user fails to authenticate 5 times consecutively
  Then the account is temporarily locked
  And a "Account temporarily locked" message is displayed
  And the lockout duration is 15 minutes (900 seconds)
  And subsequent login attempts are rejected until lockout expires
```

### AC2: Token Management

```gherkin
Feature: JWT Token Handling

Scenario: Automatic token refresh
  Given a user is authenticated
  And the access token will expire in less than 60 seconds
  When the frontend detects the token is near expiration
  Then the refresh token is used to obtain a new access token
  And the new token is stored silently
  And the user session continues uninterrupted

Scenario: Token validation on API requests
  Given a user has a valid JWT access token
  When the user makes an API request to a protected endpoint
  Then the Bearer token is included in the Authorization header
  And the backend validates the token signature
  And the backend verifies the token is not expired
  And the backend extracts user roles and opco_id from claims
  And the request proceeds if validation passes

Scenario: Expired token handling
  Given a user has an expired access token
  And the refresh token is also expired
  When the user makes an API request
  Then the request receives a 401 Unauthorized response
  And the user is redirected to the login page
  And a "Session expired" message is displayed
```

### AC3: Role-Based Access Control (RBAC)

```gherkin
Feature: Role-Based Route Protection

Scenario: Employee accessing own reviews
  Given a user with only the "employee" role is authenticated
  When the user navigates to "/reviews/me"
  Then the user can view their own reviews
  And the user can edit their own goals (during goal-setting stage)

Scenario: Employee attempting to access team reviews
  Given a user with only the "employee" role is authenticated
  When the user attempts to navigate to "/team/reviews"
  Then the user is redirected to an access denied page
  And a 403 Forbidden event is logged

Scenario: Manager accessing team dashboard
  Given a user with the "manager" role is authenticated
  When the user navigates to "/team"
  Then the user can view reviews for their direct reports only
  And the user cannot view reviews for other teams

Scenario: HR accessing all reviews
  Given a user with the "hr" role is authenticated
  When the user navigates to "/analytics"
  Then the user can view anonymized analytics for all reviews
  And the user can access calibration sessions

Scenario: Admin configuration access
  Given a user with the "admin" role is authenticated
  When the user navigates to "/admin/settings"
  Then the user can configure OpCo settings
  And the user cannot view individual review content (GDPR compliance)
```

### AC4: OpCo Data Isolation

```gherkin
Feature: Multi-Tenant Data Isolation

Scenario: Data scoped to user's OpCo
  Given a user is authenticated with opco_id="tss"
  When the user requests reviews from the API
  Then only reviews belonging to OpCo "tss" are returned
  And reviews from other OpCos are not accessible

Scenario: Cross-OpCo access denied
  Given a user from OpCo "tss" is authenticated
  When the user attempts to access a review from OpCo "abc"
  Then a 403 Forbidden response is returned
  And an unauthorized access attempt is logged
```

### AC5: Logout

```gherkin
Feature: User Logout

Scenario: Successful logout
  Given a user is authenticated
  When the user clicks the logout button
  Then the access token is invalidated
  And the refresh token is invalidated
  And local storage/session storage is cleared
  And the user is redirected to the login page
  And a logout event is logged

Scenario: Logout on all devices (optional)
  Given a user is authenticated on multiple devices
  When the user logs out with "logout everywhere" option
  Then all active sessions for that user are terminated
```

### AC6: Branded Login Experience

```gherkin
Feature: Custom Login Theme

Scenario: TSS-PPM branded login page
  Given a user navigates to the login page
  Then the TSS-PPM custom theme is displayed
  And the TSS logo is visible at the top
  And the background uses the magenta gradient (#CC0E70)
  And the form uses Tahoma font family
  And the submit button uses the magenta brand color
  And the page is responsive for mobile devices

Scenario: Error messages match branding
  Given a login error occurs
  Then the error message uses the error color (#DC3545)
  And the error styling is consistent with application design
```

### Definition of Done Checklist

- [ ] Keycloak v26 is deployed with TSS-PPM realm configuration
- [ ] Custom TSS-PPM login theme is installed and active
- [ ] Vue 3 frontend integrates with Keycloak JS adapter
- [ ] All protected routes redirect to login for unauthenticated users
- [ ] JWT tokens include roles and opco_id claims
- [ ] FastAPI backend validates JWT tokens on all protected endpoints
- [ ] Role-based guards implemented for all routes and API endpoints
- [ ] Token refresh works silently without user intervention
- [ ] Logout properly invalidates tokens and clears local state
- [ ] Error messages are user-friendly and localized (EN/NL/ES)
- [ ] Audit logs capture login, logout, and authorization failures
- [ ] Unit tests cover auth service with 80%+ coverage
- [ ] Integration tests verify end-to-end authentication flow
- [ ] Security testing completed (no XSS in login, secure token storage)
- [ ] Documentation updated (setup guide, troubleshooting)
- [ ] Accessibility audit passed (keyboard navigation, screen reader support)

---

## Non-Functional Requirements (NFRs)

### Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| Login page load time | < 2 seconds | Time to interactive |
| Token validation latency | < 50ms | 95th percentile |
| Token refresh time | < 500ms | 95th percentile |
| Redirect after login | < 1 second | Time from Keycloak callback to dashboard |

### Reliability

| Requirement | Target |
|-------------|--------|
| Keycloak availability | 99.9% uptime |
| Graceful degradation | App shows "Service unavailable" if Keycloak unreachable |
| Token refresh retry | 3 retries with exponential backoff |
| Session persistence | Survive browser refresh without re-login |

### Security & Privacy

| Requirement | Implementation |
|-------------|----------------|
| Token storage | HttpOnly cookies or secure localStorage (no XSS exposure) |
| HTTPS required | TLS 1.2+ for all authentication traffic |
| Token lifetime | Access: 5 minutes, Refresh: 30 minutes (configurable) |
| Brute force protection | 5 failed attempts = 15 minute lockout |
| Password policy | Enforced via Keycloak (min 8 chars, complexity) |
| PII protection | No PII in access tokens beyond necessary claims |
| GDPR compliance | Consent logging, data access audit trail |
| XSS prevention | All inputs sanitized, CSP headers enabled |
| CSRF protection | State parameter in OIDC flow |

### Audit & Compliance

| Event | Logged Data |
|-------|-------------|
| Login success | User ID, timestamp, IP address, user agent |
| Login failure | Attempted username, timestamp, IP address, failure reason |
| Logout | User ID, timestamp, session duration |
| Authorization failure | User ID, attempted resource, timestamp |
| Token refresh | User ID, timestamp |
| Account lockout | User ID, timestamp, failed attempt count |

### Accessibility (WCAG 2.1 AA)

- Login form is fully keyboard navigable
- Form fields have proper labels and ARIA attributes
- Error messages are announced to screen readers
- Color contrast meets 4.5:1 ratio for all text
- Focus states are visible and consistent
- No CAPTCHA (brute force handled by Keycloak lockout)

### Observability

| Type | Implementation |
|------|----------------|
| Logs | Structured JSON logs for all auth events |
| Metrics | Login success/failure rates, token refresh counts |
| Traces | Distributed tracing for auth flow (Keycloak <-> API) |
| Alerting | Alert on >10% login failure rate in 5 minutes |

### Compatibility

| Platform | Support |
|----------|---------|
| Browsers | Chrome, Firefox, Safari, Edge (latest 2 versions) |
| Mobile | iOS Safari, Chrome for Android |
| Keycloak version | v26.x |
| EntraID | Azure AD OIDC federation |

### Localization

| Language | Support |
|----------|---------|
| English (EN) | Full support (default) |
| Dutch (NL) | Full support |
| Spanish (ES) | Full support |
| Localized elements | Login form labels, error messages, email templates |

---

## Analytics & Tracking

### Events to Emit

| Event Name | Trigger | Properties |
|------------|---------|------------|
| `auth_login_initiated` | User redirected to login | `source_page` |
| `auth_login_success` | Successful authentication | `role`, `opco_id`, `is_sso` |
| `auth_login_failed` | Failed authentication | `error_type` |
| `auth_logout` | User logs out | `session_duration_seconds` |
| `auth_token_refreshed` | Token successfully refreshed | - |
| `auth_token_refresh_failed` | Token refresh failed | `error_type` |
| `auth_session_expired` | Session timeout | `session_duration_seconds` |
| `auth_access_denied` | RBAC denial | `attempted_resource`, `user_role` |

### Success Metrics

| Metric | Target | Description |
|--------|--------|-------------|
| Login success rate | > 99% | Successful logins / total login attempts |
| Avg login time | < 5 seconds | Time from initiating login to dashboard |
| Token refresh success | > 99.9% | Silent refresh success rate |
| Session duration | > 20 minutes avg | Indicates engaged users |
| Access denial rate | < 1% | Users attempting unauthorized access |
| Password reset rate | < 5% monthly | Indicates password policy friction |

---

## QA / Test Notes

### Manual Test Cases

1. **Login with valid credentials** - Verify redirect to correct dashboard based on role
2. **Login with invalid password** - Verify error message and retry ability
3. **Account lockout** - Verify 5 failed attempts triggers lockout
4. **Password reset flow** - Verify email sent and password can be reset
5. **Token expiration** - Verify redirect to login after token expires
6. **Logout** - Verify tokens cleared and redirect to login
7. **Role-based access** - Verify each role can only access permitted routes
8. **OpCo isolation** - Verify cross-OpCo data access is denied
9. **Mobile login** - Verify login works on mobile browsers
10. **Browser back button** - Verify no security issues with browser history
11. **Multiple tabs** - Verify logout in one tab affects all tabs
12. **EntraID SSO** - Verify corporate SSO login flow works

### Suggested Automated Tests

#### Unit Tests (Frontend - Vue)

```javascript
// auth.service.spec.ts
describe('AuthService', () => {
  it('should initialize Keycloak adapter on app start')
  it('should redirect to login when not authenticated')
  it('should store tokens after successful authentication')
  it('should parse roles from JWT claims')
  it('should parse opco_id from JWT claims')
  it('should refresh token before expiration')
  it('should clear tokens on logout')
  it('should handle token refresh failure gracefully')
})

// route-guard.spec.ts
describe('RouteGuard', () => {
  it('should allow access for users with required role')
  it('should deny access for users without required role')
  it('should redirect to login for unauthenticated users')
  it('should redirect to access-denied for unauthorized users')
})
```

#### Unit Tests (Backend - FastAPI)

```python
# test_auth_middleware.py
class TestAuthMiddleware:
    def test_valid_token_allows_request(self)
    def test_expired_token_returns_401(self)
    def test_invalid_signature_returns_401(self)
    def test_missing_token_returns_401(self)
    def test_roles_extracted_from_token(self)
    def test_opco_id_extracted_from_token(self)

# test_rbac.py
class TestRBAC:
    def test_employee_can_access_own_reviews(self)
    def test_employee_cannot_access_team_reviews(self)
    def test_manager_can_access_team_reviews(self)
    def test_hr_can_access_all_reviews(self)
    def test_admin_cannot_access_review_content(self)
```

#### Integration Tests

```python
# test_auth_flow.py
class TestAuthenticationFlow:
    def test_end_to_end_login_flow(self)
    def test_token_refresh_flow(self)
    def test_logout_invalidates_session(self)
    def test_concurrent_sessions_work_correctly(self)
```

#### E2E Tests (Playwright/Cypress)

```javascript
// auth.e2e.spec.ts
describe('Authentication E2E', () => {
  it('should complete full login flow successfully')
  it('should display error on invalid credentials')
  it('should redirect manager to team dashboard')
  it('should redirect employee to personal dashboard')
  it('should logout and redirect to login page')
  it('should handle session timeout gracefully')
})
```

### Security Testing

- [ ] Verify no XSS vulnerabilities in login form
- [ ] Verify tokens are not exposed in URLs
- [ ] Verify tokens are not logged in browser console
- [ ] Verify HTTPS is enforced in production
- [ ] Verify CORS is properly configured
- [ ] Verify no sensitive data in error messages
- [ ] Verify brute force protection works
- [ ] Penetration testing on authentication endpoints

---

## Dependencies & Risks

### External Dependencies

| Dependency | Version | Risk Level | Mitigation |
|------------|---------|------------|------------|
| Keycloak | v26.x | Medium | Document manual failover procedure |
| keycloak-js | v26.x | Low | Pin version, test on upgrade |
| PyJWT | 2.x | Low | Security updates monitored |
| EntraID/Azure AD | N/A | Medium | Fallback to direct Keycloak auth |

### Database Dependencies

- User-OpCo mapping stored in application database
- Manager-Employee relationship for team scoping
- No authentication data stored in app DB (all in Keycloak)

### Feature Flags

| Flag | Purpose | Default |
|------|---------|---------|
| `AUTH_KEYCLOAK_ENABLED` | Enable Keycloak authentication | true |
| `AUTH_MOCK_ENABLED` | Enable mock auth for development | false (dev only) |
| `AUTH_ENFORCE_HTTPS` | Require HTTPS for auth | true (production) |

### Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Keycloak unavailable | Low | High | Health checks, alerting, documented recovery |
| Token theft via XSS | Low | High | HttpOnly cookies, CSP headers, regular security audits |
| EntraID integration issues | Medium | Medium | Fallback to Keycloak-native auth |
| Session fixation | Low | High | New session ID on login |
| Clock skew causing token issues | Low | Medium | NTP sync on all servers |

### Rollout Plan

1. **Phase 1: Development Environment**
   - Deploy Keycloak with TSS-PPM realm
   - Integrate frontend with Keycloak JS adapter
   - Implement backend JWT validation
   - Test with mock users

2. **Phase 2: Staging Environment**
   - Configure EntraID federation
   - Load test with concurrent users
   - Security audit
   - UAT with stakeholders

3. **Phase 3: Production**
   - Deploy with feature flag (AUTH_KEYCLOAK_ENABLED=false initially)
   - Gradual rollout to 10% -> 50% -> 100% of users
   - Monitor login success rates
   - 24-hour observation period at each stage

### Rollback Plan

1. **Immediate**: Set `AUTH_KEYCLOAK_ENABLED=false` to disable Keycloak
2. **Fallback**: Enable basic auth mode (if implemented)
3. **Recovery**: Restore previous Keycloak realm export
4. **Communication**: Notify users of authentication issues via email/banner

---

## Related Documentation

- [RBAC-Matrix.md](../RBAC-Matrix.md) - Complete permission matrix
- [TSS-PPM-Requirements.md](../TSS-PPM-Requirements.md) - Full requirements document
- [Review-Workflow-States.md](../Review-Workflow-States.md) - Workflow state machine
- [keycloak/themes/README.md](../../keycloak/themes/README.md) - Theme customization guide
- [keycloak/tss-ppm-realm.json](../../keycloak/tss-ppm-realm.json) - Keycloak realm configuration

---

**Story Version**: 1.0
**Last Updated**: 2026-01-10
**Author**: Story Writer Agent
**Status**: Draft - Ready for Review
