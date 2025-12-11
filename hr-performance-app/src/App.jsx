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
  FunctionTitles,
  TovLevels,
  Competencies,
  OpCoManagement,
  GlobalDashboard,
  ImportReviews,
} from './pages';
import './App.css';

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
      <Header />
      {showNav && <Navigation />}
      <main className="main-content">
        {children}
      </main>
      <footer className="app-footer">
        <span className="app-footer-ai">Made with AI assistance</span>
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
              <PageWrapper>
                <NewReview />
              </PageWrapper>
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
          <ProtectedRoute roles={['OPCO_ADMIN', 'TSS_SUPER_ADMIN']}>
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
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="org-chart" element={<OrgChart />} />
        <Route path="function-titles" element={<FunctionTitles />} />
        <Route path="tov-levels" element={<TovLevels />} />
        <Route path="competencies" element={<Competencies />} />
        <Route path="import" element={<ImportReviews />} />
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
      </Route>

      {/* API-backed review form route (for future use) */}
      <Route
        path="/review/:reviewId"
        element={
          <ProtectedRoute>
            <LanguageProvider>
              <WhisperProvider>
                <FormProvider>
                  <PageWrapper showNav={false}>
                    <div className="card" style={{ padding: 48, textAlign: 'center' }}>
                      <h2 style={{ color: '#004A91', margin: '0 0 16px' }}>Review Details</h2>
                      <p style={{ color: '#666' }}>API-backed review editing coming soon</p>
                    </div>
                  </PageWrapper>
                </FormProvider>
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
