import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { FormProvider } from './contexts/FormContext';
import { WhisperProvider } from './contexts/WhisperContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { WhisperLoadingBanner } from './components/WhisperLoadingBanner';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import {
  MyReviews,
  NewReview,
  ReviewForm,
  TeamOverview,
  Approvals,
  HRDashboard,
  AllReviews,
  HistoryDashboard,
  AnalyticsDashboard,
  CalibrationList,
  CalibrationSession,
  CalibrationReport,
  AdminLayout,
  AdminDashboard,
  UserManagement,
  OrgChart,
  TeamsManagement,
  FunctionTitles,
  TovLevels,
  Competencies,
  OpCoManagement,
  GlobalDashboard,
  ImportReviews,
  ImportEmployees,
  StartNewYear,
  WorkflowSettings,
  BrandingSettings,
} from './pages';
import './App.css';
import './styles/accessibility.css';

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <img src="/TSS_logo.png" alt="Total Specific Solutions" className="loading-logo" />
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    </div>
  );
}

function AuthErrorScreen({ error, onRetry }) {
  return (
    <div className="error-screen">
      <div className="error-content">
        <img src="/TSS_logo.png" alt="Total Specific Solutions" className="error-logo" />
        <h2>Authentication Error</h2>
        <p>{error || 'An error occurred during authentication.'}</p>
        <button onClick={onRetry} className="retry-button">
          Try Again
        </button>
      </div>
    </div>
  );
}

// Page wrapper with footer
function PageWrapper({ children, showNav = true }) {
  const navigate = useNavigate();

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Header />
      {showNav && <Navigation />}
      <main id="main-content" className="main-content">
        {children}
      </main>
      <footer className="app-footer" role="contentinfo">
        <span className="app-footer-ai">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
            <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13A2.5 2.5 0 0 0 5 15.5 2.5 2.5 0 0 0 7.5 18a2.5 2.5 0 0 0 2.5-2.5A2.5 2.5 0 0 0 7.5 13m9 0a2.5 2.5 0 0 0-2.5 2.5 2.5 2.5 0 0 0 2.5 2.5 2.5 2.5 0 0 0 2.5-2.5 2.5 2.5 0 0 0-2.5-2.5z"/>
          </svg>
          <span>Made with AI assistance</span>
        </span>
        <div className="app-footer-links">
          <button
            className="app-footer-link privacy-link"
            onClick={() => navigate('/privacy')}
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
            <span className="sr-only"> (opens in new tab)</span>
          </a>
        </div>
      </footer>
      <WhisperLoadingBanner />
    </div>
  );
}

// Privacy page component
function PrivacyPage() {
  const navigate = useNavigate();
  return <PrivacyPolicy onBack={() => navigate(-1)} />;
}

// Admin index route handler - redirects HR to teams
function AdminIndexRoute() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('OPCO_ADMIN') || hasRole('TSS_SUPER_ADMIN');

  // HR users go directly to teams, admins see dashboard
  if (!isAdmin) {
    return <Navigate to="/admin/teams" replace />;
  }

  return <AdminDashboard />;
}

