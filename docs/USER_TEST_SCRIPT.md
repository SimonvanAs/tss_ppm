# TSS PPM User Test Script

This document describes the complete workflow for setting up and using the TSS PPM (Performance Review Management) system. Follow these steps in order to test the full functionality.

---

## Prerequisites

- Access to the application at your deployment URL (e.g., https://ppm.tss-vms.co.uk)
- Keycloak admin access for creating test users
- At least one user with TSS_SUPER_ADMIN role

---

## Part 1: Initial Setup (Super Admin)

### 1.1 Login as Super Admin

1. Navigate to the application URL
2. Click "Login" - you'll be redirected to Keycloak
3. Login with your Super Admin credentials
4. Verify you see the main navigation with "Admin" option

### 1.2 Create an OpCo (Operating Company)

1. Click **Admin** in the navigation
2. In the Admin sidebar, click **OpCos** (Super Admin section)
3. Click **Create OpCo**
4. Fill in the details:
   - **Name**: Internal identifier (e.g., `acme-corp`)
   - **Display Name**: Shown in UI (e.g., `Acme Corporation`)
   - **Domain**: Email domain for auto-assignment (e.g., `acme.com`)
5. Click **Save**
6. Verify the OpCo appears in the list

### 1.3 Configure TOV/IDE Levels

TOV (Target Operating Value) or IDE levels define career stages and their associated competencies.

1. In Admin sidebar, click **TOV Levels**
2. Verify default levels exist (A-Entry, B-Professional, C-Senior, D-Leadership)
3. If needed, click **Add Level** to create custom levels:
   - **Code**: Single letter or short code (e.g., `E`)
   - **Name**: Full name (e.g., `Executive`)
   - **Description**: Multi-language description of this level
4. Click **Save**

### 1.4 Configure Competencies

Each TOV level has 6 competencies that employees are scored against.

1. In Admin sidebar, click **Competencies**
2. Select a TOV Level from the dropdown
3. Verify 6 competencies exist for each level
4. To edit a competency:
   - Click the competency row
   - Update **Title** and **Behavioral Indicators**
   - Click **Save**

### 1.5 Configure Function Titles

Function titles are job roles that can be assigned to employees.

1. In Admin sidebar, click **Function Titles**
2. Click **Add Function Title**
3. Fill in:
   - **Name**: Job title (e.g., `Software Developer`)
   - **TOV Level**: Default level for this role
4. Click **Save**
5. Repeat for all job titles in your organization

---

## Part 2: User Management (OpCo Admin)

### 2.1 Login as OpCo Admin

1. Logout from Super Admin account
2. Login with OpCo Admin credentials
3. Verify you see the Admin option but NOT the Super Admin sections (OpCos, Global)

### 2.2 Add Users/Employees

Users are typically created automatically when they first login via Keycloak (JIT provisioning). However, admins can also manage users manually.

1. Click **Admin** → **Users**
2. To edit an existing user:
   - Find the user in the list
   - Click **Edit**
   - Update their details:
     - **Role**: EMPLOYEE, MANAGER, HR, or OPCO_ADMIN
     - **Function Title**: Their job role
     - **TOV Level**: Their career level
     - **Manager**: Who they report to
   - Click **Save**

### 2.3 Set Up Manager Hierarchy

The manager hierarchy determines who can review whom.

1. Go to **Admin** → **Users**
2. For each employee:
   - Click **Edit**
   - Select their **Manager** from the dropdown
   - Click **Save**
3. Verify hierarchy in **Admin** → **Org Chart**

### 2.4 Assign Roles

| Role | Permissions |
|------|-------------|
| EMPLOYEE | View/edit own reviews, complete self-assessment |
| MANAGER | All employee permissions + review direct reports, approve goals |
| HR | All manager permissions + view all reviews, analytics, calibration |
| OPCO_ADMIN | All HR permissions + manage OpCo settings, users, competencies |
| TSS_SUPER_ADMIN | All permissions + manage multiple OpCos |

To assign a role:
1. Go to **Admin** → **Users**
2. Find the user
3. Click **Edit**
4. Select the appropriate **Role**
5. Click **Save**

---

## Part 3: Import Historical Reviews (HR/Admin)

### 3.1 Prepare Import Data

1. Create an Excel file with the following columns:
   - Employee Email
   - Year
   - WHAT Score (End Year)
   - HOW Score (End Year)
   - Status (COMPLETED)
   - TOV Level Code

### 3.2 Import Reviews

1. Login as HR or Admin
2. Go to **Admin** → **Import**
3. Click **Choose File** and select your Excel file
4. Review the preview of data to be imported
5. Click **Import**
6. Verify imported reviews appear in **All Reviews**

---

## Part 4: Performance Review Workflow

### 4.1 Create a New Review (Manager)

1. Login as a Manager
2. Click **Team** in the navigation
3. Find the employee you want to review
4. Click **Start Review** or go to **New Review**
5. Fill in the review details:
   - **Year**: Review year (e.g., 2025)
   - **Employee**: Select the employee
   - **Manager**: Your name (auto-filled)
   - **TOV Level**: Employee's career level
6. Click **Create Review**

### 4.2 Goal Setting Stage (Manager + Employee)

**Manager sets initial goals:**
1. Open the review from **Team** or **My Reviews**
2. Click **Start Goal Setting**
3. Add goals (up to 9):
   - Click **Add Goal**
   - Enter **Title** and **Description**
   - Set **Weight** (percentage)
   - Repeat for all goals
4. Ensure weights total 100%
5. Click **Complete Goal Setting**

**Employee reviews goals:**
1. Login as the employee
2. Go to **My Reviews**
3. Open the review
4. Review the goals set by manager
5. Request changes if needed via **Request Change**

### 4.3 Mid-Year Review Stage

**Employee self-assessment:**
1. Login as employee
2. Open the review
3. For each goal, provide:
   - Progress update
   - Self-score (1-3)
4. Complete the self-assessment section

**Manager scoring:**
1. Login as manager
2. Open the review from **Team**
3. Score each goal (1-3)
4. Score competencies (HOW axis) - each competency 1-3
5. Add manager comments
6. Click **Complete Mid-Year Review**

### 4.4 End-Year Review Stage

**Employee final self-assessment:**
1. Login as employee
2. Open the review
3. Update goal progress and scores
4. Complete final self-assessment
5. Add development suggestions

**Manager final scoring:**
1. Login as manager
2. Open the review
3. Finalize goal scores (WHAT axis)
4. Finalize competency scores (HOW axis)
5. Add overall comments and development plan
6. Click **Complete End-Year Review**

### 4.5 Signatures

**Employee signature:**
1. Login as employee
2. Open completed review
3. Review all scores and comments
4. Click **Sign as Employee**
5. Confirm signature

**Manager signature:**
1. Login as manager
2. Open the review
3. Verify employee has signed
4. Click **Sign as Manager**
5. Review is now COMPLETED

---

## Part 5: HR Analytics & Calibration

### 5.1 View HR Dashboard (HR Role)

1. Login as HR
2. Click **HR Dashboard** in navigation
3. Review organization statistics:
   - Total employees
   - Active reviews
   - Completed reviews
   - Pending approvals
4. View distribution charts

### 5.2 View All Reviews

1. Click **All Reviews**
2. Use filters to narrow results:
   - Year
   - Status
   - Department/Business Unit
3. Click any review to view details
4. Export data if needed

### 5.3 Analytics Dashboard

1. Click **Analytics**
2. View the 9-Grid performance distribution
3. Click on any grid cell to see employees in that category
4. Review trends over time
5. Export analytics report

### 5.4 Calibration Sessions

Calibration ensures fair and consistent ratings across managers.

1. Click **Calibration**
2. Click **Create Session**
3. Configure session:
   - **Name**: e.g., "Q4 2025 End-Year Calibration"
   - **Year**: 2025
   - **Scope**: Business Unit or Company-wide
4. Click **Create**
5. In the session:
   - View all reviews in the calibration grid
   - Compare manager rating patterns
   - Adjust ratings as needed (drag employees between grid cells)
   - Add calibration notes
6. Click **Complete Calibration**
7. Generate calibration report

### 5.5 View Employee History

1. Click **History** (for your own history)
2. Or go to **Team** → Click an employee → **View History**
3. Review:
   - Score trends over years
   - Grid position history
   - Year-over-year comparisons
4. Export history report

---

## Part 6: Role-Specific Test Scenarios

### Test as EMPLOYEE

1. Login as employee
2. Verify you can:
   - ✅ See "My Reviews" and "History" in navigation
   - ✅ View your own reviews
   - ✅ Complete self-assessments
   - ✅ Sign reviews
   - ❌ NOT see Team, HR Dashboard, All Reviews, Admin

### Test as MANAGER

1. Login as manager
2. Verify you can:
   - ✅ See "Team" and "Approvals" in navigation
   - ✅ View direct reports' reviews
   - ✅ Create new reviews for direct reports
   - ✅ Score reviews
   - ✅ Approve goal changes
   - ❌ NOT see HR Dashboard, All Reviews, Admin

### Test as HR

1. Login as HR
2. Verify you can:
   - ✅ See "HR Dashboard", "All Reviews", "Analytics", "Calibration"
   - ✅ View all employees' reviews
   - ✅ Access analytics
   - ✅ Create and run calibration sessions
   - ❌ NOT see Admin (unless also OpCo Admin)

### Test as OPCO_ADMIN

1. Login as OpCo Admin
2. Verify you can:
   - ✅ Access Admin portal
   - ✅ Manage users within your OpCo
   - ✅ Configure TOV levels and competencies
   - ✅ Configure function titles
   - ❌ NOT see OpCos management (Super Admin only)

### Test as TSS_SUPER_ADMIN

1. Login as Super Admin
2. Verify you can:
   - ✅ Access all Admin sections
   - ✅ Manage multiple OpCos
   - ✅ View global dashboard
   - ✅ Switch between OpCos

---

## Scoring Reference

### WHAT Axis (Goals)
- **Score 1**: Did not meet expectations
- **Score 2**: Met expectations
- **Score 3**: Exceeded expectations

Calculation: Weighted average of all goal scores

### HOW Axis (Competencies)
- **Score 1**: Below expected level
- **Score 2**: At expected level
- **Score 3**: Above expected level

**VETO Rule**: If ANY competency = 1, the total HOW score = 1.00

### 9-Grid Positions

|  | WHAT 1 | WHAT 2 | WHAT 3 |
|--|--------|--------|--------|
| **HOW 3** | C1 Potential | B1 High Performer | A1 Top Talent |
| **HOW 2** | C2 Needs Dev | B2 Solid Performer | A2 Strong Contributor |
| **HOW 1** | C3 Concern | B3 Underperformer | A3 Inconsistent |

---

## Troubleshooting

### Issue: Cannot create new review
- Verify you have MANAGER role or higher
- Check that employee doesn't already have a review for that year
- Ensure TOV level is selected

### Issue: Cannot see team members
- Verify manager hierarchy is set up correctly
- Check that employees have you assigned as their manager

### Issue: Analytics show no data
- Ensure reviews are in COMPLETED status
- Check year filter matches completed reviews

### Issue: Cannot access Admin
- Verify you have OPCO_ADMIN or TSS_SUPER_ADMIN role
- Try logging out and back in

---

## Quick Reference: Navigation by Role

| Page | Employee | Manager | HR | OpCo Admin | Super Admin |
|------|----------|---------|----|-----------| ------------|
| My Reviews | ✅ | ✅ | ✅ | ✅ | ✅ |
| History | ✅ | ✅ | ✅ | ✅ | ✅ |
| Team | ❌ | ✅ | ✅ | ✅ | ✅ |
| Approvals | ❌ | ✅ | ✅ | ✅ | ✅ |
| HR Dashboard | ❌ | ❌ | ✅ | ✅ | ✅ |
| All Reviews | ❌ | ❌ | ✅ | ✅ | ✅ |
| Analytics | ❌ | ❌ | ✅ | ✅ | ✅ |
| Calibration | ❌ | ❌ | ✅ | ✅ | ✅ |
| Admin | ❌ | ❌ | ❌ | ✅ | ✅ |
| Admin > OpCos | ❌ | ❌ | ❌ | ❌ | ✅ |
| Admin > Global | ❌ | ❌ | ❌ | ❌ | ✅ |
