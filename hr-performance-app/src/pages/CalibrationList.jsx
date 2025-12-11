import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { calibrationApi, adminApi } from '../services/api';
import './Pages.css';

export function CalibrationList() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [businessUnits, setBusinessUnits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    status: '',
    businessUnitId: '',
  });

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [sessionsData, busData] = await Promise.all([
        calibrationApi.getSessions({
          year: filters.year,
          ...(filters.status && { status: filters.status }),
          ...(filters.businessUnitId && { businessUnitId: filters.businessUnitId }),
        }),
        adminApi.getBusinessUnits().catch(() => ({ businessUnits: [] })),
      ]);

      setSessions(sessionsData.sessions || []);
      setBusinessUnits(busData.businessUnits || busData || []);
    } catch (err) {
      console.error('Failed to load calibration sessions:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'DRAFT': return '#6c757d';
      case 'SCHEDULED': return '#004A91';
      case 'IN_PROGRESS': return '#CC0E70';
      case 'PENDING_APPROVAL': return '#FFA500';
      case 'COMPLETED': return '#28A745';
      case 'CANCELLED': return '#DC3545';
      default: return '#6c757d';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  // Generate year options (last 5 years + next year)
  const yearOptions = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear - 4; y <= currentYear + 1; y++) {
    yearOptions.push(y);
  }

  const handleRowClick = (sessionId) => {
    navigate(`/calibration/${sessionId}`);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('calibration.title') || 'Calibration Sessions'}</h1>
          <p className="page-subtitle">
            {t('calibration.subtitle') || 'Manage rating calibration across teams'}
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style={{ marginRight: 8 }}>
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
          {t('calibration.createSession') || 'Create Session'}
        </button>
      </div>

      {error && (
        <div className="card error-card" style={{ marginBottom: 16 }}>
          <p style={{ color: '#DC3545', margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="filters-row">
          <div className="filter-group">
            <label>{t('common.year') || 'Year'}</label>
            <select
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: parseInt(e.target.value) })}
              className="filter-select"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>{t('common.status') || 'Status'}</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="filter-select"
            >
              <option value="">{t('common.all') || 'All'}</option>
              <option value="DRAFT">{t('calibration.status.draft') || 'Draft'}</option>
              <option value="SCHEDULED">{t('calibration.status.scheduled') || 'Scheduled'}</option>
              <option value="IN_PROGRESS">{t('calibration.status.inProgress') || 'In Progress'}</option>
              <option value="PENDING_APPROVAL">{t('calibration.status.pendingApproval') || 'Pending Approval'}</option>
              <option value="COMPLETED">{t('calibration.status.completed') || 'Completed'}</option>
              <option value="CANCELLED">{t('calibration.status.cancelled') || 'Cancelled'}</option>
            </select>
          </div>

          {businessUnits.length > 0 && (
            <div className="filter-group">
              <label>{t('common.businessUnit') || 'Business Unit'}</label>
              <select
                value={filters.businessUnitId}
                onChange={(e) => setFilters({ ...filters, businessUnitId: e.target.value })}
                className="filter-select"
              >
                <option value="">{t('common.all') || 'All'}</option>
                {businessUnits.map((bu) => (
                  <option key={bu.id} value={bu.id}>{bu.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Sessions List */}
      <div className="card">
        {isLoading ? (
          <div className="loading-state">
            <div className="loading-spinner-small"></div>
            <p>{t('common.loading') || 'Loading...'}</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="#ccc" style={{ marginBottom: 16 }}>
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z" />
            </svg>
            <p>{t('calibration.noSessions') || 'No calibration sessions found'}</p>
            <button
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
              style={{ marginTop: 16 }}
            >
              {t('calibration.createFirst') || 'Create your first session'}
            </button>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('calibration.sessionName') || 'Session Name'}</th>
                <th>{t('common.status') || 'Status'}</th>
                <th>{t('calibration.scope.title') || 'Scope'}</th>
                <th>{t('common.businessUnit') || 'Business Unit'}</th>
                <th>{t('calibration.itemCount') || 'Reviews'}</th>
                <th>{t('common.createdBy') || 'Created By'}</th>
                <th>{t('common.date') || 'Date'}</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr
                  key={session.id}
                  onClick={() => handleRowClick(session.id)}
                  style={{ cursor: 'pointer' }}
                  className="clickable-row"
                >
                  <td>
                    <strong>{session.name}</strong>
                    <div style={{ fontSize: '0.75rem', color: '#666' }}>
                      {session.year}
                    </div>
                  </td>
                  <td>
                    <span
                      className="status-badge"
                      style={{
                        backgroundColor: `${getStatusColor(session.status)}15`,
                        color: getStatusColor(session.status),
                        borderColor: getStatusColor(session.status),
                      }}
                    >
                      {t(`calibration.status.${session.status.toLowerCase()}`) || session.status}
                    </span>
                  </td>
                  <td>
                    <span className="scope-badge">
                      {t(`calibration.scope.${session.scope.toLowerCase()}`) || session.scope}
                    </span>
                  </td>
                  <td>{session.businessUnit?.name || '-'}</td>
                  <td>
                    <span className="count-badge">{session.itemCount || 0}</span>
                  </td>
                  <td>{session.createdBy}</td>
                  <td>
                    {session.status === 'COMPLETED'
                      ? formatDate(session.completedAt)
                      : session.status === 'IN_PROGRESS'
                        ? formatDate(session.startedAt)
                        : session.scheduledAt
                          ? formatDate(session.scheduledAt)
                          : formatDate(session.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Session Modal */}
      {showCreateModal && (
        <CreateSessionModal
          businessUnits={businessUnits}
          onClose={() => setShowCreateModal(false)}
          onCreated={(session) => {
            setShowCreateModal(false);
            navigate(`/calibration/${session.id}`);
          }}
          t={t}
        />
      )}
    </div>
  );
}

function CreateSessionModal({ businessUnits, onClose, onCreated, t }) {
  const [formData, setFormData] = useState({
    name: '',
    year: new Date().getFullYear(),
    scope: 'BUSINESS_UNIT',
    businessUnitId: '',
    targetDistribution: {
      topTalent: 20,
      solid: 70,
      concern: 10,
    },
    enforceDistribution: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError(t('calibration.errors.nameRequired') || 'Session name is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await calibrationApi.createSession({
        name: formData.name.trim(),
        year: formData.year,
        scope: formData.scope,
        businessUnitId: formData.scope === 'BUSINESS_UNIT' ? formData.businessUnitId : undefined,
        targetDistribution: formData.targetDistribution,
        enforceDistribution: formData.enforceDistribution,
      });

      onCreated(response);
    } catch (err) {
      console.error('Failed to create session:', err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Year options
  const yearOptions = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear - 2; y <= currentYear + 1; y++) {
    yearOptions.push(y);
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <h2>{t('calibration.createSession') || 'Create Calibration Session'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="form-error" style={{ marginBottom: 16 }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label>{t('calibration.sessionName') || 'Session Name'} *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('calibration.sessionNamePlaceholder') || 'e.g., Q4 2024 End-Year Calibration'}
                className="form-input"
                autoFocus
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>{t('common.year') || 'Year'}</label>
                <select
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  className="form-input"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>{t('calibration.scope.title') || 'Scope'}</label>
                <select
                  value={formData.scope}
                  onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                  className="form-input"
                >
                  <option value="BUSINESS_UNIT">{t('calibration.scope.businessUnit') || 'Business Unit'}</option>
                  <option value="COMPANY">{t('calibration.scope.company') || 'Company-Wide'}</option>
                </select>
              </div>
            </div>

            {formData.scope === 'BUSINESS_UNIT' && businessUnits.length > 0 && (
              <div className="form-group">
                <label>{t('common.businessUnit') || 'Business Unit'}</label>
                <select
                  value={formData.businessUnitId}
                  onChange={(e) => setFormData({ ...formData, businessUnitId: e.target.value })}
                  className="form-input"
                >
                  <option value="">{t('common.selectOption') || 'Select...'}</option>
                  {businessUnits.map((bu) => (
                    <option key={bu.id} value={bu.id}>{bu.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.enforceDistribution}
                  onChange={(e) => setFormData({ ...formData, enforceDistribution: e.target.checked })}
                />
                {t('calibration.enableTargetDistribution') || 'Enable target distribution'}
              </label>
              <p style={{ fontSize: '0.75rem', color: '#666', marginTop: 4 }}>
                {t('calibration.targetDistributionHelp') || 'Set target percentages for each performance tier'}
              </p>
            </div>

            {formData.enforceDistribution && (
              <div className="distribution-inputs" style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem' }}>
                    {t('calibration.distribution.topTalent') || 'Top Talent'} %
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.targetDistribution.topTalent}
                    onChange={(e) => setFormData({
                      ...formData,
                      targetDistribution: {
                        ...formData.targetDistribution,
                        topTalent: parseInt(e.target.value) || 0,
                      },
                    })}
                    className="form-input"
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem' }}>
                    {t('calibration.distribution.solidPerformer') || 'Solid'} %
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.targetDistribution.solid}
                    onChange={(e) => setFormData({
                      ...formData,
                      targetDistribution: {
                        ...formData.targetDistribution,
                        solid: parseInt(e.target.value) || 0,
                      },
                    })}
                    className="form-input"
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem' }}>
                    {t('calibration.distribution.concern') || 'Concern'} %
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.targetDistribution.concern}
                    onChange={(e) => setFormData({
                      ...formData,
                      targetDistribution: {
                        ...formData.targetDistribution,
                        concern: parseInt(e.target.value) || 0,
                      },
                    })}
                    className="form-input"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {t('common.cancel') || 'Cancel'}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="loading-spinner-small" />
              ) : (
                t('common.create') || 'Create'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
