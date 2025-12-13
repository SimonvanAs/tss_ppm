import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render as testRender, screen, fireEvent, waitFor } from '../test/test-utils';
import { render as rtlRender } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../contexts/LanguageContext';
import { FormProvider } from '../contexts/FormContext';
import { WhisperContext } from '../contexts/WhisperContext';
import AuthContext from '../contexts/AuthContext';
import { EmployeeInfo } from './EmployeeInfo';
import { adminApi } from '../services/api';

// Mock the adminApi
vi.mock('../services/api', () => ({
  adminApi: {
    getFunctionTitles: vi.fn(),
    getTovLevels: vi.fn(),
  },
}));

// Custom render with employee role (non-HR)
const renderWithEmployeeRole = (ui) => {
  const mockAuthValue = {
    user: { id: 'emp-1', email: 'emp@test.com', displayName: 'Employee', role: 'EMPLOYEE' },
    isLoading: false,
    isAuthenticated: true,
    error: null,
    login: async () => {},
    logout: async () => {},
    getAccessToken: async () => 'mock-token',
    hasRole: (role) => role === 'EMPLOYEE',
    hasMinRole: (role) => role === 'EMPLOYEE', // Only EMPLOYEE role
    hasRoles: () => false,
  };

  const mockWhisperValue = {
    activeBackend: 'server',
    isDetectingBackend: false,
    setActiveBackend: () => {},
    isModelLoading: false,
    modelLoadProgress: 0,
    modelLoadStatus: '',
    isModelReady: false,
    modelBackend: null,
    modelError: null,
    loadModel: async () => null,
    preloadModel: () => {},
    transcribe: async () => ''
  };

  return rtlRender(
    <MemoryRouter>
      <AuthContext.Provider value={mockAuthValue}>
        <LanguageProvider>
          <WhisperContext.Provider value={mockWhisperValue}>
            <FormProvider>{ui}</FormProvider>
          </WhisperContext.Provider>
        </LanguageProvider>
      </AuthContext.Provider>
    </MemoryRouter>
  );
};

// Use the standard test render for most tests (default MANAGER role)
const render = testRender;

// Mock function titles data
const mockFunctionTitles = [
  { id: 'ft-1', name: 'Software Engineer', tovLevelId: 'tov-b', tovLevel: { code: 'B', name: 'Professional' } },
  { id: 'ft-2', name: 'Senior Developer', tovLevelId: 'tov-c', tovLevel: { code: 'C', name: 'Senior' } },
  { id: 'ft-3', name: 'Intern', tovLevelId: null, tovLevel: null }, // No mapping
];

// Mock TOV levels data
const mockTovLevels = [
  { id: 'tov-a', code: 'A', name: 'Entry' },
  { id: 'tov-b', code: 'B', name: 'Professional' },
  { id: 'tov-c', code: 'C', name: 'Senior' },
  { id: 'tov-d', code: 'D', name: 'Lead' },
];

