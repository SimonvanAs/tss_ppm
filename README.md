# TSS PPM v3.0 - Performance Portfolio Management

A web-based HR performance scoring application that replaces Excel-based annual employee reviews with a modern, multi-language platform featuring voice input and automated report generation.

## Project Goal

TSS PPM v3.0 aims to streamline the annual performance review process by providing:

- **Visual 9-Grid Scoring**: Intuitive performance visualization combining WHAT (goals/results) and HOW (competencies/behaviors) axes
- **Voice-Powered Input**: Hold-to-dictate functionality for hands-free goal and feedback entry
- **Multi-Language Support**: Full localization for English, Dutch, and Spanish
- **Automated PDF Reports**: Professional PDF-A format reports with company branding
- **Team Analytics**: Manager and HR dashboards with performance distribution insights
- **Calibration Sessions**: Ensure fair and consistent ratings across teams and business units

## Key Features

### Performance Scoring
- **WHAT-axis**: Up to 9 weighted goals (Standard, KAR, SCF types) with drag-and-drop reordering
- **HOW-axis**: 6 competencies based on IDE Framework across 4 seniority levels (A-D)
- **VETO Rules**: Automatic score adjustments for critical underperformance
- **Real-time Grid**: Visual 9-grid updates as scores are entered

### Workflow Management
- Three-stage review cycle: Goal Setting, Mid-Year Review, End-Year Review
- Digital signature workflow for employee and manager sign-off
- Goal change request and approval system
- Task lists for pending actions

### Analytics & Reporting
- Team performance dashboards for managers
- Organization-wide statistics for HR
- Historical performance tracking and trends
- Excel and PDF export options

## Technology Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 19 + Vite 7 |
| Backend | TBD + PostgreSQL 17 |
| Authentication | Keycloak v26 (OIDC/EntraID) + custom theme |
| Voice Input | faster-whisper (Docker) |
| Reverse Proxy | Caddy (TLS) |
| Deployment | Docker containers |

## User Roles

| Role | Capabilities |
|------|--------------|
| **Employee** | View/edit own goals, view reviews, approve review forms |
| **Manager** | Score team reviews, approve goal changes, view team dashboard |
| **HR** | View all reviews, organization statistics, manage calibration sessions |
| **Admin** | Manage OpCo settings, users, API credentials |

## Brand Guidelines

- **Primary Magenta**: `#CC0E70` (accents, buttons, focus states)
- **Primary Navy Blue**: `#004A91` (headings, secondary elements)
- **Typography**: Tahoma font family

## Documentation

- [CLAUDE.md](CLAUDE.md) - Development guidance and architectural overview
- [TSS-PPM-Requirements.md](requirements/TSS-PPM-Requirements.md) - Complete requirements specification
- [IDE-Competency-Framework.md](requirements/IDE-Competency-Framework.md) - HOW-axis competency definitions
- [TSS-PPM-Demo_Guide.md](requirements/TSS-PPM-Demo_Guide.md) - Quick start guide for new users
- [keycloak/themes/README.md](keycloak/themes/README.md) - Custom Keycloak login theme

## Getting Started

See [TSS-PPM-Demo_Guide.md](requirements/TSS-PPM-Demo_Guide.md) for demo accounts and a walkthrough of the application features.

## License

Proprietary - Total Specific Solutions
