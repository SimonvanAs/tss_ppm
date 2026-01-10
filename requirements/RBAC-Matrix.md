# RBAC Permission Matrix

Role-Based Access Control matrix for TSS PPM v3.0.

## Roles

| Role | Description |
|------|-------------|
| **EMPLOYEE** | Regular employee, can manage own goals and view own reviews |
| **MANAGER** | Team lead, can score team reviews and approve goal changes |
| **HR** | Human Resources, can view all reviews and manage calibration |
| **ADMIN** | System administrator, can manage OpCo settings and users |

## Permission Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Full access |
| 📖 | Read only |
| 👤 | Own data only |
| 👥 | Team data only |
| 🏢 | Business unit scope |
| ❌ | No access |

---

## Reviews

| Action | EMPLOYEE | MANAGER | HR | ADMIN |
|--------|----------|---------|-----|-------|
| **View own review** | ✅ | ✅ | ✅ | ❌ |
| **View team reviews** | ❌ | ✅ 👥 | ✅ | ❌ |
| **View all reviews** | ❌ | ❌ | ✅ | ❌ |
| **Create review** | ❌ | ✅ 👥 | ✅ | ❌ |
| **Edit review (draft)** | 👤 goals only | ✅ 👥 | ✅ | ❌ |
| **Edit review (in progress)** | ❌ | ✅ 👥 | ✅ | ❌ |
| **Delete review** | ❌ | ❌ | ✅ | ❌ |
| **Sign review (employee)** | ✅ 👤 | ❌ | ❌ | ❌ |
| **Sign review (manager)** | ❌ | ✅ 👥 | ❌ | ❌ |
| **View review history** | 👤 | 👥 | ✅ | ❌ |

---

## Goals

| Action | EMPLOYEE | MANAGER | HR | ADMIN |
|--------|----------|---------|-----|-------|
| **View goals** | 👤 | 👥 | ✅ | ❌ |
| **Add goal (goal setting stage)** | ✅ 👤 | ✅ 👥 | ✅ | ❌ |
| **Edit goal (goal setting stage)** | ✅ 👤 | ✅ 👥 | ✅ | ❌ |
| **Delete goal** | ✅ 👤 | ✅ 👥 | ✅ | ❌ |
| **Score goal** | ❌ | ✅ 👥 | ✅ | ❌ |
| **Reorder goals** | ✅ 👤 | ✅ 👥 | ✅ | ❌ |
| **Request goal change** | ✅ 👤 | ✅ 👥 | ✅ | ❌ |
| **Approve goal change** | ❌ | ✅ 👥 | ✅ | ❌ |

---

## Competencies

| Action | EMPLOYEE | MANAGER | HR | ADMIN |
|--------|----------|---------|-----|-------|
| **View competency framework** | ✅ | ✅ | ✅ | ✅ |
| **View own competency scores** | ✅ 👤 | ✅ | ✅ | ❌ |
| **View team competency scores** | ❌ | ✅ 👥 | ✅ | ❌ |
| **Score competencies** | ❌ | ✅ 👥 | ✅ | ❌ |
| **Edit competency framework** | ❌ | ❌ | ❌ | ✅ |

---

## Calibration

| Action | EMPLOYEE | MANAGER | HR | ADMIN |
|--------|----------|---------|-----|-------|
| **View calibration sessions** | ❌ | 📖 (invited) | ✅ | ❌ |
| **Create calibration session** | ❌ | ❌ | ✅ | ❌ |
| **Edit calibration session** | ❌ | ❌ | ✅ | ❌ |
| **Delete calibration session** | ❌ | ❌ | ✅ | ❌ |
| **Take snapshot** | ❌ | ❌ | ✅ | ❌ |
| **Adjust scores (during session)** | ❌ | ✅ (invited) | ✅ | ❌ |
| **Complete session** | ❌ | ❌ | ✅ | ❌ |
| **View calibration report** | ❌ | 📖 (invited) | ✅ | ❌ |

---

## Analytics & Reports

| Action | EMPLOYEE | MANAGER | HR | ADMIN |
|--------|----------|---------|-----|-------|
| **View own performance history** | ✅ 👤 | ✅ | ✅ | ❌ |
| **View team analytics** | ❌ | ✅ 👥 | ✅ | ❌ |
| **View BU analytics** | ❌ | ❌ | ✅ 🏢 | ❌ |
| **View company analytics** | ❌ | ❌ | ✅ | ❌ |
| **Generate PDF report** | ✅ 👤 | ✅ 👥 | ✅ | ❌ |
| **Export data (Excel/CSV)** | ❌ | ✅ 👥 | ✅ | ❌ |

