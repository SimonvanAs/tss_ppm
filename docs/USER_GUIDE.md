# TSS PPM v2.0 User Guide

Welcome to the TSS Performance Management System (PPM). This guide covers how to use the application based on your role.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Employee Guide](#employee-guide)
3. [Manager Guide](#manager-guide)
4. [HR Guide](#hr-guide)
5. [Administrator Guide](#administrator-guide)
6. [Common Features](#common-features)

---

## Getting Started

### Logging In

1. Navigate to the TSS PPM application URL provided by your administrator
2. Click "Sign In" to authenticate via your organization's identity provider
3. After successful login, you'll see the main dashboard

### Language Selection

The application supports three languages:
- **English** (EN) - Click 🇬🇧
- **Dutch** (NL) - Click 🇳🇱
- **Spanish** (ES) - Click 🇪🇸

Your language preference is saved automatically.

### Navigation

The main navigation menu appears at the top of the page with links based on your role:
- **New Review** - Start a new performance review
- **My Reviews** - View your reviews
- **Team** (Managers) - View your team's reviews
- **Dashboard** (HR) - Organization statistics
- **Admin** (Administrators) - System configuration

---

## Employee Guide

### Viewing Your Reviews

1. Click **My Reviews** in the navigation
2. You'll see a list of your performance reviews
3. Click on a review to open it

### Goal Setting Stage

During goal setting, you will:

1. **Add Goals**
   - Click "Add Goal" to create a new goal
   - Enter a clear, measurable title
   - Add a detailed description
   - Set the weight percentage (all goals must sum to 100%)
   - Drag goals to reorder priority

2. **Voice Input** (Optional)
   - Click and hold the microphone icon
   - Speak your text
   - Release to transcribe
   - Text will be appended to the field

3. **Save Progress**
   - Your work is automatically saved
   - You can return later to continue

4. **Submit Goals**
   - Ensure all goals are complete
   - Weights must total 100%
   - Click "Submit for Review" when ready

### Self-Assessment

During the review stage:

1. Review your goals and their outcomes
2. Complete the self-assessment section
3. Rate your own performance on each goal
4. Add comments about achievements and challenges

### Requesting Goal Changes

After goals are locked, you can request changes:

1. Click the "Request Change" button on any goal
2. Enter the proposed modification
3. Provide a reason for the change
4. Submit the request for manager approval

### Downloading Reports

1. Complete all required sections
2. Click "Download Final Report"
3. A DOCX file will be generated and downloaded

---

## Manager Guide

### Team Overview

1. Click **Team** in the navigation
2. View all direct reports and their review status
3. See progress indicators for each employee

### Scoring Reviews

1. Open an employee's review from the Team page
2. Score each goal (1-3):
   - **1** - Below expectations
   - **2** - Meets expectations
   - **3** - Exceeds expectations
3. Score each competency (1-3)
4. Add comments for each goal
5. Save your scores

### VETO Rule (HOW Score)

**Important:** If any competency score is 1, the overall HOW score becomes 1.00. This ensures that critical competency gaps are highlighted regardless of other scores.

### Understanding the 9-Grid

The performance grid combines:
- **WHAT axis** (Goals/Results) - Horizontal
- **HOW axis** (Competencies) - Vertical

| Position | Label | Color |
|----------|-------|-------|
| (1,1) | Needs Improvement | Red |
| (2,2) | Solid Performer | Green |
| (3,3) | Star Performer | Dark Green |
| Edges | Development Areas | Orange |

### Approving Goal Changes

1. Click **Approvals** in the navigation
2. View pending change requests
3. For each request:
   - Review the original vs. proposed goal
   - Read the employee's reason
   - Click **Approve** or **Reject**
   - Add a comment (required for rejection)

### Stage Transitions

As a manager, you can advance reviews through stages:

1. **Goal Setting → Mid-Year Review**
   - Verify all goals are set
   - Click "Start Mid-Year Review"

2. **Mid-Year → End-Year Review**
   - Complete mid-year scores
   - Click "Start End-Year Review"

3. **Complete Review**
   - Finalize all scores
   - Click "Complete Review"

---

## HR Guide

### HR Dashboard

Access organization-wide statistics:

1. Click **Dashboard** in the navigation
2. View:
   - Total reviews by status
   - Completion rates
   - Stage distribution
   - 9-grid distribution

### All Reviews

1. Click **All Reviews** under Dashboard
2. Use filters:
   - By status (Draft, In Progress, Completed)
   - By department
   - By manager
   - By date range
3. Export data as needed

### Report Generation

1. Navigate to a specific review
2. Click "Download Report"
3. Reports include:
   - Employee information
   - All goals with scores
   - Competency scores
   - 9-grid position
   - Manager comments
   - Self-assessment

---

## Administrator Guide

### Accessing Admin Portal

1. Click **Admin** in the navigation
2. You'll see the admin dashboard with quick links

### User Management

**Path:** Admin → Users

1. View all users in your organization
2. Search by name or email
3. Filter by role or status
4. Edit user details:
   - Assign role (Employee, Manager, HR, Admin)
   - Set manager (reporting hierarchy)
   - Assign function title
   - Set TOV/IDE level
   - Activate/deactivate user

### Organization Chart

**Path:** Admin → Org Chart

1. View the visual organization hierarchy
2. Expand/collapse departments
3. Drag and drop to reassign managers
4. Search for specific employees

### Function Titles

**Path:** Admin → Function Titles

1. View all job titles
2. Add new titles
3. Edit title names and descriptions
4. Drag to reorder
5. Delete unused titles (soft delete)

### TOV/IDE Levels

**Path:** Admin → TOV Levels

1. View competency levels (A, B, C, D)
2. Edit multilingual descriptions
3. Configure level-specific settings
4. View associated competencies

### Competencies

**Path:** Admin → Competencies

1. Filter by TOV level
2. View competencies grouped by category
3. Edit competency details:
   - Category and subcategory
   - Multilingual title
   - Behavioral indicators
4. Add or remove competencies

### Super Admin Features

If you have TSS Super Admin access:

**OpCo Management** (Admin → OpCos)
- Create new OpCos
- Configure OpCo settings
- Activate/deactivate OpCos

**Global Dashboard** (Admin → Global)
- Cross-OpCo statistics
- System health monitoring
- Performance metrics

---

## Common Features

### Voice Input

The application supports speech-to-text:

1. **Browser Mode** (Recommended for Desktop)
   - Model downloads once (~150-500MB)
   - Processing happens in your browser
   - Works offline after initial download

2. **Server Mode** (Automatic for Mobile)
   - Audio sent to server for processing
   - Requires internet connection
   - Better for mobile devices

**How to Use:**
1. Click and hold the microphone button
2. Speak clearly in your selected language
3. Release the button when finished
4. Wait for transcription (progress shown)
5. Text appends to the current field

### Session Management

Your work is automatically saved:
- Auto-save occurs every 2.5 seconds
- Session codes allow you to resume later
- Sessions expire after 14 days

**To Resume a Session:**
1. Click "Resume Another Session"
2. Enter your 10-character session code
3. Click "Resume"

### Accessibility

- **Keyboard Navigation:** Use Tab to move between elements
- **Screen Readers:** All form elements have labels
- **High Contrast:** Works with browser high contrast mode

### Exporting Data

**DOCX Report:**
- Click "Download Final Report"
- Includes all review data
- Formatted for printing

**Note:** Report download requires:
- All goals scored and weighted
- Weights summing to 100%
- All competencies scored

---

## Troubleshooting

### Login Issues

**Problem:** Can't log in
- Ensure you're using the correct identity provider
- Clear browser cache and cookies
- Contact your administrator

### Voice Input Not Working

**Problem:** Microphone not detected
- Allow microphone permissions in browser
- Check system audio settings
- Try refreshing the page

**Problem:** Transcription fails
- Check internet connection (server mode)
- Try browser mode if server is slow
- Speak clearly and not too quickly

### Data Not Saving

**Problem:** Changes not saved
- Check internet connection
- Look for error messages
- Wait for auto-save (2.5 seconds)
- Try manual save button if available

### Report Won't Download

**Problem:** Download button doesn't work
- Ensure all required fields are complete
- Check that weights sum to 100%
- Score all goals and competencies
- Look for validation error messages

---

## Getting Help

If you need assistance:

1. **Check this guide** for your specific question
2. **Contact your manager** for review process questions
3. **Contact HR** for policy questions
4. **Contact IT/Admin** for technical issues

For bug reports or feature requests:
- Contact your system administrator
- Include screenshots if possible
- Describe what you expected vs. what happened
