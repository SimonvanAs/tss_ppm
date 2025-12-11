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
    if (!confirm(t('calibration.confirmComplete') || 'Are you sure you want to complete this calibration? All adjusted scores will be applied to the reviews.')) {
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
          <p>{t('common.loading') || 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="page">
        <div className="error-state">
          <p>{t('calibration.notFound') || 'Calibration session not found'}</p>
          <Link to="/calibration" className="btn btn-primary">
            {t('common.goBack') || 'Go Back'}
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
              {session.year} • {session.businessUnit?.name || (t(`calibration.scope.${session.scope.toLowerCase()}`) || session.scope)}
              {session.itemCount > 0 && ` • ${session.itemCount} ${t('calibration.reviews') || 'reviews'}`}
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
            {t(`calibration.status.${session.status.toLowerCase()}`) || session.status}
          </span>

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
                  {t('calibration.actions.start') || 'Start Session'}
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
                  {t('calibration.actions.complete') || 'Complete Calibration'}
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
              {t('calibration.actions.exportReport') || 'View Report'}
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
          <h2>{t('calibration.readyToStart') || 'Ready to Start Calibration'}</h2>
          <p style={{ color: '#666', maxWidth: 500, margin: '16px auto' }}>
            {t('calibration.startDescription') || 'Starting the calibration will snapshot all end-year review scores for the selected scope. You can then review and adjust ratings as needed.'}
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
                {t('calibration.actions.start') || 'Start Calibration Session'}
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
                  <h3 className="card-title">{t('calibration.distribution.title') || 'Rating Distribution'}</h3>
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
                    <h3 className="card-title">{t('calibration.comparison') || 'Before / After'}</h3>
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
                  {t('calibration.tabs.grid') || 'Grid View'}
                </button>
                <button
                  className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
                  onClick={() => setActiveTab('list')}
                >
                  {t('calibration.tabs.list') || 'Employee List'}
                  <span className="tab-count">{filteredItems.length}</span>
                </button>
                {comparison && (
                  <button
                    className={`tab-btn ${activeTab === 'managers' ? 'active' : ''}`}
                    onClick={() => setActiveTab('managers')}
                  >
                    {t('calibration.tabs.managers') || 'By Manager'}
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
                            {t('calibration.employeesInCell') || 'Employees in'} {selectedCell.replace('-', '')}
                          </h4>
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => setSelectedCell(null)}
                          >
                            {t('common.clearFilter') || 'Clear Filter'}
                          </button>
                        </div>
                        {filteredItems.length === 0 ? (
                          <div className="empty-state">
                            <p>{t('calibration.noEmployeesInCell') || 'No employees in this cell'}</p>
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
                        <p>{t('calibration.selectCellInstruction') || 'Click on a grid cell to view and adjust employees in that position'}</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'list' && (
                  <div className="list-view-panel">
                    <div className="list-header">
                      <span className="list-count">
                        {filteredItems.length} {t('calibration.employees') || 'employees'}
                        {items.filter(i => i.isAdjusted).length > 0 && (
                          <span className="adjusted-count">
                            ({items.filter(i => i.isAdjusted).length} {t('calibration.adjusted') || 'adjusted'})
                          </span>
                        )}
                      </span>
                      {selectedCell && (
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={() => setSelectedCell(null)}
                        >
                          {t('common.showAll') || 'Show All'}
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
                      <span>{t('calibration.companyAverages') || 'Company Averages'}:</span>
                      <span className="avg-score">WHAT: {comparison.companyAverages?.whatScore?.toFixed(2) || '-'}</span>
                      <span className="avg-score">HOW: {comparison.companyAverages?.howScore?.toFixed(2) || '-'}</span>
                    </div>
                    <div className="manager-list">
                      {comparison.managers?.map(manager => (
                        <div key={manager.managerId} className="manager-card">
                          <div className="manager-info">
                            <strong>{manager.managerName}</strong>
                            <span className="team-size">{manager.teamSize} {t('calibration.directReports') || 'direct reports'}</span>
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
                              <span className="score-label">{t('calibration.distribution.topTalent') || 'Top'}</span>
                              <span className={`score-value ${manager.topTalentPercentage > 40 ? 'high' : ''}`}>
                                {manager.topTalentPercentage}%
                              </span>
                            </div>
                            <div className="score-item">
                              <span className="score-label">{t('calibration.distribution.concern') || 'Concern'}</span>
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
    </div>
  );
}
