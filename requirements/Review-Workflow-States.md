# Review Workflow States

State machine documentation for TSS PPM review lifecycle.

## Overview

A review has two dimensions of state:
1. **Stage**: Which phase of the annual cycle (Goal Setting → Mid-Year → End-Year)
2. **Status**: Progress within each stage (Draft → Signatures → Signed)

---

## Review Stages

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  GOAL_SETTING   │ ───► │ MID_YEAR_REVIEW │ ───► │ END_YEAR_REVIEW │
│                 │      │                 │      │                 │
│ Employee sets   │      │ Manager scores  │      │ Final scoring   │
│ goals & weights │      │ mid-year review │      │ and sign-off    │
└─────────────────┘      └─────────────────┘      └─────────────────┘
     Jan-Feb                  Jun-Jul                  Nov-Dec
```

### Stage Transitions

| From | To | Trigger | Guard Conditions |
|------|----|---------|------------------|
| GOAL_SETTING | MID_YEAR_REVIEW | Manager action | All goals have weights totaling 100% |
| MID_YEAR_REVIEW | END_YEAR_REVIEW | Manager action | Review status = SIGNED |
| END_YEAR_REVIEW | (archived) | HR action | Review status = SIGNED |

---

## Review Status (Within Each Stage)

```
                                    ┌─────────────────────────────────┐
                                    │                                 │
                                    ▼                                 │
┌─────────┐     ┌─────────────────────────────┐     ┌─────────────┐  │
│  DRAFT  │ ──► │ PENDING_EMPLOYEE_SIGNATURE  │ ──► │ EMPLOYEE_   │  │
│         │     │                             │     │ SIGNED      │  │
└─────────┘     └─────────────────────────────┘     └──────┬──────┘  │
     │                      │                              │         │
     │                      │ (reject)                     ▼         │
     │                      └──────────────────────────────┼─────────┘
     │                                                     │
     │          ┌─────────────────────────────┐            │
     │          │ PENDING_MANAGER_SIGNATURE   │ ◄──────────┘
     │          │                             │
     │          └──────────────┬──────────────┘
     │                         │
     │                         │ (reject)
     │                         ▼
     │          ┌─────────────────────────────┐
     │          │      MANAGER_SIGNED         │
     │          │                             │
     │          └──────────────┬──────────────┘
     │                         │
     │                         ▼
     │          ┌─────────────────────────────┐
     └─────────►│         SIGNED              │
   (skip to     │   (both signatures)         │
   signed for   └──────────────┬──────────────┘
   calibration)                │
                               ▼
                ┌─────────────────────────────┐
                │        ARCHIVED             │
                │   (historical record)       │
                └─────────────────────────────┘
