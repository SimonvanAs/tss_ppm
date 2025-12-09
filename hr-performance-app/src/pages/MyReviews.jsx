import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { reviewsApi } from '../services/api';
import './Pages.css';

export function MyReviews() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await reviewsApi.list({ employeeId: user?.id });
      setReviews(data.reviews || []);
    } catch (err) {
      console.error('Failed to load reviews:', err);
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

  const isEditable = (review) => {
    return review.status !== 'COMPLETED';
  };

  if (isLoading) {
    return (
      <div className="page">
        <div className="loading-state">
          <div className="loading-spinner-small"></div>
          <p>{t('pages.myReviews.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="card">
          <div className="empty-state">
            <p className="empty-state-title">Error loading reviews</p>
            <p className="empty-state-text">{error}</p>
            <button className="btn btn-primary" onClick={loadReviews}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{t('pages.myReviews.title')}</h1>
        <div className="page-actions">
          <Link to="/review/new" className="btn btn-primary">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            {t('pages.myReviews.newReview')}
          </Link>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <svg className="empty-state-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
            </svg>
            <p className="empty-state-title">{t('pages.myReviews.noReviews')}</p>
            <p className="empty-state-text">{t('pages.myReviews.startFirst')}</p>
            <Link to="/review/new" className="btn btn-primary">
              {t('pages.myReviews.newReview')}
            </Link>
          </div>
        </div>
      ) : (
        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('pages.myReviews.year')}</th>
                <th>{t('pages.myReviews.stage')}</th>
                <th>{t('pages.myReviews.status')}</th>
                <th>{t('pages.myReviews.whatScore')}</th>
                <th>{t('pages.myReviews.howScore')}</th>
                <th>{t('pages.myReviews.lastUpdated')}</th>
                <th className="actions-cell">{t('pages.myReviews.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => (
                <tr key={review.id}>
                  <td>
                    <strong>{review.year}</strong>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusClass(review.status)}`}>
                      {t(`review.stages.${review.status}`)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusClass(review.status)}`}>
                      {review.status === 'COMPLETED'
                        ? t('review.status.completed')
                        : t('review.status.inProgress')}
                    </span>
                  </td>
                  <td>
                    {review.whatScoreEndYear || review.whatScoreMidYear ? (
                      <span className={`score-badge ${getScoreClass(review.whatScoreEndYear || review.whatScoreMidYear)}`}>
                        {(review.whatScoreEndYear || review.whatScoreMidYear)?.toFixed(2)}
                      </span>
                    ) : (
                      <span className="score-badge">-</span>
                    )}
                  </td>
                  <td>
                    {review.howScoreEndYear || review.howScoreMidYear ? (
                      <span className={`score-badge ${getScoreClass(review.howScoreEndYear || review.howScoreMidYear)}`}>
                        {(review.howScoreEndYear || review.howScoreMidYear)?.toFixed(2)}
                      </span>
                    ) : (
                      <span className="score-badge">-</span>
                    )}
                  </td>
                  <td>
                    {formatDate(review.updatedAt)}
                  </td>
                  <td className="actions-cell">
                    <Link
                      to={`/review/${review.id}`}
                      className={`btn btn-sm ${isEditable(review) ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      {isEditable(review) ? t('pages.myReviews.continue') : t('pages.myReviews.view')}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
