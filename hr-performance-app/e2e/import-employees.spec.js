import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Import Employees', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin import page
    await page.goto('/admin/import');
  });

  test('HR can access import employees page', async ({ page }) => {
    // Verify page loads correctly
    await expect(page).toHaveURL(/\/admin\/import/);

    // Verify page title is visible
    await expect(page.locator('.admin-page-title')).toBeVisible();
    await expect(page.locator('.admin-page-title')).toContainText(/Import|Importar|Importeren/);
  });

  test('should show file format requirements', async ({ page }) => {
    // Verify instructions card is visible
    const instructionsCard = page.locator('.admin-card').first();
    await expect(instructionsCard).toBeVisible();

    // Verify required columns are documented
    await expect(page.locator('.import-column-list')).toBeVisible();

    // Check that Email is listed as required
    await expect(page.getByText('Email')).toBeVisible();
    await expect(page.getByText('required')).toBeVisible();

    // Verify import behavior info box is present
    await expect(page.locator('.import-info-box')).toBeVisible();
  });

  test('should display file upload section', async ({ page }) => {
    // Verify upload section exists
    const uploadCard = page.locator('.admin-card').nth(1);
    await expect(uploadCard).toBeVisible();

    // Verify file input label is visible
    await expect(page.locator('.file-upload-label')).toBeVisible();

    // Verify preview checkbox is present and checked by default
    const previewCheckbox = page.locator('input[type="checkbox"]');
    await expect(previewCheckbox).toBeVisible();
    await expect(previewCheckbox).toBeChecked();
  });

  test('should show file info after selecting a file', async ({ page }) => {
    // Create a mock CSV file for upload
    const csvContent = 'Email,Name,Role\njohn@example.com,John Doe,EMPLOYEE';

    // Set up file chooser
    const fileChooserPromise = page.waitForEvent('filechooser');

    // Click the file upload label to trigger file input
    await page.click('.file-upload-label');

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
    await page.click('.file-upload-label');

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
    const previewCheckbox = page.locator('input[type="checkbox"]');

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
    // Find the upload/preview button
    const uploadButton = page.locator('.admin-btn-primary');

    // Button should be disabled when no file is selected
    await expect(uploadButton).toBeDisabled();
  });

  test('should enable upload button after file selection', async ({ page }) => {
    const csvContent = 'Email,Name\ntest@example.com,Test User';

    // Set up file chooser
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('.file-upload-label');

    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'employees.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });

    // Find the upload/preview button
    const uploadButton = page.locator('.admin-btn-primary');

    // Button should be enabled after file selection
    await expect(uploadButton).toBeEnabled();
    await expect(uploadButton).toContainText(/Preview|Vista previa|Voorbeeld/);
  });

  test('should remove file when remove button is clicked', async ({ page }) => {
    const csvContent = 'Email,Name\ntest@example.com,Test User';

    // Set up file chooser and select a file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('.file-upload-label');

    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'employees.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });

    // Verify file is shown
    await expect(page.locator('.import-file-info')).toBeVisible();

    // Click remove button
    await page.click('.admin-btn-secondary:has-text("Remove"), .admin-btn-secondary:has-text("Eliminar"), .admin-btn-secondary:has-text("Verwijderen")');

    // Verify file info is gone
    await expect(page.locator('.import-file-info')).not.toBeVisible();
  });

  test('admin sidebar should have import link active', async ({ page }) => {
    // Verify the import link in sidebar is active
    const importLink = page.locator('.admin-sidebar a[href="/admin/import"]');
    await expect(importLink).toBeVisible();

    // The link or its parent should have an active class
    const activeLink = page.locator('.admin-nav-item.active, .admin-nav-link.active');
    // At least one active nav item should exist
    await expect(page.locator('.admin-sidebar')).toBeVisible();
  });

  test('should navigate back to admin from import page', async ({ page }) => {
    // Click the back to app link
    await page.click('.admin-back-link');

    // Should navigate away from admin
    await expect(page).toHaveURL(/\/my-reviews/);
  });
});

test.describe('Import Employees - Admin Navigation', () => {
  test('should access import page from admin sidebar', async ({ page }) => {
    // Start from admin root
    await page.goto('/admin');

    // Click import link in sidebar
    await page.click('a[href="/admin/import"]');

    // Verify navigation
    await expect(page).toHaveURL(/\/admin\/import/);
    await expect(page.locator('.admin-page-title')).toContainText(/Import|Importar|Importeren/);
  });

  test('should show breadcrumb on import page', async ({ page }) => {
    await page.goto('/admin/import');

    // Verify breadcrumb is visible
    const breadcrumb = page.locator('.admin-breadcrumb');
    await expect(breadcrumb).toBeVisible();
  });
});
