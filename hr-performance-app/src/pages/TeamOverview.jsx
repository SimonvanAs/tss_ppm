import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { usersApi, reviewsApi } from '../services/api';
import './Pages.css';

export function TeamOverview() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTeam();
  }, []);

  const loadTeam = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get direct reports for current manager
      const usersData = await usersApi.list({ managerId: user?.id });
      const users = usersData.users || [];

      // Load reviews for each team member
      const teamWithReviews = await Promise.all(
        users.map(async (member) => {
          try {
            const reviewsData = await reviewsApi.list({ employeeId: member.id });
            const currentReview = (reviewsData.reviews || [])
              .filter(r => r.year === new Date().getFullYear())
              .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];
            return { ...member, currentReview };
          } catch {
            return { ...member, currentReview: null };
          }
        })
      );

      setTeamMembers(teamWithReviews);
    } catch (err) {
      console.error('Failed to load team:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusClass = (status) => {
    if (!status) return 'draft';
    switch (status) {
      case 'DRAFT': return 'draft';
      case 'COMPLETED': return 'completed';
      default: return 'in-progress';
    }
  };

  const handleStartReview = async (employeeId) => {
    try {
      await reviewsApi.create({
        employeeId,
        year: new Date().getFullYear(),
      });
      loadTeam(); // Refresh the list
    } catch (err) {
      console.error('Failed to start review:', err);
      setError(err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="page">
        <div className="loading-state">
          <div className="loading-spinner-small"></div>
          <p>Loading team...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{t('pages.team.title')}</h1>
        <p className="page-subtitle">{t('pages.team.subtitle')}</p>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 16, background: 'rgba(220, 53, 69, 0.05)', borderColor: '#DC3545' }}>
          <p style={{ color: '#DC3545', margin: 0 }}>{error}</p>
        </div>
      )}

      {teamMembers.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <svg className="empty-state-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
            </svg>
            <p className="empty-state-title">{t('pages.team.noReports')}</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('pages.team.employee')}</th>
                <th>{t('pages.team.role')}</th>
                <th>{t('pages.team.currentReview')}</th>
                <th>{t('pages.team.status')}</th>
                <th className="actions-cell">{t('pages.team.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((member) => (
                <tr key={member.id}>
                  <td>
                    <div>
                      <strong>{member.firstName} {member.lastName}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#666' }}>{member.email}</div>
                    </div>
                  </td>
                  <td>
                    {member.functionTitle?.name || '-'}
                  </td>
                  <td>
                    {member.currentReview ? (
                      <span className={`status-badge ${getStatusClass(member.currentReview.status)}`}>
                        {t(`review.stages.${member.currentReview.status}`)}
                      </span>
                    ) : (
                      <span style={{ color: '#999', fontSize: '0.875rem' }}>
                        {t('pages.team.noActiveReview')}
                      </span>
                    )}
                  </td>
                  <td>
                    {member.currentReview && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        {member.currentReview.whatScoreMidYear && (
                          <span style={{ fontSize: '0.75rem', color: '#666' }}>
                            WHAT: {member.currentReview.whatScoreMidYear.toFixed(2)}
                          </span>
                        )}
                        {member.currentReview.howScoreMidYear && (
                          <span style={{ fontSize: '0.75rem', color: '#666' }}>
                            HOW: {member.currentReview.howScoreMidYear.toFixed(2)}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="actions-cell">
                    {member.currentReview ? (
                      <Link
                        to={`/review/${member.currentReview.id}`}
                        className="btn btn-sm btn-primary"
                      >
                        {t('pages.team.viewReview')}
                      </Link>
                    ) : (
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleStartReview(member.id)}
                      >
                        {t('pages.team.startReview')}
                      </button>
                    )}
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
