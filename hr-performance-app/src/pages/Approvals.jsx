import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { reviewsApi, usersApi } from '../services/api';
import './Pages.css';

export function Approvals() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [changeRequests, setChangeRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    loadApprovals();
  }, []);

  const loadApprovals = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get all reviews for team members
      const usersData = await usersApi.list({ managerId: user?.id });
      const teamMembers = usersData.data || [];

      // Collect all pending change requests from team reviews
      const allChangeRequests = [];

      for (const member of teamMembers) {
        const reviewsData = await reviewsApi.list({ employeeId: member.id });
        const reviews = reviewsData.reviews || [];

        for (const review of reviews) {
          try {
            const requests = await reviewsApi.getChangeRequests(review.id);
            const pendingRequests = (requests || [])
              .filter(r => r.status === 'PENDING')
              .map(r => ({
                ...r,
                review,
                employee: member,
              }));
            allChangeRequests.push(...pendingRequests);
          } catch {
            // Skip reviews we can't access
          }
        }
      }

      setChangeRequests(allChangeRequests);
    } catch (err) {
      console.error('Failed to load approvals:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (reviewId, requestId) => {
    try {
      setProcessingId(requestId);
      await reviewsApi.approveChangeRequest(reviewId, requestId);
      loadApprovals();
    } catch (err) {
      console.error('Failed to approve:', err);
      setError(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (reviewId, requestId) => {
    try {
      setProcessingId(requestId);
      await reviewsApi.rejectChangeRequest(reviewId, requestId);
      loadApprovals();
    } catch (err) {
      console.error('Failed to reject:', err);
      setError(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const getChangeTypeLabel = (type) => {
    switch (type) {
      case 'ADD': return t('pages.approvals.addGoal');
      case 'EDIT': return t('pages.approvals.editGoal');
      case 'DELETE': return t('pages.approvals.deleteGoal');
      default: return type;
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
          <p>Loading approvals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{t('pages.approvals.title')}</h1>
        <p className="page-subtitle">{t('pages.approvals.subtitle')}</p>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 16, background: 'rgba(220, 53, 69, 0.05)', borderColor: '#DC3545' }}>
          <p style={{ color: '#DC3545', margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Goal Change Requests Section */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3 className="card-title">{t('pages.approvals.goalChanges')}</h3>
        </div>

        {changeRequests.length === 0 ? (
          <div className="empty-state">
            <svg className="empty-state-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <p className="empty-state-title">{t('pages.approvals.noApprovals')}</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('pages.approvals.employee')}</th>
                <th>{t('pages.approvals.type')}</th>
                <th>{t('pages.approvals.description')}</th>
                <th>{t('pages.approvals.requestedOn')}</th>
                <th className="actions-cell">{t('pages.myReviews.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {changeRequests.map((request) => (
                <tr key={request.id}>
                  <td>
                    <div>
                      <strong>{request.employee.firstName} {request.employee.lastName}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#666' }}>
                        {request.review.year} Review
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="status-badge in-progress">
                      {getChangeTypeLabel(request.changeType)}
                    </span>
                  </td>
                  <td>
                    <div style={{ maxWidth: 300 }}>
                      {request.reason || (
                        <span style={{ color: '#999', fontStyle: 'italic' }}>
                          {request.proposedData?.title || 'Goal change'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    {formatDate(request.createdAt)}
                  </td>
                  <td className="actions-cell">
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => handleApprove(request.review.id, request.id)}
                        disabled={processingId === request.id}
                      >
                        {t('pages.approvals.approve')}
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleReject(request.review.id, request.id)}
                        disabled={processingId === request.id}
                      >
                        {t('pages.approvals.reject')}
                      </button>
                    </div>
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
