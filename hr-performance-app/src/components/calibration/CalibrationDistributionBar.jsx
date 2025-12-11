import { useLanguage } from '../../contexts/LanguageContext';
import './Calibration.css';

// Tier colors
const TIER_COLORS = {
  topTalent: '#1B5E20',
  solidPerformer: '#28A745',
  needsAttention: '#FFA500',
  concern: '#DC3545',
};

/**
 * Distribution bar showing performance tier breakdown
 */
export function CalibrationDistributionBar({
  distribution,
  target = null,
  showLabels = true,
  showCounts = true,
  animated = true,
}) {
  const { t } = useLanguage();

  const total = (distribution.topTalent || 0) +
    (distribution.solidPerformer || 0) +
    (distribution.needsAttention || 0) +
    (distribution.concern || 0);

  if (total === 0) {
    return (
      <div className="distribution-bar-empty">
        {t('calibration.noData') || 'No data available'}
      </div>
    );
  }

  const getPercentage = (count) => Math.round((count / total) * 100);

  const segments = [
    {
      key: 'topTalent',
      label: t('calibration.distribution.topTalent') || 'Top Talent',
      count: distribution.topTalent || 0,
      color: TIER_COLORS.topTalent,
      target: target?.topTalent,
    },
    {
      key: 'solidPerformer',
      label: t('calibration.distribution.solidPerformer') || 'Solid Performer',
      count: distribution.solidPerformer || 0,
      color: TIER_COLORS.solidPerformer,
      target: target?.solid,
    },
    {
      key: 'needsAttention',
      label: t('calibration.distribution.needsAttention') || 'Needs Attention',
      count: distribution.needsAttention || 0,
      color: TIER_COLORS.needsAttention,
      target: target?.needsAttention,
    },
    {
      key: 'concern',
      label: t('calibration.distribution.concern') || 'Concern',
      count: distribution.concern || 0,
      color: TIER_COLORS.concern,
      target: target?.concern,
    },
  ];

  return (
    <div className="distribution-bar-container">
      {/* Main bar */}
      <div className="distribution-bar">
        {segments.map(segment => {
          const percentage = getPercentage(segment.count);
          if (percentage === 0) return null;

          return (
            <div
              key={segment.key}
              className={`distribution-segment ${animated ? 'animated' : ''}`}
              style={{
                width: `${percentage}%`,
                backgroundColor: segment.color,
              }}
              title={`${segment.label}: ${segment.count} (${percentage}%)`}
            >
              {percentage >= 10 && showCounts && (
                <span className="segment-count">{segment.count}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Target line indicators */}
      {target && (
        <div className="distribution-targets">
          {segments.map(segment => {
            if (!segment.target) return null;
            const actual = getPercentage(segment.count);
            const diff = actual - segment.target;
            const isOver = diff > 0;

            return (
              <div
                key={`target-${segment.key}`}
                className={`target-indicator ${isOver ? 'over' : 'under'}`}
                style={{ left: `${segment.target}%` }}
                title={`Target: ${segment.target}% | Actual: ${actual}%`}
              >
                <div className="target-line" style={{ borderColor: segment.color }} />
                {Math.abs(diff) > 5 && (
                  <span className={`target-diff ${isOver ? 'over' : 'under'}`}>
                    {isOver ? '+' : ''}{diff}%
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      {showLabels && (
        <div className="distribution-legend">
          {segments.map(segment => (
            <div key={segment.key} className="legend-item">
              <span
                className="legend-color"
                style={{ backgroundColor: segment.color }}
              />
              <span className="legend-label">{segment.label}</span>
              <span className="legend-value">
                {segment.count} ({getPercentage(segment.count)}%)
              </span>
              {segment.target && (
                <span className="legend-target">
                  ({t('calibration.distribution.target') || 'Target'}: {segment.target}%)
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Before/After distribution comparison
 */
export function DistributionComparison({ original, calibrated, target = null }) {
  const { t } = useLanguage();

  return (
    <div className="distribution-comparison">
      <div className="comparison-row">
        <div className="comparison-label">
          {t('calibration.adjustment.original') || 'Original'}
        </div>
        <div className="comparison-bar">
          <CalibrationDistributionBar
            distribution={original}
            target={target}
            showLabels={false}
            animated={false}
          />
        </div>
      </div>
      <div className="comparison-row">
        <div className="comparison-label highlight">
          {t('calibration.adjustment.calibrated') || 'Calibrated'}
        </div>
        <div className="comparison-bar">
          <CalibrationDistributionBar
            distribution={calibrated}
            target={target}
            showLabels={false}
            animated
          />
        </div>
      </div>

      {/* Change summary */}
      <div className="comparison-summary">
        {Object.keys(TIER_COLORS).map(tier => {
          const origCount = original[tier] || 0;
          const calibCount = calibrated[tier] || 0;
          const diff = calibCount - origCount;

          if (diff === 0) return null;

          return (
            <span
              key={tier}
              className={`change-badge ${diff > 0 ? 'increase' : 'decrease'}`}
              style={{ borderColor: TIER_COLORS[tier] }}
            >
              {tier === 'topTalent' ? (t('calibration.distribution.topTalent') || 'Top Talent') :
                tier === 'solidPerformer' ? (t('calibration.distribution.solidPerformer') || 'Solid') :
                  tier === 'needsAttention' ? (t('calibration.distribution.needsAttention') || 'Needs Attention') :
                    (t('calibration.distribution.concern') || 'Concern')}:
              {' '}{diff > 0 ? '+' : ''}{diff}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default CalibrationDistributionBar;
