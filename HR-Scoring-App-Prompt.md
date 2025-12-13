# HR Performance Scoring Web Application - Complete Requirements Document

## 🎯 Project Overview
Build a comprehensive web-based HR performance scoring application that replaces the current Excel-based process. The application enables managers to conduct annual employee reviews using a 9-grid scoring system (WHAT-axis × HOW-axis) with voice input capabilities, multi-language support, and automated report generation.

---

## 🏗️ Core Architecture

### Technology Stack
- **Frontend Framework**: React 19 with Vite 7 (single-page application)
- **Routing**: React Router v7
- **Styling**: Corporate/professional design with Tahoma font
- **Brand Colors**:
  - Primary Magenta: `#CC0E70` (used as accent, gradient backgrounds, focus states)
  - Primary Navy Blue: `#004A91` (used as accent for headings)
- **Visual Design**:
  - Pink gradient background (subtle, using magenta with transparency)
  - Section cards with gradient border highlights
  - Focus states in magenta color
- **Storage**: PostgreSQL database via Fastify API backend (with browser localStorage fallback for drafts)
- **Authentication**: Keycloak JS adapter v26 (OIDC/EntraID federation)
- **Backend**: Fastify + Prisma ORM + PostgreSQL
- **Output Format**: DOCX (Microsoft Word format)
- **Security**: XSS and SQL injection prevention on all input fields
- **Voice Input**: 
  - Browser: Transformers.js with Whisper (WebGPU/WASM)
  - Server: faster-whisper Python service (Docker)

### Multi-User Architecture
- **User Roles**: 
  - **EMPLOYEE**: View/edit own reviews, self-assessment
  - **MANAGER**: Score team reviews, approve goal changes, view team dashboard
  - **HR**: View all reviews, organization statistics, calibration sessions
  - **OPCO_ADMIN**: Manage OpCo settings, users, competencies
  - **TSS_SUPER_ADMIN**: Cross-OpCo management, global settings
- **Authentication**: Keycloak with OIDC/EntraID federation
- **Session Management**: Database-backed reviews with full audit trail
- **Multi-Operating Company (OpCo)**: Support for multiple operating companies with isolated data
- **Future Integration**: AFAS HRIS system (design with this in mind)

---

## 📊 Scoring System Architecture

### 1. WHAT-Axis: Goals & Results (Flexible, up to 9 criteria)

#### Goal Types (Implemented):
- **Standard Goals**: Regular performance goals
- **KAR Objectives** (Optional, per OpCo): Key Account Responsibilities
- **SCF Objectives** (Optional, per OpCo): Strategic Company Focus

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
- **Goal Sections**: Separate visual sections for Standard Goals, KAR Objectives, and SCF Objectives
- **Validation**: All goals with content must be scored and weighted before download

---

### 2. HOW-Axis: Competencies & Behaviors (4 predefined levels)

#### TOV-Level Selection:
- **Location**: Dropdown at the top of form (alongside Name and Function Title)
- **Options**: A, B, C, D
- **Mapping to Numeric Scores**:
  - A = 1
  - B = 2
  - C = 3
  - D = 4 (but for 3×3 grid, this maps to 3)

#### Detailed Competency Scoring (Implemented):
- **6 Competencies per TOV Level**: Each level has 6 specific competencies
- **Individual Scoring**: Each competency scored 1-3
- **VETO Rule**: If ANY competency = 1, overall HOW Score = 1.00
- **Competency Categories**: Organized by category and subcategory
- **Competency Notes**: Optional explanation text per competency
- **Per-OpCo Configuration**: Competencies configurable per operating company

#### Level Descriptions:
**[Client to provide the 4 level text descriptions - stored in database, configurable per OpCo]**

Level A (Score 1):
```
[Text configurable in admin portal]
```

Level B (Score 2):
```
[Text configurable in admin portal]
```

Level C (Score 3):
```
[Text configurable in admin portal]
```

Level D (Score 4 → maps to 3 for grid):
```
[Text configurable in admin portal]
```

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
- HOW-axis: A=1, B=2, C=3, D=3 (for 3×3 grid)

#### Visual Display:
- Show visual 3×3 grid with color-coded cells
- Highlight the employee's position on the grid
- Display numeric scores: "WHAT: X.XX, HOW: X"
- No text labels (e.g., "High Performer"), only colors
- Include this visual in the downloadable report

---

## 🎤 Voice Input System

