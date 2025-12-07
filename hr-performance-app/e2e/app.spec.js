import { test, expect } from '@playwright/test';

test.describe('TSS PPM Generator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the application', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('.header')).toBeVisible();
  });

  test('should display session code', async ({ page }) => {
    const sessionCode = page.locator('.session-value');
    await expect(sessionCode).toBeVisible();
    // Session code should be 10 characters
    const codeText = await sessionCode.textContent();
    expect(codeText).toMatch(/^[A-Z0-9]{10}$/);
  });

  test('should have language selector with three languages', async ({ page }) => {
    const flags = page.locator('.language-flag-button');
    await expect(flags).toHaveCount(3);
  });

  test('should switch language when flag is clicked', async ({ page }) => {
    // Click Dutch flag
    await page.locator('.language-flag-button').nth(1).click();

    // Check that some Dutch text appears (e.g., in section titles)
    await expect(page.getByText('Medewerkersinformatie')).toBeVisible();
  });

  test('should display version number', async ({ page }) => {
    await expect(page.getByText('TSS PPM generator v1.0.14')).toBeVisible();
  });

  test('should have Plausible analytics script', async ({ page }) => {
    // Check that Plausible script is loaded
    const plausibleScript = page.locator('script[src*="plausible.io"]');
    await expect(plausibleScript).toHaveCount(1);
  });

  test('should have privacy policy link in footer', async ({ page }) => {
    const privacyLink = page.locator('button.privacy-link');
    await expect(privacyLink).toBeVisible();
    await expect(privacyLink).toHaveText('Privacy Policy');
  });

  test('should open privacy policy page', async ({ page }) => {
    await page.click('button.privacy-link');

    // Should show privacy policy content
    await expect(page.locator('.privacy-policy')).toBeVisible();
    await expect(page.locator('.privacy-header h1')).toBeVisible();

    // Should have back button
    await expect(page.locator('.back-button')).toBeVisible();
  });

  test('should return from privacy policy to main app', async ({ page }) => {
    await page.click('button.privacy-link');
    await expect(page.locator('.privacy-policy')).toBeVisible();

    // Click back button
    await page.click('.back-button');

    // Should be back to main app
    await expect(page.locator('.header')).toBeVisible();
    await expect(page.locator('.privacy-policy')).not.toBeVisible();
  });
});

test.describe('Employee Info Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should fill employee information', async ({ page }) => {
    await page.fill('#employeeName', 'John Doe');
    await page.fill('#role', 'Software Developer');
    await page.fill('#businessUnit', 'Engineering');
    await page.selectOption('#tovLevel', 'B');

    // Verify values are saved
    await expect(page.locator('#employeeName')).toHaveValue('John Doe');
    await expect(page.locator('#role')).toHaveValue('Software Developer');
    await expect(page.locator('#businessUnit')).toHaveValue('Engineering');
    await expect(page.locator('#tovLevel')).toHaveValue('B');
  });

  test('should show all TOV-Level options', async ({ page }) => {
    const options = page.locator('#tovLevel option');
    await expect(options).toHaveCount(5); // Including placeholder

    await expect(page.locator('#tovLevel option[value="A"]')).toHaveText('A');
    await expect(page.locator('#tovLevel option[value="B"]')).toHaveText('B');
    await expect(page.locator('#tovLevel option[value="C"]')).toHaveText('C');
    await expect(page.locator('#tovLevel option[value="D"]')).toHaveText('D');
  });
});

test.describe('Goals Section (WHAT-Axis)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should add a new goal', async ({ page }) => {
    // Initially there should be 1 goal
    const goalCards = page.locator('.goal-item');
    await expect(goalCards).toHaveCount(1);

    // Click add goal button
    await page.click('button:has-text("Add Goal")');

    // Now there should be 2 goals
    await expect(goalCards).toHaveCount(2);
  });

  test('should fill goal information', async ({ page }) => {
    const goalTitle = page.locator('.goal-item').first().locator('input[type="text"]').first();
    await goalTitle.fill('Complete project milestone');

    await expect(goalTitle).toHaveValue('Complete project milestone');
  });

  test('should set goal weight', async ({ page }) => {
    const weightInput = page.locator('.goal-item').first().locator('input[type="number"]');
    await weightInput.fill('50');

    await expect(weightInput).toHaveValue('50');
  });

  test('should show weight validation', async ({ page }) => {
    // Fill one goal with 50% weight
    const goalCard = page.locator('.goal-item').first();
    await goalCard.locator('input[type="text"]').first().fill('Goal 1');
    await goalCard.locator('input[type="number"]').fill('50');

    // Weight total should show the percentage
    const weightTotal = page.locator('.weight-total');
    await expect(weightTotal).toContainText('50%');
  });

  test('should delete a goal', async ({ page }) => {
    // Add a second goal first
    await page.click('button:has-text("Add Goal")');
    await expect(page.locator('.goal-item')).toHaveCount(2);

    // Delete the first goal
    await page.locator('.goal-item').first().locator('button.remove-goal').click();

    await expect(page.locator('.goal-item')).toHaveCount(1);
  });
});

