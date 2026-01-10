# HR Performance Scoring Web Application - Complete Requirements Document

## 🎯 Project Overview
Build a comprehensive web-based HR performance scoring application that replaces the current Excel-based process. The application enables managers to conduct annual employee reviews using a 9-grid scoring system (WHAT-axis × HOW-axis) with voice input capabilities, multi-language support, and automated report generation.

---

## 🏗️ Core Architecture

### Technology Stack
- **Frontend Framework**: Vue 3 with Vite (single-page application)
- **Styling**: Corporate/professional design with Tahoma font
- **Brand Colors**:
  - Primary Magenta: `#CC0E70` (used as accent, gradient backgrounds, focus states)
  - Primary Navy Blue: `#004A91` (used as accent for headings)
- **Visual Design**:
  - Pink gradient background (subtle, using magenta with transparency)
  - Section cards with gradient border highlights
  - Focus states in magenta color
- **Storage**: PostgreSQL 17 database, database schema updates should be done at app startup
- **Deployment**: containerized (should include Dockerfile and docker-compose.yml)
- **Reverse proxy**: Caddy (for TLS and certificate handling)
- **Authentication**: Keycloak JS adapter v26 (OIDC/EntraID federation)
- **Backend**: Python (FastAPI) + PostgreSQL
- **Output Format**: PDF-A (via WeasyPrint)
- **Security**: XSS and SQL injection prevention on all input fields
- **Voice Input**:
  - Server: faster-whisper Python service (Docker)
  - Server: voice-to-text API to be configured by Admin

### Backend Stack Details
- **Framework**: FastAPI (Python 3.11+)
- **Database Driver**: asyncpg (raw SQL, no ORM)
- **Migrations**: Numbered SQL files with simple runner script
- **Auth**: PyJWT for Keycloak token validation
- **PDF Generation**: WeasyPrint (HTML/CSS to PDF-A)

### Minimal Dependencies Philosophy
- Prefer standard library over third-party packages
- Raw SQL over ORM abstractions
- Built-in framework features over additional libraries

### Multi-User Architecture
- **User Roles**:
  - **EMPLOYEE**: View/edit own goals, view reviews, task list
  - **MANAGER**: Score team reviews, approve goal changes, view team dashboard, task list
  - **HR**: View all reviews, organization statistics, calibration sessions
  - **ADMIN**: Manage OpCo settings, users, AI API credentials/connectors
- **Authentication**: Keycloak with OIDC/EntraID federation
- **Session Management**: Database-backed reviews with full audit trail

---

## 📊 Scoring System Architecture

### 1. WHAT-Axis: Goals & Results (Flexible, up to 9 criteria)

#### Goal Types (Implemented):
- **Standard Goals**: Regular performance goals, based on strategic map
- **KAR Objectives** (Optional, per OpCo): Key Account Responsibilities
- **SCF Objectives** (Optional, per OpCo): TSS Security Control Framework

#### Field Structure per Criterion:
- **Goal Type**: Dropdown (Standard, KAR, SCF) - shown as badge in UI
- **Goal Label/Title**: Text input
  - Placeholder text (light grey): "SMART formulated goal"
  - No character limit
  - XSS/SQL injection prevention required
  
- **Goal Description**: Textarea
  - No character limit
  - XSS/SQL injection prevention required
  
- **Score**: Dropdown (1, 2, or 3)
  - 1 = Below expectations
  - 2 = Meets expectations
  - 3 = Exceeds expectations
  
- **Weight Percentage**: Number input
  - Must be assigned for every goal with text content
  - All weights must sum to exactly 100% before report generation
  - Validation: Cannot exceed 100% total
  - Example: 5 goals at 20% each, or 9 goals with varying percentages

#### Functionality:
- **Drag-and-Drop Reordering**: Managers can rearrange goals
- **Dynamic Add/Remove**: Add up to 9 goals, remove any except the last one
- **Weighted Average Calculation**: 
  ```
  WHAT Score = Σ(Goal Score × Weight) / 100
  Result: 1.00 to 3.00
  ```
- **SCF VETO Rule**: If ANY SCF objective scores 1, overall WHAT score = 1.00 (overrides weighted average)
- **KAR Rule**: Key Area of Responsibility: see VETO rule, but can be compensated by another KAR goal
- **Goal Sections**: Separate visual sections for Standard Goals, KAR Objectives, and SCF Objectives
- **Validation**: All goals with content must be scored and weighted before download
- **AI supported SMART improvement**: Button to suggest working improvements to formulate goals SMART

---

### 2. HOW-Axis: Competencies & Behaviors (4 predefined levels)

#### TOV-Level Selection:
- **Location**: Dropdown at the top of form (alongside Name, Manager and Function Title)
- **Options**: A, B, C, D

#### Detailed Competency Scoring (Implemented):
- **6 Competencies per TOV Level**: Each level has 6 specific competencies
- **Individual Scoring**: Each competency scored 1-3
- **VETO Rule**: If ANY competency = 1, overall HOW Score = 1.00
- **Competency Categories**: Organized by category and subcategory
- **Competency Notes**: Optional explanation text per competency
- **Per-OpCo Configuration**: Competencies configurable per operating company

#### Level Descriptions:
**[See scoring reference in 'IDE-Competency-Framework.md' - stored in database]**

#### Display Rules:
- Only show the **selected level description** in the app interface
- Only include the **selected level description** in the final report
- Show all 6 competencies for selected level with scoring inputs
- Display competency notes in report if provided

---

### 3. Nine-Grid Scoring Matrix (3×3)

