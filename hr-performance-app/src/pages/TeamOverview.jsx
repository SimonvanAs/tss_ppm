import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { usersApi, reviewsApi } from '../services/api';
import { roundToGridPosition, getGridColor } from '../utils/analyticsUtils';
import { SignatureStatus } from '../components/SignatureStatus';
import './Pages.css';

// Grid position labels
const GRID_LABELS = {
  '1-1': 'C1', '2-1': 'B1', '3-1': 'A1',
  '1-2': 'C2', '2-2': 'B2', '3-2': 'A2',
  '1-3': 'C3', '2-3': 'B3', '3-3': 'A3',
};

// Performance tier based on grid position
function getPerformanceTier(whatPos, howPos) {
  if (!whatPos || !howPos) return null;
  const key = `${whatPos}-${howPos}`;
  const topTalent = ['3-3', '2-3', '3-2']; // A3, B3, A2
  const solid = ['2-2', '1-3', '3-1']; // B2, C3, A1
  const needsImprovement = ['1-2', '2-1']; // C2, B1
  const concern = ['1-1']; // C1

  if (topTalent.includes(key)) return 'top';
  if (solid.includes(key)) return 'solid';
  if (needsImprovement.includes(key)) return 'improvement';
  if (concern.includes(key)) return 'concern';
  return null;
}

