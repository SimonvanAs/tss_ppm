import { LanguageProvider } from './contexts/LanguageContext';
import { FormProvider } from './contexts/FormContext';
import { Header } from './components/Header';
import { StorageWarning } from './components/StorageWarning';
import { EmployeeInfo } from './components/EmployeeInfo';
import { SummarySection } from './components/SummarySection';
import { WhatAxis } from './components/WhatAxis';
import { HowAxis } from './components/HowAxis';
import { PerformanceGrid } from './components/PerformanceGrid';
import { SelfAssessment } from './components/SelfAssessment';
import { Comments } from './components/Comments';
import { Actions } from './components/Actions';
import './App.css';

function App() {
  return (
    <LanguageProvider>
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
        </div>
      </FormProvider>
    </LanguageProvider>
  );
}

export default App;
