import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { reviewsApi, usersApi } from '../services/api';
import './Pages.css';

export function HRDashboard() {
  const { t } = useLanguage();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeReviews: 0,
    completedReviews: 0,
    pendingApprovals: 0,
    byStage: {},
  });
  const [recentReviews, setRecentReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load all users and reviews
      const [usersData, reviewsData] = await Promise.all([
        usersApi.list(),
        reviewsApi.list({ year: new Date().getFullYear() }),
      ]);

      const users = usersData.users || [];
      const reviews = reviewsData.reviews || [];

      // Calculate stats
      const byStage = reviews.reduce((acc, review) => {
        acc[review.status] = (acc[review.status] || 0) + 1;
        return acc;
      }, {});

      const completedCount = reviews.filter(r => r.status === 'COMPLETED').length;
      const activeCount = reviews.filter(r => r.status !== 'COMPLETED' && r.status !== 'DRAFT').length;

      // Count pending approvals (simplified - would need proper API endpoint)
      let pendingApprovals = 0;
      for (const review of reviews.slice(0, 10)) {
        try {
          const requests = await reviewsApi.getChangeRequests(review.id);
          pendingApprovals += (requests || []).filter(r => r.status === 'PENDING').length;
        } catch {
          // Skip on error
        }
      }

      setStats({
        totalEmployees: users.length,
        activeReviews: activeCount,
        completedReviews: completedCount,
        pendingApprovals,
        byStage,
      });

      // Get recent reviews with employee info
      const recentWithEmployees = reviews
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, 5)
        .map(review => {
          const employee = users.find(u => u.id === review.employeeId);
          return { ...review, employee };
        });

      setRecentReviews(recentWithEmployees);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'DRAFT': return 'draft';
      case 'COMPLETED': return 'completed';
      default: return 'in-progress';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="page">
        <div className="loading-state">
          <div className="loading-spinner-small"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{t('pages.hrDashboard.title')}</h1>
        <p className="page-subtitle">{t('pages.hrDashboard.subtitle')}</p>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 16, background: 'rgba(220, 53, 69, 0.05)', borderColor: '#DC3545' }}>
          <p style={{ color: '#DC3545', margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totalEmployees}</div>
          <div className="stat-label">{t('pages.hrDashboard.totalEmployees')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.activeReviews}</div>
          <div className="stat-label">{t('pages.hrDashboard.activeReviews')}</div>
        </div>
        <div className="stat-card highlight">
          <div className="stat-value">{stats.completedReviews}</div>
          <div className="stat-label">{t('pages.hrDashboard.completedReviews')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.pendingApprovals}</div>
          <div className="stat-label">{t('pages.hrDashboard.pendingApprovals')}</div>
        </div>
      </div>

      {/* Reviews by Stage */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3 className="card-title">{t('pages.hrDashboard.byStage')}</h3>
          <Link to="/hr/reviews" className="btn btn-sm btn-secondary">
            {t('pages.hrDashboard.allReviews') || 'View All'}
          </Link>
        </div>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {Object.entries(stats.byStage).map(([stage, count]) => (
            <div
              key={stage}
              style={{
                padding: '12px 16px',
                background: '#f8f9fa',
                borderRadius: 8,
                minWidth: 120,
              }}
            >
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#004A91' }}>
                {count}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>
                {t(`review.stages.${stage}`) || stage}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">{t('pages.hrDashboard.recentActivity')}</h3>
        </div>

        {recentReviews.length === 0 ? (
          <div className="empty-state">
            <p>{t('pages.hrDashboard.noRecentReviews') || 'No recent reviews'}</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('pages.team.employee')}</th>
                <th>{t('pages.myReviews.stage')}</th>
                <th>{t('pages.myReviews.lastUpdated')}</th>
                <th className="actions-cell">{t('pages.myReviews.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {recentReviews.map((review) => (
                <tr key={review.id}>
                  <td>
                    <strong>
                      {review.employee
                        ? `${review.employee.firstName} ${review.employee.lastName}`
                        : 'Unknown'}
                    </strong>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusClass(review.status)}`}>
                      {t(`review.stages.${review.status}`)}
                    </span>
                  </td>
                  <td>{formatDate(review.updatedAt)}</td>
                  <td className="actions-cell">
                    <Link to={`/review/${review.id}`} className="btn btn-sm btn-ghost">
                      {t('pages.myReviews.view')}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
