import { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import './Calibration.css';

// Grid position configuration
const GRID_POSITIONS = [
  { what: 3, how: 1, label: 'A1', key: '3-1' },
  { what: 3, how: 2, label: 'A2', key: '3-2' },
  { what: 3, how: 3, label: 'A3', key: '3-3' },
  { what: 2, how: 1, label: 'B1', key: '2-1' },
  { what: 2, how: 2, label: 'B2', key: '2-2' },
  { what: 2, how: 3, label: 'B3', key: '2-3' },
  { what: 1, how: 1, label: 'C1', key: '1-1' },
  { what: 1, how: 2, label: 'C2', key: '1-2' },
  { what: 1, how: 3, label: 'C3', key: '1-3' },
];

// Grid cell colors matching the performance app
const GRID_COLORS = {
  '1-1': '#DC3545', // Red - Concern
  '1-2': '#FFA500', // Orange
  '2-1': '#FFA500', // Orange
  '1-3': '#28A745', // Green
  '2-2': '#28A745', // Green
  '3-1': '#28A745', // Green
  '2-3': '#1B5E20', // Dark Green
  '3-2': '#1B5E20', // Dark Green
  '3-3': '#1B5E20', // Dark Green - Top Talent
};

function getGridColor(key) {
  return GRID_COLORS[key] || '#e5e7eb';
}

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

/**
 * Interactive 9-grid for calibration sessions
 * Shows distribution and supports clicking to filter employees
 */
export function CalibrationGrid({
  items = [],
  useCalibrated = false,
  selectedCell = null,
  onCellClick = () => {},
  showPercentages = true,
  compact = false,
}) {
  const { t } = useLanguage();

  // Calculate counts for each cell
  const cellCounts = {};
  GRID_POSITIONS.forEach(pos => {
    cellCounts[pos.key] = { count: 0, adjusted: 0 };
  });

  items.forEach(item => {
    const whatScore = useCalibrated && item.calibrated
      ? item.calibrated.whatScore
      : item.original.whatScore;
    const howScore = useCalibrated && item.calibrated
      ? item.calibrated.howScore
      : item.original.howScore;

    if (whatScore && howScore) {
      const key = getGridKey(whatScore, howScore);
      if (cellCounts[key]) {
        cellCounts[key].count++;
        if (item.isAdjusted) {
          cellCounts[key].adjusted++;
        }
      }
    }
  });

  const totalCount = items.length;

  const handleCellClick = (key) => {
    onCellClick(key === selectedCell ? null : key);
  };

  return (
    <div className={`calibration-grid ${compact ? 'compact' : ''}`}>
      {/* Y-axis label (WHAT) */}
      <div className="grid-y-label">
        <span>WHAT</span>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
        </svg>
      </div>

      {/* Grid container */}
      <div className="grid-container">
        {/* Row labels */}
        <div className="row-labels">
          <span>3</span>
          <span>2</span>
          <span>1</span>
        </div>

        {/* Grid cells */}
        <div className="grid-cells">
          {GRID_POSITIONS.map(pos => {
            const count = cellCounts[pos.key].count;
            const adjusted = cellCounts[pos.key].adjusted;
            const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
            const isSelected = selectedCell === pos.key;

            return (
              <div
                key={pos.key}
                className={`grid-cell ${isSelected ? 'selected' : ''} ${count > 0 ? 'has-items' : ''}`}
                style={{
                  '--cell-color': getGridColor(pos.key),
                  backgroundColor: `${getGridColor(pos.key)}${count > 0 ? '30' : '10'}`,
                }}
                onClick={() => handleCellClick(pos.key)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleCellClick(pos.key)}
                role="button"
                tabIndex={0}
                aria-label={`${pos.label}: ${count} employees${adjusted > 0 ? `, ${adjusted} adjusted` : ''}`}
                title={`${pos.label}: ${count} employees${adjusted > 0 ? ` (${adjusted} adjusted)` : ''}`}
              >
                <div className="cell-label">{pos.label}</div>
                <div className="cell-count">{count}</div>
                {showPercentages && totalCount > 0 && (
                  <div className="cell-percentage">{percentage}%</div>
                )}
                {adjusted > 0 && (
                  <div className="cell-adjusted-indicator" title={`${adjusted} adjusted`}>
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="#CC0E70">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                    <span>{adjusted}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Column labels */}
        <div className="col-labels">
          <span>1</span>
          <span>2</span>
          <span>3</span>
        </div>
      </div>

      {/* X-axis label (HOW) */}
      <div className="grid-x-label">
        <span>HOW</span>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
        </svg>
      </div>
    </div>
  );
}

/**
 * Shows before/after comparison for calibration
 */
export function CalibrationGridComparison({ items = [] }) {
  const { t } = useLanguage();
  const [selectedCell, setSelectedCell] = useState(null);

  return (
    <div className="grid-comparison">
      <div className="grid-comparison-panel">
        <h4>{t('pages.calibration.distribution.original')}</h4>
        <CalibrationGrid
          items={items}
          useCalibrated={false}
          selectedCell={selectedCell}
          onCellClick={setSelectedCell}
          compact
        />
      </div>
      <div className="grid-comparison-arrow">
        <svg viewBox="0 0 24 24" width="32" height="32" fill="#CC0E70">
          <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
        </svg>
      </div>
      <div className="grid-comparison-panel">
        <h4>{t('pages.calibration.distribution.calibrated')}</h4>
        <CalibrationGrid
          items={items}
          useCalibrated={true}
          selectedCell={selectedCell}
          onCellClick={setSelectedCell}
          compact
        />
      </div>
    </div>
  );
}

export default CalibrationGrid;