#### Grid Structure:
```
         HOW-Axis (Competencies)
         1          2          3
    ┌──────────┬──────────┬──────────┐
  3 │  Orange  │  Green   │ DarkGreen│ WHAT-Axis
    ├──────────┼──────────┼──────────┤ (Goals)
  2 │  Orange  │  Green   │  Green   │
    ├──────────┼──────────┼──────────┤
  1 │   Red    │  Orange  │  Orange  │
    └──────────┴──────────┴──────────┘
```

#### Color Coding:
- **Red** (1,1): Immediate attention needed
- **Orange** (1,2), (1,3), (2,1), (3,1): Development area
- **Green** (2,2), (2,3), (3,2): Good performance
- **Dark Green** (3,3): Exceptional performance

#### Grid Conversion:
- WHAT-axis: Use weighted average (1.00-3.00) → round to 1, 2, or 3
- HOW-axis: Use weighted average (1.00-3.00) → round to 1, 2, or 3

#### Visual Display:
- Show visual 3×3 grid with color-coded cells
- Highlight the employee's position on the grid
- Display numeric scores: "WHAT: X.XX, HOW: X.XX"
- No text labels (e.g., "High Performer"), only colors
- Include this visual in the downloadable report

---

## 🎤 Voice Input System

### Core Functionality:
- **Trigger**: Microphone icon button on every text input field
- **Interaction**: Hold-to-dictate (press and hold to record, release to stop)
- **Behavior**: Appends to existing text (does not replace)
- **Language Support**: English, Spanish, Dutch (matches app language selection)
- **Technology**: Two options (for Admin to configure):
   - Standard: whisper-small
   - API voice-to-text based

### Architecture:
- **Frontend**: Vue 3
- **Backend**: Python (FastAPI)
- **Model**: whisper-small (~500MB, good accuracy for EN/NL/ES)

### Hold-to-Dictate Mode:
- **Desktop**: Press and hold mouse button on microphone icon
- **Mobile**: Touch and hold microphone icon
- **Release**: Stops recording when button/touch is released
- **Processing**: Shows spinner while transcribing (blue color)
- **No Voice Commands**: Simple dictation only, no command parsing

### Visual Feedback:
- **Idle State**: Grey microphone icon button
- **Active Recording**:
  - Button scales up (1.1x) with smooth transition
  - Pulse glow animation (magenta rings)
  - Animated sound wave bars inside button
  - "Listening..." label appears below button
  - Color changes to magenta gradient
- **Processing State**:
  - Blue gradient background
  - Spinning loader animation
  - "Processing..." label
- **Error State**:
  - Red border with shake animation
  - Error tooltip: "Dictation unavailable. Please type instead or try a different browser."
- **Tooltip**: "Hold to speak" (localized)

### Implementation Details:
```
// Append mode example (pseudocode)
currentText = "Already entered goal: "
voiceInput = "Increase sales by 15%"
result = "Already entered goal: Increase sales by 15%"

// Event handlers for hold-to-dictate (Vue)
@mousedown / @touchstart → startListening()
@mouseup / @touchend / @mouseleave → stopListening()

// Audio flow
1. Record audio (MediaRecorder API in browser)
2. Convert to WAV in browser (AudioContext)
3. Send to /api/v1/transcribe
4. FastAPI proxies to whisper service
5. Text appended to input field
```

---

## 👤 Employee Information Fields

### Required Fields:
1. **Employee Name**: Text input
2. **Function Title/Role**: Text input
3. **Business Unit**: Dropdown
4. **TOV-Level**: Dropdown (A, B, C, D)
5. **Review Period/Year**: Date picker
6. **Reviewer Date**: Date picker
7. **Manager Name**: Auto-populated from login or text input

### Optional Fields:
- None at this stage

### Validation:
- All required fields must be completed before report generation
- Display validation errors clearly
- Highlight incomplete fields in red

---

## 💬 Comments & Feedback Sections

### 1. Summary Section (Top of Report):
- **Location**: Beginning of report, after employee info
- **Purpose**: Executive summary of performance
- **Input**: Rich text editor
- **Character Limit**: 500-1000 words suggested
- **Voice Input**: Enabled


### 2. Generic Comments (Bottom of Report):
- **Location**: End of report
- **Purpose**: Additional notes, development areas, action items
- **Input**: Rich text editor
- **Character Limit**: Unlimited
- **Voice Input**: Enabled

---

## 📥 Report Generation & Download

### PDF-A Format Requirements:
- **File Name**: `Performance_Review_[EmployeeName]_[Year].PDF`
- **Styling**: Professional formatting with brand colors and OpCo logo

### Report Structure:
```
1. Header
   - Company Logo (uploaded by Admin)
   - Review Period
   
2. Employee Information
   - Name, Role, Business Unit, TOV-Level
   - Manager Name, Review Date
   
3. Executive Summary
   - Summary comments (from summary section)
   
4. Performance Grid Visual
   - 3×3 colored grid with position marked
   - WHAT Score: X.XX / 3.00
   - HOW Score: X.XX / 3.00
   
5. WHAT-Axis: Goals & Results
   For each goal:
   - Goal title
   - Description and badge if applicable: SCF, KAR
   - Score (1-3)
   - Weight percentage
   - Weighted score contribution
   
6. HOW-Axis: Competencies
   - TOV-Level (A/B/C/D)
   - Selected level description text
   
7. Manager review
   - Manager's input at each comment section when filled
   
8. Additional Comments
   - Generic comments from bottom section
   
9. Footer
   - Version/Year tracking
   - Generated date
   - Session code
```

### Logo Handling:
- **Upload Feature**: Allow Admins to upload company logo
- **Storage**: Store in Admin settings
- **Format**: PNG, JPG, SVG (max 2MB)
- **Placement**: Top-left of report header
- **Sizing**: Automatic scaling to fit

