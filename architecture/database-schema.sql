-- TSS PPM v3.0 Database Schema
-- PostgreSQL 17
-- Run with: psql -U ppm -d tss_ppm -f database-schema.sql

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- For gen_random_uuid()

-- ============================================================================
-- TABLES
-- ============================================================================

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
    stage VARCHAR(50) NOT NULL DEFAULT 'GOAL_SETTING'
        CHECK (stage IN ('GOAL_SETTING', 'MID_YEAR_REVIEW', 'END_YEAR_REVIEW')),
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'PENDING_EMPLOYEE_SIGNATURE', 'EMPLOYEE_SIGNED',
                          'PENDING_MANAGER_SIGNATURE', 'MANAGER_SIGNED', 'SIGNED', 'ARCHIVED')),
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
    goal_type VARCHAR(20) NOT NULL DEFAULT 'STANDARD'
        CHECK (goal_type IN ('STANDARD', 'KAR', 'SCF')),
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
    scope VARCHAR(50) NOT NULL CHECK (scope IN ('BUSINESS_UNIT', 'COMPANY_WIDE')),
    business_unit_id UUID REFERENCES business_units(id),
    status VARCHAR(50) NOT NULL DEFAULT 'PREPARATION'
        CHECK (status IN ('PREPARATION', 'IN_PROGRESS', 'PENDING_APPROVAL', 'COMPLETED', 'CANCELLED')),
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
    request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('ADD', 'EDIT', 'DELETE')),

    -- Proposed changes
    proposed_title VARCHAR(500),
    proposed_description TEXT,
    proposed_weight INTEGER,
    proposed_type VARCHAR(20),

    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
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

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_reviews_opco_year ON reviews(opco_id, review_year);
CREATE INDEX idx_reviews_employee ON reviews(employee_id);
CREATE INDEX idx_reviews_manager ON reviews(manager_id);
CREATE INDEX idx_reviews_status ON reviews(status);
CREATE INDEX idx_reviews_stage ON reviews(stage);
CREATE INDEX idx_goals_review ON goals(review_id);
CREATE INDEX idx_goals_type ON goals(goal_type);
CREATE INDEX idx_competency_scores_review ON competency_scores(review_id);
CREATE INDEX idx_competencies_level ON competencies(level);
CREATE INDEX idx_calibration_sessions_opco ON calibration_sessions(opco_id, review_year);
CREATE INDEX idx_calibration_adjustments_session ON calibration_adjustments(session_id);
CREATE INDEX idx_goal_change_requests_review ON goal_change_requests(review_id);
CREATE INDEX idx_goal_change_requests_status ON goal_change_requests(status);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at);
CREATE INDEX idx_users_opco ON users(opco_id);
CREATE INDEX idx_users_manager ON users(manager_id);
CREATE INDEX idx_users_keycloak ON users(keycloak_id);
CREATE INDEX idx_business_units_opco ON business_units(opco_id);

-- ============================================================================
-- FOREIGN KEY FOR CALIBRATION SESSION (added after reviews table exists)
-- ============================================================================

ALTER TABLE reviews
ADD CONSTRAINT fk_reviews_calibration_session
FOREIGN KEY (calibration_session_id) REFERENCES calibration_sessions(id);

-- ============================================================================
-- TRIGGERS FOR updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_opcos_updated_at BEFORE UPDATE ON opcos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_units_updated_at BEFORE UPDATE ON business_units
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competencies_updated_at BEFORE UPDATE ON competencies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competency_scores_updated_at BEFORE UPDATE ON competency_scores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calibration_sessions_updated_at BEFORE UPDATE ON calibration_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
