import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../contexts/LanguageContext';
import { FormProvider } from '../contexts/FormContext';

// Import the actual contexts to use the same context objects
import { WhisperContext } from '../contexts/WhisperContext';
import AuthContext from '../contexts/AuthContext';

// Mock AuthProvider to avoid Keycloak initialization in tests
const MockAuthProvider = ({ children }) => {
  const mockValue = {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      displayName: 'Test User',
      firstName: 'Test',
      lastName: 'User',
      role: 'MANAGER',
      opcoId: 'test-opco-id',
    },
    isLoading: false,
    isAuthenticated: true,
    error: null,
    login: async () => {},
    logout: async () => {},
    getAccessToken: async () => 'mock-token',
    hasRole: (role) => role === 'MANAGER' || role === 'EMPLOYEE',
    hasMinRole: () => true,
    hasRoles: () => true,
  };

  return (
    <AuthContext.Provider value={mockValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Mock WhisperProvider to avoid async model loading in tests
const MockWhisperProvider = ({ children }) => {
  const mockValue = {
    // Backend state - set to server to prevent model loading
    activeBackend: 'server',
    isDetectingBackend: false,
    setActiveBackend: () => {},

    // Model state
    isModelLoading: false,
    modelLoadProgress: 0,
    modelLoadStatus: '',
    isModelReady: false,
    modelBackend: null,
    modelError: null,

    // Actions (no-ops for tests)
    loadModel: async () => null,
    preloadModel: () => {},
    transcribe: async () => ''
  };

  return (
    <WhisperContext.Provider value={mockValue}>
      {children}
    </WhisperContext.Provider>
  );
};

const AllTheProviders = ({ children, initialEntries = ['/'] }) => {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <MockAuthProvider>
        <LanguageProvider>
          <MockWhisperProvider>
            <FormProvider>
              {children}
            </FormProvider>
          </MockWhisperProvider>
        </LanguageProvider>
      </MockAuthProvider>
    </MemoryRouter>
  );
};

const customRender = (ui, options) =>
  render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react';

// Override render method
export { customRender as render };
