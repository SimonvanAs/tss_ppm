import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImportEmployees } from './ImportEmployees';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { BrowserRouter } from 'react-router-dom';

// Mock the importEmployees function
const mockImportEmployees = vi.fn();

// Mock import.meta.env
vi.mock('../../services/api', () => ({
  adminApi: {
    importEmployees: (...args) => mockImportEmployees(...args)
  }
}));

const renderWithProviders = () => {
  return render(
    <BrowserRouter>
      <LanguageProvider>
        <ImportEmployees />
      </LanguageProvider>
    </BrowserRouter>
  );
};

describe('ImportEmployees', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockImportEmployees.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Page Rendering', () => {
    it('should render page title', () => {
      renderWithProviders();
      expect(screen.getByText(/Import Employees/i)).toBeInTheDocument();
    });

    it('should render instructions card', () => {
      renderWithProviders();
      expect(screen.getByText(/File Format Requirements/i)).toBeInTheDocument();
    });

    it('should render file upload section', () => {
      renderWithProviders();
      expect(screen.getByText(/Select File/i)).toBeInTheDocument();
    });

    it('should render preview checkbox checked by default', () => {
      renderWithProviders();
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    it('should display column requirements', () => {
      renderWithProviders();
      // Use getAllByText for elements that appear multiple times
      expect(screen.getAllByText(/Email/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Manager Email/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/TOV Level/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/WHAT Score/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/HOW Score/i).length).toBeGreaterThan(0);
    });
  });

  describe('File Selection', () => {
    it('should accept xlsx, xls, and csv files', () => {
      renderWithProviders();
      const input = document.querySelector('input[type="file"]');
      expect(input).toBeInTheDocument();
      expect(input.accept).toBe('.xlsx,.xls,.csv');
    });

    it('should show selected file name', async () => {
      renderWithProviders();
      const input = document.querySelector('input[type="file"]');

      const file = new File(['test content'], 'employees.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('employees.xlsx')).toBeInTheDocument();
      });
    });

    it('should show file size in KB', async () => {
      renderWithProviders();
      const input = document.querySelector('input[type="file"]');

      const file = new File(['test content'], 'employees.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/KB/i)).toBeInTheDocument();
      });
    });

    it('should show error for invalid file type', async () => {
      renderWithProviders();
      const input = document.querySelector('input[type="file"]');

      const file = new File(['test content'], 'employees.txt', { type: 'text/plain' });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/Invalid file type/i)).toBeInTheDocument();
      });
    });

    it('should show error for file too large (> 10MB)', async () => {
      renderWithProviders();
      const input = document.querySelector('input[type="file"]');

      // Create a mock large file
      const largeFile = new File(['x'], 'large.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      // Override size property
      Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024 });

      fireEvent.change(input, { target: { files: [largeFile] } });

      await waitFor(() => {
        expect(screen.getByText(/exceeds 10MB/i)).toBeInTheDocument();
      });
    });

    it('should have remove button after file selection', async () => {
      renderWithProviders();
      const input = document.querySelector('input[type="file"]');

      const file = new File(['test content'], 'employees.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('Remove')).toBeInTheDocument();
      });
    });

    it('should clear file when remove is clicked', async () => {
      renderWithProviders();
      const input = document.querySelector('input[type="file"]');

      const file = new File(['test content'], 'employees.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('employees.xlsx')).toBeInTheDocument();
      });

      // Click remove
      fireEvent.click(screen.getByText('Remove'));

      await waitFor(() => {
        expect(screen.queryByText('employees.xlsx')).not.toBeInTheDocument();
      });
    });
  });

  describe('Preview Mode', () => {
    it('should toggle preview mode when checkbox is clicked', async () => {
      renderWithProviders();
      const checkbox = screen.getByRole('checkbox');

      expect(checkbox).toBeChecked();

      fireEvent.click(checkbox);

      expect(checkbox).not.toBeChecked();
    });

    it('should show "Preview Import" button when preview mode is enabled', async () => {
      renderWithProviders();
      const input = document.querySelector('input[type="file"]');

      const file = new File(['test content'], 'employees.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Preview Import/i })).toBeInTheDocument();
      });
    });

    it('should show "Upload and Import" button when preview mode is disabled', async () => {
      renderWithProviders();
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox); // Disable preview mode

      const input = document.querySelector('input[type="file"]');

      const file = new File(['test content'], 'employees.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Upload and Import/i })).toBeInTheDocument();
      });
    });
  });

  describe('Upload Button State', () => {
    it('should be disabled when no file selected', () => {
      renderWithProviders();
      const uploadBtn = screen.getByRole('button', { name: /Preview Import/i });
      expect(uploadBtn).toBeDisabled();
    });

    it('should be enabled when file is selected', async () => {
      renderWithProviders();
      const input = document.querySelector('input[type="file"]');

      const file = new File(['test content'], 'employees.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        const uploadBtn = screen.getByRole('button', { name: /Preview Import/i });
        expect(uploadBtn).not.toBeDisabled();
      });
    });
  });

  describe('Preview Results', () => {
    it('should display preview results after dry run', async () => {
      mockImportEmployees.mockResolvedValueOnce({
        results: {
          total: 10,
          usersCreated: 5,
          usersUpdated: 2,
          reviewsCreated: 3,
          reviewsUpdated: 1,
          skipped: 2,
          errors: []
        },
        preview: [
          { row: 2, email: 'john@example.com', name: 'John Doe', action: 'CREATE_USER', hasScores: true },
          { row: 3, email: 'jane@example.com', name: 'Jane Smith', action: 'UPDATE_USER', hasScores: false },
        ]
      });

      renderWithProviders();
      const input = document.querySelector('input[type="file"]');

      const file = new File(['test content'], 'employees.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        const uploadBtn = screen.getByRole('button', { name: /Preview Import/i });
        fireEvent.click(uploadBtn);
      });

      await waitFor(() => {
        expect(screen.getByText(/Preview Results/i)).toBeInTheDocument();
      });

      // Check results summary - use getAllByText since numbers may appear multiple times
      const tens = screen.getAllByText('10');
      expect(tens.length).toBeGreaterThan(0); // Total
      const fives = screen.getAllByText('5');
      expect(fives.length).toBeGreaterThan(0); // Users Created
      const threes = screen.getAllByText('3');
      expect(threes.length).toBeGreaterThan(0); // Reviews Created
    });

    it('should show preview table with sample rows', async () => {
      mockImportEmployees.mockResolvedValueOnce({
        results: {
          total: 2,
          usersCreated: 1,
          usersUpdated: 1,
          reviewsCreated: 1,
          reviewsUpdated: 0,
          skipped: 0,
          errors: []
        },
        preview: [
          { row: 2, email: 'john@example.com', name: 'John Doe', action: 'CREATE_USER', hasScores: true },
          { row: 3, email: 'jane@example.com', name: 'Jane Smith', action: 'UPDATE_USER', hasScores: false },
        ]
      });

      renderWithProviders();
      const input = document.querySelector('input[type="file"]');

      const file = new File(['test content'], 'employees.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        const uploadBtn = screen.getByRole('button', { name: /Preview Import/i });
        fireEvent.click(uploadBtn);
      });

      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
        expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      });
    });

    it('should show "Proceed with Import" button after preview', async () => {
      mockImportEmployees.mockResolvedValueOnce({
        results: {
          total: 2,
          usersCreated: 1,
          usersUpdated: 0,
          reviewsCreated: 0,
          reviewsUpdated: 0,
          skipped: 0,
          errors: []
        },
        preview: []
      });

      renderWithProviders();
      const input = document.querySelector('input[type="file"]');

      const file = new File(['test content'], 'employees.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        const uploadBtn = screen.getByRole('button', { name: /Preview Import/i });
        fireEvent.click(uploadBtn);
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Proceed with Import/i })).toBeInTheDocument();
      });
    });
  });

  describe('Import Process', () => {
    it('should show loading state during upload', async () => {
      // Mock importEmployees to never resolve
      mockImportEmployees.mockImplementation(() => new Promise(() => {}));

      renderWithProviders();

      // Disable preview mode for direct import
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      const input = document.querySelector('input[type="file"]');

      const file = new File(['test content'], 'employees.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        const uploadBtn = screen.getByRole('button', { name: /Upload and Import/i });
        fireEvent.click(uploadBtn);
      });

      await waitFor(() => {
        expect(screen.getByText(/Processing/i)).toBeInTheDocument();
      });
    });

    it('should display success results after import', async () => {
      mockImportEmployees.mockResolvedValueOnce({
        results: {
          total: 10,
          usersCreated: 8,
          usersUpdated: 2,
          reviewsCreated: 5,
          reviewsUpdated: 3,
          skipped: 0,
          errors: []
        }
      });

      renderWithProviders();

      // Disable preview mode
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      const input = document.querySelector('input[type="file"]');

      const file = new File(['test content'], 'employees.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        const uploadBtn = screen.getByRole('button', { name: /Upload and Import/i });
        fireEvent.click(uploadBtn);
      });

      await waitFor(() => {
        expect(screen.getByText(/Import Complete/i)).toBeInTheDocument();
      });

      // Check results summary
      expect(screen.getByText('10')).toBeInTheDocument(); // Total
      expect(screen.getByText('8')).toBeInTheDocument(); // Users Created
      expect(screen.getByText('5')).toBeInTheDocument(); // Reviews Created
    });

    it('should display errors from failed import', async () => {
      mockImportEmployees.mockResolvedValueOnce({
        results: {
          total: 10,
          usersCreated: 5,
          usersUpdated: 0,
          reviewsCreated: 2,
          reviewsUpdated: 0,
          skipped: 5,
          errors: [
            { row: 3, message: 'Invalid email format' },
            { row: 7, message: 'Invalid TOV level: X' }
          ]
        }
      });

      renderWithProviders();

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      const input = document.querySelector('input[type="file"]');

      const file = new File(['test content'], 'employees.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        const uploadBtn = screen.getByRole('button', { name: /Upload and Import/i });
        fireEvent.click(uploadBtn);
      });

      await waitFor(() => {
        expect(screen.getByText(/Invalid email format/i)).toBeInTheDocument();
        expect(screen.getByText(/Invalid TOV level/i)).toBeInTheDocument();
      });
    });

    it('should handle API errors', async () => {
      mockImportEmployees.mockRejectedValueOnce(new Error('File exceeds maximum of 1000 rows'));

      renderWithProviders();

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      const input = document.querySelector('input[type="file"]');

      const file = new File(['test content'], 'employees.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        const uploadBtn = screen.getByRole('button', { name: /Upload and Import/i });
        fireEvent.click(uploadBtn);
      });

      await waitFor(() => {
        expect(screen.getByText(/File exceeds maximum of 1000 rows/i)).toBeInTheDocument();
      });
    });

    it('should show Import Another File button after success', async () => {
      mockImportEmployees.mockResolvedValueOnce({
        results: {
          total: 10,
          usersCreated: 10,
          usersUpdated: 0,
          reviewsCreated: 5,
          reviewsUpdated: 0,
          skipped: 0,
          errors: []
        }
      });

      renderWithProviders();

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      const input = document.querySelector('input[type="file"]');

      const file = new File(['test content'], 'employees.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        const uploadBtn = screen.getByRole('button', { name: /Upload and Import/i });
        fireEvent.click(uploadBtn);
      });

      await waitFor(() => {
        expect(screen.getByText(/Import Another File/i)).toBeInTheDocument();
      });
    });
  });

  describe('API Integration', () => {
    it('should call adminApi.importEmployees with file and dryRun flag', async () => {
      mockImportEmployees.mockResolvedValueOnce({
        results: { total: 1, usersCreated: 1, usersUpdated: 0, reviewsCreated: 0, reviewsUpdated: 0, skipped: 0, errors: [] },
        preview: []
      });

      renderWithProviders();
      const input = document.querySelector('input[type="file"]');

      const file = new File(['test content'], 'employees.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        const uploadBtn = screen.getByRole('button', { name: /Preview Import/i });
        fireEvent.click(uploadBtn);
      });

      await waitFor(() => {
        expect(mockImportEmployees).toHaveBeenCalled();
        const callArgs = mockImportEmployees.mock.calls[0];
        expect(callArgs[0]).toBeInstanceOf(File);
        expect(callArgs[0].name).toBe('employees.xlsx');
      });
    });

    it('should send dryRun=true for preview', async () => {
      mockImportEmployees.mockResolvedValueOnce({
        results: { total: 1, usersCreated: 1, usersUpdated: 0, reviewsCreated: 0, reviewsUpdated: 0, skipped: 0, errors: [] },
        preview: []
      });

      renderWithProviders();
      const input = document.querySelector('input[type="file"]');

      const file = new File(['test content'], 'employees.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        const uploadBtn = screen.getByRole('button', { name: /Preview Import/i });
        fireEvent.click(uploadBtn);
      });

      await waitFor(() => {
        expect(mockImportEmployees).toHaveBeenCalledWith(expect.any(File), true);
      });
    });

    it('should send dryRun=false for actual import', async () => {
      mockImportEmployees.mockResolvedValueOnce({
        results: { total: 1, usersCreated: 1, usersUpdated: 0, reviewsCreated: 0, reviewsUpdated: 0, skipped: 0, errors: [] }
      });

      renderWithProviders();

      // Disable preview mode
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      const input = document.querySelector('input[type="file"]');

      const file = new File(['test content'], 'employees.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        const uploadBtn = screen.getByRole('button', { name: /Upload and Import/i });
        fireEvent.click(uploadBtn);
      });

      await waitFor(() => {
        expect(mockImportEmployees).toHaveBeenCalledWith(expect.any(File), false);
      });
    });
  });

  describe('Network and Error Handling', () => {
    it('should handle network timeout errors', async () => {
      mockImportEmployees.mockRejectedValueOnce(new Error('Network timeout'));

      renderWithProviders();
      const input = document.querySelector('input[type="file"]');

      const file = new File(['test content'], 'employees.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        const uploadBtn = screen.getByRole('button', { name: /Preview Import/i });
        fireEvent.click(uploadBtn);
      });

      await waitFor(() => {
        expect(screen.getByText(/Network timeout/i)).toBeInTheDocument();
      });
    });

    it('should handle network fetch failures', async () => {
      mockImportEmployees.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      renderWithProviders();
      const input = document.querySelector('input[type="file"]');

      const file = new File(['test content'], 'employees.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        const uploadBtn = screen.getByRole('button', { name: /Preview Import/i });
        fireEvent.click(uploadBtn);
      });

      await waitFor(() => {
        expect(screen.getByText(/Failed to fetch/i)).toBeInTheDocument();
      });
    });
  });

  describe('Double-Submission Prevention', () => {
    it('should disable upload button during upload', async () => {
      // Mock importEmployees to never resolve to keep isUploading=true
      mockImportEmployees.mockImplementation(() => new Promise(() => {}));

      renderWithProviders();
      const input = document.querySelector('input[type="file"]');

      const file = new File(['test content'], 'employees.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        const uploadBtn = screen.getByRole('button', { name: /Preview Import/i });
        expect(uploadBtn).not.toBeDisabled();
        fireEvent.click(uploadBtn);
      });

      // After clicking, the button should be disabled
      await waitFor(() => {
        const processingText = screen.getByText(/Processing/i);
        expect(processingText).toBeInTheDocument();
        // The button containing "Processing" should be disabled
        const uploadBtn = processingText.closest('button');
        expect(uploadBtn).toBeDisabled();
      });
    });

    it('should disable file input during upload', async () => {
      mockImportEmployees.mockImplementation(() => new Promise(() => {}));

      renderWithProviders();
      const input = document.querySelector('input[type="file"]');

      const file = new File(['test content'], 'employees.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        const uploadBtn = screen.getByRole('button', { name: /Preview Import/i });
        fireEvent.click(uploadBtn);
      });

      await waitFor(() => {
        const fileInput = document.querySelector('input[type="file"]');
        expect(fileInput).toBeDisabled();
      });
    });

    it('should disable remove button during upload', async () => {
      mockImportEmployees.mockImplementation(() => new Promise(() => {}));

      renderWithProviders();
      const input = document.querySelector('input[type="file"]');

      const file = new File(['test content'], 'employees.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('Remove')).toBeInTheDocument();
      });

      const uploadBtn = screen.getByRole('button', { name: /Preview Import/i });
      fireEvent.click(uploadBtn);

      await waitFor(() => {
        const removeBtn = screen.getByText('Remove');
        expect(removeBtn.closest('button')).toBeDisabled();
      });
    });

    it('should disable checkbox during upload', async () => {
      mockImportEmployees.mockImplementation(() => new Promise(() => {}));

      renderWithProviders();
      const input = document.querySelector('input[type="file"]');

      const file = new File(['test content'], 'employees.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      fireEvent.change(input, { target: { files: [file] } });

      const uploadBtn = screen.getByRole('button', { name: /Preview Import/i });
      fireEvent.click(uploadBtn);

      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).toBeDisabled();
      });
    });
  });

  describe('File Type Validation Error Display', () => {
    it('should show error message for PDF files', async () => {
      renderWithProviders();
      const input = document.querySelector('input[type="file"]');

      const file = new File(['test content'], 'employees.pdf', { type: 'application/pdf' });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/Invalid file type/i)).toBeInTheDocument();
      });
    });

    it('should show error message for image files', async () => {
      renderWithProviders();
      const input = document.querySelector('input[type="file"]');

      const file = new File(['test content'], 'employees.png', { type: 'image/png' });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/Invalid file type/i)).toBeInTheDocument();
      });
    });

    it('should show error message for JSON files', async () => {
      renderWithProviders();
      const input = document.querySelector('input[type="file"]');

      const file = new File(['{}'], 'employees.json', { type: 'application/json' });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/Invalid file type/i)).toBeInTheDocument();
      });
    });

    it('should clear file selection when invalid file type is selected', async () => {
      renderWithProviders();
      const input = document.querySelector('input[type="file"]');

      const file = new File(['test content'], 'employees.txt', { type: 'text/plain' });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/Invalid file type/i)).toBeInTheDocument();
        // The upload button should still be disabled since file was rejected
        const uploadBtn = screen.getByRole('button', { name: /Preview Import/i });
        expect(uploadBtn).toBeDisabled();
      });
    });

    it('should clear error when valid file is selected after invalid file', async () => {
      renderWithProviders();
      const input = document.querySelector('input[type="file"]');

      // First, select invalid file
      const invalidFile = new File(['test content'], 'employees.txt', { type: 'text/plain' });
      fireEvent.change(input, { target: { files: [invalidFile] } });

      await waitFor(() => {
        expect(screen.getByText(/Invalid file type/i)).toBeInTheDocument();
      });

      // Then select valid file
      const validFile = new File(['test content'], 'employees.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      fireEvent.change(input, { target: { files: [validFile] } });

      await waitFor(() => {
        expect(screen.queryByText(/Invalid file type/i)).not.toBeInTheDocument();
        expect(screen.getByText('employees.xlsx')).toBeInTheDocument();
      });
    });

    it('should display server-side file type validation error', async () => {
      mockImportEmployees.mockRejectedValueOnce(new Error('Invalid file type. Only Excel and CSV files are allowed.'));

      renderWithProviders();
      const input = document.querySelector('input[type="file"]');

      // Select a file that passes client validation but fails server validation
      const file = new File(['test content'], 'employees.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        const uploadBtn = screen.getByRole('button', { name: /Preview Import/i });
        fireEvent.click(uploadBtn);
      });

      await waitFor(() => {
        expect(screen.getByText(/Invalid file type. Only Excel and CSV files are allowed./i)).toBeInTheDocument();
      });
    });
  });

  describe('Download Error Report', () => {
    it('should show download error report button when there are errors in preview', async () => {
      mockImportEmployees.mockResolvedValueOnce({
        results: {
          total: 5,
          usersCreated: 2,
          usersUpdated: 0,
          reviewsCreated: 1,
          reviewsUpdated: 0,
          skipped: 3,
          errors: [
            { row: 2, message: 'Invalid email format' },
            { row: 4, message: 'Invalid TOV level: X' }
          ]
        },
        preview: []
      });

      renderWithProviders();
      const input = document.querySelector('input[type="file"]');

      const file = new File(['test content'], 'employees.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        const uploadBtn = screen.getByRole('button', { name: /Preview Import/i });
        fireEvent.click(uploadBtn);
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Download Error Report/i })).toBeInTheDocument();
      });
    });

    it('should show download error report button when there are errors after import', async () => {
      mockImportEmployees.mockResolvedValueOnce({
        results: {
          total: 5,
          usersCreated: 2,
          usersUpdated: 0,
          reviewsCreated: 1,
          reviewsUpdated: 0,
          skipped: 3,
          errors: [
            { row: 2, message: 'Invalid email format' },
            { row: 4, message: 'Invalid TOV level: X' }
          ]
        }
      });

      renderWithProviders();

      // Disable preview mode
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      const input = document.querySelector('input[type="file"]');

      const file = new File(['test content'], 'employees.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        const uploadBtn = screen.getByRole('button', { name: /Upload and Import/i });
        fireEvent.click(uploadBtn);
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Download Error Report/i })).toBeInTheDocument();
      });
    });

    it('should not show download error report button when there are no errors', async () => {
      mockImportEmployees.mockResolvedValueOnce({
        results: {
          total: 5,
          usersCreated: 5,
          usersUpdated: 0,
          reviewsCreated: 2,
          reviewsUpdated: 0,
          skipped: 0,
          errors: []
        },
        preview: []
      });

      renderWithProviders();
      const input = document.querySelector('input[type="file"]');

      const file = new File(['test content'], 'employees.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        const uploadBtn = screen.getByRole('button', { name: /Preview Import/i });
        fireEvent.click(uploadBtn);
      });

      await waitFor(() => {
        expect(screen.getByText(/Preview Results/i)).toBeInTheDocument();
      });

      // The download button should not be present
      expect(screen.queryByRole('button', { name: /Download Error Report/i })).not.toBeInTheDocument();
    });

    it('should trigger download when download error report button is clicked', async () => {
      // Mock URL.createObjectURL and URL.revokeObjectURL
      const mockCreateObjectURL = vi.fn(() => 'blob:test-url');
      const mockRevokeObjectURL = vi.fn();
      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = mockRevokeObjectURL;

      // Mock anchor element click
      const mockClick = vi.fn();
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        const element = originalCreateElement(tag);
        if (tag === 'a') {
          element.click = mockClick;
        }
        return element;
      });

      mockImportEmployees.mockResolvedValueOnce({
        results: {
          total: 5,
          usersCreated: 2,
          usersUpdated: 0,
          reviewsCreated: 1,
          reviewsUpdated: 0,
          skipped: 3,
          errors: [
            { row: 2, message: 'Invalid email format' },
            { row: 4, message: 'Invalid TOV level: X' }
          ]
        },
        preview: []
      });

      renderWithProviders();
      const input = document.querySelector('input[type="file"]');

      const file = new File(['test content'], 'employees.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        const uploadBtn = screen.getByRole('button', { name: /Preview Import/i });
        fireEvent.click(uploadBtn);
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Download Error Report/i })).toBeInTheDocument();
      });

      const downloadBtn = screen.getByRole('button', { name: /Download Error Report/i });
      fireEvent.click(downloadBtn);

      // Verify blob was created and download was triggered
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();

      // Cleanup
      vi.restoreAllMocks();
    });

    it('should display errors in error table with row numbers', async () => {
      mockImportEmployees.mockResolvedValueOnce({
        results: {
          total: 5,
          usersCreated: 2,
          usersUpdated: 0,
          reviewsCreated: 1,
          reviewsUpdated: 0,
          skipped: 3,
          errors: [
            { row: 2, message: 'Invalid email format' },
            { row: 4, message: 'Missing required field: Email' },
            { row: 7, message: 'Invalid TOV level: Z' }
          ]
        },
        preview: []
      });

      renderWithProviders();
      const input = document.querySelector('input[type="file"]');

      const file = new File(['test content'], 'employees.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        const uploadBtn = screen.getByRole('button', { name: /Preview Import/i });
        fireEvent.click(uploadBtn);
      });

      await waitFor(() => {
        expect(screen.getByText('Errors (3)')).toBeInTheDocument();
        expect(screen.getByText('Invalid email format')).toBeInTheDocument();
        expect(screen.getByText('Missing required field: Email')).toBeInTheDocument();
        expect(screen.getByText('Invalid TOV level: Z')).toBeInTheDocument();
      });
    });
  });
});