### Core Functionality:
- **Trigger**: Microphone icon button on every text input field
- **Interaction**: Hold-to-dictate (press and hold to record, release to stop)
- **Behavior**: Appends to existing text (does not replace)
- **Language Support**: English, Spanish, Dutch (matches app language selection)
- **Technology**: Local Whisper server (OpenAI Whisper model running locally via Python)

### Architecture:
- **Frontend**: Records audio using MediaRecorder API, converts to WAV in browser
- **Backend**: Python Flask server with Hugging Face Transformers Whisper model
- **Privacy**: All audio processing happens locally - no data sent to external services
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

### Server Setup:
```bash
# In hr-performance-app/server folder:
setup_whisper.bat   # One-time setup (creates venv, installs dependencies)
start_whisper.bat   # Start the Whisper server on port 3001
```

### Implementation Details:
```javascript
// Append mode example
currentText = "Already entered goal: "
voiceInput = "Increase sales by 15%"
result = "Already entered goal: Increase sales by 15%"

// Event handlers for hold-to-dictate
onMouseDown / onTouchStart → startListening()
onMouseUp / onTouchEnd / onMouseLeave → stopListening()

// Audio flow
1. Record audio (MediaRecorder API)
2. Convert to WAV in browser (AudioContext)
3. Send to localhost:3001/transcribe
4. Whisper model transcribes
5. Text appended to input field
```

---

## 👤 Employee Information Fields

### Required Fields:
1. **Employee Name**: Text input
2. **Function Title/Role**: Text input
3. **Business Unit**: Text input or dropdown
4. **TOV-Level**: Dropdown (A, B, C, D)
5. **Review Period/Year**: Date picker or text
6. **Reviewer Date**: Date picker
7. **Manager Name**: Auto-populated from login (if multi-user) or text input

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

### 2. Employee Self-Assessment:
- **Input By**: Manager (on behalf of employee during review meeting)
- **Location**: Separate section in form
- **Format**: Free text area
- **Display**: Shown in report as "Employee Self-Assessment"
- **Voice Input**: Enabled

### 3. Generic Comments (Bottom of Report):
- **Location**: End of report
- **Purpose**: Additional notes, development areas, action items
- **Input**: Rich text editor
- **Character Limit**: Unlimited
- **Voice Input**: Enabled

---

## 📥 Report Generation & Download

### DOCX Format Requirements:
- **File Name**: `Performance_Review_[EmployeeName]_[Year].docx`
- **Editable**: Fully editable in Microsoft Word
- **Styling**: Professional formatting with brand colors

### Report Structure:
```
1. Header
   - Company Logo (uploaded by user or admin)
   - Review Period
   
2. Employee Information
   - Name, Role, Business Unit, TOV-Level
   - Manager Name, Review Date
   
3. Executive Summary
   - Summary comments (from summary section)
   
4. Performance Grid Visual
   - 3×3 colored grid with position marked
   - WHAT Score: X.XX / 3.00
   - HOW Score: X / 3
   
5. WHAT-Axis: Goals & Results
   For each goal:
   - Goal title
   - Description
   - Score (1-3)
   - Weight percentage
   - Weighted score contribution
   
6. HOW-Axis: Competencies
   - TOV-Level (A/B/C/D)
   - Selected level description text
   
7. Employee Self-Assessment
   - Manager's input of employee's self-assessment
   
8. Additional Comments
   - Generic comments from bottom section
   
9. Footer
   - Version/Year tracking
   - Generated date
   - Session code
```

### Logo Handling:
- **Upload Feature**: Allow managers/admins to upload company logo
- **Storage**: Store in localStorage or admin settings
- **Format**: PNG, JPG, SVG (max 2MB)
- **Placement**: Top-left of report header
- **Sizing**: Automatic scaling to fit

### Export Options:
1. **Download Final Report**: Full DOCX with all validations passed
2. **Export as Draft**: Save incomplete review as DOCX with "DRAFT" watermark
3. **Email Session Code**: Send resume code via email

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
- **Location**: Top-right corner of header
- **Design**: Flag icon buttons (🇬🇧 English, 🇳🇱 Dutch, 🇪🇸 Spanish)
- **Active State**: Magenta border with subtle glow effect
- **Hover Effect**: Scale up animation
- **Persistence**: Save language preference with session
- **Default**: English (browser detection optional)

### Report Language:
- Report generated in the language selected during form completion
- Language code stored with session data

---

## 💾 Session Management & Auto-Save

