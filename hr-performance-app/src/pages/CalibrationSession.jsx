import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { calibrationApi } from '../services/api';
import {
  CalibrationGrid,
  CalibrationEmployeeCard,
  CalibrationDistributionBar,
  DistributionComparison,
  AnomalyAlertPanel,
} from '../components/calibration';
import './Pages.css';

export function CalibrationSession() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [session, setSession] = useState(null);
  const [items, setItems] = useState([]);
  const [distribution, setDistribution] = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [comparison, setComparison] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [expandedItemId, setExpandedItemId] = useState(null);
  const [activeTab, setActiveTab] = useState('grid'); // 'grid' | 'list' | 'managers'
  const [isStarting, setIsStarting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Edit session modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', notes: '', targetDistribution: {} });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSession();
  }, [id]);

  const loadSession = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const sessionData = await calibrationApi.getSession(id);
      setSession(sessionData);

      // Load additional data based on session status
      if (['IN_PROGRESS', 'PENDING_APPROVAL', 'COMPLETED'].includes(sessionData.status)) {
        const [itemsData, distData, anomalyData, comparisonData] = await Promise.all([
          calibrationApi.getItems(id),
          calibrationApi.getDistribution(id),
          calibrationApi.getAnomalies(id).catch(() => ({ anomalies: [] })),
          calibrationApi.getComparison(id).catch(() => null),
        ]);

        setItems(itemsData.items || []);
        setDistribution(distData);
        setAnomalies(anomalyData.anomalies || []);
        setComparison(comparisonData);
      }
    } catch (err) {
      console.error('Failed to load calibration session:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartSession = async () => {
    try {
      setIsStarting(true);
      await calibrationApi.startSession(id);
      await loadSession();
    } catch (err) {
      console.error('Failed to start session:', err);
      setError(err.message);
    } finally {
      setIsStarting(false);
    }
  };

  const handleCompleteSession = async () => {
    if (!confirm('Are you sure you want to complete this calibration? All adjusted scores will be applied to the reviews.')) {
      return;
    }

    try {
      setIsCompleting(true);
      await calibrationApi.completeSession(id, { applyChanges: true });
      await loadSession();
    } catch (err) {
      console.error('Failed to complete session:', err);
      setError(err.message);
    } finally {
      setIsCompleting(false);
    }
  };

  const handleAdjustItem = async (itemId, adjustmentValues) => {
    try {
      await calibrationApi.adjustItem(id, itemId, adjustmentValues);
      // Reload items and distribution
      const [itemsData, distData] = await Promise.all([
        calibrationApi.getItems(id),
        calibrationApi.getDistribution(id),
      ]);
      setItems(itemsData.items || []);
      setDistribution(distData);
    } catch (err) {
      console.error('Failed to adjust item:', err);
      setError(err.message);
    }
  };

  const handleFlagItem = async (itemId, flagData) => {
    try {
      await calibrationApi.flagItem(id, itemId, flagData);
      const itemsData = await calibrationApi.getItems(id);
      setItems(itemsData.items || []);
    } catch (err) {
      console.error('Failed to flag item:', err);
      setError(err.message);
    }
  };

  const handleAnomalyClick = (anomaly) => {
    // Filter to show that manager's team
    // For now, just switch to list view
    setActiveTab('list');
  };

  const handleOpenEditModal = () => {
    setEditForm({
      name: session.name || '',
      notes: session.notes || '',
      targetDistribution: session.targetDistribution || { topTalent: 20, solid: 70, concern: 10 },
    });
    setIsEditModalOpen(true);
  };

  const handleEditSession = async () => {
    try {
      setIsSaving(true);
      setError(null);
      await calibrationApi.updateSession(id, editForm);
      await loadSession();
      setIsEditModalOpen(false);
    } catch (err) {
      console.error('Failed to update session:', err);
      setError(err.message);
    } finally {
      setIsSaving(false);
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

  // Convert API enum values to camelCase for translation keys
  // e.g., "IN_PROGRESS" -> "inProgress", "BUSINESS_UNIT" -> "businessUnit"
  const toCamelCase = (str) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .split('_')
      .map((word, index) => 
        index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
      )
      .join('');
  };

  // Filter items by selected grid cell
  const filteredItems = selectedCell
    ? items.filter(item => {
      const whatPos = Math.round(item.original.whatScore < 1.5 ? 1 : item.original.whatScore < 2.5 ? 2 : 3);
      const howPos = Math.round(item.original.howScore < 1.5 ? 1 : item.original.howScore < 2.5 ? 2 : 3);
      return `${whatPos}-${howPos}` === selectedCell;
    })
    : items;

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

  if (!session) {
    return (
      <div className="page">
        <div className="error-state">
          <p>{t('pages.calibration.error')}</p>
          <Link to="/calibration" className="btn btn-primary">
            {t('common.goBack')}
          </Link>
        </div>
      </div>
    );
  }

  const isEditable = session.status === 'IN_PROGRESS';
  const canStart = ['DRAFT', 'SCHEDULED'].includes(session.status);
  const canComplete = session.status === 'IN_PROGRESS';

  return (
    <div className="page calibration-session-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <Link to="/calibration" className="back-link">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
          </Link>
          <div>
            <h1 className="page-title">{session.name}</h1>
            <p className="page-subtitle">
              {session.year} • {session.businessUnit?.name || (t(`pages.calibration.scope.${toCamelCase(session.scope)}`) || session.scope)}
              {session.itemCount > 0 && ` • ${session.itemCount} ${t('pages.calibration.session.totalEmployees')}`}
            </p>
          </div>
        </div>
        <div className="header-actions">
          <span
            className="status-badge large"
            style={{
              backgroundColor: `${getStatusColor(session.status)}15`,
              color: getStatusColor(session.status),
              borderColor: getStatusColor(session.status),
            }}
          >
            {t(`pages.calibration.status.${toCamelCase(session.status)}`) || session.status}
          </span>

          {['DRAFT', 'SCHEDULED', 'IN_PROGRESS'].includes(session.status) && (
            <button
              className="btn btn-secondary"
              onClick={handleOpenEditModal}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style={{ marginRight: 8 }}>
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
              </svg>
              {t('common.edit')}
            </button>
          )}

          {canStart && (
            <button
              className="btn btn-primary"
              onClick={handleStartSession}
              disabled={isStarting}
            >
              {isStarting ? (
                <span className="loading-spinner-small" />
              ) : (
                <>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style={{ marginRight: 8 }}>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  {t('pages.calibration.actions.start')}
                </>
              )}
            </button>
          )}

          {canComplete && (
            <button
              className="btn btn-primary"
              onClick={handleCompleteSession}
              disabled={isCompleting}
            >
              {isCompleting ? (
                <span className="loading-spinner-small" />
              ) : (
                <>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style={{ marginRight: 8 }}>
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                  {t('pages.calibration.actions.complete')}
                </>
              )}
            </button>
          )}

          {session.status === 'COMPLETED' && (
            <Link
              to={`/calibration/${id}/report`}
              className="btn btn-secondary"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style={{ marginRight: 8 }}>
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
              </svg>
              {t('pages.calibration.actions.exportReport')}
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="card error-card" style={{ marginBottom: 16 }}>
          <p style={{ color: '#DC3545', margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Draft/Scheduled State */}
      {canStart && (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <svg viewBox="0 0 24 24" width="64" height="64" fill="#004A91" style={{ marginBottom: 16 }}>
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z" />
          </svg>
          <h2>{t('pages.calibration.readyToStart') || 'Ready to Start Calibration'}</h2>
          <p style={{ color: '#666', maxWidth: 500, margin: '16px auto' }}>
            {t('pages.calibration.readyToStartDesc') || 'Starting the calibration will snapshot all end-year review scores for the selected scope. You can then review and adjust ratings as needed.'}
          </p>
          <button
            className="btn btn-primary btn-large"
            onClick={handleStartSession}
            disabled={isStarting}
            style={{ marginTop: 16 }}
          >
            {isStarting ? (
              <span className="loading-spinner-small" />
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style={{ marginRight: 8 }}>
                  <path d="M8 5v14l11-7z" />
                </svg>
                {t('pages.calibration.actions.start')}
              </>
            )}
          </button>
        </div>
      )}

      {/* Active/Completed Session Content */}
      {['IN_PROGRESS', 'PENDING_APPROVAL', 'COMPLETED'].includes(session.status) && (
        <>
          {/* Anomaly Alerts */}
          {anomalies.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <AnomalyAlertPanel
                anomalies={anomalies}
                onAnomalyClick={handleAnomalyClick}
              />
            </div>
          )}

          {/* Main Content */}
          <div className="calibration-content">
            {/* Left Panel - Grid and Distribution */}
            <div className="calibration-sidebar">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">{t('pages.calibration.distribution.title')}</h3>
                </div>
                <CalibrationGrid
                  items={items}
                  useCalibrated={true}
                  selectedCell={selectedCell}
                  onCellClick={setSelectedCell}
                />
              </div>

              {distribution && (
                <div className="card" style={{ marginTop: 16 }}>
                  <div className="card-header">
                    <h3 className="card-title">{t('pages.calibration.comparison.title')}</h3>
                  </div>
                  <DistributionComparison
                    original={distribution.original?.tiers || {}}
                    calibrated={distribution.calibrated?.tiers || {}}
                    target={session.targetDistribution}
                  />
                </div>
              )}
            </div>

            {/* Right Panel - Tabs */}
            <div className="calibration-main">
              {/* Tab Navigation */}
              <div className="tab-nav" style={{ marginBottom: 16 }}>
                <button
                  className={`tab-btn ${activeTab === 'grid' ? 'active' : ''}`}
                  onClick={() => setActiveTab('grid')}
                >
                  {t('pages.calibration.grid.title')}
                </button>
                <button
                  className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
                  onClick={() => setActiveTab('list')}
                >
                  {t('pages.calibration.employees.title')}
                  <span className="tab-count">{filteredItems.length}</span>
                </button>
                {comparison && (
                  <button
                    className={`tab-btn ${activeTab === 'managers' ? 'active' : ''}`}
                    onClick={() => setActiveTab('managers')}
                  >
                    {t('pages.calibration.comparison.title')}
                    <span className="tab-count">{comparison.managers?.length || 0}</span>
                  </button>
                )}
              </div>

              {/* Tab Content */}
              <div className="tab-content">
                {activeTab === 'grid' && (
                  <div className="grid-view-panel">
                    {selectedCell ? (
                      <>
                        <div className="selected-cell-header">
                          <h4>
                            {t('pages.calibration.employees.title')} {selectedCell.replace('-', '')}
                          </h4>
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => setSelectedCell(null)}
                          >
                            Clear Filter
                          </button>
                        </div>
                        {filteredItems.length === 0 ? (
                          <div className="empty-state">
                            <p>{t('pages.calibration.employees.noEmployees')}</p>
                          </div>
                        ) : (
                          <div className="employee-list">
                            {filteredItems.map(item => (
                              <CalibrationEmployeeCard
                                key={item.id}
                                item={item}
                                isEditable={isEditable}
                                expanded={expandedItemId === item.id}
                                onExpandToggle={(id) => setExpandedItemId(expandedItemId === id ? null : id)}
                                onAdjust={handleAdjustItem}
                                onFlag={handleFlagItem}
                              />
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="grid-instructions">
                        <svg viewBox="0 0 24 24" width="48" height="48" fill="#ccc">
                          <path d="M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4V7zm-1-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                        </svg>
                        <p>{t('pages.calibration.grid.clickToSelect')}</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'list' && (
                  <div className="list-view-panel">
                    <div className="list-header">
                      <span className="list-count">
                        {filteredItems.length} {t('pages.calibration.grid.employees')}
                        {items.filter(i => i.isAdjusted).length > 0 && (
                          <span className="adjusted-count">
                            ({items.filter(i => i.isAdjusted).length} {t('pages.calibration.grid.adjusted')})
                          </span>
                        )}
                      </span>
                      {selectedCell && (
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={() => setSelectedCell(null)}
                        >
                          Show All
                        </button>
                      )}
                    </div>
                    <div className="employee-list">
                      {filteredItems.map(item => (
                        <CalibrationEmployeeCard
                          key={item.id}
                          item={item}
                          isEditable={isEditable}
                          expanded={expandedItemId === item.id}
                          onExpandToggle={(id) => setExpandedItemId(expandedItemId === id ? null : id)}
                          onAdjust={handleAdjustItem}
                          onFlag={handleFlagItem}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'managers' && comparison && (
                  <div className="managers-view-panel">
                    <div className="manager-stats-header">
                      <span>Company Averages:</span>
                      <span className="avg-score">WHAT: {comparison.companyAverages?.whatScore?.toFixed(2) || '-'}</span>
                      <span className="avg-score">HOW: {comparison.companyAverages?.howScore?.toFixed(2) || '-'}</span>
                    </div>
                    <div className="manager-list">
                      {comparison.managers?.map(manager => (
                        <div key={manager.managerId} className="manager-card">
                          <div className="manager-info">
                            <strong>{manager.managerName}</strong>
                            <span className="team-size">{manager.teamSize} {t('pages.calibration.comparison.teamSize')}</span>
                          </div>
                          <div className="manager-scores">
                            <div className="score-item">
                              <span className="score-label">WHAT</span>
                              <span className={`score-value ${Math.abs(manager.avgWhatScore - comparison.companyAverages.whatScore) > 0.5 ? 'deviation' : ''}`}>
                                {manager.avgWhatScore?.toFixed(2)}
                              </span>
                            </div>
                            <div className="score-item">
                              <span className="score-label">HOW</span>
                              <span className={`score-value ${Math.abs(manager.avgHowScore - comparison.companyAverages.howScore) > 0.5 ? 'deviation' : ''}`}>
                                {manager.avgHowScore?.toFixed(2)}
                              </span>
                            </div>
                            <div className="score-item">
                              <span className="score-label">{t('pages.calibration.distribution.topTalent')}</span>
                              <span className={`score-value ${manager.topTalentPercentage > 40 ? 'high' : ''}`}>
                                {manager.topTalentPercentage}%
                              </span>
                            </div>
                            <div className="score-item">
                              <span className="score-label">{t('pages.calibration.distribution.concern')}</span>
                              <span className={`score-value ${manager.concernPercentage > 30 ? 'high' : ''}`}>
                                {manager.concernPercentage}%
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Session Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2>{t('pages.calibration.session.editSession') || 'Edit Session'}</h2>
              <button
                className="modal-close"
                onClick={() => setIsEditModalOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              {/* Session Name - only editable for DRAFT/SCHEDULED */}
              <div className="form-group">
                <label htmlFor="sessionName">
                  {t('pages.calibration.session.sessionName') || 'Session Name'}
                </label>
                <input
                  id="sessionName"
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  disabled={session.status === 'IN_PROGRESS'}
                  className="form-control"
                />
                {session.status === 'IN_PROGRESS' && (
                  <small className="form-hint" style={{ color: '#666' }}>
                    {t('pages.calibration.session.nameLockedHint') || 'Name cannot be changed for in-progress sessions'}
                  </small>
                )}
              </div>

              {/* Target Distribution - only editable for DRAFT/SCHEDULED */}
              {session.status !== 'IN_PROGRESS' && (
                <div className="form-group">
                  <label>{t('pages.calibration.targetDistribution') || 'Target Distribution'}</label>
                  <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                    <div style={{ flex: 1 }}>
                      <label className="form-label-small">{t('pages.calibration.distribution.topTalent') || 'Top Talent %'}</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editForm.targetDistribution?.topTalent || 0}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          targetDistribution: {
                            ...editForm.targetDistribution,
                            topTalent: parseInt(e.target.value) || 0
                          }
                        })}
                        className="form-control"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label className="form-label-small">{t('pages.calibration.distribution.solid') || 'Solid %'}</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editForm.targetDistribution?.solid || 0}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          targetDistribution: {
                            ...editForm.targetDistribution,
                            solid: parseInt(e.target.value) || 0
                          }
                        })}
                        className="form-control"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label className="form-label-small">{t('pages.calibration.distribution.concern') || 'Concern %'}</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editForm.targetDistribution?.concern || 0}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          targetDistribution: {
                            ...editForm.targetDistribution,
                            concern: parseInt(e.target.value) || 0
                          }
                        })}
                        className="form-control"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Notes - always editable */}
              <div className="form-group">
                <label htmlFor="sessionNotes">
                  {t('pages.calibration.session.sessionNotes') || 'Notes'}
                </label>
                <textarea
                  id="sessionNotes"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder={t('pages.calibration.session.notesPlaceholder') || 'Add session notes, observations, or decisions...'}
                  className="form-control"
                  rows={4}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setIsEditModalOpen(false)}
              >
                {t('common.cancel')}
              </button>
              <button
                className="btn btn-primary"
                onClick={handleEditSession}
                disabled={isSaving}
              >
                {isSaving ? (
                  <span className="loading-spinner-small" />
                ) : (
                  t('common.save')
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
