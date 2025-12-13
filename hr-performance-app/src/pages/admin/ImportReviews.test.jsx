import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImportReviews } from './ImportReviews';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { BrowserRouter } from 'react-router-dom';

// Bug #56: Excel import error - regression test
// This test ensures file upload and import functionality works correctly

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock import.meta.env
vi.mock('../../services/api', () => ({
  apiClient: {
    accessToken: 'mock-token'
  }
}));

const renderWithProviders = () => {
  return render(
    <BrowserRouter>
      <LanguageProvider>
        <ImportReviews />
      </LanguageProvider>
    </BrowserRouter>
  );
};

describe('ImportReviews', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Page Rendering', () => {
    it('should render page title', () => {
      renderWithProviders();
      expect(screen.getByText(/Import Historical Reviews/i)).toBeInTheDocument();
    });

    it('should render instructions card', () => {
      renderWithProviders();
      expect(screen.getByText(/File Format Requirements/i)).toBeInTheDocument();
    });

    it('should render file upload section', () => {
      renderWithProviders();
      expect(screen.getByText(/Select File/i)).toBeInTheDocument();
    });

    it('should render upload button', () => {
      renderWithProviders();
      expect(screen.getByRole('button', { name: /Upload and Import/i })).toBeInTheDocument();
    });
  });

  describe('File Selection', () => {
    it('should accept xlsx files', () => {
      renderWithProviders();
      const input = document.querySelector('input[type="file"]');
      expect(input).toBeInTheDocument();
      expect(input.accept).toBe('.xlsx,.xls,.csv');
    });

    it('should show selected file name', async () => {
      renderWithProviders();
      const input = document.querySelector('input[type="file"]');

      const file = new File(['test content'], 'reviews.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('reviews.xlsx')).toBeInTheDocument();
      });
    });

    it('should show file size in KB', async () => {
      renderWithProviders();
      const input = document.querySelector('input[type="file"]');

      const file = new File(['test content'], 'reviews.xlsx', {
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

      const file = new File(['test content'], 'reviews.txt', { type: 'text/plain' });

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

      const file = new File(['test content'], 'reviews.xlsx', {
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

      const file = new File(['test content'], 'reviews.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('reviews.xlsx')).toBeInTheDocument();
      });

      // Click remove
      fireEvent.click(screen.getByText('Remove'));

      await waitFor(() => {
        expect(screen.queryByText('reviews.xlsx')).not.toBeInTheDocument();
      });
    });
  });

  describe('Upload Button State', () => {
    it('should be disabled when no file selected', () => {
      renderWithProviders();
      const uploadBtn = screen.getByRole('button', { name: /Upload and Import/i });
      expect(uploadBtn).toBeDisabled();
    });

    it('should be enabled when file is selected', async () => {
      renderWithProviders();
      const input = document.querySelector('input[type="file"]');

      const file = new File(['test content'], 'reviews.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        const uploadBtn = screen.getByRole('button', { name: /Upload and Import/i });
        expect(uploadBtn).not.toBeDisabled();
      });
    });
  });

  describe('Upload Process', () => {
    it('should show loading state during upload', async () => {
      // Mock fetch to never resolve
      mockFetch.mockImplementation(() => new Promise(() => {}));

      renderWithProviders();
      const input = document.querySelector('input[type="file"]');

      const file = new File(['test content'], 'reviews.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        const uploadBtn = screen.getByRole('button', { name: /Upload and Import/i });
        fireEvent.click(uploadBtn);
      });

      await waitFor(() => {
        expect(screen.getByText(/Uploading/i)).toBeInTheDocument();
      });
    });

    it('should display success results after upload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          results: {
            total: 10,
            created: 8,
            updated: 2,
            skipped: 0,
            errors: []
          }
        })
      });

      renderWithProviders();
      const input = document.querySelector('input[type="file"]');

      const file = new File(['test content'], 'reviews.xlsx', {
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
      expect(screen.getByText('8')).toBeInTheDocument(); // Created
      expect(screen.getByText('2')).toBeInTheDocument(); // Updated
    });

    it('should display errors from failed import', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          results: {
            total: 10,
            created: 5,
            updated: 0,
            skipped: 5,
            errors: [
              { row: 3, message: 'Invalid email format' },
              { row: 7, message: 'Missing required field' }
            ]
          }
        })
      });

      renderWithProviders();
      const input = document.querySelector('input[type="file"]');

      const file = new File(['test content'], 'reviews.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        const uploadBtn = screen.getByRole('button', { name: /Upload and Import/i });
        fireEvent.click(uploadBtn);
      });

      await waitFor(() => {
        expect(screen.getByText(/Invalid email format/i)).toBeInTheDocument();
        expect(screen.getByText(/Missing required field/i)).toBeInTheDocument();
      });
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          error: { message: 'Server error' }
        })
      });

      renderWithProviders();
      const input = document.querySelector('input[type="file"]');

      const file = new File(['test content'], 'reviews.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        const uploadBtn = screen.getByRole('button', { name: /Upload and Import/i });
        fireEvent.click(uploadBtn);
      });

      await waitFor(() => {
        expect(screen.getByText(/Server error/i)).toBeInTheDocument();
      });
    });

    it('should show Import Another File button after success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          results: {
            total: 10,
            created: 10,
            updated: 0,
            skipped: 0,
            errors: []
          }
        })
      });

      renderWithProviders();
      const input = document.querySelector('input[type="file"]');

      const file = new File(['test content'], 'reviews.xlsx', {
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

  describe('File Input', () => {
    it('should call API with FormData containing file', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          results: { total: 1, created: 1, updated: 0, skipped: 0, errors: [] }
        })
      });

      renderWithProviders();
      const input = document.querySelector('input[type="file"]');

      const file = new File(['test content'], 'reviews.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        const uploadBtn = screen.getByRole('button', { name: /Upload and Import/i });
        fireEvent.click(uploadBtn);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
        const callArgs = mockFetch.mock.calls[0];
        expect(callArgs[0]).toContain('/admin/reviews/import');
        expect(callArgs[1].method).toBe('POST');
        expect(callArgs[1].body).toBeInstanceOf(FormData);
      });
    });

    it('should include authorization header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          results: { total: 1, created: 1, updated: 0, skipped: 0, errors: [] }
        })
      });

      renderWithProviders();
      const input = document.querySelector('input[type="file"]');

      const file = new File(['test content'], 'reviews.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        const uploadBtn = screen.getByRole('button', { name: /Upload and Import/i });
        fireEvent.click(uploadBtn);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
        const callArgs = mockFetch.mock.calls[0];
        expect(callArgs[1].headers['Authorization']).toBe('Bearer mock-token');
      });
    });
  });
});
