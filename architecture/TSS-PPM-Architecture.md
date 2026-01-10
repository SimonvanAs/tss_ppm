# TSS PPM v3.0 - System Architecture Document

## Goal and Constraints

### Goal
Design a comprehensive, scalable, and secure system architecture for TSS PPM v3.0 - an HR performance scoring web application that replaces Excel-based annual employee reviews with a modern, multi-language platform featuring voice input, real-time 9-grid visualization, and automated PDF-A report generation.

### Key Acceptance Criteria
1. Support 4 user roles (Employee, Manager, HR, Admin) with role-based access control
2. Implement 9-grid scoring system with WHAT-axis (up to 9 weighted goals) and HOW-axis (6 competencies per TOV level)
3. Multi-language support for English, Dutch, and Spanish
4. Voice-to-text input using faster-whisper or configurable API
5. PDF-A format report generation with company branding
6. Support 50+ concurrent users per OpCo with <3s page load times
7. Full audit trail for GDPR compliance
8. Multi-tenant architecture supporting multiple Operating Companies (OpCos)

### Constraints
- Backend: Python (FastAPI) with minimal dependencies
- Must integrate with Keycloak v26 for OIDC/EntraID federation
- PostgreSQL 17 is the mandated database
- Docker containerization required with Caddy reverse proxy
- Must support both server-hosted whisper and external voice-to-text APIs
- 99.5% uptime target

---

## Current Architecture Touchpoints

### Existing Components
1. **Keycloak Configuration** (`keycloak/tss-ppm-realm.json`)
   - Realm: `tss-ppm`
   - Roles defined: employee, manager, hr, admin
   - Two clients: `tss-ppm-web` (public SPA) and `tss-ppm-api` (bearer-only)
   - Custom attribute mapper for `opco_id`
   - Brute force protection enabled