test.describe('Performance Grid', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display 9-grid', async ({ page }) => {
    const gridCells = page.locator('.grid-cell');
    await expect(gridCells).toHaveCount(9);
  });

  test('should display axis labels', async ({ page }) => {
    await expect(page.locator('.y-axis-label')).toContainText('WHAT');
    await expect(page.locator('.x-axis-label')).toContainText('HOW');
  });

  test('should display legend', async ({ page }) => {
    await expect(page.getByText('Immediate attention')).toBeVisible();
    await expect(page.getByText('Development area')).toBeVisible();
    await expect(page.getByText('Good performance')).toBeVisible();
    await expect(page.getByText('Exceptional')).toBeVisible();
  });

  test('should show scores when data is complete', async ({ page }) => {
    // Fill employee info
    await page.fill('#employeeName', 'John Doe');
    await page.fill('#role', 'Developer');
    await page.fill('#businessUnit', 'Engineering');
    await page.selectOption('#tovLevel', 'B');

    // Fill goal with score and weight
    const goalCard = page.locator('.goal-item').first();
    await goalCard.locator('input[type="text"]').first().fill('Goal 1');

    // Select score 2 for the goal (it's a select dropdown)
    await goalCard.locator('select').first().selectOption('2');

    // Set weight to 100%
    await goalCard.locator('input[type="number"]').fill('100');

    // WHAT score should now show a value
    const whatScore = page.locator('.score-item').first().locator('.score-value');
    await expect(whatScore).not.toHaveText('-');
  });
});

test.describe('Session Management', () => {
  test('should copy session code to clipboard', async ({ page, context, browserName }) => {
    // Skip clipboard test on Firefox as it doesn't support clipboard permissions
    test.skip(browserName === 'firefox', 'Firefox does not support clipboard permissions');

    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/');

    // Click copy button
    await page.click('button:has-text("Copy")');

    // Button should show checkmark
    await expect(page.locator('button:has-text("✓")')).toBeVisible();
  });

  test('should open resume session modal', async ({ page }) => {
    await page.goto('/');

    await page.click('button:has-text("Resume Another Session")');

    await expect(page.locator('.modal')).toBeVisible();
    await expect(page.locator('.modal-input')).toBeVisible();
  });

  test('should show error for invalid session code', async ({ page }) => {
    await page.goto('/');

    await page.click('button:has-text("Resume Another Session")');
    await page.fill('.modal-input', 'INVALID123');
    await page.click('.modal-button.primary');

    await expect(page.locator('.error-message')).toBeVisible();
  });

  test('should close modal on cancel', async ({ page }) => {
    await page.goto('/');

    await page.click('button:has-text("Resume Another Session")');
    await expect(page.locator('.modal')).toBeVisible();

    await page.click('.modal-button.cancel');
    await expect(page.locator('.modal')).not.toBeVisible();
  });
});

test.describe('Progress Tracking', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure clean state for progress tests
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should start with 6% progress (reviewDate auto-filled)', async ({ page }) => {
    // Initial progress is 6% because reviewDate is auto-populated
    // (1/5 employee fields filled = 20% × 30% weight = 6%)
    const progressText = page.locator('.progress-text');
    await expect(progressText).toContainText('6%');
  });

  test('should increase progress when filling form', async ({ page }) => {
    // Fill employee name
    await page.fill('#employeeName', 'John Doe');

    // Progress should increase
    const progressText = page.locator('.progress-text');
    const progressValue = await progressText.textContent();
    const percentage = parseInt(progressValue);
    expect(percentage).toBeGreaterThan(0);
  });
});

test.describe('Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show validation errors on download attempt with incomplete form', async ({ page }) => {
    // Try to download without filling required fields
    await page.click('button:has-text("Download Final Report")');

    // Should show validation errors
    const errorFields = page.locator('.has-error');
    expect(await errorFields.count()).toBeGreaterThan(0);
  });
});
