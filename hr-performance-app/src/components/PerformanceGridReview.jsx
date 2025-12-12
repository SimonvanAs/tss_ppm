import { useLanguage } from '../contexts/LanguageContext';
import { useReview } from '../contexts/ReviewContext';
import { roundToGridPosition, getGridColor } from '../utils/scoring';
import './PerformanceGrid.css';

/**
 * PerformanceGridReview - 9-grid visualization using ReviewContext
 * Displays the performance position based on WHAT and HOW scores
 */
export function PerformanceGridReview() {
  const { t } = useLanguage();
  const { whatScore, howScore, hasScfVeto } = useReview();

  const whatPosition = whatScore !== null ? roundToGridPosition(whatScore) : null;
  const howPosition = howScore !== null ? roundToGridPosition(howScore) : null;

  const gridCells = [];
  for (let what = 3; what >= 1; what--) {
    for (let how = 1; how <= 3; how++) {
      const isPosition = whatPosition === what && howPosition === how;
      const color = getGridColor(what, how);
      gridCells.push({
        what,
        how,
        isPosition,
        color
      });
    }
  }

  return (
    <section className="section performance-grid-section card">
      <h2 className="section-title">{t('grid.title')}</h2>

      <div className="grid-container">
        <div className="grid-wrapper">
          {/* Y-axis label */}
          <div className="axis-label y-axis-label">WHAT</div>

          {/* Y-axis numbers */}
          <div className="y-axis">
            <span>3</span>
            <span>2</span>
            <span>1</span>
          </div>

          {/* Grid */}
          <div className="grid">
            {gridCells.map((cell, idx) => (
              <div
                key={idx}
                className={`grid-cell ${cell.isPosition ? 'position' : ''}`}
                style={{ backgroundColor: cell.color }}
              >
                {cell.isPosition && <div className="position-marker">●</div>}
              </div>
            ))}
          </div>

          {/* X-axis numbers */}
          <div className="x-axis">
            <span>1</span>
            <span>2</span>
            <span>3</span>
          </div>

          {/* X-axis label */}
          <div className="axis-label x-axis-label">HOW</div>
        </div>

        {/* Scores display */}
        <div className="scores-display">
          <div className={`score-item ${hasScfVeto ? 'veto-active' : ''}`}>
            <span className="score-name">{t('grid.whatScore')}:</span>
            <span className="score-value">
              {whatScore !== null ? whatScore.toFixed(2) : '-'}
            </span>
            {hasScfVeto && <span className="veto-badge">{t('grid.scfVeto')}</span>}
          </div>
          <div className="score-item">
            <span className="score-name">{t('grid.howScore')}:</span>
            <span className="score-value">
              {howScore !== null ? howScore.toFixed(2) : '-'}
            </span>
          </div>
          {whatPosition && howPosition && (
            <div className="position-info">
              <span>{t('grid.position')}: ({whatPosition}, {howPosition})</span>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="grid-legend">
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#DC3545' }} />
          <span>{t('grid.legend.immediateAttention') || 'Immediate attention'}</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#FFA500' }} />
          <span>{t('grid.legend.developmentArea') || 'Development area'}</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#28A745' }} />
          <span>{t('grid.legend.goodPerformance') || 'Good performance'}</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#1B5E20' }} />
          <span>{t('grid.legend.exceptional') || 'Exceptional'}</span>
        </div>
      </div>
    </section>
  );
}