// Team 9-Grid Visualization Component
function Team9Grid({ teamMembers, t }) {
  // Count employees in each grid position
  const gridCounts = useMemo(() => {
    const counts = {};
    const names = {};

    teamMembers.forEach(member => {
      const review = member.currentReview;
      if (!review) return;

      const whatScore = review.whatScoreEndYear || review.whatScoreMidYear;
      const howScore = review.howScoreEndYear || review.howScoreMidYear;

      if (whatScore && howScore) {
        const whatPos = roundToGridPosition(whatScore);
        const howPos = roundToGridPosition(howScore);
        const key = `${whatPos}-${howPos}`;

        counts[key] = (counts[key] || 0) + 1;
        if (!names[key]) names[key] = [];
        names[key].push(`${member.firstName} ${member.lastName?.charAt(0)}.`);
      }
    });

    return { counts, names };
  }, [teamMembers]);

  const positions = [
    // Row 3 (HOW High)
    { what: 1, how: 3, label: 'C3' },
    { what: 2, how: 3, label: 'B3' },
    { what: 3, how: 3, label: 'A3' },
    // Row 2 (HOW Medium)
    { what: 1, how: 2, label: 'C2' },
    { what: 2, how: 2, label: 'B2' },
    { what: 3, how: 2, label: 'A2' },
    // Row 1 (HOW Low)
    { what: 1, how: 1, label: 'C1' },
    { what: 2, how: 1, label: 'B1' },
    { what: 3, how: 1, label: 'A1' },
  ];

  return (
    <div className="team-grid-container">
      <h3 className="card-title">{t('pages.team.gridTitle')}</h3>
      <div className="team-9grid">
        {/* Y-axis label */}
        <div className="grid-axis-label grid-y-label">
          <span>HOW</span>
        </div>

        {/* Grid cells container */}
        <div className="grid-cells-wrapper">
          {/* Grid cells */}
          <div className="grid-cells">
            {/* HOW labels */}
            <div className="grid-how-labels">
              <span>3</span>
              <span>2</span>
              <span>1</span>
            </div>

            {/* Main grid */}
            <div className="grid-main">
              {positions.map(pos => {
                const key = `${pos.what}-${pos.how}`;
                const count = gridCounts.counts[key] || 0;
                const names = gridCounts.names[key] || [];
                const color = getGridColor(pos.what, pos.how);

                return (
                  <div
                    key={key}
                    className="grid-cell"
                    style={{ backgroundColor: color }}
                    title={names.join(', ') || t('pages.team.noEmployees')}
                  >
                    <span className="grid-cell-count">{count}</span>
                    <span className="grid-cell-label">{pos.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* WHAT labels */}
          <div className="grid-what-labels">
            <span>1</span>
            <span>2</span>
            <span>3</span>
          </div>
        </div>

        {/* X-axis label */}
        <div className="grid-axis-label grid-x-label">
          <span>WHAT</span>
        </div>
      </div>

      {/* Legend */}
      <div className="grid-legend">
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#1B5E20' }}></span>
          <span>{t('pages.team.topTalent')}</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#28A745' }}></span>
          <span>{t('pages.team.solidPerformer')}</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#FFA500' }}></span>
          <span>{t('pages.team.needsAttention')}</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#DC3545' }}></span>
          <span>{t('pages.team.concern')}</span>
        </div>
      </div>
    </div>
  );
}

// Team Statistics Component
function TeamStats({ teamMembers, t }) {
  const stats = useMemo(() => {
    const withReviews = teamMembers.filter(m => m.currentReview);
    const completed = withReviews.filter(m => m.currentReview?.status === 'COMPLETED');

    let totalWhat = 0, totalHow = 0, scoredCount = 0;
    let topPerformers = 0, needsAttention = 0;

    withReviews.forEach(m => {
      const review = m.currentReview;
      const whatScore = review.whatScoreEndYear || review.whatScoreMidYear;
      const howScore = review.howScoreEndYear || review.howScoreMidYear;

      if (whatScore && howScore) {
        totalWhat += whatScore;
        totalHow += howScore;
        scoredCount++;

        const tier = getPerformanceTier(
          roundToGridPosition(whatScore),
          roundToGridPosition(howScore)
        );
        if (tier === 'top') topPerformers++;
        if (tier === 'improvement' || tier === 'concern') needsAttention++;
      }
    });

    return {
      teamSize: teamMembers.length,
      withReviews: withReviews.length,
      completed: completed.length,
      completionRate: teamMembers.length > 0
        ? Math.round((completed.length / teamMembers.length) * 100)
        : 0,
      avgWhat: scoredCount > 0 ? (totalWhat / scoredCount).toFixed(2) : '-',
      avgHow: scoredCount > 0 ? (totalHow / scoredCount).toFixed(2) : '-',
      topPerformers,
      needsAttention,
    };
  }, [teamMembers]);

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-value">{stats.teamSize}</div>
        <div className="stat-label">{t('pages.team.stats.teamSize')}</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">{stats.completed}/{stats.withReviews}</div>
        <div className="stat-label">{t('pages.team.stats.completed')}</div>
      </div>
      <div className="stat-card highlight">
        <div className="stat-value">{stats.completionRate}%</div>
        <div className="stat-label">{t('pages.team.stats.completionRate')}</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">{stats.avgWhat}</div>
        <div className="stat-label">{t('pages.team.stats.avgWhat')}</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">{stats.avgHow}</div>
        <div className="stat-label">{t('pages.team.stats.avgHow')}</div>
      </div>
      <div className="stat-card" style={stats.topPerformers > 0 ? { borderColor: '#28A745' } : {}}>
        <div className="stat-value" style={{ color: '#28A745' }}>{stats.topPerformers}</div>
        <div className="stat-label">{t('pages.team.stats.topPerformers')}</div>
      </div>
    </div>
  );
}

export function TeamOverview() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters and sorting
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [statusFilter, setStatusFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());

  useEffect(() => {
    loadTeam();
  }, [yearFilter]);

  const loadTeam = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get direct reports for current manager
      const usersData = await usersApi.list({ managerId: user?.id });
      const users = usersData.data || [];

      // Load reviews for each team member
      const teamWithReviews = await Promise.all(
        users.map(async (member) => {
          try {
            const reviewsData = await reviewsApi.list({ employeeId: member.id });
            const currentReview = (reviewsData.reviews || [])
              .filter(r => r.year === yearFilter)
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

  // Sort and filter team members
  const filteredAndSortedMembers = useMemo(() => {
    let result = [...teamMembers];

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(m => {
        if (statusFilter === 'no-review') return !m.currentReview;
        return m.currentReview?.status === statusFilter;
      });
    }

    // Apply sorting
    result.sort((a, b) => {
      let aVal, bVal;

      switch (sortField) {
        case 'name':
          aVal = `${a.firstName} ${a.lastName}`.toLowerCase();
          bVal = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case 'role':
          aVal = a.functionTitle?.name || '';
          bVal = b.functionTitle?.name || '';
          break;
        case 'what':
          aVal = a.currentReview?.whatScoreEndYear || a.currentReview?.whatScoreMidYear || 0;
          bVal = b.currentReview?.whatScoreEndYear || b.currentReview?.whatScoreMidYear || 0;
          break;
        case 'how':
          aVal = a.currentReview?.howScoreEndYear || a.currentReview?.howScoreMidYear || 0;
          bVal = b.currentReview?.howScoreEndYear || b.currentReview?.howScoreMidYear || 0;
          break;
        case 'status':
          aVal = a.currentReview?.status || 'zzz';
          bVal = b.currentReview?.status || 'zzz';
          break;
        default:
          aVal = a.firstName;
          bVal = b.firstName;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [teamMembers, sortField, sortDirection, statusFilter]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getStatusClass = (status) => {
    if (!status) return 'draft';
    switch (status) {
      case 'DRAFT': return 'draft';
      case 'COMPLETED': return 'completed';
      case 'ARCHIVED': return 'completed';
      case 'PENDING_EMPLOYEE_SIGNATURE': return 'signature-pending';
      case 'PENDING_MANAGER_SIGNATURE': return 'signature-pending';
      default: return 'in-progress';
    }
  };

  const isSignatureStatus = (status) => {
    return ['PENDING_EMPLOYEE_SIGNATURE', 'PENDING_MANAGER_SIGNATURE', 'COMPLETED'].includes(status);
  };

  const handleSignatureStatusChange = (memberId, reviewId, newStatus) => {
    setTeamMembers(prev =>
      prev.map(m => {
        if (m.id === memberId && m.currentReview?.id === reviewId) {
          return { ...m, currentReview: { ...m.currentReview, status: newStatus } };
        }
        return m;
      })
    );
  };

  const getScoreClass = (score) => {
    if (!score) return '';
    if (score >= 2.5) return 'high';
    if (score >= 1.5) return 'medium';
    return 'low';
  };

  const getGridPosition = (member) => {
    const review = member.currentReview;
    if (!review) return '-';

    const whatScore = review.whatScoreEndYear || review.whatScoreMidYear;
    const howScore = review.howScoreEndYear || review.howScoreMidYear;

    if (!whatScore || !howScore) return '-';

    const whatPos = roundToGridPosition(whatScore);
    const howPos = roundToGridPosition(howScore);

    return GRID_LABELS[`${whatPos}-${howPos}`] || '-';
  };

  const handleStartReview = async (member) => {
    try {
      // Validate that employee has a TOV level assigned
      if (!member.tovLevelId) {
        setError(t('pages.team.errors.noTovLevel') || 'Employee does not have a TOV level assigned. Please configure their profile first.');
        return;
      }

      await reviewsApi.create({
        employeeId: member.id,
        managerId: user.id,
        year: yearFilter,
        tovLevelId: member.tovLevelId,
      });
      loadTeam();
    } catch (err) {
      console.error('Failed to start review:', err);
      setError(err.message);
    }
  };

  const handleExport = () => {
    // Create CSV content
    const headers = ['Employee', 'Email', 'Role', 'WHAT Score', 'HOW Score', 'Grid Position', 'Status'];
    const rows = filteredAndSortedMembers.map(m => {
      const whatScore = m.currentReview?.whatScoreEndYear || m.currentReview?.whatScoreMidYear || '';
      const howScore = m.currentReview?.howScoreEndYear || m.currentReview?.howScoreMidYear || '';
      return [
        `${m.firstName} ${m.lastName}`,
        m.email,
        m.functionTitle?.name || '',
        whatScore ? whatScore.toFixed(2) : '',
        howScore ? howScore.toFixed(2) : '',
        getGridPosition(m),
        m.currentReview?.status || 'No Review',
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `team-performance-${yearFilter}.csv`;
    link.click();
  };

  const SortHeader = ({ field, children }) => (
    <th
      onClick={() => handleSort(field)}
      style={{ cursor: 'pointer', userSelect: 'none' }}
      className={sortField === field ? 'sorted' : ''}
    >
      {children}
      {sortField === field && (
        <span className="sort-indicator">
          {sortDirection === 'asc' ? ' ▲' : ' ▼'}
        </span>
      )}
    </th>
  );

  if (isLoading) {
    return (
      <div className="page">
        <div className="loading-state">
          <div className="loading-spinner-small"></div>
          <p>{t('common.loading')}</p>
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
        <>
          {/* Team Statistics */}
          <TeamStats teamMembers={teamMembers} t={t} />

          {/* Two-column layout: Grid + Table */}
          <div className="team-dashboard">
            {/* 9-Grid Visualization */}
            <div className="card team-grid-card">
              <Team9Grid teamMembers={teamMembers} t={t} />
            </div>

            {/* Filters and Table */}
            <div className="card team-table-card">
              <div className="table-controls">
                <div className="filter-group">
                  <label>{t('pages.team.filters.year')}:</label>
                  <select
                    value={yearFilter}
                    onChange={(e) => setYearFilter(Number(e.target.value))}
                    className="filter-select"
                  >
                    {[0, 1, 2].map(offset => {
                      const year = new Date().getFullYear() - offset;
                      return <option key={year} value={year}>{year}</option>;
                    })}
                  </select>
                </div>

                <div className="filter-group">
                  <label>{t('pages.team.filters.status')}:</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="filter-select"
                  >
                    <option value="all">{t('pages.team.filters.allStatuses')}</option>
                    <option value="no-review">{t('pages.team.filters.noReview')}</option>
                    <option value="DRAFT">{t('review.stages.DRAFT')}</option>
                    <option value="GOAL_SETTING">{t('review.stages.GOAL_SETTING')}</option>
                    <option value="MID_YEAR_REVIEW">{t('review.stages.MID_YEAR_REVIEW')}</option>
                    <option value="END_YEAR_REVIEW">{t('review.stages.END_YEAR_REVIEW')}</option>
                    <option value="COMPLETED">{t('review.stages.COMPLETED')}</option>
                  </select>
                </div>

                <button className="btn btn-secondary btn-sm" onClick={handleExport}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                  </svg>
                  {t('pages.team.export')}
                </button>
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <SortHeader field="name">{t('pages.team.employee')}</SortHeader>
                    <SortHeader field="role">{t('pages.team.role')}</SortHeader>
                    <SortHeader field="what">WHAT</SortHeader>
                    <SortHeader field="how">HOW</SortHeader>
                    <th>{t('pages.team.grid')}</th>
                    <SortHeader field="status">{t('pages.team.status')}</SortHeader>
                    <th>{t('signature.title') || 'Signature'}</th>
                    <th className="actions-cell">{t('pages.team.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedMembers.map((member) => {
                    const whatScore = member.currentReview?.whatScoreEndYear || member.currentReview?.whatScoreMidYear;
                    const howScore = member.currentReview?.howScoreEndYear || member.currentReview?.howScoreMidYear;
                    const gridPos = getGridPosition(member);
                    const gridColor = whatScore && howScore
                      ? getGridColor(roundToGridPosition(whatScore), roundToGridPosition(howScore))
                      : '#E5E7EB';

                    return (
                      <tr key={member.id}>
                        <td>
                          <div>
                            <strong>{member.firstName} {member.lastName}</strong>
                            <div style={{ fontSize: '0.75rem', color: '#666' }}>{member.email}</div>
                          </div>
                        </td>
                        <td>{member.functionTitle?.name || '-'}</td>
                        <td>
                          {whatScore ? (
                            <span className={`score-badge ${getScoreClass(whatScore)}`}>
                              {whatScore.toFixed(2)}
                            </span>
                          ) : (
                            <span style={{ color: '#999' }}>-</span>
                          )}
                        </td>
                        <td>
                          {howScore ? (
                            <span className={`score-badge ${getScoreClass(howScore)}`}>
                              {howScore.toFixed(2)}
                            </span>
                          ) : (
                            <span style={{ color: '#999' }}>-</span>
                          )}
                        </td>
                        <td>
                          <span
                            className="grid-position-badge"
                            style={{
                              backgroundColor: gridColor,
                              color: gridPos !== '-' ? 'white' : '#666'
                            }}
                          >
                            {gridPos}
                          </span>
                        </td>
                        <td>
                          {member.currentReview ? (
                            <span className={`status-badge ${getStatusClass(member.currentReview.status)}`}>
                              {t(`review.stages.${member.currentReview.status}`) || member.currentReview.status}
                            </span>
                          ) : (
                            <span style={{ color: '#999', fontSize: '0.875rem' }}>
                              {t('pages.team.noActiveReview')}
                            </span>
                          )}
                        </td>
                        <td>
                          {member.currentReview && isSignatureStatus(member.currentReview.status) ? (
                            <SignatureStatus
                              reviewId={member.currentReview.id}
                              reviewStatus={member.currentReview.status}
                              reviewSummary={{
                                employeeName: `${member.firstName} ${member.lastName}`,
                                year: member.currentReview.year || yearFilter,
                                whatScore: whatScore,
                                howScore: howScore,
                              }}
                              onStatusChange={(newStatus) =>
                                handleSignatureStatusChange(member.id, member.currentReview.id, newStatus)
                              }
                              compact
                            />
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td className="actions-cell">
                          <div style={{ display: 'flex', gap: '6px' }}>
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
                                onClick={() => handleStartReview(member)}
                              >
                                {t('pages.team.startReview')}
                              </button>
                            )}
                            <Link
                              to={`/history/${member.id}`}
                              className="btn btn-sm btn-secondary"
                              title={t('pages.history.viewHistory')}
                              style={{ padding: '4px 8px' }}
                            >
                              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                <path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99l1.5 1.5z"/>
                              </svg>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredAndSortedMembers.length === 0 && (
                <div className="empty-state" style={{ padding: '24px' }}>
                  <p>{t('pages.team.noMatchingMembers')}</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