### Export Options:
- **Download Final Report**: Full PDF-A with all validations passed
- **Page Breaks**: Strategic placement for readability

### Print-Friendly View:
- **Preview Mode**: Show exactly how report will look
- **Browser Print**: Optimized CSS for printing
- **Page Breaks**: Strategic placement for readability

---

## 🌍 Multi-Language Support

### Supported Languages:
1. **English** (en)
2. **Spanish** (es)
3. **Dutch** (nl)

### Translation Scope:
- All UI labels and buttons
- Form field placeholders
- Validation messages
- Report section headers
- Help text and tooltips
- HOW-axis level descriptions (if different per language)

### Language Selector:
- **Location**: Top-left corner of sticky sidebar
- **Design**: Flag icon buttons (🇬🇧 English, 🇳🇱 Dutch, 🇪🇸 Spanish)
- **Active State**: Magenta border with subtle glow effect
- **Hover Effect**: Scale up animation
- **Persistence**: Save language preference with session
- **Default**: Admin setting

### Report Language:
- Report generated in the language selected during form completion
- Language code stored with session data

---

## 💾 Session Management & Auto-Save

### Auto-Save Functionality:
- **Trigger**: Save after 2-3 seconds of inactivity on any field
- **Storage**: Database
- **Data Saved**: 
  - All form fields
  - Goal items and weights
  - TOV-level selection
  - Comments sections
  - Language preference
  - Timestamp of last save

### Session Code System:
- **Generation**: Unique 8-12 character alphanumeric code stored in database
- **Purpose**: Resume incomplete reviews
- **Persistence**: Database
- **Cleanup**: Manual by HR

### Resume Feature:
- **Input**: From 'My reviews' menu options
- **Validation**: Check if code exists
- **Loading**: Restore all saved data to form
- **Error Handling**: Clear message if review is unavailable

### Data Privacy:
- **Encryption**: Consider basic encryption for sensitive data
- **Deletion**: By HR
- **GDPR**: Admins not allowed to see review contents or individual names

---

## 🎨 User Interface & Design

