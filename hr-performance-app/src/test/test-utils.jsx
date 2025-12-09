import { render } from '@testing-library/react';
import { createContext } from 'react';
import { LanguageProvider } from '../contexts/LanguageContext';
import { FormProvider } from '../contexts/FormContext';

// Import the actual WhisperContext to use the same context object
import { WhisperContext } from '../contexts/WhisperContext';

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

const AllTheProviders = ({ children }) => {
  return (
    <LanguageProvider>
      <MockWhisperProvider>
        <FormProvider>
          {children}
        </FormProvider>
      </MockWhisperProvider>
    </LanguageProvider>
  );
};

const customRender = (ui, options) =>
  render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react';

// Override render method
export { customRender as render };
