import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { adminApi } from '../../services/api';

export function AdminDashboard() {
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      // For now, fetch users to get basic stats
      // In future, use dedicated stats endpoint
      const users = await adminApi.getUsers();

      const usersByRole = users.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {});

      const activeUsers = users.filter(u => u.isActive).length;

      setStats({
        totalUsers: users.length,
        activeUsers,
        managers: usersByRole.MANAGER || 0,
        employees: usersByRole.EMPLOYEE || 0,
        hrUsers: usersByRole.HR || 0,
        admins: (usersByRole.OPCO_ADMIN || 0) + (usersByRole.TSS_SUPER_ADMIN || 0),
      });
    } catch (err) {
      console.error('Failed to load stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-loading-spinner" />
        {t('common.loading')}
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-card">
        <div className="admin-empty">
          <div className="admin-empty-title">{t('admin.dashboard.error')}</div>
          <div className="admin-empty-text">{error}</div>
          <button className="admin-btn admin-btn-primary" onClick={loadStats}>
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">{t('admin.dashboard.title')}</h1>
        <p className="admin-page-subtitle">{t('admin.dashboard.subtitle')}</p>
      </div>

      {/* Stats Grid */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-label">{t('admin.dashboard.totalUsers')}</div>
          <div className="admin-stat-value">{stats?.totalUsers || 0}</div>
          <div className="admin-stat-change positive">
            {stats?.activeUsers || 0} {t('admin.dashboard.active')}
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-label">{t('admin.dashboard.employees')}</div>
          <div className="admin-stat-value">{stats?.employees || 0}</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-label">{t('admin.dashboard.managers')}</div>
          <div className="admin-stat-value">{stats?.managers || 0}</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-label">{t('admin.dashboard.hrAdmins')}</div>
          <div className="admin-stat-value">{(stats?.hrUsers || 0) + (stats?.admins || 0)}</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h3 className="admin-card-title">{t('admin.dashboard.quickActions')}</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <Link to="/admin/users" className="admin-btn admin-btn-secondary" style={{ justifyContent: 'center', textDecoration: 'none' }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
            {t('admin.dashboard.manageUsers')}
          </Link>

          <Link to="/admin/org-chart" className="admin-btn admin-btn-secondary" style={{ justifyContent: 'center', textDecoration: 'none' }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M22 11V3h-7v3H9V3H2v8h7V8h2v10h4v3h7v-8h-7v3h-2V8h2v3h7zM7 9H4V5h3v4zm10 6h3v4h-3v-4zm0-10h3v4h-3V5z"/>
            </svg>
            {t('admin.dashboard.viewOrgChart')}
          </Link>

          <Link to="/admin/function-titles" className="admin-btn admin-btn-secondary" style={{ justifyContent: 'center', textDecoration: 'none' }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/>
            </svg>
            {t('admin.dashboard.manageFunctions')}
          </Link>

          <Link to="/admin/competencies" className="admin-btn admin-btn-secondary" style={{ justifyContent: 'center', textDecoration: 'none' }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
            </svg>
            {t('admin.dashboard.manageCompetencies')}
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h3 className="admin-card-title">{t('admin.dashboard.recentActivity')}</h3>
        </div>

        <div className="admin-empty">
          <div className="admin-empty-icon">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor" opacity="0.3">
              <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
            </svg>
          </div>
          <div className="admin-empty-title">{t('admin.dashboard.noActivity')}</div>
          <div className="admin-empty-text">{t('admin.dashboard.noActivityDesc')}</div>
        </div>
      </div>
    </div>
  );
}