---

## User Management

| Action | EMPLOYEE | MANAGER | HR | ADMIN |
|--------|----------|---------|-----|-------|
| **View own profile** | ✅ | ✅ | ✅ | ✅ |
| **Edit own profile** | ✅ (limited) | ✅ (limited) | ✅ (limited) | ✅ |
| **View team members** | ❌ | ✅ 👥 | ✅ | ✅ |
| **View all users** | ❌ | ❌ | ✅ | ✅ |
| **Assign team members** | ❌ | ❌ | ✅ | ✅ |
| **Edit user roles** | ❌ | ❌ | ❌ | ✅ |
| **Deactivate user** | ❌ | ❌ | ❌ | ✅ |

---

## OpCo & Business Unit Management

| Action | EMPLOYEE | MANAGER | HR | ADMIN |
|--------|----------|---------|-----|-------|
| **View OpCo settings** | ❌ | ❌ | 📖 | ✅ |
| **Edit OpCo settings** | ❌ | ❌ | ❌ | ✅ |
| **Upload OpCo logo** | ❌ | ❌ | ❌ | ✅ |
| **View business units** | ❌ | ❌ | ✅ | ✅ |
| **Create business unit** | ❌ | ❌ | ❌ | ✅ |
| **Edit business unit** | ❌ | ❌ | ❌ | ✅ |
| **Delete business unit** | ❌ | ❌ | ❌ | ✅ |

---

## System & Configuration

| Action | EMPLOYEE | MANAGER | HR | ADMIN |
|--------|----------|---------|-----|-------|
| **View system health** | ❌ | ❌ | ❌ | ✅ |
| **Configure voice API** | ❌ | ❌ | ❌ | ✅ |
| **View audit logs** | ❌ | ❌ | 📖 (anonymized) | ✅ |
| **Manage review periods** | ❌ | ❌ | ❌ | ✅ |
| **Upload strategic map** | ❌ | ❌ | ❌ | ✅ |

---

## Data Isolation Rules

1. **OpCo Isolation**: All data is isolated by OpCo. Users can only access data within their own OpCo.

2. **Manager Scope**: Managers can only access reviews for their direct reports (users where `manager_id = current_user.id`).

3. **HR Scope**: HR users can access all reviews within their assigned business units or company-wide (based on HR assignment).

4. **Admin Restrictions**: Admins have system configuration access but cannot view individual review content or scores (GDPR compliance).

---

## API Endpoint Authorization

| Endpoint | EMPLOYEE | MANAGER | HR | ADMIN |
|----------|----------|---------|-----|-------|
| `GET /reviews` | 👤 | 👥 | ✅ | ❌ |
| `POST /reviews` | ❌ | ✅ | ✅ | ❌ |
| `GET /reviews/:id` | 👤 | 👥 | ✅ | ❌ |
| `PUT /reviews/:id` | 👤 (limited) | 👥 | ✅ | ❌ |
| `DELETE /reviews/:id` | ❌ | ❌ | ✅ | ❌ |
| `GET /users` | ❌ | ❌ | ✅ | ✅ |
| `GET /users/me` | ✅ | ✅ | ✅ | ✅ |
| `GET /calibration/sessions` | ❌ | 📖 | ✅ | ❌ |
| `POST /calibration/sessions` | ❌ | ❌ | ✅ | ❌ |
| `GET /opcos` | ❌ | ❌ | ❌ | ✅ |
| `POST /opcos` | ❌ | ❌ | ❌ | ✅ |
| `GET /reports/analytics` | ❌ | 👥 | ✅ | ❌ |

---

## Implementation Notes

1. **Keycloak Roles**: Map directly to `employee`, `manager`, `hr`, `admin` roles in Keycloak realm.

2. **JWT Claims**: Include `roles` array and `opco_id` in JWT token for authorization decisions.

3. **Middleware Chain**:
   ```
   Request → Auth (JWT valid?) → RBAC (role allowed?) → Scope (data filtered?) → Handler
   ```

4. **Audit Logging**: All authorization failures should be logged for security monitoring.
