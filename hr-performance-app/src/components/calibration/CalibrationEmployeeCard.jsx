import { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import './Calibration.css';

// Grid colors
const GRID_COLORS = {
  '1-1': '#DC3545',
  '1-2': '#FFA500',
  '2-1': '#FFA500',
  '1-3': '#28A745',
  '2-2': '#28A745',
  '3-1': '#28A745',
  '2-3': '#1B5E20',
  '3-2': '#1B5E20',
  '3-3': '#1B5E20',
};

function roundToGridPosition(score) {
  if (score === null || score === undefined) return null;
  if (score < 1.5) return 1;
  if (score < 2.5) return 2;
  return 3;
}

function getGridKey(whatScore, howScore) {
  const whatPos = roundToGridPosition(whatScore);
  const howPos = roundToGridPosition(howScore);
  return whatPos && howPos ? `${whatPos}-${howPos}` : '';
}

function getGridLabel(whatScore, howScore) {
  const whatPos = roundToGridPosition(whatScore);
  const howPos = roundToGridPosition(howScore);
  if (!whatPos || !howPos) return '-';
  return `${String.fromCharCode(65 + 3 - whatPos)}${howPos}`;
}

/**
 * Employee card for calibration with adjustment controls
 */
export function CalibrationEmployeeCard({
  item,
  onAdjust,
  onFlag,
  isEditable = true,
  expanded = false,
  onExpandToggle,
}) {
  const { t } = useLanguage();
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustmentValues, setAdjustmentValues] = useState({
    whatScore: item.calibrated?.whatScore || item.original.whatScore,
    howScore: item.calibrated?.howScore || item.original.howScore,
    notes: item.adjustmentNotes || '',
  });

  const originalKey = getGridKey(item.original.whatScore, item.original.howScore);
  const calibratedKey = item.calibrated
    ? getGridKey(item.calibrated.whatScore, item.calibrated.howScore)
    : originalKey;

  const handleAdjustSubmit = () => {
    onAdjust(item.id, adjustmentValues);
    setIsAdjusting(false);
  };

  const handleFlagToggle = () => {
    onFlag(item.id, {
      flagged: !item.flaggedForReview,
      reason: item.flagReason,
    });
  };

  return (
    <div className={`calibration-employee-card ${item.isAdjusted ? 'adjusted' : ''} ${item.flaggedForReview ? 'flagged' : ''}`}>
      {/* Header */}
      <div className="card-header" onClick={() => onExpandToggle?.(item.id)}>
        <div className="employee-info">
          <div className="employee-avatar">
            {item.employee.name.charAt(0)}
          </div>
          <div className="employee-details">
            <strong className="employee-name">{item.employee.name}</strong>
            <span className="employee-meta">
              {item.employee.functionTitle && <span>{item.employee.functionTitle}</span>}
              {item.employee.businessUnit && <span> • {item.employee.businessUnit}</span>}
            </span>
            {item.employee.manager && (
              <span className="employee-manager">
                {t('common.manager') || 'Manager'}: {item.employee.manager}
              </span>
            )}
          </div>
        </div>

        <div className="score-badges">
          {/* Original score */}
          <div
            className="score-badge original"
            style={{ borderColor: GRID_COLORS[originalKey] }}
          >
            <span className="score-label">{item.original.gridPos}</span>
            <span className="score-values">
              W: {item.original.whatScore.toFixed(2)} / H: {item.original.howScore.toFixed(2)}
            </span>
          </div>

          {/* Arrow if adjusted */}
          {item.isAdjusted && (
            <>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="#CC0E70">
                <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
              </svg>
              <div
                className="score-badge calibrated"
                style={{ borderColor: GRID_COLORS[calibratedKey], backgroundColor: `${GRID_COLORS[calibratedKey]}15` }}
              >
                <span className="score-label">{item.calibrated.gridPos}</span>
                <span className="score-values">
                  W: {item.calibrated.whatScore.toFixed(2)} / H: {item.calibrated.howScore.toFixed(2)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Status indicators */}
        <div className="card-indicators">
          {item.flaggedForReview && (
            <span className="flag-indicator" title={item.flagReason || 'Flagged for review'}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="#FFA500">
                <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z" />
              </svg>
            </span>
          )}
          {item.isAdjusted && (
            <span className="adjusted-indicator" title={`Adjusted by ${item.adjustedBy}`}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="#CC0E70">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
              </svg>
            </span>
          )}
          <button
            className="expand-toggle"
            onClick={(e) => {
              e.stopPropagation();
              onExpandToggle?.(item.id);
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="currentColor"
              style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}
            >
              <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="card-expanded">
          {/* Adjustment notes */}
          {item.adjustmentNotes && (
            <div className="adjustment-notes">
              <strong>{t('calibration.adjustment.notes') || 'Adjustment Notes'}:</strong>
              <p>{item.adjustmentNotes}</p>
              {item.adjustedBy && item.adjustedAt && (
                <span className="adjusted-meta">
                  {t('calibration.adjustment.adjustedBy') || 'Adjusted by'} {item.adjustedBy} on{' '}
                  {new Date(item.adjustedAt).toLocaleString()}
                </span>
              )}
            </div>
          )}

          {/* Actions */}
          {isEditable && (
            <div className="card-actions">
              {!isAdjusting ? (
                <>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => setIsAdjusting(true)}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                    </svg>
                    {t('calibration.actions.adjust') || 'Adjust Rating'}
                  </button>
                  <button
                    className={`btn btn-sm ${item.flaggedForReview ? 'btn-warning' : 'btn-secondary'}`}
                    onClick={handleFlagToggle}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                      <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z" />
                    </svg>
                    {item.flaggedForReview
                      ? (t('calibration.actions.unflag') || 'Remove Flag')
                      : (t('calibration.actions.flag') || 'Flag for Review')
                    }
                  </button>
                </>
              ) : (
                <div className="adjustment-form">
                  <div className="adjustment-scores">
                    <div className="score-input">
                      <label>WHAT Score</label>
                      <input
                        type="number"
                        min="1"
                        max="3"
                        step="0.01"
                        value={adjustmentValues.whatScore}
                        onChange={(e) => setAdjustmentValues({
                          ...adjustmentValues,
                          whatScore: parseFloat(e.target.value) || 1,
                        })}
                      />
                    </div>
                    <div className="score-input">
                      <label>HOW Score</label>
                      <input
                        type="number"
                        min="1"
                        max="3"
                        step="0.01"
                        value={adjustmentValues.howScore}
                        onChange={(e) => setAdjustmentValues({
                          ...adjustmentValues,
                          howScore: parseFloat(e.target.value) || 1,
                        })}
                      />
                    </div>
                  </div>
                  <div className="notes-input">
                    <label>{t('calibration.adjustment.notes') || 'Notes'}</label>
                    <textarea
                      value={adjustmentValues.notes}
                      onChange={(e) => setAdjustmentValues({
                        ...adjustmentValues,
                        notes: e.target.value,
                      })}
                      placeholder={t('calibration.adjustment.notesPlaceholder') || 'Reason for adjustment...'}
                      rows={2}
                    />
                  </div>
                  <div className="adjustment-actions">
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => setIsAdjusting(false)}
                    >
                      {t('common.cancel') || 'Cancel'}
                    </button>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={handleAdjustSubmit}
                    >
                      {t('common.save') || 'Save'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CalibrationEmployeeCard;
