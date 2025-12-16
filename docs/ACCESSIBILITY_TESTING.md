# Accessibility Testing Guide

This document provides procedures for testing the TSS PPM application for WCAG 2.1 Level AA compliance.

## Table of Contents

1. [Automated Testing](#automated-testing)
2. [Manual Testing Checklist](#manual-testing-checklist)
3. [Screen Reader Testing](#screen-reader-testing)
4. [Keyboard Navigation Testing](#keyboard-navigation-testing)
5. [Color and Contrast Testing](#color-and-contrast-testing)
6. [Known Issues and Workarounds](#known-issues-and-workarounds)

---

## Automated Testing

### Running Accessibility Tests

```bash
cd hr-performance-app

# Run all unit tests including accessibility tests
npm run test:run

# Run only accessibility tests
npm run test:run src/App.a11y.test.jsx

# Run ESLint with jsx-a11y rules
npm run lint
```

### What Automated Tests Cover

| Tool | Coverage |
|------|----------|
| **vitest-axe** | WCAG violations in rendered components |
| **eslint-plugin-jsx-a11y** | Static code analysis for 28+ a11y rules |

### Adding New Accessibility Tests

```javascript
import { axe } from 'vitest-axe';

it('should have no accessibility violations', async () => {
  const { container } = render(<YourComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

---

## Manual Testing Checklist

### Before Each Test Session

- [ ] Clear browser cache and cookies
- [ ] Disable browser extensions that might interfere
- [ ] Test in multiple browsers (Chrome, Firefox, Safari)
- [ ] Test at different zoom levels (100%, 150%, 200%)

### Page Structure (WCAG 1.3.1, 2.4.1, 2.4.6)

| Test | Expected Result | Pass/Fail |
|------|-----------------|-----------|
| Skip link appears on Tab | "Skip to main content" link visible at top | |
| Skip link navigates to main | Focus moves to main content area | |
| Headings are hierarchical | h1 > h2 > h3, no skipped levels | |
| Landmarks are present | header, nav, main, footer identifiable | |
| Page has descriptive title | Browser tab shows meaningful title | |

### Forms (WCAG 1.3.1, 3.3.1, 3.3.2)

| Test | Expected Result | Pass/Fail |
|------|-----------------|-----------|
| All inputs have labels | Labels visible or aria-label present | |
| Required fields marked | Asterisk or "required" indicator | |
| Error messages clear | Errors explain what went wrong | |
| Errors announced | Screen reader announces errors | |
| Focus moves to first error | After submit, focus on first invalid field | |

### Interactive Elements (WCAG 2.1.1, 2.4.7)

| Test | Expected Result | Pass/Fail |
|------|-----------------|-----------|
| All buttons focusable | Tab reaches all buttons | |
| Focus indicator visible | 3px outline visible on focus | |
| Buttons have accessible names | Button text or aria-label present | |
| Dropdowns keyboard accessible | Arrow keys navigate options | |
| Modals trap focus | Tab cycles within modal | |
| Modals close with Escape | Escape key closes modal | |

### Images and Icons (WCAG 1.1.1)

| Test | Expected Result | Pass/Fail |
|------|-----------------|-----------|
| Logo has alt text | "Total Specific Solutions" | |
| Decorative icons hidden | aria-hidden="true" on SVGs | |
| Informative icons labeled | aria-label describes purpose | |

### Dynamic Content (WCAG 4.1.3)

| Test | Expected Result | Pass/Fail |
|------|-----------------|-----------|
| Loading states announced | "Loading..." announced by screen reader | |
| Save status announced | "Saved", "Saving...", errors announced | |
| Voice input status announced | "Listening...", "Processing..." announced | |

---

## Screen Reader Testing

### Recommended Screen Readers

| Platform | Screen Reader | Browser |
|----------|---------------|---------|
| macOS | VoiceOver | Safari |
| Windows | NVDA (free) | Firefox, Chrome |
| Windows | JAWS | Chrome |

### VoiceOver (macOS) Quick Reference

| Action | Shortcut |
|--------|----------|
| Turn on/off | Cmd + F5 |
| Read next item | VO + Right Arrow |
| Read previous item | VO + Left Arrow |
| Interact with item | VO + Shift + Down Arrow |
| Stop interacting | VO + Shift + Up Arrow |
| Read all | VO + A |
| Open rotor | VO + U |

*VO = Control + Option*

### NVDA (Windows) Quick Reference

| Action | Shortcut |
|--------|----------|
| Turn on | Ctrl + Alt + N |
| Turn off | Insert + Q |
| Read next item | Down Arrow |
| Read previous item | Up Arrow |
| Activate item | Enter or Space |
| List headings | Insert + F7 |
| List landmarks | Insert + F7, then Alt + L |

### Screen Reader Test Script

#### 1. Landing Page (My Reviews)

```
1. Open https://your-domain.com
2. Verify page title is announced
3. Navigate to skip link (first Tab)
4. Activate skip link - verify focus moves to main content
5. Use heading navigation (VoiceOver: VO+Cmd+H, NVDA: H)
6. Verify heading structure: "TSS PPM Generator" > "My Reviews"
7. Navigate to navigation menu
8. Verify all menu items are announced with their names
```

**Expected Announcements:**
- "Skip to main content, link"
- "TSS PPM Generator, heading level 1"
- "My Reviews, heading level 2"
- "My Reviews, link, current page" (for active nav item)

#### 2. Performance Grid

```
1. Navigate to a review with scores
2. Find the Performance Grid section
3. Verify grid is announced as "9-grid performance matrix, grid"
4. Navigate through grid cells
5. Verify each cell announces position and description
6. Verify current position is announced
```

**Expected Announcements:**
- "9-grid performance matrix, grid"
- "WHAT 3, HOW 1: High performance, Low potential - Strong results, gridcell"
- "Employee is positioned at High performance, High potential - Exceptional performer"

#### 3. Voice Input Button

```
1. Navigate to a text area with voice input
2. Find the voice input button
3. Verify button is announced with label
4. Activate button (hold)
5. Verify "Listening..." is announced
6. Release button
7. Verify "Processing..." is announced
```

**Expected Announcements:**
- "Hold to speak, button"
- "Listening..."
- "Processing..."

#### 4. Forms and Validation

```
1. Navigate to Employee Information section
2. Verify all form fields have labels announced
3. Leave required field empty
4. Submit/tab away
5. Verify error is announced
```

**Expected Announcements:**
- "Employee Name, required, edit text"
- "Error: This field is required"

#### 5. Table Sorting (Team Overview)

```
1. Navigate to Team Overview (Manager+ role)
2. Find the team table
3. Navigate to a sortable column header
4. Verify it's announced as a button with sort state
5. Activate with Enter or Space
6. Verify sort direction changes
```

**Expected Announcements:**
- "Name, button, sortable, sorted ascending"
- After activation: "sorted descending"

---

## Keyboard Navigation Testing

### Tab Order Test

1. Start at the address bar
2. Press Tab repeatedly through the entire page
3. Verify:
   - [ ] Skip link is first focusable element
   - [ ] All interactive elements receive focus
   - [ ] Focus order matches visual order
   - [ ] No focus traps (except modals)
   - [ ] Focus indicator always visible

### Specific Component Tests

#### Navigation Menu
- Tab to first nav item
- Arrow keys should NOT move between items (they're links, not menu items)
- Tab moves to next nav item
- Enter activates link

#### Dropdown Selects
- Tab to dropdown
- Space or Enter opens dropdown
- Arrow keys navigate options
- Enter selects option
- Escape closes without selecting

#### Modal Dialogs
- Tab should cycle within modal
- Escape closes modal
- Focus returns to trigger element

#### Performance Grid
- Tab to grid (if position exists)
- Current position cell should be focusable
- Other cells should not be in tab order

#### Sortable Table Headers
- Tab to header
- Enter or Space toggles sort
- Visual indicator updates
- aria-sort attribute updates

---

## Color and Contrast Testing

### Tools

- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Chrome DevTools Accessibility](chrome://accessibility)
- Browser extension: axe DevTools

### Contrast Requirements (WCAG 1.4.3, 1.4.11)

| Element | Minimum Ratio |
|---------|---------------|
| Normal text | 4.5:1 |
| Large text (18pt+ or 14pt bold) | 3:1 |
| UI components/graphics | 3:1 |

### Color-Coded Elements

Verify these elements have non-color indicators:

| Element | Color Indicator | Non-Color Indicator |
|---------|-----------------|---------------------|
| Grid cells | Background color | Position marker (●) |
| Error states | Red text | "Error:" prefix + icon |
| Required fields | Red asterisk | "required" text |
| Success states | Green | Checkmark icon |
| Status badges | Background | Text label |

### High Contrast Mode

1. Enable high contrast mode:
   - Windows: Settings > Ease of Access > High Contrast
   - macOS: System Preferences > Accessibility > Display > Increase Contrast

2. Verify:
   - [ ] All text remains readable
   - [ ] Focus indicators more prominent (4px)
   - [ ] Borders thicker (2px)
   - [ ] No information lost

### Reduced Motion

1. Enable reduced motion:
   - Windows: Settings > Ease of Access > Display > Show animations
   - macOS: System Preferences > Accessibility > Display > Reduce motion

2. Verify:
   - [ ] Animations are minimal or static
   - [ ] No autoplaying animations
   - [ ] Page remains functional

---

## Known Issues and Workarounds

### Issue: Grid Cell Navigation

**Description:** Individual grid cells (non-position) are not keyboard focusable by design.

**Reason:** The 9-grid is primarily a visualization, not an interactive element.

**Workaround:** Screen readers can navigate through cells using arrow keys when in grid navigation mode.

### Issue: Voice Input Requires Mouse/Touch

**Description:** Hold-to-speak requires mouse down/touch, cannot be keyboard activated.

**Reason:** Holding down a key would conflict with typing.

**Workaround:** Users can type directly instead of using voice input.

### Issue: Chart/Graph Descriptions

**Description:** The 9-grid visualization relies on visual position.

**Workaround:** Screen reader announcements describe current position in text (e.g., "High performance, High potential").

---

## Reporting Accessibility Issues

When reporting an accessibility issue, include:

1. **Screen reader/browser combination** (e.g., NVDA + Firefox)
2. **Steps to reproduce**
3. **Expected behavior**
4. **Actual behavior**
5. **WCAG success criterion** if known (e.g., 2.4.7 Focus Visible)

File issues at: https://github.com/SimonvanAs/tss_ppm/issues

Use the label: `accessibility`

---

## References

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Screen Reader Survey](https://webaim.org/projects/screenreadersurvey9/)
- [Deque axe Rules](https://dequeuniversity.com/rules/axe/)
- [MDN ARIA Practices](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA)
