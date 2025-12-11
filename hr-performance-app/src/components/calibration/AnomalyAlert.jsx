import { useLanguage } from '../../contexts/LanguageContext';
import './Calibration.css';

const ANOMALY_ICONS = {
  HIGH_RATINGS: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
    </svg>
  ),
  LOW_RATINGS: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
    </svg>
  ),
  DEVIATION: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" />
    </svg>
  ),
};

/**
 * Single anomaly alert item
 */
export function AnomalyAlertItem({ anomaly, onClick }) {
  const { t } = useLanguage();

  return (
    <div
      className={`anomaly-alert-item ${anomaly.severity}`}
      onClick={() => onClick?.(anomaly)}
    >
      <div className="anomaly-icon">
        {ANOMALY_ICONS[anomaly.type] || ANOMALY_ICONS.DEVIATION}
      </div>
      <div className="anomaly-content">
        <div className="anomaly-header">
          <strong className="anomaly-manager">{anomaly.managerName}</strong>
          <span className={`anomaly-severity ${anomaly.severity}`}>
            {anomaly.severity === 'alert'
              ? (t('calibration.anomalies.alert') || 'Alert')
              : (t('calibration.anomalies.warning') || 'Warning')
            }
          </span>
        </div>
        <p className="anomaly-description">{anomaly.description}</p>
      </div>
      <div className="anomaly-action">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
        </svg>
      </div>
    </div>
  );
}

/**
 * Anomaly alerts panel showing detected patterns
 */
export function AnomalyAlertPanel({
  anomalies = [],
  onAnomalyClick,
  collapsed = false,
  onToggleCollapse,
}) {
  const { t } = useLanguage();

  const alertCount = anomalies.filter(a => a.severity === 'alert').length;
  const warningCount = anomalies.filter(a => a.severity === 'warning').length;

  if (anomalies.length === 0) {
    return (
      <div className="anomaly-panel empty">
        <div className="anomaly-panel-header">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="#28A745">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          <span>{t('calibration.anomalies.noAnomalies') || 'No anomalies detected'}</span>
        </div>
        <p className="anomaly-empty-text">
          {t('calibration.anomalies.allNormal') || 'Rating patterns appear normal across all managers'}
        </p>
      </div>
    );
  }

  return (
    <div className={`anomaly-panel ${collapsed ? 'collapsed' : ''}`}>
      <div className="anomaly-panel-header" onClick={onToggleCollapse}>
        <div className="anomaly-title">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="#FFA500">
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
          </svg>
          <span>{t('calibration.anomalies.title') || 'Anomalies Detected'}</span>
        </div>
        <div className="anomaly-counts">
          {alertCount > 0 && (
            <span className="count-badge alert">{alertCount} {t('calibration.anomalies.alerts') || 'alerts'}</span>
          )}
          {warningCount > 0 && (
            <span className="count-badge warning">{warningCount} {t('calibration.anomalies.warnings') || 'warnings'}</span>
          )}
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="currentColor"
            style={{ transform: collapsed ? 'rotate(180deg)' : 'none' }}
          >
            <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" />
          </svg>
        </div>
      </div>

      {!collapsed && (
        <div className="anomaly-list">
          {anomalies.map((anomaly, index) => (
            <AnomalyAlertItem
              key={`${anomaly.managerId}-${anomaly.type}-${index}`}
              anomaly={anomaly}
              onClick={onAnomalyClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default AnomalyAlertPanel;
