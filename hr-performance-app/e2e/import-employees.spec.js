import { test, expect } from '@playwright/test';

test.describe('Import Employees', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin import employees page (not /admin/import which is Import Reviews)
    await page.goto('/admin/import-employees');
    // Wait for page to fully load
    await page.waitForSelector('.admin-page-title');
  });

  test('HR can access import employees page', async ({ page }) => {
    // Verify page loads correctly
    await expect(page).toHaveURL(/\/admin\/import-employees/);

    // Verify page title is visible
    await expect(page.locator('.admin-page-title')).toBeVisible();
    await expect(page.locator('.admin-page-title')).toContainText(/Import|Importar|Importeren/);
  });

  test('should show file format requirements', async ({ page }) => {
    // Verify instructions card is visible
    const instructionsCard = page.locator('.admin-card').first();
    await expect(instructionsCard).toBeVisible();

    // Verify required columns are documented - using ul element which contains column list
    const columnList = page.locator('ul.import-column-list');
    await expect(columnList).toBeVisible();

    // Check that Email is listed as required (using exact match to avoid ambiguity)
    await expect(page.getByText('Email', { exact: true })).toBeVisible();
    await expect(page.getByText('required', { exact: false }).first()).toBeVisible();

    // Verify import behavior info box is present
    await expect(page.locator('.import-info-box')).toBeVisible();
  });

  test('should display file upload section', async ({ page }) => {
    // Verify upload section exists
    const uploadCard = page.locator('.admin-card').nth(1);
    await expect(uploadCard).toBeVisible();

    // Verify file input label is visible (styled as button)
    await expect(page.locator('label.file-upload-label')).toBeVisible();

    // Verify preview checkbox is present - select the specific checkbox in the import section
    const previewCheckbox = page.locator('.import-checkbox-wrapper input[type="checkbox"]');
    await expect(previewCheckbox).toBeVisible();
    await expect(previewCheckbox).toBeChecked();
  });

  test('should show file info after selecting a file', async ({ page }) => {
    // Create a mock CSV file for upload
    const csvContent = 'Email,Name,Role\njohn@example.com,John Doe,EMPLOYEE';

    // Set up file chooser
    const fileChooserPromise = page.waitForEvent('filechooser');

    // Click the file upload label to trigger file input
    await page.click('label.file-upload-label');

    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'test-employees.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });

    // Verify file info is displayed
    await expect(page.locator('.import-file-info')).toBeVisible();
    await expect(page.getByText('test-employees.csv')).toBeVisible();

    // Verify remove button is visible
    await expect(page.getByRole('button', { name: /Remove|Eliminar|Verwijderen/ })).toBeVisible();
  });

  test('should validate file type before upload', async ({ page }) => {
    // Set up file chooser
    const fileChooserPromise = page.waitForEvent('filechooser');

    // Click the file upload label
    await page.click('label.file-upload-label');

    const fileChooser = await fileChooserPromise;

    // Try uploading an invalid file type (e.g., .txt)
    await fileChooser.setFiles({
      name: 'invalid-file.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('invalid content'),
    });

    // Verify error message is displayed
    await expect(page.locator('.import-error')).toBeVisible();
    await expect(page.locator('.import-error')).toContainText(/Invalid|invalid|archivo|bestand/i);
  });

  test('should toggle preview mode checkbox', async ({ page }) => {
    // Select the specific preview checkbox in import section
    const previewCheckbox = page.locator('.import-checkbox-wrapper input[type="checkbox"]');

    // Should be checked by default
    await expect(previewCheckbox).toBeChecked();

    // Uncheck it
    await previewCheckbox.uncheck();
    await expect(previewCheckbox).not.toBeChecked();

    // Check it again
    await previewCheckbox.check();
    await expect(previewCheckbox).toBeChecked();
  });

  test('should disable upload button when no file is selected', async ({ page }) => {
    // Find the upload/preview button in the import section
    const uploadButton = page.locator('.admin-card-content .admin-btn-primary');

    // Button should be disabled when no file is selected
    await expect(uploadButton).toBeDisabled();
  });

  test('should enable upload button after file selection', async ({ page }) => {
    const csvContent = 'Email,Name\ntest@example.com,Test User';

    // Set up file chooser
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('label.file-upload-label');

    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'employees.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });

    // Find the upload/preview button
    const uploadButton = page.locator('.admin-card-content .admin-btn-primary');

    // Button should be enabled after file selection
    await expect(uploadButton).toBeEnabled();
    await expect(uploadButton).toContainText(/Preview|Vista previa|Voorbeeld/);
  });

  test('should remove file when remove button is clicked', async ({ page }) => {
    const csvContent = 'Email,Name\ntest@example.com,Test User';

    // Set up file chooser and select a file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('label.file-upload-label');

    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'employees.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });

    // Verify file is shown
    await expect(page.locator('.import-file-info')).toBeVisible();

    // Click remove button using role selector
    await page.getByRole('button', { name: /Remove|Eliminar|Verwijderen/ }).click();

    // Verify file info is gone
    await expect(page.locator('.import-file-info')).not.toBeVisible();
  });

  test('admin sidebar should have import employees link', async ({ page }) => {
    // Verify the import employees link in sidebar is visible
    const importLink = page.locator('.admin-sidebar a[href="/admin/import-employees"]');
    await expect(importLink).toBeVisible();

    // Verify the sidebar is rendered
    await expect(page.locator('.admin-sidebar')).toBeVisible();
  });

  test('should navigate back to app from import page', async ({ page }) => {
    // Click the back to app link
    await page.click('.admin-back-link');

    // Should navigate away from admin
    await expect(page).toHaveURL(/\/my-reviews/);
  });
});

test.describe('Import Employees - Admin Navigation', () => {
  test('should access import employees page from admin sidebar', async ({ page }) => {
    // Start from admin root
    await page.goto('/admin');
    await page.waitForSelector('.admin-sidebar');

    // Click import employees link in sidebar
    await page.click('a[href="/admin/import-employees"]');

    // Verify navigation
    await expect(page).toHaveURL(/\/admin\/import-employees/);
    await expect(page.locator('.admin-page-title')).toContainText(/Import|Importar|Importeren/);
  });

  test('should show breadcrumb on import employees page', async ({ page }) => {
    await page.goto('/admin/import-employees');
    await page.waitForSelector('.admin-page-title');

    // Verify breadcrumb is visible
    const breadcrumb = page.locator('.admin-breadcrumb');
    await expect(breadcrumb).toBeVisible();
  });
});
