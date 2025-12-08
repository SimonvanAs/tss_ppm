import { useState } from 'react';
import { LanguageProvider } from './contexts/LanguageContext';
import { FormProvider } from './contexts/FormContext';
import { WhisperProvider } from './contexts/WhisperContext';
import { Header } from './components/Header';
import { StorageWarning } from './components/StorageWarning';
import { WhisperLoadingBanner } from './components/WhisperLoadingBanner';
import { EmployeeInfo } from './components/EmployeeInfo';
import { SummarySection } from './components/SummarySection';
import { WhatAxis } from './components/WhatAxis';
import { HowAxis } from './components/HowAxis';
import { PerformanceGrid } from './components/PerformanceGrid';
import { SelfAssessment } from './components/SelfAssessment';
import { Comments } from './components/Comments';
import { Actions } from './components/Actions';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import './App.css';

function App() {
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);

  if (showPrivacyPolicy) {
    return (
      <LanguageProvider>
        <PrivacyPolicy onBack={() => setShowPrivacyPolicy(false)} />
      </LanguageProvider>
    );
  }

  return (
    <LanguageProvider>
      <WhisperProvider>
        <FormProvider>
          <div className="app">
            <StorageWarning />
            <Header />
            <main className="main-content">
              <EmployeeInfo />
              <SummarySection />
              <WhatAxis />
              <HowAxis />
              <PerformanceGrid />
              <SelfAssessment />
              <Comments />
              <Actions />
            </main>
            <footer className="app-footer">
              <span className="app-footer-ai">🤖 Made with AI assistance</span>
              <div className="app-footer-links">
                <button
                  className="app-footer-link privacy-link"
                  onClick={() => setShowPrivacyPolicy(true)}
                >
                  Privacy Policy
                </button>
                <span className="app-footer-separator">|</span>
                <a
                  href="https://github.com/SimonvanAs/tss_ppm"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="app-footer-link"
                >
                  View source code on GitHub
                </a>
              </div>
            </footer>
            <WhisperLoadingBanner />
          </div>
        </FormProvider>
      </WhisperProvider>
    </LanguageProvider>
  );
}

export default App;
