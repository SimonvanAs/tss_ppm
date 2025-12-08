import { render } from '@testing-library/react';
import { LanguageProvider } from '../contexts/LanguageContext';
import { FormProvider } from '../contexts/FormContext';
import { WhisperProvider } from '../contexts/WhisperContext';

const AllTheProviders = ({ children }) => {
  return (
    <LanguageProvider>
      <WhisperProvider>
        <FormProvider>
          {children}
        </FormProvider>
      </WhisperProvider>
    </LanguageProvider>
  );
};

const customRender = (ui, options) =>
  render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react';

// Override render method
export { customRender as render };
