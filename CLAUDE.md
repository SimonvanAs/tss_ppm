# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **HR Performance Scoring Web Application** for Total Specific Solutions. The application replaces an Excel-based annual employee performance review process with a web-based interface featuring:
- 9-grid performance scoring (WHAT-axis × HOW-axis)
- Multi-language voice input (English, Spanish, Dutch)
- Automatic DOCX report generation
- Session-based auto-save with 14-day retention

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
```

## Technology Stack

- **Frontend**: React 18 with Vite
- **Styling**: Custom CSS with Tahoma font
- **Brand Colors**: Magenta `#CC0E70`, Navy Blue `#004A91` (as accents)
- **Storage**: Browser localStorage (14-day max retention)
- **Output**: DOCX generation via `docx` package
- **Voice**: Web Speech API for speech-to-text

## Project Structure

```
hr-performance-app/
├── src/
│   ├── components/       # React components (Header, WhatAxis, HowAxis, etc.)
│   ├── contexts/         # React contexts (FormContext, LanguageContext)
│   ├── hooks/            # Custom hooks (useVoiceInput)
│   ├── languages/        # i18n translations (en.json, nl.json, es.json)
│   ├── utils/            # Utilities (scoring, session, competencies, docxGenerator)
│   ├── App.jsx           # Main app component
│   └── App.css           # Global styles
└── package.json
```

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

## Key Files

| File | Purpose |
|------|---------|
| `HR-Scoring-App-Prompt.md` | Complete requirements document |
| `IDE-Competency-Framework-Complete.md` | HOW-axis competency data with EN/NL/ES translations |
| `src/utils/scoring.js` | WHAT/HOW score calculations, validation |
| `src/utils/session.js` | Session management, localStorage handling |
| `src/utils/docxGenerator.js` | DOCX report generation |
| `src/utils/competencies.js` | All 24 competencies with translations |

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
- Voice input uses Web Speech API with language codes (en-US, nl-NL, es-ES)
- Language selector persists with session

## Future Phases

- **Phase 2**: Enhanced UX, dictation mode, rich text editors, mobile optimization
- **Phase 3**: Multi-user auth, admin dashboard, analytics
- **Phase 4**: AFAS HRIS integration, advanced features