describe('EmployeeInfo', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    adminApi.getFunctionTitles.mockResolvedValue({ functionTitles: mockFunctionTitles });
    adminApi.getTovLevels.mockResolvedValue({ tovLevels: mockTovLevels });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render all employee info fields', async () => {
    render(<EmployeeInfo />);

    expect(screen.getByLabelText(/employee name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/function title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/business unit/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ide-level/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/review date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/manager/i)).toBeInTheDocument();
  });

  it('should render function title dropdown with options', async () => {
    render(<EmployeeInfo />);

    // Wait for function titles to load
    await waitFor(() => {
      expect(screen.getByRole('option', { name: /Software Engineer/i })).toBeInTheDocument();
    });

    expect(screen.getByRole('option', { name: /Senior Developer/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Intern/i })).toBeInTheDocument();
  });

  it('should show TOV level in function title options when mapped', async () => {
    render(<EmployeeInfo />);

    await waitFor(() => {
      // Check that TOV level code is shown in the option
      expect(screen.getByRole('option', { name: /Software Engineer \(B\)/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Senior Developer \(C\)/i })).toBeInTheDocument();
    });
  });

  it('should render section title', () => {
    render(<EmployeeInfo />);

    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });

  it('should show required field indicators', () => {
    render(<EmployeeInfo />);

    // Check for asterisks indicating required fields
    const labels = screen.getAllByText(/\*/);
    expect(labels.length).toBeGreaterThan(0);
  });

  it('should render voice input indicators', () => {
    render(<EmployeeInfo />);

    // Voice input components should be present (may be buttons or spans depending on browser support)
    const voiceElements = document.querySelectorAll('.input-with-voice');
    expect(voiceElements.length).toBeGreaterThan(0);
  });

  it('should have date input for review date', () => {
    render(<EmployeeInfo />);

    const dateInput = screen.getByLabelText(/review date/i);
    expect(dateInput).toHaveAttribute('type', 'date');
  });

  it('should load function titles and TOV levels on mount', async () => {
    render(<EmployeeInfo />);

    await waitFor(() => {
      expect(adminApi.getFunctionTitles).toHaveBeenCalled();
      expect(adminApi.getTovLevels).toHaveBeenCalled();
    });
  });

  it('should show loading state while fetching data', async () => {
    // Make the API call take some time
    adminApi.getFunctionTitles.mockImplementation(() => new Promise((resolve) => {
      setTimeout(() => resolve({ functionTitles: mockFunctionTitles }), 100);
    }));

    render(<EmployeeInfo />);

    // Should show loading option initially
    expect(screen.getByRole('option', { name: /loading/i })).toBeInTheDocument();

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByRole('option', { name: /Software Engineer/i })).toBeInTheDocument();
    });
  });

  it('should show warning for function titles without TOV level mapping (non-HR user)', async () => {
    // Use employee role (non-HR) to test warning display
    renderWithEmployeeRole(<EmployeeInfo />);

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /Intern/i })).toBeInTheDocument();
    });

    // Select the function title without mapping
    const functionTitleSelect = screen.getByLabelText(/function title/i);
    fireEvent.change(functionTitleSelect, { target: { value: 'ft-3' } });

    // Should show warning and allow TOV level selection
    await waitFor(() => {
      expect(screen.getByText(/no.*mapping/i)).toBeInTheDocument();
    });

    // Non-HR user should still be able to select TOV level when no mapping
    const tovLevelSelect = screen.getByLabelText(/ide-level/i);
    expect(tovLevelSelect.tagName).toBe('SELECT');
  });

  it('should display error message when API fails and still render form', async () => {
    // Mock API failure
    adminApi.getFunctionTitles.mockRejectedValue(new Error('Network error'));
    adminApi.getTovLevels.mockRejectedValue(new Error('Network error'));

    render(<EmployeeInfo />);

    // Wait for the error to be displayed
    await waitFor(() => {
      expect(screen.getByText(/failed to load function titles/i)).toBeInTheDocument();
    });

    // Form should still render and be functional
    expect(screen.getByLabelText(/employee name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/function title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/business unit/i)).toBeInTheDocument();

    // User should still be able to interact with the form
    const nameInput = screen.getByLabelText(/employee name/i);
    fireEvent.change(nameInput, { target: { value: 'Test Employee' } });
    expect(nameInput.value).toBe('Test Employee');
  });

  it('should show auto-applied badge when function title with TOV mapping is selected', async () => {
    render(<EmployeeInfo />);

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /Software Engineer/i })).toBeInTheDocument();
    });

    // Select function title with TOV level mapping
    const functionTitleSelect = screen.getByLabelText(/function title/i);
    fireEvent.change(functionTitleSelect, { target: { value: 'ft-1' } });

    // Should show auto-applied badge
    await waitFor(() => {
      expect(screen.getByText(/auto-applied/i)).toBeInTheDocument();
    });
  });

  it('should hide auto-applied badge when TOV level is manually changed', async () => {
    render(<EmployeeInfo />);

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /Software Engineer/i })).toBeInTheDocument();
    });

    // Select function title with TOV level mapping
    const functionTitleSelect = screen.getByLabelText(/function title/i);
    fireEvent.change(functionTitleSelect, { target: { value: 'ft-1' } });

    // Verify auto-applied badge appears
    await waitFor(() => {
      expect(screen.getByText(/auto-applied/i)).toBeInTheDocument();
    });

    // Manually change TOV level
    const tovLevelSelect = screen.getByLabelText(/ide-level/i);
    fireEvent.change(tovLevelSelect, { target: { value: 'C' } });

    // Badge should disappear after manual change
    await waitFor(() => {
      expect(screen.queryByText(/auto-applied/i)).not.toBeInTheDocument();
    });
  });
});