### Auto-Save Functionality:
- **Trigger**: Save after 2-3 seconds of inactivity on any field
- **Storage**: Browser localStorage
- **Data Saved**: 
  - All form fields
  - Goal items and weights
  - TOV-level selection
  - Comments sections
  - Language preference
  - Timestamp of last save

### Session Code System:
- **Generation**: Unique 8-12 character alphanumeric code
- **Display**: Prominently shown at top of form
- **Purpose**: Resume incomplete reviews
- **Persistence**: 14 days maximum in localStorage
- **Cleanup**: Automatic deletion after 14 days

### Resume Feature:
- **Input**: Enter session code in dedicated modal/field
- **Validation**: Check if code exists and is not expired
- **Loading**: Restore all saved data to form
- **Error Handling**: Clear message if code invalid/expired

### Email Session Code:
- **Button**: "Email me this session code"
- **Functionality**: Opens default email client with pre-filled message
- **Email Template**:
  ```
  Subject: Performance Review Session Code
  
  Your performance review session code: [CODE]
  
  This code will expire in [X] days.
  Resume your review at: [APP_URL]
  ```

### Data Privacy:
- **Storage**: Client-side only (no server storage initially)
- **Encryption**: Consider basic encryption for sensitive data
- **Deletion**: Manual "Clear Session" button
- **GDPR**: Include notice about local storage usage

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

### Layout Structure (Single Page Scroll):

```
┌──────────────────────────────────────────────────┐
│ STICKY HEADER BAR                                │
│ ┌──────────────────────────────────────────────┐ │
│ │ Logo  |  Progress: ████░░░░ 60%  |  🌐 Lang │ │
│ └──────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────┤
│                                                  │
│ Session Code: ABC123XYZ  [Email] [Copy]         │
│                                                  │
│ ┌─ Employee Information ────────────────────┐   │
│ │ Name: [________]  🎤                      │   │
│ │ Role: [________]  🎤                      │   │
│ │ Business Unit: [________]  🎤             │   │
│ │ TOV-Level: [▼]  Review Date: [📅]        │   │
│ └───────────────────────────────────────────┘   │
│                                                  │
│ ┌─ Summary Comments ────────────────────────┐   │
│ │ [Rich text editor with voice input 🎤]    │   │
│ └───────────────────────────────────────────┘   │
│                                                  │
│ ┌─ WHAT-Axis: Goals & Results ─────────────┐   │
│ │                                           │   │
│ │ Goal 1 [☰ drag]                [❌ remove]│   │
│ │   Title: [________________] 🎤            │   │
│ │   Description: [__________] 🎤            │   │
│ │   Score: [1▼]  Weight: [20]%              │   │
│ │                                           │   │
│ │ Goal 2 [☰ drag]                [❌ remove]│   │
│ │   ...                                     │   │
│ │                                           │   │
│ │ [+ Add Goal] (max 9)                      │   │
│ │ Total Weight: 100% ✓                      │   │
│ └───────────────────────────────────────────┘   │
│                                                  │
│ ┌─ HOW-Axis: Competencies ─────────────────┐   │
│ │ Selected Level: B                         │   │
│ │ Description: [Show level B text]          │   │
│ └───────────────────────────────────────────┘   │
│                                                  │
│ ┌─ Performance Grid ────────────────────────┐   │
│ │      1     2     3                        │   │
│ │   ┌────┬────┬────┐                        │   │
│ │ 3 │ 🟧 │ 🟩 │ 🟢 │                        │   │
│ │   ├────┼────┼────┤                        │   │
│ │ 2 │ 🟧 │ 🟩●│ 🟩 │  ← You are here       │   │
│ │   ├────┼────┼────┤                        │   │
│ │ 1 │ 🟥 │ 🟧 │ 🟧 │                        │   │
│ │   └────┴────┴────┘                        │   │
│ │ WHAT: 2.35  HOW: 2                        │   │
│ └───────────────────────────────────────────┘   │
│                                                  │
│ ┌─ Employee Self-Assessment ────────────────┐   │
│ │ [Rich text editor with voice input 🎤]    │   │
│ └───────────────────────────────────────────┘   │
│                                                  │
│ ┌─ Additional Comments ─────────────────────┐   │
│ │ [Rich text editor with voice input 🎤]    │   │
│ └───────────────────────────────────────────┘   │
│                                                  │
│ [Preview Report] [Save as Draft] [Download Final]│
│                                                  │
└──────────────────────────────────────────────────┘
```

