import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { reviewsApi, usersApi } from '../services/api';
import './Pages.css';

export function AllReviews() {
  const { t } = useLanguage();
  const [reviews, setReviews] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    status: '',
    search: '',
  });

  useEffect(() => {
    loadData();
  }, [filters.year, filters.status]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [usersData, reviewsData] = await Promise.all([
        usersApi.list(),
        reviewsApi.list({
          year: filters.year,
          status: filters.status || undefined,
        }),
      ]);

      setUsers(usersData.users || []);
      setReviews(reviewsData.reviews || []);
    } catch (err) {
      console.error('Failed to load reviews:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getEmployee = (employeeId) => {
    return users.find(u => u.id === employeeId);
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'DRAFT': return 'draft';
      case 'COMPLETED': return 'completed';
      default: return 'in-progress';
    }
  };

  const getScoreClass = (score) => {
    if (!score) return '';
    if (score < 1.67) return 'low';
    if (score < 2.34) return 'medium';
    return 'high';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  // Filter reviews by search
  const filteredReviews = reviews.filter(review => {
    if (!filters.search) return true;
    const employee = getEmployee(review.employeeId);
    if (!employee) return false;
    const fullName = `${employee.firstName} ${employee.lastName}`.toLowerCase();
    return fullName.includes(filters.search.toLowerCase());
  });

  // Available years
  const years = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i
  );

  // Available statuses
  const statuses = [
    'DRAFT',
    'GOAL_SETTING',
    'GOAL_SETTING_COMPLETE',
    'MID_YEAR_REVIEW',
    'MID_YEAR_COMPLETE',
    'END_YEAR_REVIEW',
    'COMPLETED',
  ];

  if (isLoading) {
    return (
      <div className="page">
        <div className="loading-state">
          <div className="loading-spinner-small"></div>
          <p>Loading reviews...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{t('pages.allReviews.title')}</h1>
        <p className="page-subtitle">{t('pages.allReviews.subtitle')}</p>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 16, background: 'rgba(220, 53, 69, 0.05)', borderColor: '#DC3545' }}>
          <p style={{ color: '#DC3545', margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', marginBottom: 4 }}>
              {t('pages.allReviews.year')}
            </label>
            <select
              value={filters.year}
              onChange={(e) => setFilters(f => ({ ...f, year: parseInt(e.target.value) }))}
              style={{
                padding: '8px 12px',
                borderRadius: 4,
                border: '1px solid #ddd',
                minWidth: 100,
              }}
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', marginBottom: 4 }}>
              {t('pages.allReviews.status')}
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
              style={{
                padding: '8px 12px',
                borderRadius: 4,
                border: '1px solid #ddd',
                minWidth: 150,
              }}
            >
              <option value="">All Statuses</option>
              {statuses.map(status => (
                <option key={status} value={status}>
                  {t(`review.stages.${status}`)}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', marginBottom: 4 }}>
              {t('pages.allReviews.search')}
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
              placeholder={t('pages.allReviews.search')}
              style={{
                padding: '8px 12px',
                borderRadius: 4,
                border: '1px solid #ddd',
                width: '100%',
              }}
            />
          </div>

          <div style={{ alignSelf: 'flex-end' }}>
            <button className="btn btn-secondary">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
              </svg>
              {t('pages.allReviews.export')}
            </button>
          </div>
        </div>
      </div>

      {/* Reviews Table */}
      <div className="card">
        {filteredReviews.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-title">{t('pages.myReviews.noReviews')}</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('pages.team.employee')}</th>
                <th>{t('pages.team.role')}</th>
                <th>{t('pages.myReviews.stage')}</th>
                <th>{t('pages.myReviews.whatScore')}</th>
                <th>{t('pages.myReviews.howScore')}</th>
                <th>{t('pages.myReviews.lastUpdated')}</th>
                <th className="actions-cell">{t('pages.myReviews.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredReviews.map((review) => {
                const employee = getEmployee(review.employeeId);
                return (
                  <tr key={review.id}>
                    <td>
                      <div>
                        <strong>
                          {employee
                            ? `${employee.firstName} ${employee.lastName}`
                            : 'Unknown'}
                        </strong>
                        {employee && (
                          <div style={{ fontSize: '0.75rem', color: '#666' }}>
                            {employee.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      {employee?.functionTitle?.name || '-'}
                    </td>
                    <td>
                      <span className={`status-badge ${getStatusClass(review.status)}`}>
                        {t(`review.stages.${review.status}`)}
                      </span>
                    </td>
                    <td>
                      {review.whatScoreEndYear || review.whatScoreMidYear ? (
                        <span className={`score-badge ${getScoreClass(review.whatScoreEndYear || review.whatScoreMidYear)}`}>
                          {(review.whatScoreEndYear || review.whatScoreMidYear)?.toFixed(2)}
                        </span>
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                    <td>
                      {review.howScoreEndYear || review.howScoreMidYear ? (
                        <span className={`score-badge ${getScoreClass(review.howScoreEndYear || review.howScoreMidYear)}`}>
                          {(review.howScoreEndYear || review.howScoreMidYear)?.toFixed(2)}
                        </span>
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                    <td>
                      {formatDate(review.updatedAt)}
                    </td>
                    <td className="actions-cell">
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <Link to={`/review/${review.id}`} className="btn btn-sm btn-ghost">
                          {t('pages.myReviews.view')}
                        </Link>
                        {employee && (
                          <Link
                            to={`/history/${employee.id}`}
                            className="btn btn-sm btn-secondary"
                            title={t('pages.history.viewHistory')}
                            style={{ padding: '4px 8px' }}
                          >
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                              <path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99l1.5 1.5z"/>
                            </svg>
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