### Design Principles:
- **Style**: Corporate/professional
- **Typography**: Tahoma font family throughout
- **Color Palette**:
  - Primary Background: White (#FFFFFF) or light grey (#F5F5F5)
  - Text: Dark grey (#333333)
  - Accent 1: Magenta (#CC0E70) - for buttons, highlights, grid colors
  - Accent 2: Navy Blue (#004A91) - for headers, secondary elements
  - Success: Green (#28A745)
  - Warning: Orange (#FFA500)
  - Error: Red (#DC3545)

### Layout Structure (Single Page Scroll, left hand menu):

```
┌────────────────────┬─────────────────────────────────────────────────┐
│ STICKY SIDEBAR     │                                                 │
│ (Fixed Left)       │  MAIN CONTENT AREA (Scrollable)                 │
│                    │                                                 │
│ ┌────────────────┐ │  ┌─ Employee Information ────────────────────┐  │
│ │  [Logo]        │ │  │ Name: [________]  🎤                      │  │
│ └────────────────┘ │  │ Role: [________]  🎤                      │  │
│                    │  │ Business Unit: [________]  🎤             │  │
│ ┌────────────────┐ │  │ TOV-Level: [▼]  Review Date: [📅]        │  │
│ │ 🌐 Lang        │ │  └───────────────────────────────────────────┘  │
│ │ [EN][NL][ES]   │ │                                                 │
│ └────────────────┘ │  ┌─ Summary Comments ────────────────────────┐  │
│                    │  │ [Rich text editor with voice input 🎤]    │  │
│ ┌────────────────┐ │  └───────────────────────────────────────────┘  │
│ │ Progress: 60%  │ │                                                 │
│ │ ████████░░░░░░ │ │  ┌─ WHAT-Axis: Goals & Results ─────────────┐  │
│ └────────────────┘ │  │                                           │  │
│                    │  │ Goal 1 [☰ drag]              [❌ remove]  │  │
│ ┌────────────────┐ │  │   Title: [________________] 🎤            │  │
│ │ Navigation     │ │  │   Description: [__________] 🎤            │  │
│ │                │ │  │   Score: [1▼]  Weight: [20]%              │  │
│ │ • Employee     │ │  │                                           │  │
│ │ • Summary      │ │  │ Goal 2 [☰ drag]              [❌ remove]  │  │
│ │ • Goals        │ │  │   ...                                     │  │
│ │ • Competencies │ │  │                                           │  │
│ │ • Grid         │ │  │ [+ Add Goal] (max 9)                      │  │
│ │ • Comments     │ │  │ Total Weight: 100% ✓                      │  │
│ └────────────────┘ │  └───────────────────────────────────────────┘  │
│                    │                                                 │
│                    │  ┌─ HOW-Axis: Competencies ─────────────────┐  │
│                    │  │ Selected Level: B                         │  │
│                    │  │ [6 competency scoring cards]              │  │
│                    │  └───────────────────────────────────────────┘  │
│                    │                                                 │
│                    │  ┌─ Performance Grid ────────────────────────┐  │
│                    │  │      1     2     3                        │  │
│                    │  │   ┌────┬────┬────┐                        │  │
│                    │  │ 3 │ 🟧 │ 🟩 │ 🟢 │                        │  │
│                    │  │   ├────┼────┼────┤                        │  │
│                    │  │ 2 │ 🟧 │ 🟩●│ 🟩 │  ← You are here       │  │
│                    │  │   ├────┼────┼────┤                        │  │
│                    │  │ 1 │ 🟥 │ 🟧 │ 🟧 │                        │  │
│                    │  │   └────┴────┴────┘                        │  │
│                    │  │ WHAT: 2.35  HOW: 2                        │  │
│                    │  └───────────────────────────────────────────┘  │
│                    │                                                 │
│                    │  ┌─ Additional Comments ─────────────────────┐  │
│                    │  │ [Rich text editor with voice input 🎤]    │  │
│                    │  └───────────────────────────────────────────┘  │
│                    │                                                 │
│                    │  [Preview Report] [Save as Draft] [Submit Final]│
│                    │                                                 │
└────────────────────┴─────────────────────────────────────────────────┘
```

### Sidebar Components:
- **Position**: Fixed at left, does not scroll with content
- **Width**: ~200-250px
- **Contents**:
  - Logo (top)
  - Language selector (flag buttons)
  - Progress indicator (vertical bar)
  - Section navigation (click to scroll)

### Progress Indicator:
- **Location**: In sidebar
- **Style**: Vertical progress bar
- **Calculation**: 
  ```
  Required fields: Employee info (4 fields) = 30%
  WHAT-axis (at least 3 goals fully filled) = 30%
  HOW-axis (TOV-level selected) = 20%
  Comments (summary filled) = 20%
  Total = 100%
  ```
- **Visual**: Color-coded (red < 50%, orange 50-80%, green > 80%)
- **Label**: "60% Complete" next to bar

### Responsive Design (Mobile/Tablet):
- **Breakpoints**:
  - Desktop: > 1024px (full layout)
  - Tablet: 768px - 1024px (adjusted columns)
  - Mobile: < 768px (stacked layout - not primary focus)
  
- **Tablet Optimization**:
  - Single column form fields
  - Larger touch targets (48px minimum)
  - Optimized voice input buttons
  - Collapsible sections
  - Grid visualization remains visible

### Form Validation:
- **Real-Time**: Validate as user types/selects
- **Visual Indicators**:
  - ✓ Green checkmark for valid fields
  - ✗ Red X for invalid fields
  - ⚠ Orange warning for optional issues
  
- **Validation Rules**:
  - Required fields cannot be empty
  - Weight percentages must sum to 100%
  - All goals with text must have scores
  - TOV-level must be selected
  - Email format validation (if email feature)
  
- **Error Messages**:
  - Display inline below field
  - Use clear, actionable language
  - Example: "Weight total is 85%. Add 15% more to reach 100%."

### Microinteractions:
- Button hover states (subtle color shift)
- Loading spinners during saves
- Success animations (checkmark fade-in)
- Drag-and-drop visual feedback
- Voice input pulse animation
- Auto-save notification (toast message)

---

## 📊 Analytics & Reporting Dashboard

### Multi-Level Analytics (Implemented):
- **Level Selector**: Filter by Manager, Team, Business Unit, or Company-Wide
- **Interactive 9-Grid Visualization**: 
  - Click any cell to view employees in that position
  - Employee count per cell
  - Color-coded distribution
- **Distribution Charts**: 
  - Current vs. target distribution
  - Performance distribution bars
- **Statistics**:
  - Total employees
  - Average WHAT and HOW scores
  - Top performers count
- **Export Options**:
  - Excel export
  - PDF export
- **Access Control**: 
  - Managers: View own team only
  - HR: View Business Unit, Company-Wide level
  - Admins: No view

### Team Performance Dashboard (Manager Feature):
- **Team Overview Page**: 
  - Direct reports list with current review status
  - Team 9-grid visualization showing all team members
  - Sortable table with WHAT/HOW scores
  - Filter by year and status
- **Team Statistics**:
  - Team size
  - Completion rate
  - Average scores
  - Top performers identification

### Historical Performance Tracking:
- **Performance History Dashboard**:
  - Year-over-year score comparison
  - Trend line charts (WHAT and HOW scores over time)
  - Historical 9-grid positions
  - Score change indicators (improving/declining/stable)
- **Year Range Filtering**:
  - Select specific year ranges
  - Include/exclude mid-year reviews
- **Export Options**:
  - Excel export with historical data
  - PDF export with charts
- **Access Control**:
  - Employees: View own history
  - Managers: View team member history
  - HR: View any employee history

### Analytics to Track:
1. **Team Performance Distribution**:
   - Chart showing employees across 9-grid cells
   - Percentage in each quadrant
   - Average WHAT score
   - Average HOW score

2. **Goal Analysis**:
   - Most common goal types
   - Average goal weights
   - Score distribution per goal category

3. **Review Completion**:
   - Number of reviews in progress
   - Number of completed reviews
   - Average time to complete

4. **Manager Activity**:
   - Reviews completed per manager
   - Average scores given by manager

### Visualization Types:
- **Heat Map**: 3×3 grid with employee count in each cell
- **Bar Charts**: Score distributions
- **Pie Charts**: Completion rates
- **Line Charts**: Trends over time (future years)

### Export Options:
- Download analytics as PDF
- Export data as CSV/Excel

### Privacy:
- Anonymize data where appropriate
- Role-based access (only HR see analytics)

### Product Analytics (Plausible):
Privacy-friendly usage analytics via self-hosted Plausible instance.

**Configuration (Admin Portal)**:
- **Analytics Enabled**: Toggle on/off
- **Plausible URL**: On-prem instance URL (e.g., `https://plausible.company.internal`)
- **Site Domain**: Domain identifier for this installation
- **Test Connection**: Verify connectivity to Plausible instance

**Automatic Tracking**:
- Page views (no cookies, no personal data)
- Referrer sources
- Device/browser breakdown
- Geographic distribution (country-level only)

**Custom Events**:

| Event | Trigger | Properties |
|-------|---------|------------|
| `review_created` | New review initiated | `stage`, `role` |
| `review_submitted` | Submitted for signature | `stage` |
| `review_signed` | Employee or manager signs | `signer_role` |
| `goal_added` | Goal created | `goal_type` |
| `voice_input_used` | Voice recording completed | `language` |
| `pdf_generated` | PDF report downloaded | `stage` |
| `calibration_completed` | Session finalized | `scope` |
| `language_switched` | User changes UI language | `to_language` |
| `session_resumed` | Review resumed via code | - |

**Privacy Compliance**:
- No cookies required (GDPR compliant)
- No personal data collected
- No cross-site tracking
- Data stays on-prem

**Dashboard Access**:
- HR and Admin roles only
- Embedded iframe or link to Plausible dashboard

---

## 🔐 Security & Data Privacy

### Input Security:
- **XSS Prevention**: 
  - Sanitize all user inputs
  - Escape HTML entities
  - Use Vue's built-in XSS protection
  - Validate on both client and server (future)

- **SQL Injection Prevention**:
  - Parameterized queries (when database added)
  - Input validation
  - Whitelist allowed characters

### Data Storage:
- **Primary**: PostgreSQL
- **Encryption**: Data encrypted in transit (HTTPS/TLS)
- **Access Control**: Role-based access control (RBAC) via Keycloak
- **Data Retention**: Configurable per OpCo
- **Audit Trail**: Full audit logging for all review changes and views on employee review by Manager or HR

### Authentication & Authorization:
- **Keycloak Integration**: 
  - OIDC/EntraID federation
  - Single Sign-On (SSO) support
  - Token-based API authentication
  - Automatic token refresh
- **Role-Based Access Control (RBAC)**:
  - Employee: Own reviews only
  - Manager: Team reviews + approvals
  - HR: All reviews + analytics
  - OpCo Admin: OpCo-wide management
- **Protected Routes**: 
  - Route-level access control
  - Component-level role guards
  - Automatic redirect on unauthorized access

### GDPR Compliance:
- **Notice**: Inform users about data storage
- **Consent**: Explicit consent for data processing
- **Right to Delete**: Session clearing
- **Data Minimization**: Collect only necessary data
- **Privacy Policy**: Link to company privacy policy
- **Data Export**: Users can export their own data in PDF
- **Audit Logs**: Track all data access and modifications

### Future Considerations (AFAS Integration):
- Direct AFAS HRIS API integration
- Automated employee data sync
- Import historical reviews in PDF, proces and input in app
- Encrypted data transmission (HTTPS/TLS)
- Regular security audits

---

## 🎨 UI/UX Enhancements (Implemented)

### Translation System:
- **Complete i18n Support**: All UI elements translated
- **Languages**: English, Spanish, Dutch
- **Translation Keys**: Centralized in JSON files
- **Fallback Handling**: Graceful fallback to English if translation missing
- **Footer Attribution**: GitHub Icon with "View source" Robot icon (🤖) with "Made with AI assistance" text, Expandable "Credits" with names: Graciela van der Stroom, Tjerk Venrooy, Simon van As

### Responsive Design:
- **Mobile Optimization**: Touch-friendly interfaces
- **Tablet Support**: Optimized layouts for tablets
- **Desktop**: Full-featured experience
- **Grid Visualization**: Responsive 9-grid displays

### Accessibility:
- **ARIA Labels**: All interactive elements properly labeled
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader Support**: Semantic HTML structure
- **Color Contrast**: WCAG 2.1 AA compliant

---

## 🚀 Admin Features & Settings

### Admin Portal (Implemented):
- **Admin Dashboard**: 
  - Overview statistics (total users)
  - Quick actions for common tasks
  - Recent activity feed (data minimalization)
- **User Management**:
  - View all users with roles and status
  - Search and filter users
  - Edit user roles and assignments
  - Assign managers and business units
- **OpCo Management**:
  - Create/edit/delete BU's'
  - OpCo-specific settings
- **Global Dashboard**:
  - System health monitoring
  - Database and service status

### Configuration Options:
1. **Review Period Settings**:
   - Set current review year
   - Enable/disable past year reviews
   - Version tracking

2. **Goal Templates**:
   - Upload company-wide strategic map

3. **Notification Settings**:
   - Email reminders for incomplete reviews
   - Deadline notifications

4. **Data Management**:
   - Backup/restore functionality

5. **Analytics Configuration (Plausible)**:
   - Enable/disable analytics tracking
   - Plausible instance URL (on-prem or cloud)
   - Site domain identifier
   - Test connection button

### User Management (Multi-User):
- Add/remove managers
- Assign business units

---

## 🔄 Review Workflow & Stages

### Multi-Stage Review Process (Implemented):
- **Stage 1: Goal Setting**:

  - Status: `GOAL_SETTING`
  
- **Stage 2: Mid-Year Review**:

  - Status: `MID_YEAR_REVIEW`
  
- **Stage 3: End-Year Review**:

  - Status: `END_YEAR_REVIEW`

### Signature Workflow:
- **Employee Signature**:
  - Employee acknowledges review completion
  - Signature timestamp recorded
  - Status: `PENDING_EMPLOYEE_SIGNATURE` → `EMPLOYEE_SIGNED`
  
- **Manager Signature**:
  - Manager confirms review completion
  - Signature timestamp recorded
  - Status: `PENDING_MANAGER_SIGNATURE` → `MANAGER_SIGNED`
  
- **Completed Status**: `SIGNED` (both signatures received)

### Approval Workflow:
- **Goal Change Requests**:
  - Employee/Manager can request goal modifications
  - Pending approvals shown in task list
  - Manager/HR can approve or reject
  - Types: Add Goal, Edit Goal, Delete Goal

- **Stage Completion**:
  - Manager marks stage as complete
  - Triggers workflow to next stage
  - Notifications sent, added to task list

---

## 🎯 Calibration System

### Calibration Sessions:
- **Purpose**: Ensure consistency and fairness across performance ratings
- **Session Types**:
  - **Business Unit**: All employees in a business unit
  - **Company-Wide**: All employees across organization

### Session Workflow:
1. **PREPARATION**: Session being prepared
2. **IN_PROGRESS**: Active calibration meeting
3. **PENDING_APPROVAL**: Awaiting final approval
4. **COMPLETED**: Calibration finalized
5. **CANCELLED**: Session cancelled

### Calibration Features:
- **Session Creation**:
  - Name, year, scope selection
  - Business unit selection, OpCo level
  - Participant management (facilitators, observers)
  
- **Score Snapshot**:
  - Original scores captured at session start
  - Original grid positions preserved
  - Cannot be modified after snapshot
  
- **Calibration Adjustments**:
  - Adjust WHAT and HOW scores
  - Add adjustment notes
  - Track who made adjustments
  - Flag items for review by responsible manager in task list
  
- **Distribution Analysis**:
  - Current distribution vs. target
  - Original vs. calibrated comparison
  - Anomaly detection (unusual patterns) using AI
  - Distribution enforcement options
  
- **Calibration Grid**:
  - Interactive 9-grid visualization
  - Click cell to view employees
  - Filter by grid position
  - Show original vs. calibrated positions
  
- **Manager Comparison**:
  - Compare manager scoring patterns
  - Identify deviations from company average
  - Highlight managers with unusual distributions
  
- **Calibration Report**:
  - Session summary
  - All adjustments made
  - Distribution comparisons
  - Facilitator statistics
  - Export to Excel/PDF

### Access Control:
- **HR**: Create and manage calibration sessions
- **Managers**: View and adjust scores during session

---

## 📋 Implementation Phases

### Phase 1: Core Functionality (MVP)
- Single-page form with all fields
- WHAT-axis with drag-drop and weighting
- HOW-axis dropdown and descriptions
- Basic voice input (append mode)
- 3×3 grid calculation and display
- PDF-A report generation
- Auto-save
- Session code system
- Three-language support
- Basic validation

### Phase 2: Enhanced UX
- Dictation mode (voice input)
- Rich text editors for comments
- Print-friendly preview
- Mobile/tablet optimization
- Progress indicator
- Logo upload feature

### Phase 3: Multi-User & Analytics
- Keycloak authentication with OIDC/EntraID
- Role-based access control (Employee, Manager, HR, Admin)
- Multi-level analytics (Manager, BU, Company)
- Team performance dashboard
- Historical performance tracking
- Manager activity tracking
- Data export features (Excel, PDF)
- OpCo management

### Phase 4: Advanced Features & Integration
- Database-backed reviews (PostgreSQL)
- Calibration system with sessions
- Multi-stage review workflow
- Signature workflow (employee + manager)
- Approval system for goal changes
- Historical review comparison
- Advanced analytics with drill-down
- Audit trail for all changes
- Import employee data
- Goal templates
- Notification system

---

## ⚙️ Non-Functional Requirements

### Performance Requirements

#### Response Time:
- **Page Load Time**: < 3 seconds for initial page load (95th percentile)
- **API Response Time**: < 500ms for standard CRUD operations (95th percentile)
- **Voice Input Processing**: < 5 seconds (server)
- **Auto-Save**: Completes within 500ms without blocking UI
- **Report Generation**: PDF generation completes within 5 seconds
- **Search/Filter Operations**: < 1 second for filtering lists (up to 1000 items)
- **Analytics Dashboard Load**: < 3 seconds for aggregated data

#### Throughput:
- **Concurrent Users**: Support 50+ concurrent users per OpCo
- **API Requests**: Handle 100+ requests per second per OpCo
- **Database Queries**: Optimize queries to handle 1000+ reviews per OpCo
- **Export Operations**: Support 10+ concurrent report generations

#### Resource Utilization:
- **Frontend Bundle Size**: Initial bundle < 500KB (gzipped)
- **Memory Usage**: Browser memory < 200MB during normal operation
- **Database Size**: Efficient storage for 10,000+ reviews per OpCo
- **Server Resources**: API server handles 4GB RAM, 2 CPU cores minimum

### Scalability Requirements

#### Horizontal Scalability:
- **Frontend**: Stateless design allows multiple instances behind load balancer
- **API**: Stateless API design supports horizontal scaling
- **Database**: PostgreSQL with connection pooling (max 100 connections)
- **Keycloak**: Supports clustering for high availability

#### Vertical Scalability:
- **Database Growth**: Support 100,000+ reviews across all OpCos
- **User Growth**: Support 1,000+ users per OpCo
- **Data Retention**: Configurable retention policies per OpCo

### Reliability & Availability Requirements

#### Uptime:
- **Target Availability**: 99.5% uptime (approximately 3.65 days downtime per year)
- **Scheduled Maintenance**: Planned maintenance windows with user notification
- **Unplanned Downtime**: < 4 hours per incident (target)

#### Fault Tolerance:
- **Database Failover**: Automatic failover to standby database (future)
- **API Redundancy**: Multiple API instances with health checks (future)
- **Graceful Degradation**: Core functionality available if non-critical features fail
- **Error Recovery**: Automatic retry for transient failures

#### Data Integrity:
- **Transaction Consistency**: ACID compliance for all database operations
- **Audit Trail**: Immutable audit logs for all data changes
- **Backup Integrity**: Verified backups with restore testing
- **Data Validation**: Server-side validation prevents invalid data storage

### Security Requirements

#### Authentication & Authorization:
- **Single Sign-On**: Keycloak with OIDC/EntraID federation
- **Session Management**: Secure session tokens with automatic refresh
- **Role-Based Access Control**: Granular permissions per role
- **Password Policy**: Enforced via Keycloak (if applicable)
- **Multi-Factor Authentication**: Supported via Keycloak (optional)

#### Data Protection:
- **Encryption in Transit**: HTTPS/TLS 1.2+ for all communications
- **Encryption at Rest**: Database encryption (future enhancement)
- **PII Protection**: Personal data encrypted and access-controlled
- **Input Sanitization**: XSS and SQL injection prevention on all inputs
- **Output Encoding**: Proper encoding for all user-generated content

#### Security Monitoring:
- **Audit Logging**: All authentication, authorization, and data access events logged
- **Security Alerts**: Failed login attempts, unauthorized access attempts
- **Vulnerability Scanning**: Regular dependency and code scanning
- **Penetration Testing**: Annual security audits with remediation

#### Compliance:
- **GDPR Compliance**: 
  - Right to access, rectification, erasure
  - Data portability
  - Privacy by design
  - Data processing documentation
- **Data Retention**: Configurable retention policies per OpCo
- **Privacy Policy**: Comprehensive privacy notice and consent management

### Usability Requirements

#### User Experience:
- **Learning Curve**: New users productive within 30 minutes
- **Task Completion**: 90% of users complete review without help
- **Error Messages**: Clear, actionable error messages in user's language
- **Help Documentation**: Contextual help and tooltips available

#### Accessibility:
- **WCAG 2.1 AA Compliance**: All UI elements meet accessibility standards
- **Keyboard Navigation**: Full functionality via keyboard only
- **Screen Reader Support**: Semantic HTML and ARIA labels
- **Color Contrast**: Minimum 4.5:1 contrast ratio for text
- **Multi-Language**: Complete translations for EN, ES, NL

#### Responsive Design:
- **Desktop**: Full-featured experience (1024px+)
- **Tablet**: Optimized layout (768px - 1024px)
- **Mobile**: Core functionality available (< 768px)
- **Touch Targets**: Minimum 44×44px for mobile interactions

### Maintainability Requirements

#### Code Quality:
- **Code Standards**: ESLint/Prettier for consistent formatting
- **Type Safety**: Python type hints for API, TypeScript for Vue components
- **Documentation**: Inline code comments and API documentation
- **Test Coverage**: Minimum 70% code coverage for critical paths

#### Architecture:
- **Modular Design**: Separation of concerns (frontend, API, database)
- **API Versioning**: Versioned API endpoints (`/api/v1/`)
- **Database Migrations**: Version-controlled schema migrations
- **Configuration Management**: Environment-based configuration

#### Deployment:
- **CI/CD Pipeline**: Automated testing and deployment
- **Rollback Capability**: Quick rollback to previous version
- **Zero-Downtime Deployment**: Blue-green or canary deployments
- **Docker Containerization**: Consistent environments across stages

### Portability Requirements

#### Platform Support:
- **Operating Systems**: Windows, macOS, Linux (browser-based)
- **Browsers**: Chrome, Firefox, Safari, Edge (latest 2 versions)
- **Database**: PostgreSQL 17+ (standard SQL, no vendor lock-in)
- **Container Runtime**: Docker-compatible (Docker, Podman, etc.)

#### Integration:
- **API Standards**: RESTful API with OpenAPI/Swagger documentation
- **Authentication**: Standard OIDC/OAuth 2.0 protocols
- **Data Export**: Standard formats (CSV, Excel, PDF, DOCX)
- **Future Integrations**: Design for AFAS HRIS, email systems, etc.

### Monitoring & Logging Requirements

#### Application Monitoring:
- **Health Checks**: `/health` endpoint for all services
- **Performance Metrics**: Response times, error rates, throughput
- **Resource Monitoring**: CPU, memory, disk usage
- **User Activity**: Page views, feature usage, error tracking

#### Logging:
- **Structured Logging**: JSON format for all application logs
- **Log Levels**: DEBUG, INFO, WARN, ERROR with appropriate filtering
- **Centralized Logging**: Aggregated logs for analysis (future: ELK/Loki)
- **Log Retention**: 90 days for application logs, 1 year for audit logs

#### Alerting:
- **Critical Errors**: Immediate alerts for system failures
- **Performance Degradation**: Alerts when response times exceed thresholds
- **Security Events**: Alerts for suspicious activity
- **Capacity Planning**: Alerts when approaching resource limits

### Backup & Disaster Recovery Requirements

#### Backup Strategy:
- **Database Backups**: Daily automated backups with 30-day retention
- **Backup Verification**: Weekly restore testing to verify backup integrity
- **Backup Storage**: Off-site storage for disaster recovery
- **Backup Encryption**: Encrypted backups (future enhancement)

#### Recovery Objectives:
- **Recovery Time Objective (RTO)**: < 4 hours for full system recovery
- **Recovery Point Objective (RPO)**: < 24 hours (maximum data loss)
- **Disaster Recovery Plan**: Documented procedures for various failure scenarios
- **Regular Testing**: Quarterly disaster recovery drills

#### Data Retention:
- **Active Reviews**: Indefinite retention (until deleted by user/admin)
- **Completed Reviews**: Configurable retention per OpCo (default: 7 years)
- **Audit Logs**: 7-year retention for compliance
- **Backup Retention**: 30 days for daily backups, 1 year for monthly archives

### Documentation Requirements

#### User Documentation:
- **User Guides**: Manager, Employee, HR, Admin guides
- **Quick Reference**: One-page cheat sheets
- **FAQ Section**: Common questions and answers

#### Technical Documentation:
- **API Documentation**: OpenAPI/Swagger specification
- **Architecture Diagrams**: System architecture and data flow
- **Deployment Guides**: Step-by-step deployment instructions
- **Troubleshooting Guides**: Common issues and solutions

#### Operational Documentation:
- **Runbooks**: Procedures for common operational tasks
- **Incident Response**: Procedures for security and system incidents
- **Change Management**: Process for deploying changes
- **Configuration Management**: Environment configuration documentation

### Compliance & Legal Requirements

#### Data Protection:
- **GDPR**: Full compliance with EU General Data Protection Regulation
- **Data Processing Agreements**: Contracts with data processors
- **Privacy Impact Assessments**: Regular PIAs for new features
- **Data Breach Notification**: Procedures for reporting breaches within 72 hours

#### Industry Standards:
- **ISO 27001**: Security management (future certification)
- **SOC 2**: Security, availability, processing integrity (future)
- **OWASP Top 10**: Protection against common vulnerabilities

#### Audit & Reporting:
- **Audit Trails**: Complete audit logs for compliance reviews
- **Regular Audits**: Annual security and compliance audits
- **Reporting**: Compliance reports for stakeholders
- **Documentation**: Maintain compliance documentation

---

## 🧪 Testing Requirements

### Functional Testing:
- All form fields accept and save data
- Voice input works in all three languages
- Drag-and-drop reordering functions
- Weight percentage validation
- Grid calculation accuracy
- PDF generation with correct formatting
- Session save/resume functionality
- All validations trigger appropriately

### Browser Compatibility:
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

### Device Testing:
- Desktop (1920×1080, 1366×768)
- Tablet (iPad, Android tablets)
- Test portrait and landscape modes

### Performance Testing:
- Page load time < 3 seconds
- Voice input response < 5 seconds
- Auto-save completes < 500ms
- Report generation < 5 seconds

### Security Testing:
- XSS attack prevention
- Input validation effectiveness
- Data encryption (if implemented)

---

## 📚 User Documentation Needs

### Manager User Guide:
- How to start a new review
- Using voice input effectively
- Understanding the 9-grid system
- Setting goal weights
- Saving and resuming sessions
- Generating the final report
- Troubleshooting common issues

### Admin Guide:
- Setting up company settings
- Managing users
- System maintenance

### Quick Reference Card:
- One-page cheat sheet
- Keyboard shortcuts
- Voice input tips
- Validation requirements

---

## 🎯 Success Metrics

### User Adoption:
- % of managers using app vs. Excel
- Time to complete review (app vs. Excel)
- User satisfaction score (survey)

### System Performance:
- Average session duration
- Completion rate (started vs. finished)
- Error rate (validation failures)

### Business Impact:
- Reduction in HR processing time
- Improved review completion rates
- Better data quality for analytics

---

## 🔮 Future Enhancements (Post-MVP)

1. **AI-Powered Features**:
   - Smart goal suggestions based on role
   - Auto-generated summary from goals
   - Performance trend predictions

2. **Advanced Analytics**:
   - Machine learning insights
   - Predictive performance modeling
   - Benchmarking against industry standards


---

## 📞 Support & Maintenance

### Support Channels:
- In-app help documentation
- Email support
- FAQ section
- Video tutorials

### Maintenance Schedule:
- Regular security updates
- Browser compatibility updates
- Feature enhancements based on feedback
- Quarterly review of analytics

### Backup & Recovery:
- Encourage managers to download drafts regularly
- Admin export all reviews quarterly
- Consider cloud backup (future phase)

---

## ✅ Definition of Done

A feature/module is considered complete when:
1. ✓ All functional requirements are implemented
2. ✓ Code is reviewed and tested
3. ✓ No critical or major bugs remain
4. ✓ Responsive design verified on target devices
5. ✓ Security measures implemented and tested
6. ✓ User documentation created
7. ✓ Admin can configure related settings
8. ✓ Multi-language support verified
9. ✓ Performance benchmarks met
10. ✓ Accessibility standards met (WCAG 2.1 AA)

---

## 📝 Notes & Assumptions

### Assumptions:
- Managers have modern browsers (last 2 years)
- Managers have stable internet connection
- Company will provide official logo file
- HOW-axis level descriptions will be provided
- Initial rollout is for single organization
- English is default language during development

### Open Questions for Future:
- [x] Complete HOW-axis level description texts ✅
- [ ] Exact analytics requirements from HR team
- [x] User authentication method: **Keycloak with OIDC/EntraID** ✅
- [x] Notification system requirements **email, in-app** ✅

---

## 🎨 Design Assets Needed

### From Client:
1. Company logo (PNG/SVG, high resolution)
2. Complete HOW-axis level descriptions (A, B, C, D) in EN/ES/NL
3. Brand guidelines (if any beyond colors)
4. Sample completed performance review (for reference)
5. Legal/compliance review text (if required)

### To Be Created:
1. Icon set (microphone, drag handles, etc.)
2. Grid visualization design
3. Loading animations
4. Error state illustrations
5. Email templates
6. User onboarding flow

---

**Document Version**: 3.0  
**Last Updated**: January 2026  
**Next Review**: After Phase 4 completion

---

## 📝 Implementation Status Summary

### ✅ Completed Features (Phases 1-4):

