import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { calibrationApi } from '../services/api';
import {
  CalibrationGrid,
  CalibrationGridComparison,
  CalibrationDistributionBar,
  DistributionComparison,
} from '../components/calibration';
import './CalibrationReport.css';

// Helper to get grid position label
function getGridLabel(what, how) {
  const col = what < 1.67 ? 'A' : what < 2.34 ? 'B' : 'C';
  const row = how < 1.67 ? '1' : how < 2.34 ? '2' : '3';
  return `${col}${row}`;
}

// Format date
function formatDate(dateString) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function CalibrationReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [session, setSession] = useState(null);
  const [items, setItems] = useState([]);
  const [distribution, setDistribution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Load report data
  useEffect(() => {
    async function loadReport() {
      try {
        setLoading(true);
        const [sessionRes, itemsRes, distRes] = await Promise.all([
          calibrationApi.getSession(id),
          calibrationApi.getItems(id),
          calibrationApi.getDistribution(id),
        ]);
        setSession(sessionRes);
        setItems(itemsRes);
        setDistribution(distRes);
      } catch (err) {
        console.error('Failed to load calibration report:', err);
        setError(err.message || t('pages.calibration.error'));
      } finally {
        setLoading(false);
      }
    }
    loadReport();
  }, [id, t]);

  // Calculate statistics
  const adjustedItems = items.filter((item) => item.isAdjusted);
  const flaggedItems = items.filter((item) => item.flaggedForReview);

  // Calculate original vs calibrated distributions
  const originalDistribution = {};
  const calibratedDistribution = {};

  items.forEach((item) => {
    const origPos = item.originalGridPos || getGridLabel(item.originalWhatScore, item.originalHowScore);
    originalDistribution[origPos] = (originalDistribution[origPos] || 0) + 1;

    const calPos = item.isAdjusted
      ? item.calibratedGridPos || getGridLabel(item.calibratedWhatScore, item.calibratedHowScore)
      : origPos;
    calibratedDistribution[calPos] = (calibratedDistribution[calPos] || 0) + 1;
  });

  // Group adjustments by adjuster
  const adjustmentsByUser = {};
  adjustedItems.forEach((item) => {
    const adjuster = item.adjustedBy?.displayName || item.adjustedBy?.email || 'Unknown';
    if (!adjustmentsByUser[adjuster]) {
      adjustmentsByUser[adjuster] = [];
    }
    adjustmentsByUser[adjuster].push(item);
  });

  // Export handlers
  const handleExportPDF = async () => {
    setExporting(true);
    try {
      // In a real implementation, this would call an API endpoint
      // that generates a PDF using a library like PDFKit or Puppeteer
      alert('PDF export functionality would be implemented here');
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      // In a real implementation, this would call an API endpoint
      // that generates an Excel file using a library like ExcelJS
      alert('Excel export functionality would be implemented here');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="calibration-report loading">
        <div className="loading-spinner"></div>
        <p>{t('pages.calibration.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="calibration-report error">
        <p className="error-message">{error}</p>
        <button onClick={() => navigate('/calibration')} className="btn btn-secondary">
          {t('common.goBack')}
        </button>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="calibration-report error">
        <p>{t('pages.calibration.sessionNotFound') || 'Session not found'}</p>
        <button onClick={() => navigate('/calibration')} className="btn btn-secondary">
          {t('common.goBack')}
        </button>
      </div>
    );
  }

  return (
    <div className="calibration-report">
      {/* Header */}
      <div className="report-header">
        <div className="report-header-content">
          <button
            className="back-button"
            onClick={() => navigate(`/calibration/${id}`)}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
            {t('pages.calibration.backToSession') || 'Back to Session'}
          </button>
          <h1>{session.name}</h1>
          <p className="report-subtitle">{t('pages.calibration.reportTitle') || 'Calibration Report'}</p>
        </div>
        <div className="report-actions">
          <button
            className="btn btn-secondary"
            onClick={handleExportExcel}
            disabled={exporting}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM8 15.01l1.41 1.41L11 14.84V19h2v-4.16l1.59 1.59L16 15.01 12.01 11 8 15.01z" />
            </svg>
            {t('pages.analytics.export.excel')}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleExportPDF}
            disabled={exporting}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z" />
            </svg>
            {t('pages.analytics.export.pdf')}
          </button>
        </div>
      </div>

      {/* Session Summary */}
      <div className="report-section">
        <h2>{t('pages.calibration.report.sessionSummary') || 'Session Summary'}</h2>
        <div className="summary-grid">
          <div className="summary-card">
            <span className="summary-label">{t('common.status')}</span>
            <span className={`summary-value status-badge ${session.status?.toLowerCase()}`}>
              {t(`pages.calibration.status.${session.status?.toLowerCase().replace(/_/g, '')}`) || session.status}
            </span>
          </div>
          <div className="summary-card">
            <span className="summary-label">{t('common.year')}</span>
            <span className="summary-value">{session.year}</span>
          </div>
          <div className="summary-card">
            <span className="summary-label">{t('pages.calibration.scope.title')}</span>
            <span className="summary-value">
              {t(`pages.calibration.scope.${session.scope?.toLowerCase()}`) || session.scope}
            </span>
          </div>
          <div className="summary-card">
            <span className="summary-label">{t('pages.calibration.session.totalEmployees')}</span>
            <span className="summary-value">{items.length}</span>
          </div>
          <div className="summary-card">
            <span className="summary-label">{t('pages.calibration.session.adjustments')}</span>
            <span className="summary-value highlight">{adjustedItems.length}</span>
          </div>
          <div className="summary-card">
            <span className="summary-label">{t('pages.calibration.session.flaggedReviews')}</span>
            <span className="summary-value">{flaggedItems.length}</span>
          </div>
        </div>

        <div className="session-timeline">
          <div className="timeline-item">
            <span className="timeline-label">{t('pages.calibration.session.createdBy')}</span>
            <span className="timeline-value">
              {session.createdBy?.displayName || session.createdBy?.email || '-'}
            </span>
          </div>
          {session.scheduledAt && (
            <div className="timeline-item">
              <span className="timeline-label">{t('pages.calibration.session.scheduledFor')}</span>
              <span className="timeline-value">{formatDate(session.scheduledAt)}</span>
            </div>
          )}
          {session.startedAt && (
            <div className="timeline-item">
              <span className="timeline-label">{t('pages.calibration.session.startedAt')}</span>
              <span className="timeline-value">{formatDate(session.startedAt)}</span>
            </div>
          )}
          {session.completedAt && (
            <div className="timeline-item">
              <span className="timeline-label">{t('pages.calibration.session.completedAt')}</span>
              <span className="timeline-value">{formatDate(session.completedAt)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Distribution Comparison */}
      <div className="report-section">
        <h2>{t('pages.calibration.distribution.title')}</h2>
        <div className="distribution-comparison-container">
          <CalibrationGridComparison
            originalData={originalDistribution}
            calibratedData={calibratedDistribution}
            total={items.length}
          />
        </div>

        {distribution && (
          <div className="distribution-bars">
            <DistributionComparison
              original={distribution.original}
              calibrated={distribution.calibrated}
              target={session.targetDistribution}
            />
          </div>
        )}
      </div>

      {/* Adjustments Made */}
      {adjustedItems.length > 0 && (
        <div className="report-section">
          <h2>{t('pages.calibration.report.adjustmentsMade') || 'Adjustments Made'} ({adjustedItems.length})</h2>
          <div className="adjustments-table">
            <table>
              <thead>
                <tr>
                  <th>{t('pages.calibration.employees.employee') || 'Employee'}</th>
                  <th>{t('pages.calibration.report.originalPosition') || 'Original Position'}</th>
                  <th>{t('pages.calibration.report.calibratedPosition') || 'Calibrated Position'}</th>
                  <th>{t('pages.calibration.report.change') || 'Change'}</th>
                  <th>{t('pages.calibration.adjustment.notes')}</th>
                  <th>{t('pages.calibration.adjustment.adjustedBy')}</th>
                  <th>{t('common.date')}</th>
                </tr>
              </thead>
              <tbody>
                {adjustedItems.map((item) => {
                  const origPos = item.originalGridPos || getGridLabel(item.originalWhatScore, item.originalHowScore);
                  const calPos = item.calibratedGridPos || getGridLabel(item.calibratedWhatScore, item.calibratedHowScore);
                  const whatChange = (item.calibratedWhatScore - item.originalWhatScore).toFixed(2);
                  const howChange = (item.calibratedHowScore - item.originalHowScore).toFixed(2);

                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="employee-cell">
                          <span className="employee-name">
                            {item.reviewCycle?.employee?.displayName || 'Unknown'}
                          </span>
                          <span className="employee-role">
                            {item.reviewCycle?.employee?.functionTitle?.name || '-'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="position-cell">
                          <span className="grid-position">{origPos}</span>
                          <span className="scores">
                            W: {item.originalWhatScore?.toFixed(2)} / H: {item.originalHowScore?.toFixed(2)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="position-cell">
                          <span className="grid-position calibrated">{calPos}</span>
                          <span className="scores">
                            W: {item.calibratedWhatScore?.toFixed(2)} / H: {item.calibratedHowScore?.toFixed(2)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="change-cell">
                          <span className={`change ${parseFloat(whatChange) > 0 ? 'positive' : parseFloat(whatChange) < 0 ? 'negative' : ''}`}>
                            W: {parseFloat(whatChange) > 0 ? '+' : ''}{whatChange}
                          </span>
                          <span className={`change ${parseFloat(howChange) > 0 ? 'positive' : parseFloat(howChange) < 0 ? 'negative' : ''}`}>
                            H: {parseFloat(howChange) > 0 ? '+' : ''}{howChange}
                          </span>
                        </div>
                      </td>
                      <td className="notes-cell">
                        {item.adjustmentNotes || '-'}
                      </td>
                      <td>
                        {item.adjustedBy?.displayName || item.adjustedBy?.email || '-'}
                      </td>
                      <td>
                        {formatDate(item.adjustedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Flagged Items */}
      {flaggedItems.length > 0 && (
        <div className="report-section">
          <h2>Flagged for Review ({flaggedItems.length})</h2>
          <div className="flagged-list">
            {flaggedItems.map((item) => (
              <div key={item.id} className="flagged-item">
                <div className="flagged-header">
                  <span className="employee-name">
                    {item.reviewCycle?.employee?.displayName || 'Unknown'}
                  </span>
                  <span className="flag-indicator">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="#FFA500">
                      <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6h-5.6z" />
                    </svg>
                  </span>
                </div>
                {item.flagReason && (
                  <p className="flag-reason">{item.flagReason}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Adjustment Summary by User */}
      {Object.keys(adjustmentsByUser).length > 0 && (
        <div className="report-section">
          <h2>{t('pages.calibration.report.adjustmentsByFacilitator') || 'Adjustments by Facilitator'}</h2>
          <div className="facilitator-summary">
            {Object.entries(adjustmentsByUser).map(([user, userItems]) => (
              <div key={user} className="facilitator-card">
                <div className="facilitator-header">
                  <span className="facilitator-name">{user}</span>
                  <span className="adjustment-count">{userItems.length} {t('pages.calibration.report.adjustments') || 'adjustments'}</span>
                </div>
                <div className="facilitator-stats">
                  <div className="stat">
                    <span className="stat-label">{t('pages.calibration.report.avgWhatChange') || 'Avg WHAT Change'}</span>
                    <span className="stat-value">
                      {(userItems.reduce((sum, item) =>
                        sum + (item.calibratedWhatScore - item.originalWhatScore), 0
                      ) / userItems.length).toFixed(2)}
                    </span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">{t('pages.calibration.report.avgHowChange') || 'Avg HOW Change'}</span>
                    <span className="stat-value">
                      {(userItems.reduce((sum, item) =>
                        sum + (item.calibratedHowScore - item.originalHowScore), 0
                      ) / userItems.length).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session Notes */}
      {session.notes && (
        <div className="report-section">
          <h2>{t('pages.calibration.report.sessionNotes') || 'Session Notes'}</h2>
          <div className="session-notes">
            <p>{session.notes}</p>
          </div>
        </div>
      )}

      {/* Print Footer */}
      <div className="report-footer print-only">
        <p>{t('pages.calibration.report.generatedOn') || 'Generated on'} {new Date().toLocaleDateString()}</p>
        <p>{t('pages.calibration.report.systemName') || 'TSS Performance Management System'}</p>
      </div>
    </div>
  );
}