2. **Custom Keycloak Theme** (`keycloak/themes/`)
   - Login theme matching application branding
   - Brand colors: Magenta (#CC0E70), Navy Blue (#004A91)

3. **Competency Framework** (`requirements/IDE-Competency-Framework.md`)
   - 6 competencies x 4 levels = 24 total competencies
   - Full translations for EN/NL/ES
   - Structured for database storage

### Patterns to Follow
- OIDC standard authentication flow via Keycloak
- RESTful API with versioned endpoints (`/api/v1/`)
- Vue 3 SPA with client-side routing
- Docker containerization for all services
- Environment-based configuration

### Key Constraints
- **Authentication**: All API calls must be authenticated via Keycloak JWT tokens
- **Data Isolation**: OpCo-level data isolation (employees only see their OpCo data)
- **RBAC**: Role hierarchy (Admin includes Manager+HR, Manager includes Employee)
- **Audit**: All data modifications must be logged
- **Performance**: <3s page load, <500ms API response, <5s voice processing

---

## Architecture Decision

### Chosen Stack: Python + Vue with Minimal Dependencies

**Frontend**: Vue 3 with Vite
**Backend**: Python (FastAPI) with asyncpg (raw SQL)
**PDF Generation**: WeasyPrint (Python, integrated into API)
**Voice Service**: faster-whisper (Python, separate container)

```
                                  +------------------+
                                  |  Caddy Reverse   |
                                  |  Proxy (TLS)     |
                                  +--------+---------+
                                           |
              +----------------------------+----------------------------+
              |                            |                            |
    +---------v---------+       +----------v----------+      +----------v----------+
    |   Vue 3 SPA       |       |   API Server        |      |   Keycloak          |
    |   (Vite)          |       |   (Python/FastAPI)  |      |   (Auth Server)     |
    +-------------------+       +----------+----------+      +---------------------+
                                           |
              +----------------------------+----------------------------+
              |                            |                            |
    +---------v---------+       +----------v----------+      +----------v----------+
    |   PostgreSQL 17   |       |   Voice Service     |      |   PDF Generation    |
    |   (Primary DB)    |       |   (faster-whisper)  |      |   (WeasyPrint)      |
    +-------------------+       +---------------------+      +---------------------+
```

### Rationale

1. **Team Expertise**: Python backend aligns with team skills
2. **Minimal Dependencies**: Raw SQL (asyncpg) over ORM, fewer packages to maintain
3. **All-Python Backend**: API, voice, and PDF all in Python - shared knowledge
4. **Vue for Learners**: Easiest frontend framework for backend-focused team
5. **WeasyPrint Integration**: PDF generation in same process, no separate service needed

---

## Implementation Plan

### 1. System Components Overview

```
+------------------------------------------------------------------------------+
|                              FRONTEND TIER                                    |
|  +------------------------------------------------------------------------+  |
|  |                         Vue 3 SPA (Vite)                               |  |
|  |  - Review Form with 9-Grid Visualization                               |  |
|  |  - Team Dashboard & Analytics                                          |  |
|  |  - Calibration Session Interface                                       |  |
|  |  - Admin Portal                                                        |  |
|  |  - vue-i18n (EN/NL/ES)                                                 |  |
|  +------------------------------------------------------------------------+  |
+------------------------------------------------------------------------------+
                                      |
                              HTTPS (TLS 1.3)
                                      |
+------------------------------------------------------------------------------+
|                              GATEWAY TIER                                     |
|  +------------------------------------------------------------------------+  |
|  |                      Caddy Reverse Proxy                               |  |
|  |  - TLS Termination & Auto-Cert                                         |  |
|  |  - Path-based Routing                                                  |  |
|  |  - Rate Limiting                                                       |  |
|  |  - Static Asset Caching                                                |  |
|  +------------------------------------------------------------------------+  |
+------------------------------------------------------------------------------+
                                      |
              +-----------------------+-----------------------+
              |                       |                       |
+-------------v-----------+  +--------v--------+  +-----------v-----------+
|      API SERVER         |  |   VOICE SERVICE |  |    AUTH SERVER        |
|  (Python/FastAPI)       |  | (Python/FastAPI)|  |    (Keycloak v26)     |
|                         |  |                 |  |                       |
| - REST API v1           |  | - /transcribe   |  | - OIDC Provider       |
| - Business Logic        |  | - faster-whisper|  | - EntraID Federation  |
| - Review Workflows      |  | - Multi-lang    |  | - Role Management     |
| - Scoring Engine        |  | - OR External   |  | - Custom TSS Theme    |
| - Calibration           |  |   Voice API     |  | - JWT Tokens          |
| - PDF Generation        |  |                 |  |                       |
|   (WeasyPrint)          |  |                 |  |                       |
+-------------+-----------+  +-----------------+  +-----------------------+
              |
+-------------v-----------+
|    DATA TIER            |
|  (PostgreSQL 17)        |
|                         |
| - Reviews & Goals       |
| - Users & OpCos         |
| - Competencies          |
| - Audit Logs            |
| - Calibration Sessions  |
+-------------------------+
```

### 2. Frontend Architecture (Vue 3 + Vite)

#### Directory Structure
```
frontend/
├── public/
│   └── locales/
│       ├── en.json
│       ├── nl.json
│       └── es.json
├── src/
│   ├── api/
│   │   ├── client.ts           # Fetch wrapper with auth interceptor
│   │   ├── reviews.ts          # Review API calls
│   │   ├── goals.ts            # Goal API calls
│   │   ├── competencies.ts     # Competency API calls
│   │   ├── calibration.ts      # Calibration API calls
│   │   └── users.ts            # User management API calls
│   ├── components/
│   │   ├── common/
│   │   │   ├── AppButton.vue
│   │   │   ├── AppInput.vue
│   │   │   ├── VoiceInput.vue  # Hold-to-dictate component
│   │   │   └── LoadingSpinner.vue
│   │   ├── review/
│   │   │   ├── GoalItem.vue
│   │   │   ├── GoalList.vue    # Drag-and-drop goals
│   │   │   ├── CompetencyScorer.vue
│   │   │   ├── NineGrid.vue    # 9-grid visualization
│   │   │   └── ReviewForm.vue
│   │   ├── dashboard/
│   │   │   ├── TeamGrid.vue
│   │   │   ├── AnalyticsChart.vue
│   │   │   └── TaskList.vue
│   │   └── calibration/
│   │       ├── CalibrationGrid.vue
│   │       └── AdjustmentPanel.vue
│   ├── composables/
│   │   ├── useAuth.ts          # Keycloak auth state
│   │   ├── useReview.ts        # Current review state
│   │   ├── useVoiceInput.ts
│   │   └── useAutoSave.ts
│   ├── views/
│   │   ├── LoginView.vue
│   │   ├── DashboardView.vue
│   │   ├── ReviewEditView.vue
│   │   ├── ReviewView.vue
│   │   ├── TeamOverviewView.vue
│   │   ├── CalibrationView.vue
│   │   ├── AnalyticsView.vue
│   │   └── AdminView.vue
│   ├── router/
│   │   └── index.ts
│   ├── services/
│   │   ├── keycloak.ts         # Keycloak initialization
│   │   └── scoring.ts          # Client-side score calculations
│   ├── types/
│   │   ├── review.ts
│   │   ├── goal.ts
│   │   ├── competency.ts
│   │   ├── user.ts
│   │   └── calibration.ts
│   ├── utils/
│   │   ├── validation.ts
│   │   ├── scoring.ts          # VETO rule calculations
│   │   └── formatters.ts
│   ├── i18n/
│   │   ├── en.json             # English UI translations
│   │   ├── nl.json             # Dutch UI translations
│   │   └── es.json             # Spanish UI translations
│   ├── App.vue
│   └── main.ts
├── vite.config.ts
├── tsconfig.json
└── package.json
```

#### Minimal Frontend Dependencies
```json
{
  "dependencies": {
    "vue": "^3.4",
    "vue-router": "^4.3",
    "vue-i18n": "^9.10",
    "keycloak-js": "^26.0"
  },
  "devDependencies": {
    "vite": "^5.0",
    "typescript": "^5.3",
    "vitest": "^1.0"
  }
}
```

#### Internationalization (i18n)

The application supports three languages: English (en), Dutch (nl), and Spanish (es).

**Translation Sources:**
| Content Type | Source | Notes |
|--------------|--------|-------|
| UI elements | `frontend/src/i18n/*.json` | Navigation, labels, buttons, messages |
| Competency titles | Database (`competencies` table) | `title_en`, `title_nl`, `title_es` columns |
| Competency indicators | Database (`competencies` table) | `indicators_en`, `indicators_nl`, `indicators_es` JSONB columns |

**Design Decision:** Competency translations are stored in the database (not i18n files) because:
1. Competencies can be customized per OpCo
2. Content is managed by HR, not developers
3. Allows runtime updates without redeployment

**Language Selection Flow:**
1. User preference from `users.language_preference`
2. OpCo default from `opcos.default_language`
3. Browser language detection
4. Fallback to English

#### Key Frontend Components

**VoiceInput Component**
```vue
<!-- src/components/common/VoiceInput.vue -->
<script setup lang="ts">
interface Props {
  language: 'en' | 'nl' | 'es'
  disabled?: boolean
}
const props = defineProps<Props>()
const emit = defineEmits<{ transcription: [text: string] }>()

// States: idle, recording, processing, error
// Uses MediaRecorder API for audio capture
// Sends WAV to /api/v1/transcribe endpoint
</script>
```

**NineGrid Component**
```vue
<!-- src/components/review/NineGrid.vue -->
<script setup lang="ts">
interface Props {
  whatScore: number   // 1.00 - 3.00
  howScore: number    // 1.00 - 3.00
  interactive?: boolean
  employees?: GridEmployee[]  // For team view
}
defineProps<Props>()
</script>
```

**Auto-Save Composable**
```typescript
// src/composables/useAutoSave.ts
// Debounced save (2-3 seconds inactivity)
// Tracks dirty fields via Vue reactivity
// Shows save status indicator
```

### 3. Backend Architecture (API Server)

#### Technology Choice: Python + FastAPI + asyncpg

**Rationale**:
- Team expertise in Python
- Minimal dependencies philosophy (raw SQL, no ORM)
- Same language as voice service (faster-whisper)
- FastAPI provides automatic OpenAPI docs
- asyncpg for high-performance async PostgreSQL

#### Minimal Backend Dependencies
```
# requirements.txt
fastapi
uvicorn[standard]
asyncpg
pyjwt[crypto]
weasyprint
pytest
pytest-asyncio
```

#### Directory Structure
```
api/
├── app/
│   ├── __init__.py
│   ├── main.py                     # FastAPI application
│   ├── config.py                   # Environment configuration
│   ├── database.py                 # asyncpg connection pool
│   ├── auth.py                     # JWT validation with PyJWT
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── reviews.py
│   │   ├── goals.py
│   │   ├── competencies.py
│   │   ├── calibration.py
│   │   ├── users.py
│   │   ├── opcos.py
│   │   └── reports.py
│   ├── repositories/
│   │   ├── __init__.py
│   │   ├── reviews.py              # Raw SQL queries
│   │   ├── goals.py
│   │   ├── users.py
│   │   └── audit.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── scoring.py              # Score calculations + VETO rules
│   │   ├── calibration.py
│   │   ├── pdf.py                  # WeasyPrint PDF generation
│   │   └── voice.py                # Voice service client
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── review.py               # Pydantic models
│   │   ├── goal.py
│   │   ├── competency.py
│   │   └── user.py
│   └── utils/
│       ├── __init__.py
│       ├── scoring.py
│       └── sanitization.py
├── migrations/
│   ├── 001_initial_schema.sql
│   ├── 002_competencies_seed.sql
│   ├── ...
│   └── run_migrations.py           # Simple migration runner
├── templates/
│   └── report.html                 # PDF template for WeasyPrint
├── tests/
│   ├── __init__.py
│   ├── test_reviews.py
│   └── test_scoring.py
├── Dockerfile
└── requirements.txt
```

#### Example Repository (Raw SQL)
```python
# app/repositories/reviews.py
from uuid import UUID
import asyncpg

class ReviewRepository:
    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    async def get_by_id(self, review_id: UUID, opco_id: UUID) -> dict | None:
        return await self.pool.fetchrow("""
            SELECT r.*,
                   u.first_name || ' ' || u.last_name as employee_name,
                   m.first_name || ' ' || m.last_name as manager_name
            FROM reviews r
            JOIN users u ON r.employee_id = u.id
            JOIN users m ON r.manager_id = m.id
            WHERE r.id = $1 AND r.opco_id = $2 AND r.deleted_at IS NULL
        """, review_id, opco_id)

    async def get_team_reviews(self, manager_id: UUID, year: int) -> list[dict]:
        return await self.pool.fetch("""
            SELECT r.*, u.first_name, u.last_name, u.tov_level
            FROM reviews r
            JOIN users u ON r.employee_id = u.id
            WHERE r.manager_id = $1 AND r.review_year = $2
              AND r.deleted_at IS NULL
            ORDER BY u.last_name, u.first_name
        """, manager_id, year)
```

#### API Endpoints (v1)

```
# Authentication
POST   /api/v1/auth/logout              # Logout (clear server session)

# Reviews
GET    /api/v1/reviews                  # List reviews (filtered by role)
POST   /api/v1/reviews                  # Create new review
GET    /api/v1/reviews/:id              # Get review details
PUT    /api/v1/reviews/:id              # Update review
DELETE /api/v1/reviews/:id              # Delete review (soft delete)
PUT    /api/v1/reviews/:id/stage        # Transition review stage
POST   /api/v1/reviews/:id/sign         # Sign review (employee/manager)
GET    /api/v1/reviews/:id/history      # Get review change history

# Goals
GET    /api/v1/reviews/:id/goals        # List goals for review
POST   /api/v1/reviews/:id/goals        # Add goal to review
PUT    /api/v1/goals/:id                # Update goal
DELETE /api/v1/goals/:id                # Remove goal
PUT    /api/v1/reviews/:id/goals/order  # Reorder goals (drag-drop)
POST   /api/v1/goals/:id/change-request # Request goal change

# Competencies
GET    /api/v1/competencies             # Get all competencies
GET    /api/v1/competencies/:level      # Get competencies by TOV level
PUT    /api/v1/reviews/:id/competencies # Update competency scores

# Calibration
GET    /api/v1/calibration/sessions     # List calibration sessions
POST   /api/v1/calibration/sessions     # Create calibration session
GET    /api/v1/calibration/sessions/:id # Get session details
PUT    /api/v1/calibration/sessions/:id # Update session (adjustments)
POST   /api/v1/calibration/sessions/:id/snapshot # Take score snapshot
POST   /api/v1/calibration/sessions/:id/complete # Complete session

# Users & Teams
GET    /api/v1/users                    # List users (HR/Admin only)
GET    /api/v1/users/me                 # Current user profile
GET    /api/v1/users/:id/team           # Get manager's team
PUT    /api/v1/users/:id/team           # Update team assignments

# OpCo Management
GET    /api/v1/opcos                    # List OpCos (Admin only)
POST   /api/v1/opcos                    # Create OpCo
PUT    /api/v1/opcos/:id                # Update OpCo settings
GET    /api/v1/opcos/:id/business-units # List business units
POST   /api/v1/opcos/:id/business-units # Create business unit

# Reports
POST   /api/v1/reports/pdf/:reviewId    # Generate PDF report
GET    /api/v1/reports/analytics        # Get analytics data
POST   /api/v1/reports/export           # Export data (Excel/CSV)

# Voice
POST   /api/v1/transcribe               # Transcribe audio (proxy to voice service)

# Health
GET    /health                          # Health check endpoint
GET    /ready                           # Readiness check
```

### 4. Voice Service Architecture

#### Technology: Pre-built faster-whisper Docker Image

The voice service uses the `fedirz/faster-whisper-server` Docker image, which provides a ready-to-use REST API for speech-to-text transcription. This eliminates the need for a custom voice service build.

```yaml
# docker-compose.yml excerpt
whisper:
  image: fedirz/faster-whisper-server:latest-cpu
  environment:
    WHISPER__MODEL: Systran/faster-whisper-small
    WHISPER__DEVICE: cpu
    WHISPER__COMPUTE_TYPE: int8
  ports:
    - "8001:8000"
```

**Note**: For GPU acceleration, use `fedirz/faster-whisper-server:latest-cuda` instead.

#### Voice Service Endpoint
```
POST /transcribe
Content-Type: multipart/form-data

Request:
  - audio: WAV file (16kHz, mono)
  - language: "en" | "nl" | "es"

Response:
{
  "text": "transcribed text here",
  "language": "en",
  "confidence": 0.95,
  "processing_time_ms": 1234
}
```

### 5. Database Schema Design

```sql
-- Operating Companies (Multi-tenant root)
CREATE TABLE opcos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    logo_url VARCHAR(500),
    default_language VARCHAR(5) DEFAULT 'en',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Business Units
CREATE TABLE business_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opco_id UUID NOT NULL REFERENCES opcos(id),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    parent_id UUID REFERENCES business_units(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(opco_id, code)
);

-- Users (synced from Keycloak)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keycloak_id VARCHAR(255) UNIQUE NOT NULL,
    opco_id UUID NOT NULL REFERENCES opcos(id),
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    function_title VARCHAR(255),
    business_unit_id UUID REFERENCES business_units(id),
    manager_id UUID REFERENCES users(id),
    tov_level CHAR(1) CHECK (tov_level IN ('A', 'B', 'C', 'D')),
    roles VARCHAR(50)[] DEFAULT ARRAY['employee'],
    is_active BOOLEAN DEFAULT true,
    language_preference VARCHAR(5) DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Reviews
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opco_id UUID NOT NULL REFERENCES opcos(id),
    employee_id UUID NOT NULL REFERENCES users(id),
    manager_id UUID NOT NULL REFERENCES users(id),
    review_year INTEGER NOT NULL,
    stage VARCHAR(50) NOT NULL DEFAULT 'GOAL_SETTING',
        -- GOAL_SETTING, MID_YEAR_REVIEW, END_YEAR_REVIEW
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
        -- DRAFT, PENDING_EMPLOYEE_SIGNATURE, EMPLOYEE_SIGNED,
        -- PENDING_MANAGER_SIGNATURE, MANAGER_SIGNED, SIGNED, ARCHIVED
    session_code VARCHAR(12) UNIQUE,

    -- Scores (calculated)
    what_score DECIMAL(4,2),
    how_score DECIMAL(4,2),
    what_veto_active BOOLEAN DEFAULT false,
    how_veto_active BOOLEAN DEFAULT false,
    grid_position_what INTEGER CHECK (grid_position_what BETWEEN 1 AND 3),
    grid_position_how INTEGER CHECK (grid_position_how BETWEEN 1 AND 3),

    -- Content
    summary_comments TEXT,
    additional_comments TEXT,
    tov_level CHAR(1) CHECK (tov_level IN ('A', 'B', 'C', 'D')),

    -- Signatures
    employee_signature_date TIMESTAMP WITH TIME ZONE,
    manager_signature_date TIMESTAMP WITH TIME ZONE,

    -- Calibration
    calibration_session_id UUID,
    calibrated_what_score DECIMAL(4,2),
    calibrated_how_score DECIMAL(4,2),
    calibration_notes TEXT,

    -- Metadata
    language VARCHAR(5) DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    UNIQUE(employee_id, review_year, stage)
);

-- Goals
CREATE TABLE goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    goal_type VARCHAR(20) NOT NULL DEFAULT 'STANDARD',
        -- STANDARD, KAR, SCF
    title VARCHAR(500) NOT NULL,
    description TEXT,
    score INTEGER CHECK (score BETWEEN 1 AND 3),
    weight INTEGER NOT NULL CHECK (weight BETWEEN 0 AND 100),
    display_order INTEGER NOT NULL DEFAULT 0,

    -- For tracking changes
    previous_goal_id UUID REFERENCES goals(id),
    change_reason TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Competencies (Reference data)
CREATE TABLE competencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opco_id UUID REFERENCES opcos(id),  -- NULL = global
    level CHAR(1) NOT NULL CHECK (level IN ('A', 'B', 'C', 'D')),
    category VARCHAR(50) NOT NULL,       -- Dedicated, Entrepreneurial, Innovative
    subcategory VARCHAR(50) NOT NULL,    -- Result driven, Committed, etc.
    display_order INTEGER NOT NULL,

    -- Translations
    title_en TEXT NOT NULL,
    title_nl TEXT,
    title_es TEXT,
    indicators_en JSONB,  -- Array of behavioral indicators
    indicators_nl JSONB,
    indicators_es JSONB,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Competency Scores (per review)
CREATE TABLE competency_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    competency_id UUID NOT NULL REFERENCES competencies(id),
    score INTEGER CHECK (score BETWEEN 1 AND 3),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(review_id, competency_id)
);

-- Calibration Sessions
CREATE TABLE calibration_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opco_id UUID NOT NULL REFERENCES opcos(id),
    name VARCHAR(255) NOT NULL,
    review_year INTEGER NOT NULL,
    scope VARCHAR(50) NOT NULL,  -- BUSINESS_UNIT, COMPANY_WIDE
    business_unit_id UUID REFERENCES business_units(id),
    status VARCHAR(50) NOT NULL DEFAULT 'PREPARATION',
        -- PREPARATION, IN_PROGRESS, PENDING_APPROVAL, COMPLETED, CANCELLED
    facilitator_id UUID REFERENCES users(id),
    snapshot_taken_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Calibration Adjustments
CREATE TABLE calibration_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES calibration_sessions(id),
    review_id UUID NOT NULL REFERENCES reviews(id),
    adjusted_by UUID NOT NULL REFERENCES users(id),

    -- Original scores (snapshot)
    original_what_score DECIMAL(4,2),
    original_how_score DECIMAL(4,2),
    original_grid_what INTEGER,
    original_grid_how INTEGER,

    -- Adjusted scores
    adjusted_what_score DECIMAL(4,2),
    adjusted_how_score DECIMAL(4,2),
    adjusted_grid_what INTEGER,
    adjusted_grid_how INTEGER,

    adjustment_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Goal Change Requests
CREATE TABLE goal_change_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID REFERENCES goals(id),
    review_id UUID NOT NULL REFERENCES reviews(id),
    requested_by UUID NOT NULL REFERENCES users(id),
    request_type VARCHAR(20) NOT NULL,  -- ADD, EDIT, DELETE

    -- Proposed changes
    proposed_title VARCHAR(500),
    proposed_description TEXT,
    proposed_weight INTEGER,
    proposed_type VARCHAR(20),

    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        -- PENDING, APPROVED, REJECTED
    decided_by UUID REFERENCES users(id),
    decision_notes TEXT,
    decided_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opco_id UUID REFERENCES opcos(id),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    changes JSONB,  -- Before/after values
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_reviews_opco_year ON reviews(opco_id, review_year);
CREATE INDEX idx_reviews_employee ON reviews(employee_id);
CREATE INDEX idx_reviews_manager ON reviews(manager_id);
CREATE INDEX idx_reviews_status ON reviews(status);
CREATE INDEX idx_goals_review ON goals(review_id);
CREATE INDEX idx_competency_scores_review ON competency_scores(review_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at);
CREATE INDEX idx_users_opco ON users(opco_id);
CREATE INDEX idx_users_manager ON users(manager_id);
```

### 6. Authentication Flow

```
┌─────────┐     ┌─────────┐     ┌──────────┐     ┌─────────┐
│  User   │     │  Vue    │     │ Keycloak │     │   API   │
│         │     │   SPA   │     │          │     │ Server  │
└────┬────┘     └────┬────┘     └────┬─────┘     └────┬────┘
     │               │               │                │
     │  1. Access    │               │                │
     │  ──────────>  │               │                │
     │               │ 2. Redirect   │                │
     │               │ ──────────>   │                │
     │               │               │                │
     │  3. Login Form (Custom Theme) │                │
     │  <────────────────────────────│                │
     │               │               │                │
     │  4. Credentials               │                │
     │  ────────────────────────────>│                │
     │               │               │                │
     │  5. Auth Code │               │                │
     │  <────────────────────────────│                │
     │               │               │                │
     │               │ 6. Exchange   │                │
     │               │ ──────────>   │                │
     │               │               │                │
     │               │ 7. JWT Tokens │                │
     │               │ <──────────   │                │
     │               │               │                │
     │               │ 8. API Request (Bearer Token)  │
     │               │ ─────────────────────────────> │
     │               │               │                │
     │               │               │ 9. Validate   │
     │               │               │ <────────────  │
     │               │               │                │
     │               │ 10. Response  │                │
     │               │ <───────────────────────────── │
     │               │               │                │
     │  11. UI       │               │                │
     │  <──────────  │               │                │
     │               │               │                │
```

**Token Structure (JWT Claims)**:
```json
{
  "sub": "keycloak-user-id",
  "email": "user@opco.com",
  "name": "User Name",
  "roles": ["employee", "manager"],
  "opco_id": "tss",
  "exp": 1234567890,
  "iat": 1234567000
}
```

### 7. Deployment Architecture

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Reverse Proxy
  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - frontend
      - api
      - keycloak

  # Frontend (Vue SPA)
  frontend:
    build: ./frontend
    environment:
      - VITE_API_URL=/api
      - VITE_KEYCLOAK_URL=/auth
      - VITE_KEYCLOAK_REALM=tss-ppm
      - VITE_KEYCLOAK_CLIENT_ID=tss-ppm-web
    depends_on:
      - api

  # API Server
  api:
    build: ./api
    environment:
      - ENVIRONMENT=production
      - DATABASE_URL=postgresql://ppm:password@postgres:5432/tss_ppm
      - KEYCLOAK_URL=http://keycloak:8080
      - KEYCLOAK_REALM=tss-ppm
      - VOICE_SERVICE_URL=http://whisper:8000
      # PDF generation via WeasyPrint (integrated)
    depends_on:
      postgres:
        condition: service_healthy
      keycloak:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Voice Service (pre-built faster-whisper)
  whisper:
    image: fedirz/faster-whisper-server:latest-cpu
    environment:
      - WHISPER__MODEL=Systran/faster-whisper-small
      - WHISPER__DEVICE=cpu
      - WHISPER__COMPUTE_TYPE=int8
    ports:
      - "8001:8000"
    deploy:
      resources:
        limits:
          memory: 4G
        reservations:
          memory: 2G

  # Note: PDF generation is integrated into the API via WeasyPrint (no separate container)

  # PostgreSQL
  postgres:
    image: postgres:17-alpine
    environment:
      - POSTGRES_USER=ppm
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=tss_ppm
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./api/migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ppm -d tss_ppm"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Keycloak
  keycloak:
    image: quay.io/keycloak/keycloak:26.0
    command: start-dev --import-realm
    environment:
      - KEYCLOAK_ADMIN=admin
      - KEYCLOAK_ADMIN_PASSWORD=admin
      - KC_DB=postgres
      - KC_DB_URL=jdbc:postgresql://postgres:5432/keycloak
      - KC_DB_USERNAME=ppm
      - KC_DB_PASSWORD=password
    volumes:
      - ./keycloak/themes:/opt/keycloak/themes
      - ./keycloak/tss-ppm-realm.json:/opt/keycloak/data/import/tss-ppm-realm.json
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 5

volumes:
  postgres_data:
  caddy_data:
  caddy_config:
```

**Caddyfile**:
```
{
    email admin@tss.eu
}

ppm.tss-vms.co.uk {
    # Frontend SPA
    handle /auth/* {
        reverse_proxy keycloak:8080
    }

    handle /api/* {
        reverse_proxy api:8000
    }

    handle {
        reverse_proxy frontend:80
    }

    # Security headers
    header {
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        X-XSS-Protection "1; mode=block"
        Referrer-Policy strict-origin-when-cross-origin
    }
}
```

### 8. Feature Flags and Rollout

```typescript
// Feature flags configuration
const featureFlags = {
  VOICE_INPUT_ENABLED: true,
  EXTERNAL_VOICE_API: false,     // Toggle between whisper/external
  CALIBRATION_AI_SUGGESTIONS: false,
  SMART_GOAL_AI: false,
  HISTORICAL_TRENDS: true,
  EXCEL_EXPORT: true,
  MULTI_OPCO: false,             // Enable for multi-tenant
  PLAUSIBLE_ANALYTICS: true,     // Privacy-friendly usage analytics
};
```

**Rollout Strategy**:
1. **Phase 1 (MVP)**: Single OpCo, core review functionality
2. **Phase 2**: Add voice input, analytics dashboards
3. **Phase 3**: Calibration sessions, multi-OpCo
4. **Phase 4**: AI features (SMART goals, calibration suggestions)

### 9. Product Analytics (Plausible)

Privacy-friendly usage analytics via self-hosted Plausible instance. No cookies, no personal data, GDPR compliant.

#### Configuration (Admin-Managed)

Stored in `opcos.settings` JSONB field:

```json
{
  "analytics": {
    "enabled": true,
    "plausible_url": "https://plausible.company.internal",
    "site_domain": "ppm.tss-vms.co.uk"
  }
}
```

#### Frontend Integration

```typescript
// src/services/analytics.ts
interface PlausibleConfig {
  enabled: boolean
  plausibleUrl: string
  siteDomain: string
}

export function initPlausible(config: PlausibleConfig) {
  if (!config.enabled) return

  const script = document.createElement('script')
  script.defer = true
  script.dataset.domain = config.siteDomain
  script.src = `${config.plausibleUrl}/js/script.js`
  document.head.appendChild(script)
}

// Custom event tracking
export function trackEvent(name: string, props?: Record<string, string>) {
  if (window.plausible) {
    window.plausible(name, { props })
  }
}
```

#### Custom Events Implementation

```typescript
// Usage examples throughout the app:

// Review created
trackEvent('review_created', { stage: 'GOAL_SETTING', role: 'manager' })

// Review signed
trackEvent('review_signed', { signer_role: 'employee' })

// Voice input used
trackEvent('voice_input_used', { language: 'nl' })

// PDF generated
trackEvent('pdf_generated', { stage: 'END_YEAR_REVIEW' })

// Language switched
trackEvent('language_switched', { to_language: 'es' })
```

#### API Endpoints

```
GET  /api/v1/opcos/:id/settings/analytics    # Get analytics config (Admin only)
PUT  /api/v1/opcos/:id/settings/analytics    # Update analytics config (Admin only)
POST /api/v1/opcos/:id/settings/analytics/test  # Test connection to Plausible
```

#### Admin UI Fields

| Field | Type | Description |
|-------|------|-------------|
| Analytics Enabled | Toggle | Enable/disable Plausible tracking |
| Plausible URL | Text | On-prem instance URL |
| Site Domain | Text | Domain identifier for this installation |
| Test Connection | Button | Verify Plausible instance is reachable |

---

## Non-Functional Requirements and Operational Notes

### Security and Privacy

| Requirement | Implementation |
|-------------|----------------|
| **PII Protection** | Employee names, scores stored encrypted at rest (PostgreSQL TDE) |
| **Authorization** | JWT validation + role checking on every API call |
| **Data Isolation** | OpCo ID checked on all queries via middleware |
| **Audit Trail** | All data changes logged with user, timestamp, before/after |
| **GDPR Right to Access** | Export endpoint for user's own data |
| **GDPR Right to Erasure** | Soft delete with scheduled hard delete after retention period |
| **XSS Prevention** | Vue auto-escaping + server-side sanitization |
| **SQL Injection** | Parameterized queries via asyncpg |

### Performance Targets

| Metric | Target | Monitoring |
|--------|--------|------------|
| Page Load | <3s (95th percentile) | Lighthouse, RUM |
| API Response | <500ms (95th percentile) | APM traces |
| Voice Processing | <5s | Service metrics |
| Auto-Save | <500ms | Client metrics |
| PDF Generation | <5s | Service metrics |
| Concurrent Users | 50+ per OpCo | Load testing |

### Reliability

| Aspect | Strategy |
|--------|----------|
| **Idempotency** | All create operations use client-generated UUIDs |
| **Retries** | Exponential backoff for external services (voice, PDF) |
| **Graceful Degradation** | Voice service down = show "type instead" message |
| **Database** | Connection pooling (max 100), auto-reconnect |
| **Session Recovery** | Session codes allow resume on any device |

### Observability

```yaml
# Logging format (structured JSON)
{
  "timestamp": "2026-01-10T10:30:00Z",
  "level": "INFO",
  "service": "api",
  "traceId": "abc123",
  "userId": "uuid",
  "action": "review.created",
  "reviewId": "uuid",
  "duration_ms": 123
}
```

| Type | Tool | Retention |
|------|------|-----------|
| Application Logs | stdout (JSON) | 90 days |
| Audit Logs | PostgreSQL | 7 years |
| Metrics | Prometheus | 30 days |
| Traces | Jaeger/Zipkin | 7 days |

### Accessibility

- WCAG 2.1 AA compliance
- Full keyboard navigation
- ARIA labels on all interactive elements
- Color contrast minimum 4.5:1
- Screen reader tested with NVDA/VoiceOver

---

## Testing Strategy

### Unit Tests
- **Frontend**: Vitest + Vue Test Utils
- **Backend**: pytest + pytest-asyncio for services and utilities
- **Coverage Target**: 70% for critical paths (scoring, workflows)

### Integration Tests
- **API**: pytest with httpx TestClient and test database
- **Database**: Test migrations up/down
- **Keycloak**: Mock token validation

### End-to-End Tests
- **Tool**: Playwright
- **Scenarios**:
  - Complete review workflow (Employee -> Manager sign-off)
  - Calibration session creation and adjustments
  - PDF report generation and validation
  - Multi-language switching
  - Voice input flow

### Performance Tests
- **Tool**: k6
- **Scenarios**:
  - 50 concurrent users entering reviews
  - Bulk PDF generation (10 simultaneous)
  - Analytics dashboard load with 1000+ reviews

### Security Tests
- OWASP ZAP automated scan
- Manual penetration testing (annually)
- Dependency vulnerability scanning (npm audit, pip audit)

---

## Done Checklist

A feature is considered complete when:

- [ ] Code reviewed and merged to main branch
- [ ] Unit tests passing with >70% coverage on new code
- [ ] Integration tests passing
- [ ] API documentation updated (OpenAPI spec)
- [ ] Database migrations tested (up and down)
- [ ] Security review completed (XSS, SQL injection checks)
- [ ] Performance benchmarks met (<500ms API response)
- [ ] Multi-language translations complete (EN/NL/ES)
- [ ] Accessibility audit passed (keyboard nav, ARIA)
- [ ] Audit logging implemented for data changes
- [ ] Feature flag configured (if applicable)
- [ ] Deployment verified in staging environment
- [ ] Runbook updated for operational procedures
- [ ] User documentation updated

---

## Appendix: Key Files Reference

| File | Purpose |
|------|---------|
| `requirements/TSS-PPM-Requirements.md` | Complete requirements specification |
| `requirements/IDE-Competency-Framework.md` | HOW-axis competency definitions (24 competencies x 3 languages) |
| `requirements/TSS-PPM-Demo_Guide.md` | Demo accounts and workflow walkthrough |
| `keycloak/tss-ppm-realm.json` | Keycloak realm configuration with roles and users |
| `keycloak/themes/README.md` | Custom login theme documentation |
| `CLAUDE.md` | Development guidance and project overview |

---

**Document Version**: 1.0
**Created**: January 2026
**Status**: Ready for Review