// Custom render with HR role for manual TOV override test
const renderWithHRRole = (ui) => {
  const mockAuthValue = {
    user: { id: 'hr-1', email: 'hr@test.com', displayName: 'HR Manager', role: 'HR' },
    isLoading: false,
    isAuthenticated: true,
    error: null,
    login: async () => {},
    logout: async () => {},
    getAccessToken: async () => 'mock-token',
    hasRole: (role) => role === 'HR' || role === 'MANAGER' || role === 'EMPLOYEE',
    hasMinRole: (role) => ['EMPLOYEE', 'MANAGER', 'HR'].includes(role),
    hasRoles: () => false,
  };

  const mockWhisperValue = {
    activeBackend: 'server',
    isDetectingBackend: false,
    setActiveBackend: () => {},
    isModelLoading: false,
    modelLoadProgress: 0,
    modelLoadStatus: '',
    isModelReady: false,
    modelBackend: null,
    modelError: null,
    loadModel: async () => null,
    preloadModel: () => {},
    transcribe: async () => ''
  };

  return rtlRender(
    <MemoryRouter>
      <AuthContext.Provider value={mockAuthValue}>
        <LanguageProvider>
          <WhisperContext.Provider value={mockWhisperValue}>
            <FormProvider>{ui}</FormProvider>
          </WhisperContext.Provider>
        </LanguageProvider>
      </AuthContext.Provider>
    </MemoryRouter>
  );
};

describe('EmployeeInfo - HR/Admin TOV Override', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminApi.getFunctionTitles.mockResolvedValue({ functionTitles: mockFunctionTitles });
    adminApi.getTovLevels.mockResolvedValue({ tovLevels: mockTovLevels });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should allow HR user to manually override auto-applied TOV level', async () => {
    renderWithHRRole(<EmployeeInfo />);

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /Software Engineer/i })).toBeInTheDocument();
    });

    // Select function title with TOV level mapping (B - Professional)
    const functionTitleSelect = screen.getByLabelText(/function title/i);
    fireEvent.change(functionTitleSelect, { target: { value: 'ft-1' } });

    // Verify auto-applied badge appears
    await waitFor(() => {
      expect(screen.getByText(/auto-applied/i)).toBeInTheDocument();
    });

    // HR user should see the TOV level dropdown (not read-only)
    const tovLevelSelect = screen.getByLabelText(/ide-level/i);
    expect(tovLevelSelect.tagName).toBe('SELECT');

    // Verify TOV level is set to B (auto-applied)
    expect(tovLevelSelect.value).toBe('B');

    // Manually change TOV level to C (override)
    fireEvent.change(tovLevelSelect, { target: { value: 'C' } });

    // Badge should disappear after manual override
    await waitFor(() => {
      expect(screen.queryByText(/auto-applied/i)).not.toBeInTheDocument();
    });

    // Verify the new value is set
    expect(tovLevelSelect.value).toBe('C');
  });

  it('should show TOV level dropdown for HR users even with mapped function title', async () => {
    renderWithHRRole(<EmployeeInfo />);

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /Software Engineer/i })).toBeInTheDocument();
    });

    // Select function title with TOV level mapping
    const functionTitleSelect = screen.getByLabelText(/function title/i);
    fireEvent.change(functionTitleSelect, { target: { value: 'ft-1' } });

    // HR user should see dropdown with all TOV level options
    await waitFor(() => {
      const tovLevelSelect = screen.getByLabelText(/ide-level/i);
      expect(tovLevelSelect.tagName).toBe('SELECT');

      // Verify all TOV level options are available
      expect(screen.getByRole('option', { name: /A - Entry/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /B - Professional/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /C - Senior/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /D - Lead/i })).toBeInTheDocument();
    });
  });
});
