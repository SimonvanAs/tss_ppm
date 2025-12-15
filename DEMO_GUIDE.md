# TSS PPM - Demo Guide

Quick start guide for new users who want to explore the system.

## Demo Login Accounts

| Role | Email | Password | What you can do |
|------|-------|----------|-----------------|
| **Employee** | employee@tss.eu | test123 | View your reviews, fill self-assessments, use voice dictation |
| **Manager** | manager@tss.eu | test123 | Score your team, approve goal changes, view team 9-grid |
| **HR** | hr@tss.eu | test123 | View all reviews, run analytics, manage calibration sessions |
| **Admin** | admin@tss.eu | test123 | Full admin portal, manage users, configure competencies |
| **Super Admin** | superadmin@tss.eu | test123 | Cross-OpCo access, global settings |

Additional test employees (all with password `test123`):
- `dev1@tss.eu` - David Developer (reports to Manager)
- `dev2@tss.eu` - Diana Developer (reports to Manager)

## Interesting Features to Try

### 1. 9-Grid Performance Scoring
The core of the application - a visual representation of performance.

- **WHAT-axis**: Set goals with weights that must total 100%
- **HOW-axis**: Score competencies based on TOV level (A/B/C/D)
- **VETO rule**: If any competency scores 1, the entire HOW score becomes 1
- Watch the grid visualization update in real-time as you score

### 2. Voice Dictation (Hold-to-Speak)
AI-powered speech-to-text for hands-free input.

- Toggle "Browser Dictation" in the header (downloads ~150-500MB model first time)
- Hold the microphone button while speaking
- Works in English, Dutch, and Spanish
- Text is appended (doesn't overwrite existing content)

### 3. Team Overview (Manager+)
Visual overview of your direct reports' performance.

- See your team plotted on the 9-grid
- Click grid cells to filter employees by performance quadrant
- Start new reviews directly from the team page
- View historical performance trends

### 4. Calibration Sessions (HR+)
Ensure fair and consistent ratings across the organization.

- Create sessions by team, business unit, or company-wide
- Drag employees between grid cells to adjust ratings
- Track all changes with audit trail
- Export calibration reports

### 5. Multi-Language Support
Full internationalization in three languages.

- Click flag icons in the header to switch
- UI, competencies, and reports all translate
- Supported: English, Dutch, Spanish

### 6. Report Export
Generate professional documents from completed reviews.

- **DOCX**: Editable Word document with full review details
- **Excel**: Data export for analysis
- **PDF**: Print-ready format

## Quick Workflow to Try

### As a Manager (Recommended First Experience)

1. **Login** as `manager@tss.eu` / `test123`

2. **Explore Team View**
   - Click "Team" in the navigation
   - See David and Diana Developer on your team
   - Notice the 9-grid visualization (empty until reviews are scored)

3. **Start a Review**
   - Click "Start Review" for one of your team members
   - This creates a new review for the current year

4. **Set Goals (WHAT-axis)**
   - Add 2-3 goals with descriptions
   - Assign weights (must total 100%)
   - Try drag-and-drop to reorder goals

5. **Score Competencies (HOW-axis)**
   - Select a TOV level (A-D) to see relevant competencies
   - Score each competency 1-3
   - Notice the VETO rule warning if you select 1

6. **Try Voice Input**
   - Enable "Browser Dictation" in header
   - Click and hold the microphone on a goal description
   - Speak your input and release

7. **View the Grid**
   - See the employee's position on the 9-grid
   - Return to Team view to see them plotted

8. **Export Report**
   - Click "Download Report" to generate DOCX
   - Open in Word to see the professional format

### As HR

1. **Login** as `hr@tss.eu` / `test123`

2. **View HR Dashboard**
   - See organization-wide statistics
   - Review completion rates and score distributions

3. **Browse All Reviews**
   - Use filters to find specific reviews
   - Click into any review for details

4. **Try Calibration**
   - Create a new calibration session
   - Select scope (team/BU/company)
   - Review and adjust ratings for consistency

### As an Employee

1. **Login** as `employee@tss.eu` / `test123`

2. **View My Reviews**
   - See your performance reviews
   - Access historical reviews

3. **Complete Self-Assessment**
   - If a review is in progress, complete your self-assessment section
   - Add comments about your performance

## Tips

- **Keyboard Navigation**: Use Tab to navigate, Enter to activate
- **Auto-Save**: Changes are saved automatically to the database
- **Session Persistence**: Your work is saved server-side, accessible from any device
- **Responsive Design**: Works on mobile devices (server-side voice recommended)

## Need Help?

- Check the main [README.md](README.md) for technical documentation
- Report issues at [GitHub Issues](https://github.com/SimonvanAs/tss_ppm/issues)