```

---

## Status Transitions

### DRAFT → PENDING_EMPLOYEE_SIGNATURE

| Attribute | Value |
|-----------|-------|
| **Trigger** | Manager submits review for employee signature |
| **Actor** | Manager |
| **Guards** | - All goals scored (if scoring stage) |
| | - All competencies scored (if scoring stage) |
| | - Summary comments provided |
| **Actions** | - Add to employee's task list |
| | - Send notification (if enabled) |

### PENDING_EMPLOYEE_SIGNATURE → EMPLOYEE_SIGNED

| Attribute | Value |
|-----------|-------|
| **Trigger** | Employee signs review |
| **Actor** | Employee |
| **Guards** | - User is the review's employee |
| **Actions** | - Record signature timestamp |
| | - Create audit log entry |

### PENDING_EMPLOYEE_SIGNATURE → DRAFT (Reject)

| Attribute | Value |
|-----------|-------|
| **Trigger** | Employee rejects/requests changes |
| **Actor** | Employee |
| **Guards** | - User is the review's employee |
| **Actions** | - Add feedback note |
| | - Notify manager |
| | - Create audit log entry |

### EMPLOYEE_SIGNED → PENDING_MANAGER_SIGNATURE

| Attribute | Value |
|-----------|-------|
| **Trigger** | Automatic after employee signs |
| **Actor** | System |
| **Guards** | None |
| **Actions** | - Add to manager's task list |

### PENDING_MANAGER_SIGNATURE → MANAGER_SIGNED

| Attribute | Value |
|-----------|-------|
| **Trigger** | Manager signs review |
| **Actor** | Manager |
| **Guards** | - User is the review's manager |
| **Actions** | - Record signature timestamp |
| | - Create audit log entry |

### PENDING_MANAGER_SIGNATURE → PENDING_EMPLOYEE_SIGNATURE (Reject)

| Attribute | Value |
|-----------|-------|
| **Trigger** | Manager requests employee re-review |
| **Actor** | Manager |
| **Guards** | - User is the review's manager |
| **Actions** | - Clear employee signature |
| | - Add feedback note |
| | - Notify employee |

### MANAGER_SIGNED → SIGNED

| Attribute | Value |
|-----------|-------|
| **Trigger** | Automatic after manager signs |
| **Actor** | System |
| **Guards** | - Employee signature exists |
| | - Manager signature exists |
| **Actions** | - Mark review complete |
| | - Enable PDF generation |

### SIGNED → ARCHIVED

| Attribute | Value |
|-----------|-------|
| **Trigger** | HR archives review |
| **Actor** | HR |
| **Guards** | - Review year is past |
| **Actions** | - Move to archive |
| | - Create audit log entry |

---

## Goal Setting Stage Specifics

During GOAL_SETTING stage, the workflow is simplified:

```
┌─────────┐     ┌─────────────────────────────┐     ┌─────────────┐
│  DRAFT  │ ──► │ PENDING_MANAGER_SIGNATURE   │ ──► │   SIGNED    │
│         │     │                             │     │             │
│Employee │     │ Manager reviews goals       │     │ Goals       │
│sets     │     │                             │     │ approved    │
│goals    │     │                             │     │             │
└─────────┘     └─────────────────────────────┘     └─────────────┘
```

### Goal Setting Transitions

| From | To | Trigger | Guards |
|------|----|---------|--------|
| DRAFT | PENDING_MANAGER_SIGNATURE | Employee submits | Goals total 100% weight |
| PENDING_MANAGER_SIGNATURE | SIGNED | Manager approves | Manager reviewed all goals |
| PENDING_MANAGER_SIGNATURE | DRAFT | Manager rejects | Feedback provided |

---

## Calibration Impact

Calibration sessions can modify scores on reviews in certain states:

| Review Status | Can be Calibrated? | Notes |
|---------------|-------------------|-------|
| DRAFT | ❌ | Not ready for calibration |
| PENDING_EMPLOYEE_SIGNATURE | ❌ | In signature flow |
| EMPLOYEE_SIGNED | ✅ | Primary calibration window |
| PENDING_MANAGER_SIGNATURE | ✅ | Can still calibrate |
| MANAGER_SIGNED | ✅ | Last chance for calibration |
| SIGNED | ❌ | Locked after signatures |
| ARCHIVED | ❌ | Historical record |

### Calibration Flow

```
Reviews in EMPLOYEE_SIGNED/MANAGER_SIGNED status
                    │
                    ▼
         ┌─────────────────────┐
         │ Calibration Session │
         │    IN_PROGRESS      │
         └──────────┬──────────┘
                    │
         ┌──────────▼──────────┐
         │  Take Snapshot      │
         │  (original scores)  │
         └──────────┬──────────┘
                    │
         ┌──────────▼──────────┐
         │  HR/Managers adjust │
         │  scores in session  │
         └──────────┬──────────┘
                    │
         ┌──────────▼──────────┐
         │  Complete Session   │
         │  (apply adjusted    │
         │   scores to reviews)│
         └─────────────────────┘
```

---

## Goal Change Request States

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐
│ PENDING │ ──► │  APPROVED   │     │  REJECTED   │
│         │     │             │     │             │
└────┬────┘     └─────────────┘     └─────────────┘
     │                 ▲                   ▲
     │                 │                   │
     └─────────────────┴───────────────────┘
           Manager/HR decision
```

| From | To | Trigger | Actor |
|------|----|---------|-------|
| PENDING | APPROVED | Approve request | Manager or HR |
| PENDING | REJECTED | Reject request | Manager or HR |

---

## State Queries

### Reviews Requiring Action

```sql
-- Employee's pending signatures
SELECT * FROM reviews
WHERE employee_id = :user_id
  AND status = 'PENDING_EMPLOYEE_SIGNATURE';

-- Manager's pending signatures
SELECT * FROM reviews
WHERE manager_id = :user_id
  AND status = 'PENDING_MANAGER_SIGNATURE';

-- Manager's team reviews needing scoring
SELECT * FROM reviews
WHERE manager_id = :user_id
  AND status = 'DRAFT'
  AND stage IN ('MID_YEAR_REVIEW', 'END_YEAR_REVIEW');
```

### Reviews Ready for Calibration

```sql
SELECT * FROM reviews
WHERE opco_id = :opco_id
  AND review_year = :year
  AND stage = :stage
  AND status IN ('EMPLOYEE_SIGNED', 'PENDING_MANAGER_SIGNATURE', 'MANAGER_SIGNED');
```

---

## Validation Rules

### Before Stage Transition

| Stage Transition | Validation |
|-----------------|------------|
| GOAL_SETTING → MID_YEAR | Goals weight = 100%, status = SIGNED |
| MID_YEAR → END_YEAR | Status = SIGNED |

### Before Status Transition

| Status Transition | Validation |
|-------------------|------------|
| DRAFT → PENDING_EMPLOYEE_SIGNATURE | All required fields completed |
| * → SIGNED | Both signatures present |

### Scoring Validation

| Rule | Condition | Result |
|------|-----------|--------|
| SCF VETO | Any SCF goal score = 1 | what_veto_active = true, what_score = 1.00 |
| KAR VETO | KAR goal score = 1, no compensating KAR = 3 | what_veto_active = true |
| HOW VETO | Any competency score = 1 | how_veto_active = true, how_score = 1.00 |
| Weight Total | Sum of goal weights ≠ 100 | Block submission |
