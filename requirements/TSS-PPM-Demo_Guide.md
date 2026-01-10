# TSS PPM v3.0 - Demo Guide

Quick start guide for new users who want to explore the system.

## Demo Login Accounts

| Role | Email | Password | What you can do |
|------|-------|----------|-----------------|
| **Employee** | employee@tss.eu | employeetest123 | Enter goals, view your reviews and status, use voice dictation |
| **Manager** | manager@tss.eu | managertest123 | Score your team, approve goal changes, view team 9-grid |
| **HR** | hr@tss.eu | hrtest123 | View all reviews, run analytics, manage calibration sessions |
| **Admin** | admin@tss.eu | admintest123 | Full admin portal, manage users, global settings |

Additional test employees (all with password `devtest123`):
- `dev1@tss.eu` - David Developer (reports to Manager)
- `dev2@tss.eu` - Diana Developer (reports to Manager)

## General flow of the application

### First time setup
Generic language selection: Dutch, Spanish, English (UK)
OpCo name entry and logo upload
BU creation and naming
Connecting EntraID to the app, sync users

## Yearly flow
- Start of next years cycle by HR, Admin loads strategic map with high level goals
- Start of year: goal setting:
    - All employees will receive a goal setting task of their review form
-    Manager will see these tasks on their dashboard
    - Employees fill the goals, based on the strategic map helped by AI
    - Manager checks tasks, reviews and approves or sents back with feedback
- Mid-year review: 
    - Manager to score and feedback all the employees in his team, will receive all mid-year reviews in his task list. Helped by voice dictation and AI for improving the feedback wording
    - All employees get calibrated per BU by management, supervised by HR
    - Manager and employee have the mid-year review meeting, adjustments might be made based on the meeting by the manager to the review form
    - Manager to finalize the review form, added to the employees task list for approval or sents back with feedback
    - HR has a dashboard to check progress of all teams and abstract scores per team, per BU and for full OpCo
- End-year review:
    - Manager to score and feedback all the employees in his team, will receive all end-year reviews in his task list, these contain the approved mid-year review forms too. Helped by voice dictation and AI for improving the feedback wording
    - All employees get calibrated per BU by management, supervised by HR
    - Manager and employee have the end-year review meeting, adjustments might be made based on the meeting by the manager to the review form
    - Manager to finalize the review form, added to the employees task list for approval or sents back with feedback
    - HR has a dashboard to check progress of all teams and abstract scores per team, per BU and for full OpCo

### Continuous tasks
- Admin to CRUD users and permissions (roles)
- HR to adjust the employees in managers teams
- Goals can be ajusted during the year, old goal will stay in the form in light grey as reference
- HR will be able to view all employees and teams in their appointed BU's
- HR to clean up old review forms, either single or bulk

## Most-valuable Features

### 1. 9-Grid Performance Scoring
The core of the application - a visual representation of performance.

- **WHAT-axis**: Set goals with weights that must total 100%
- **SCF VETO rule**: If any SCF goal scores 1, the entire WHAT score becomes 1
- **KAR rule**: Key Area of Responsibility: triggers VETO, but can be compensated by another KAR goal scoring 3
- **HOW-axis**: Score competencies based on TOV level (A/B/C/D), there are three main categories with two sub-competencies each
- **HOW VETO rule**: If any competency scores 1, the entire HOW score becomes 1
- Watch the grid visualization update in real-time as you score

### 2. Voice Dictation (Hold-to-Speak)
AI-powered speech-to-text for hands-free input.

- Hold the microphone button 'Dictation' while speaking
- Works for all supported languages (see initial setup)
- Text is appended (doesn't overwrite existing content)

### 3. Team Overview (Manager & HR)
Visual overview of your direct reports' performance.

- See your team plotted on the 9-grid
- Click grid cells to filter employees by performance quadrant
- Start new reviews directly from the team page
- View historical performance trends

### 4. Calibration Sessions (HR)
Ensure fair and consistent ratings across the organization.

- Create sessions by business unit or company-wide, use AI to flag potential outliers
- Drag employees between grid cells to adjust ratings
- Track all changes with audit trail
- Save calibration reports

### 5. Multi-Language Support
Full internationalization in supported languages.

- Based on initial setup language
- UI, competencies, and reports all translate
- Currently Supported: English, Dutch, Spanish

### 6. Report Export
Generate professional documents from completed reviews.

- **Excel**: Data export for analysis
- **PDF**: Print-ready format

## Quick Workflow to Try

### As a Manager (Recommended First Experience)

1. **Login** as `manager@tss.eu` / `managertest123`

2. **Explore Team View**
   - Click "Team" in the navigation
   - See David and Diana Developer on your team
   - Notice the 9-grid visualization (empty until reviews are scored)

3. **Start a Review**
   - Click "Start Review" for one of your team members
   - This creates a new review and lets you select a year, if that year already has a review, the review is opened

4. **Review Goals (WHAT-axis)**
   - Add 2-3 goals with descriptions
   - Assign weights (must total 100%), and appoint KAR goals
   - Try drag-and-drop to reorder goals

5. **Score Competencies (HOW-axis)**
   - Select a TOV level (A-D) to see relevant competencies
   - Score each competency 1-3
   - Notice the VETO rule warning if you select 1 on either of the six sub-competencies

6. **Try Voice Input**
   - Click and hold the microphone on a review
   - Speak your input and release
   - The 'suggest improvements' uses AI to reword feedback given

7. **View the Grid**
   - See the employee's position on the 9-grid
   - Return to Team view to see them plotted

8. **Export Report**
   - Click "Download Report" to generate PDF
   - Open the PDF to see the professional format

### As HR

1. **Login** as `hr@tss.eu` / `hrtest123`

2. **View HR Dashboard**
   - See organization-wide statistics
   - Review completion rates and score distributions

3. **Browse All Reviews**
   - Use filters to find specific reviews
   - Click into any review for details

4. **Try Calibration**
   - Create a new calibration session
   - Select scope (BU/OpCo)
   - Review and adjust ratings for consistency

### As an Employee

1. **Login** as `employee@tss.eu` / `employeetest123`

2. **View My Reviews**
   - See your performance reviews
   - Access historical reviews and trends

3. **Complete goal setting**
   - Add 2-3 goals with descriptions, let AI support you in formulating SMART goals
   - Assign weights (must total 100%), and appoint KAR goals
   - Try drag-and-drop to reorder goals

4. **Approve review forms**
   - After the meeting with manager, review the review form
   - Approve or send feedback
   
## Tips

- **Keyboard Navigation**: Use Tab to navigate, Enter to activate
- **Auto-Save**: Changes are saved automatically to the database
- **Session Persistence**: Your work is saved server-side, accessible from any device
- **Responsive Design**: Works on mobile devices (server-side voice)

## Need Help?

- Check the main [README.md](README.md) for technical documentation
- Report issues at [GitHub Issues](https://github.com/tss-ppm/issues)
