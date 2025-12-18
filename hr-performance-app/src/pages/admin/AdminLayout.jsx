import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import './AdminLayout.css';

// Icons as SVG components
const DashboardIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
  </svg>
);

const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
  </svg>
);

const OrgChartIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M22 11V3h-7v3H9V3H2v8h7V8h2v10h4v3h7v-8h-7v3h-2V8h2v3h7zM7 9H4V5h3v4zm10 6h3v4h-3v-4zm0-10h3v4h-3V5z"/>
  </svg>
);

const TeamsIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 5.9c1.16 0 2.1.94 2.1 2.1s-.94 2.1-2.1 2.1S9.9 9.16 9.9 8s.94-2.1 2.1-2.1m0 9c2.97 0 6.1 1.46 6.1 2.1v1.1H5.9V17c0-.64 3.13-2.1 6.1-2.1M12 4C9.79 4 8 5.79 8 8s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 9c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z"/>
  </svg>
);

const FunctionIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-5 3c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm4 8h-8v-1c0-1.33 2.67-2 4-2s4 .67 4 2v1z"/>
  </svg>
);

const LevelIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
  </svg>
);

const CompetencyIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
  </svg>
);

const OpCoIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/>
  </svg>
);

const GlobalIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z"/>
  </svg>
);

const ImportIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/>
  </svg>
);

const ImportEmployeesIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
  </svg>
);

const NewYearIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/>
  </svg>
);

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
  </svg>
);

const BrandingIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
  </svg>
);

const MenuIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
  </svg>
);

const BackIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
  </svg>
);