### Progress Indicator (Sticky Header):
- **Position**: Fixed at top of viewport
- **Style**: Horizontal progress bar
- **Calculation**: 
  ```
  Required fields: Employee info (4 fields) = 30%
  WHAT-axis (at least 1 goal fully scored) = 30%
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
- **Level Selector**: Filter by Manager Team, Business Unit, or Company-Wide
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
  - PowerPoint export
- **Access Control**: 
  - Managers: View own team only
  - HR: View Business Unit level
  - Admins: View Company-Wide level

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
- PowerPoint presentations
- Share view with HR team

### Privacy:
- Anonymize data where appropriate
- Role-based access (only admins see analytics)

---

## 🔐 Security & Data Privacy

### Input Security:
- **XSS Prevention**: 
  - Sanitize all user inputs
  - Escape HTML entities
  - Use React's built-in XSS protection
  - Validate on both client and server (future)

- **SQL Injection Prevention**:
  - Parameterized queries (when database added)
  - Input validation
  - Whitelist allowed characters

### Data Storage:
- **Primary**: PostgreSQL database via Fastify API backend
- **Fallback**: Browser localStorage for draft sessions (14-day retention max)
- **Encryption**: Data encrypted in transit (HTTPS/TLS)
- **Access Control**: Role-based access control (RBAC) via Keycloak
- **Data Retention**: Configurable per OpCo
- **Audit Trail**: Full audit logging for all review changes

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
  - Super Admin: Cross-OpCo access
- **Protected Routes**: 
  - Route-level access control
  - Component-level role guards
  - Automatic redirect on unauthorized access

### GDPR Compliance:
- **Notice**: Inform users about data storage
- **Consent**: Explicit consent for data processing
- **Right to Delete**: Easy session clearing
- **Data Minimization**: Collect only necessary data
- **Privacy Policy**: Link to company privacy policy
- **Data Export**: Users can export their own data
- **Audit Logs**: Track all data access and modifications

### Future Considerations (AFAS Integration):
- Direct AFAS HRIS API integration
- Automated employee data sync
- Import historical reviews from AFAS
- Encrypted data transmission (HTTPS/TLS)
- Regular security audits

---

## 🎨 UI/UX Enhancements (Implemented)

### Translation System:
- **Complete i18n Support**: All UI elements translated
- **Languages**: English, Spanish, Dutch
- **Translation Keys**: Centralized in JSON files
- **Fallback Handling**: Graceful fallback to English if translation missing
- **Footer Attribution**: Robot icon (🤖) with "Made with AI assistance" text

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
  - Overview statistics (total users, active reviews, completion rates)
  - Quick actions for common tasks
  - Recent activity feed
- **User Management**:
  - View all users with roles and status
  - Search and filter users
  - Edit user roles and assignments
  - Assign managers and business units
- **Organization Chart**:
  - Visual hierarchy of reporting structure
  - Drag-and-drop to change manager assignments
  - Expand/collapse tree view
  - Search functionality
- **Function Titles Management**:
  - Create/edit/delete function titles
  - Sort order configuration
  - Description fields
- **TOV Levels Management**:
  - Configure TOV/IDE levels (A, B, C, D)
  - Set level descriptions per language
  - Code and name management
- **Competencies Management**:
  - Manage competency definitions per TOV level
  - Category and subcategory organization
  - Multi-language support
- **OpCo Management** (Super Admin):
  - Create/edit operating companies
  - Configure OpCo identifiers and domains
  - Domain-based user assignment
  - OpCo-specific settings
- **Global Dashboard** (Super Admin):
  - Cross-OpCo overview
  - System health monitoring
  - Database and service status
  - OpCo comparison statistics
- **Import Reviews**:
  - Bulk import from Excel/CSV
  - Validation and error reporting
  - Preview before import

### Configuration Options:
1. **Review Period Settings**:
   - Set current review year
   - Enable/disable past year reviews
   - Version tracking

2. **Goal Templates** (Future):
   - Create company-wide goal templates
   - Managers can select and customize

3. **Notification Settings**:
   - Email reminders for incomplete reviews
   - Deadline notifications

4. **Data Management**:
   - Export all reviews (CSV/Excel)
   - Bulk delete old sessions
   - Backup/restore functionality

### User Management (Multi-User):
- Add/remove managers
- Assign business units
- View manager's review list
- Impersonate user (for support)

---

## 🔄 Review Workflow & Stages

### Multi-Stage Review Process (Implemented):
- **Stage 1: Goal Setting**:
  - Manager sets goals and weights
  - Employee can view (read-only)
  - Status: `GOAL_SETTING`
  
- **Stage 2: Mid-Year Review**:
  - Manager scores goals and competencies
  - Employee completes self-assessment
  - Status: `MID_YEAR_REVIEW`
  
- **Stage 3: End-Year Review**:
  - Final scoring and calibration
  - Manager comments
  - Status: `END_YEAR_REVIEW`

### Signature Workflow (Implemented):
- **Employee Signature**:
  - Employee acknowledges review completion
  - Signature timestamp recorded
  - Status: `PENDING_EMPLOYEE_SIGNATURE` → `EMPLOYEE_SIGNED`
  
- **Manager Signature**:
  - Manager confirms review discussion
  - Signature timestamp recorded
  - Status: `PENDING_MANAGER_SIGNATURE` → `MANAGER_SIGNED`
  
- **Completed Status**: `SIGNED` (both signatures received)

### Approval Workflow:
- **Goal Change Requests**:
  - Employee/Manager can request goal modifications
  - Pending approvals shown in Approvals page
  - Manager/HR can approve or reject
  - Types: Add Goal, Edit Goal, Delete Goal

- **Stage Completion**:
  - Manager marks stage as complete
  - Triggers workflow to next stage
  - Notifications sent (future)

---

## 🎯 Calibration System

### Calibration Sessions (Implemented):
- **Purpose**: Ensure consistency and fairness across performance ratings
- **Session Types**:
  - **Manager Team**: Single manager's direct reports
  - **Business Unit**: All employees in a business unit
  - **Company-Wide**: All employees across organization

### Session Workflow:
1. **DRAFT**: Session being prepared
2. **SCHEDULED**: Session scheduled but not started
3. **IN_PROGRESS**: Active calibration meeting
4. **PENDING_APPROVAL**: Awaiting final approval
5. **COMPLETED**: Calibration finalized
6. **CANCELLED**: Session cancelled

### Calibration Features:
- **Session Creation**:
  - Name, year, scope selection
  - Business unit selection (if applicable)
  - Participant management (facilitators, observers)
  
- **Score Snapshot**:
  - Original scores captured at session start
  - Original grid positions preserved
  - Cannot be modified after snapshot
  
- **Calibration Adjustments**:
  - Adjust WHAT and HOW scores
  - Add adjustment notes
  - Track who made adjustments
  - Flag items for review
  
- **Distribution Analysis**:
  - Current distribution vs. target
  - Original vs. calibrated comparison
  - Anomaly detection (unusual patterns)
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
- **HR+**: Create and manage calibration sessions
- **Participants**: View and adjust scores during session
- **Observers**: View-only access

---

## 📋 Implementation Phases

### Phase 1: Core Functionality (MVP)
- Single-page form with all fields
- WHAT-axis with drag-drop and weighting
- HOW-axis dropdown and descriptions
- Basic voice input (append mode)
- 3×3 grid calculation and display
- DOCX report generation
- Auto-save to localStorage
- Session code system
- Three-language support
- Basic validation

### Phase 2: Enhanced UX
- Dictation mode (continuous voice input)
- Rich text editors for comments
- Print-friendly preview
- Mobile/tablet optimization
- Progress indicator
- Logo upload feature
- Draft export option
- Email session code

### Phase 3: Multi-User & Analytics ✅ **COMPLETE**
- ✅ Keycloak authentication with OIDC/EntraID
- ✅ Role-based access control (Employee, Manager, HR, Admin)
- ✅ Admin dashboard with user management
- ✅ Multi-level analytics (Manager, BU, Company)
- ✅ Team performance dashboard
- ✅ Historical performance tracking
- ✅ Manager activity tracking
- ✅ Data export features (Excel, PDF, PowerPoint)
- ✅ Organization chart management
- ✅ Function titles and TOV levels management
- ✅ Competencies management
- ✅ OpCo management (multi-tenant)

### Phase 4: Advanced Features & Integration ✅ **COMPLETE**
- ✅ Database-backed reviews (PostgreSQL)
- ✅ Full API backend (Fastify + Prisma)
- ✅ Calibration system with sessions
- ✅ Multi-stage review workflow
- ✅ Signature workflow (employee + manager)
- ✅ Approval system for goal changes
- ✅ Historical review comparison
- ✅ Advanced analytics with drill-down
- ✅ Audit trail for all changes
- ⏳ AFAS HRIS integration (future)
- ⏳ Import employee data from AFAS (future)
- ⏳ Goal templates (future)
- ⏳ Notification system (future)

---

## ⚙️ Non-Functional Requirements

### Performance Requirements

#### Response Time:
- **Page Load Time**: < 3 seconds for initial page load (95th percentile)
- **API Response Time**: < 500ms for standard CRUD operations (95th percentile)
- **Voice Input Processing**: < 2 seconds for transcription (browser) or < 5 seconds (server)
- **Auto-Save**: Completes within 500ms without blocking UI
- **Report Generation**: DOCX generation completes within 5 seconds
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

#### Multi-Tenancy:
- **OpCo Isolation**: Complete data isolation between operating companies
- **Resource Quotas**: Per-OpCo limits configurable (users, reviews, storage)
- **Performance Isolation**: One OpCo's load doesn't impact others

### Reliability & Availability Requirements

#### Uptime:
- **Target Availability**: 99.5% uptime (approximately 3.65 days downtime per year)
- **Scheduled Maintenance**: Planned maintenance windows with user notification
- **Unplanned Downtime**: < 4 hours per incident (target)

#### Fault Tolerance:
- **Database Failover**: Automatic failover to standby database (future)
- **API Redundancy**: Multiple API instances with health checks
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
- **Type Safety**: TypeScript for API, PropTypes for React components
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
- **Database**: PostgreSQL 14+ (standard SQL, no vendor lock-in)
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
- **Video Tutorials**: Step-by-step video guides
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
- DOCX generation with correct formatting
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
- Voice input response < 2 seconds
- Auto-save completes < 500ms
- Report generation < 5 seconds

### Security Testing:
- XSS attack prevention
- Input validation effectiveness
- localStorage security
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
- Accessing analytics
- Exporting data
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

2. **Collaboration Features**:
   - Employee can review and sign-off
   - HR review and approval workflow
   - Comments and discussion threads

3. **Advanced Analytics**:
   - Machine learning insights
   - Predictive performance modeling
   - Benchmarking against industry standards

4. **Integration Expansion**:
   - Calendar integration (review reminders)
   - Slack/Teams notifications
   - Learning management system (development plans)

5. **Mobile App**:
   - Native iOS/Android apps
   - Offline mode with sync
   - Push notifications

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
3. ✓ No critical bugs remain
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
- [ ] Specific AFAS API endpoints for integration
- [ ] Complete HOW-axis level description texts
- [ ] Email server/service for session code emails
- [ ] Exact analytics requirements from HR team
- [x] User authentication method: **Keycloak with OIDC/EntraID** ✅
- [ ] Data retention policies beyond 14 days
- [ ] Notification system requirements (email, in-app)
- [ ] Goal template structure and approval workflow

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

## 🏁 Launch Checklist

### Pre-Launch:
- [ ] All Phase 1 features complete
- [ ] Security audit passed
- [ ] Performance testing passed
- [ ] Browser compatibility confirmed
- [ ] User documentation complete
- [ ] Admin trained on system
- [ ] Pilot group testing completed
- [ ] Feedback incorporated

### Launch Day:
- [ ] Deploy to production
- [ ] Monitor error logs
- [ ] Support team ready
- [ ] Communication sent to managers
- [ ] Backup Excel process available

### Post-Launch:
- [ ] Collect user feedback
- [ ] Monitor usage metrics
- [ ] Address critical bugs within 24 hours
- [ ] Schedule Phase 2 planning
- [ ] Celebrate success! 🎉

---

**Document Version**: 2.0  
**Last Updated**: January 2025  
**Next Review**: After Phase 4 completion

---

## 📝 Implementation Status Summary

### ✅ Completed Features (Phases 1-4):
- ✅ Core scoring system (WHAT/HOW axes, 9-grid)
- ✅ Multi-language support (EN, ES, NL)
- ✅ Voice input (browser + server Whisper)
- ✅ DOCX report generation
- ✅ Keycloak authentication & RBAC
- ✅ Database backend (PostgreSQL + Fastify)
- ✅ Multi-stage review workflow
- ✅ Signature system
- ✅ Calibration sessions
- ✅ Multi-level analytics
- ✅ Team performance dashboard
- ✅ Historical performance tracking
- ✅ Admin portal (users, org chart, settings)
- ✅ OpCo management (multi-tenant)
- ✅ Approval workflow
- ✅ Complete translation system

### ⏳ Future Enhancements:
- ⏳ AFAS HRIS integration
- ⏳ Goal templates
- ⏳ Notification system
- ⏳ Advanced reporting
- ⏳ Mobile native apps
