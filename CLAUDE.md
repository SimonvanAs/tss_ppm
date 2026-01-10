# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TSS PPM (Performance Portfolio Management) v3.0 is an HR performance scoring web application that replaces Excel-based annual employee reviews. It uses a 9-grid scoring system (WHAT-axis × HOW-axis) with voice input, multi-language support (EN/NL/ES), and automated PDF-A report generation.

## Technology Stack

- **Frontend**: Vue 3 with Vite (SPA)
- **Backend**: Python (FastAPI) + PostgreSQL 17
- **Authentication**: Keycloak JS adapter v26 (OIDC/EntraID federation) with custom TSS-PPM theme
- **Voice Input**: faster-whisper Python service (Docker) or configurable voice-to-text API
- **Styling**: Tahoma font, brand colors: Magenta (#CC0E70), Navy Blue (#004A91)
- **Deployment**: Docker containers with Caddy reverse proxy for TLS
- **Output**: PDF-A format reports

## Key Architectural Concepts

### Scoring System
- **WHAT-axis (Goals)**: Up to 9 weighted goals (must total 100%), scored 1-3. Goal types: Standard, KAR, SCF
- **HOW-axis (Competencies)**: 6 competencies per TOV level (A/B/C/D), each scored 1-3
- **VETO Rules**:
  - SCF goal scores 1 → entire WHAT score = 1.00
  - KAR goal scores 1 → triggers VETO, but can be compensated by another KAR goal scoring 3
  - Any competency scores 1 → entire HOW score = 1.00
- **9-Grid**: 3×3 matrix combining WHAT (rows) and HOW (columns), color-coded: Red, Orange, Green, Dark Green

### User Roles
- **EMPLOYEE**: View/edit own goals, view reviews, task list
- **MANAGER**: Score team reviews, approve goal changes, view team dashboard
- **HR**: View all reviews, organization statistics, calibration sessions
- **ADMIN**: Manage OpCo settings, users, AI API credentials

### Review Workflow Stages
1. GOAL_SETTING → Employee sets goals
2. MID_YEAR_REVIEW → Manager scores, calibration, signatures
3. END_YEAR_REVIEW → Final scoring, calibration, signatures

### Competency Framework
The HOW-axis uses the IDE Competency Framework with 3 main categories, each with 2 subcategories (6 total), across 4 levels:
- **Dedicated**: Result driven, Committed
- **Entrepreneurial**: Entrepreneurial, Ambition
- **Innovative**: Market oriented, Customer focused
- Levels A-D correspond to increasing seniority/scope
- Full competency data is in `requirements/IDE-Competency-Framework.md`

## Multi-Language Support

All UI elements, competency descriptions, and reports support EN, NL, ES. Translation keys should be centralized in JSON files with graceful fallback to English.

## Security Requirements

- XSS prevention on all inputs (use Vue's built-in protection + server validation)
- SQL injection prevention (parameterized queries)
- RBAC via Keycloak for all protected routes
- Full audit trail for review changes and views
- GDPR compliance: data export, consent management, right to deletion

## Database Considerations

- Schema updates should be handled at app startup (migrations)
- Session codes: 8-12 character alphanumeric for resume functionality
- Auto-save: trigger after 2-3 seconds of inactivity
- Audit logging for all data modifications

## Voice Input Architecture

- Hold-to-dictate interaction (press/hold to record, release to stop)
- Appends to existing text (does not replace)
- Visual states: Idle (grey), Recording (magenta pulse), Processing (blue spinner), Error (red shake)
- Language matches app selection (EN/NL/ES)
- Technology: faster-whisper Python service (Docker) using whisper-small model, or configurable voice-to-text API

## Keycloak Theme

Custom login theme located in `keycloak/themes/tss-ppm/` that matches the application branding:
- Brand colors (Magenta/Navy Blue) and Tahoma typography
- Custom login page templates (FreeMarker `.ftl` files)
- TSS logo on login page
- Responsive design for mobile
- Configured via realm JSON (`keycloak/tss-ppm-realm.json`) with `loginTheme: "tss-ppm"`