// Main app router
function AppRouter() {
  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/privacy"
        element={
          <LanguageProvider>
            <PrivacyPage />
          </LanguageProvider>
        }
      />

      {/* Protected routes */}
      <Route
        path="/"
        element={<Navigate to="/my-reviews" replace />}
      />

      <Route
        path="/my-reviews"
        element={
          <ProtectedRoute>
            <LanguageProvider>
              <WhisperProvider>
                <FormProvider>
                  <PageWrapper>
                    <MyReviews />
                  </PageWrapper>
                </FormProvider>
              </WhisperProvider>
            </LanguageProvider>
          </ProtectedRoute>
        }
      />

      <Route
        path="/review/new"
        element={
          <ProtectedRoute roles={['MANAGER', 'HR', 'OPCO_ADMIN', 'TSS_SUPER_ADMIN']}>
            <LanguageProvider>
              <WhisperProvider>
                <FormProvider>
                  <PageWrapper>
                    <NewReview />
                  </PageWrapper>
                </FormProvider>
              </WhisperProvider>
            </LanguageProvider>
          </ProtectedRoute>
        }
      />

      <Route
        path="/team"
        element={
          <ProtectedRoute roles={['MANAGER', 'HR', 'OPCO_ADMIN', 'TSS_SUPER_ADMIN']}>
            <LanguageProvider>
              <WhisperProvider>
                <FormProvider>
                  <PageWrapper>
                    <TeamOverview />
                  </PageWrapper>
                </FormProvider>
              </WhisperProvider>
            </LanguageProvider>
          </ProtectedRoute>
        }
      />

      <Route
        path="/approvals"
        element={
          <ProtectedRoute roles={['MANAGER', 'HR', 'OPCO_ADMIN', 'TSS_SUPER_ADMIN']}>
            <LanguageProvider>
              <WhisperProvider>
                <FormProvider>
                  <PageWrapper>
                    <Approvals />
                  </PageWrapper>
                </FormProvider>
              </WhisperProvider>
            </LanguageProvider>
          </ProtectedRoute>
        }
      />

      <Route
        path="/hr/dashboard"
        element={
          <ProtectedRoute roles={['HR', 'OPCO_ADMIN', 'TSS_SUPER_ADMIN']}>
            <LanguageProvider>
              <WhisperProvider>
                <FormProvider>
                  <PageWrapper>
                    <HRDashboard />
                  </PageWrapper>
                </FormProvider>
              </WhisperProvider>
            </LanguageProvider>
          </ProtectedRoute>
        }
      />

      <Route
        path="/hr/reviews"
        element={
          <ProtectedRoute roles={['HR', 'OPCO_ADMIN', 'TSS_SUPER_ADMIN']}>
            <LanguageProvider>
              <WhisperProvider>
                <FormProvider>
                  <PageWrapper>
                    <AllReviews />
                  </PageWrapper>
                </FormProvider>
              </WhisperProvider>
            </LanguageProvider>
          </ProtectedRoute>
        }
      />

      {/* History Dashboard - own history */}
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <LanguageProvider>
              <WhisperProvider>
                <FormProvider>
                  <PageWrapper>
                    <HistoryDashboard />
                  </PageWrapper>
                </FormProvider>
              </WhisperProvider>
            </LanguageProvider>
          </ProtectedRoute>
        }
      />

      {/* History Dashboard - view other user (Manager+) */}
      <Route
        path="/history/:userId"
        element={
          <ProtectedRoute roles={['MANAGER', 'HR', 'OPCO_ADMIN', 'TSS_SUPER_ADMIN']}>
            <LanguageProvider>
              <WhisperProvider>
                <FormProvider>
                  <PageWrapper>
                    <HistoryDashboard />
                  </PageWrapper>
                </FormProvider>
              </WhisperProvider>
            </LanguageProvider>
          </ProtectedRoute>
        }
      />

      {/* Analytics Dashboard - HR+ only */}
      <Route
        path="/analytics"
        element={
          <ProtectedRoute roles={['HR', 'OPCO_ADMIN', 'TSS_SUPER_ADMIN']}>
            <LanguageProvider>
              <WhisperProvider>
                <FormProvider>
                  <PageWrapper>
                    <AnalyticsDashboard />
                  </PageWrapper>
                </FormProvider>
              </WhisperProvider>
            </LanguageProvider>
          </ProtectedRoute>
        }
      />

      {/* Calibration Sessions - HR+ only */}
      <Route
        path="/calibration"
        element={
          <ProtectedRoute roles={['HR', 'OPCO_ADMIN', 'TSS_SUPER_ADMIN']}>
            <LanguageProvider>
              <WhisperProvider>
                <FormProvider>
                  <PageWrapper>
                    <CalibrationList />
                  </PageWrapper>
                </FormProvider>
              </WhisperProvider>
            </LanguageProvider>
          </ProtectedRoute>
        }
      />

      <Route
        path="/calibration/:id"
        element={
          <ProtectedRoute roles={['HR', 'OPCO_ADMIN', 'TSS_SUPER_ADMIN']}>
            <LanguageProvider>
              <WhisperProvider>
                <FormProvider>
                  <PageWrapper>
                    <CalibrationSession />
                  </PageWrapper>
                </FormProvider>
              </WhisperProvider>
            </LanguageProvider>
          </ProtectedRoute>
        }
      />

      <Route
        path="/calibration/:id/report"
        element={
          <ProtectedRoute roles={['HR', 'OPCO_ADMIN', 'TSS_SUPER_ADMIN']}>
            <LanguageProvider>
              <WhisperProvider>
                <FormProvider>
                  <PageWrapper>
                    <CalibrationReport />
                  </PageWrapper>
                </FormProvider>
              </WhisperProvider>
            </LanguageProvider>
          </ProtectedRoute>
        }
      />

      {/* Admin Portal with nested routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['HR', 'OPCO_ADMIN', 'TSS_SUPER_ADMIN']}>
            <LanguageProvider>
              <WhisperProvider>
                <FormProvider>
                  <PageWrapper showNav={false}>
                    <AdminLayout />
                  </PageWrapper>
                </FormProvider>
              </WhisperProvider>
            </LanguageProvider>
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminIndexRoute />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="org-chart" element={<OrgChart />} />
        <Route path="teams" element={<TeamsManagement />} />
        <Route path="function-titles" element={<FunctionTitles />} />
        <Route path="tov-levels" element={<TovLevels />} />
        <Route path="competencies" element={<Competencies />} />
        <Route path="import" element={<ImportReviews />} />
        <Route path="import-employees" element={<ImportEmployees />} />
        <Route path="start-new-year" element={<StartNewYear />} />
        <Route path="settings" element={<WorkflowSettings />} />
        <Route
          path="opcos"
          element={
            <ProtectedRoute roles={['TSS_SUPER_ADMIN']}>
              <OpCoManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="global"
          element={
            <ProtectedRoute roles={['TSS_SUPER_ADMIN']}>
              <GlobalDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="branding"
          element={
            <ProtectedRoute roles={['TSS_SUPER_ADMIN']}>
              <BrandingSettings />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* API-backed review form */}
      <Route
        path="/review/:reviewId"
        element={
          <ProtectedRoute>
            <LanguageProvider>
              <WhisperProvider>
                <PageWrapper showNav={false}>
                  <ReviewForm />
                </PageWrapper>
              </WhisperProvider>
            </LanguageProvider>
          </ProtectedRoute>
        }
      />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/my-reviews" replace />} />
    </Routes>
  );
}

function App() {
  const { isLoading, error, login } = useAuth();

  // Show loading screen while authenticating
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Show error screen if authentication failed
  if (error) {
    return <AuthErrorScreen error={error} onRetry={() => login()} />;
  }

  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}

export default App;