export function AdminLayout() {
  const { user, hasRole } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isSuperAdmin = hasRole('TSS_SUPER_ADMIN');

  // Get current page name from path
  const getPageName = () => {
    const path = location.pathname;
    if (path === '/admin' || path === '/admin/') return t('admin.nav.dashboard');
    if (path.includes('/users')) return t('admin.nav.users');
    if (path.includes('/org-chart')) return t('admin.nav.orgChart');
    if (path.includes('/teams')) return t('admin.nav.teams');
    if (path.includes('/function-titles')) return t('admin.nav.functionTitles');
    if (path.includes('/tov-levels')) return t('admin.nav.tovLevels');
    if (path.includes('/competencies')) return t('admin.nav.competencies');
    if (path.includes('/import-employees')) return t('admin.nav.importEmployees');
    if (path.includes('/import')) return t('admin.nav.import');
    if (path.includes('/start-new-year')) return t('admin.nav.startNewYear');
    if (path.includes('/settings')) return t('admin.nav.settings');
    if (path.includes('/branding')) return t('admin.nav.branding');
    if (path.includes('/opcos')) return t('admin.nav.opcos');
    if (path.includes('/global')) return t('admin.nav.global');
    return 'Admin';
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="admin-layout">
      {/* Mobile overlay */}
      <div
        className={`admin-sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={closeSidebar}
        onKeyDown={(e) => e.key === 'Escape' && closeSidebar()}
        role="button"
        tabIndex={sidebarOpen ? 0 : -1}
        aria-label="Close sidebar"
        aria-hidden={!sidebarOpen}
      />

      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-header">
          <NavLink
            to="/my-reviews"
            className="admin-back-link"
            onClick={closeSidebar}
          >
            <span className="admin-nav-icon"><BackIcon /></span>
            {t('admin.backToApp')}
          </NavLink>
          <h2 className="admin-sidebar-title">{t('admin.title')}</h2>
          <p className="admin-sidebar-subtitle">{user?.opcoName || 'OpCo'}</p>
        </div>

        <nav className="admin-sidebar-nav">
          {/* OpCo Admin Section */}
          <div className="admin-nav-section">
            <div className="admin-nav-section-title">{t('admin.sections.management')}</div>

            <NavLink
              to="/admin"
              end
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
              onClick={closeSidebar}
            >
              <span className="admin-nav-icon"><DashboardIcon /></span>
              {t('admin.nav.dashboard')}
            </NavLink>

            <NavLink
              to="/admin/users"
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
              onClick={closeSidebar}
            >
              <span className="admin-nav-icon"><UsersIcon /></span>
              {t('admin.nav.users')}
            </NavLink>

            <NavLink
              to="/admin/org-chart"
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
              onClick={closeSidebar}
            >
              <span className="admin-nav-icon"><OrgChartIcon /></span>
              {t('admin.nav.orgChart')}
            </NavLink>

            <NavLink
              to="/admin/teams"
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
              onClick={closeSidebar}
            >
              <span className="admin-nav-icon"><TeamsIcon /></span>
              {t('admin.nav.teams')}
            </NavLink>
          </div>

          {/* Configuration Section */}
          <div className="admin-nav-section">
            <div className="admin-nav-section-title">{t('admin.sections.configuration')}</div>

            <NavLink
              to="/admin/function-titles"
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
              onClick={closeSidebar}
            >
              <span className="admin-nav-icon"><FunctionIcon /></span>
              {t('admin.nav.functionTitles')}
            </NavLink>

            <NavLink
              to="/admin/tov-levels"
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
              onClick={closeSidebar}
            >
              <span className="admin-nav-icon"><LevelIcon /></span>
              {t('admin.nav.tovLevels')}
            </NavLink>

            <NavLink
              to="/admin/competencies"
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
              onClick={closeSidebar}
            >
              <span className="admin-nav-icon"><CompetencyIcon /></span>
              {t('admin.nav.competencies')}
            </NavLink>

            <NavLink
              to="/admin/import"
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
              onClick={closeSidebar}
            >
              <span className="admin-nav-icon"><ImportIcon /></span>
              {t('admin.nav.import')}
            </NavLink>

            <NavLink
              to="/admin/import-employees"
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
              onClick={closeSidebar}
            >
              <span className="admin-nav-icon"><ImportEmployeesIcon /></span>
              {t('admin.nav.importEmployees')}
            </NavLink>

            <NavLink
              to="/admin/start-new-year"
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
              onClick={closeSidebar}
            >
              <span className="admin-nav-icon"><NewYearIcon /></span>
              {t('admin.nav.startNewYear')}
            </NavLink>

            <NavLink
              to="/admin/settings"
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
              onClick={closeSidebar}
            >
              <span className="admin-nav-icon"><SettingsIcon /></span>
              {t('admin.nav.settings')}
            </NavLink>
          </div>

          {/* Super Admin Section */}
          {isSuperAdmin && (
            <div className="admin-nav-section">
              <div className="admin-nav-section-title">{t('admin.sections.superAdmin')}</div>

              <NavLink
                to="/admin/opcos"
                className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
              >
                <span className="admin-nav-icon"><OpCoIcon /></span>
                {t('admin.nav.opcos')}
              </NavLink>

              <NavLink
                to="/admin/global"
                className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
              >
                <span className="admin-nav-icon"><GlobalIcon /></span>
                {t('admin.nav.global')}
              </NavLink>

              <NavLink
                to="/admin/branding"
                className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
              >
                <span className="admin-nav-icon"><BrandingIcon /></span>
                {t('admin.nav.branding')}
              </NavLink>
            </div>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        <div className="admin-content">
          {/* Breadcrumb */}
          <div className="admin-breadcrumb">
            <NavLink to="/admin" className="admin-breadcrumb-link">
              {t('admin.title')}
            </NavLink>
            {location.pathname !== '/admin' && (
              <>
                <span className="admin-breadcrumb-separator">/</span>
                <span className="admin-breadcrumb-current">{getPageName()}</span>
              </>
            )}
          </div>

          {/* Page content from nested routes */}
          <Outlet />
        </div>
      </main>

      {/* Mobile Toggle Button */}
      <button
        className="admin-sidebar-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label={t('admin.toggleMenu') || 'Toggle menu'}
      >
        <MenuIcon />
      </button>
    </div>
  );
}
