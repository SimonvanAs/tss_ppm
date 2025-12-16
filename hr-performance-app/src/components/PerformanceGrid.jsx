import { useLanguage } from '../contexts/LanguageContext';
import { useForm } from '../contexts/FormContext';
import {
  calculateWhatScore,
  calculateHowScore,
  roundToGridPosition,
  mapLevelToGrid,
  getGridColor
} from '../utils/scoring';
import './PerformanceGrid.css';

export function PerformanceGrid() {
  const { t } = useLanguage();
  const { formData } = useForm();

  const whatResult = calculateWhatScore(formData.goals || []);
  const whatScore = whatResult?.score ?? null;
  const hasScfVeto = whatResult?.hasScfVeto ?? false;
  const howScore = calculateHowScore(formData.competencyScores || {});
  const levelPosition = mapLevelToGrid(formData.tovLevel);

  const whatPosition = whatScore ? roundToGridPosition(whatScore) : null;
  const howPosition = howScore ? roundToGridPosition(howScore) : levelPosition;

  // Helper function to get cell description for screen readers
  const getCellDescription = (what, how) => {
    const descriptions = {
      '3-3': 'High performance, High potential - Exceptional performer',
      '3-2': 'High performance, Medium potential - Top performer',
      '3-1': 'High performance, Low potential - Strong results',
      '2-3': 'Medium performance, High potential - High potential talent',
      '2-2': 'Medium performance, Medium potential - Solid performer',
      '2-1': 'Medium performance, Low potential - Development area',
      '1-3': 'Low performance, High potential - Needs support',
      '1-2': 'Low performance, Medium potential - Improvement needed',
      '1-1': 'Low performance, Low potential - Immediate attention required'
    };
    return descriptions[`${what}-${how}`] || '';
  };

  // Build grid rows (WHAT 3, 2, 1 from top to bottom)
  const gridRows = [];
  for (let what = 3; what >= 1; what--) {
    const row = [];
    for (let how = 1; how <= 3; how++) {
      const isPosition = whatPosition === what && howPosition === how;
      const color = getGridColor(what, how);
      row.push({
        what,
        how,
        isPosition,
        color,
        description: getCellDescription(what, how)
      });
    }
    gridRows.push({ what, cells: row });
  }

  return (
    <section className="section performance-grid-section" aria-labelledby="grid-title">
      <h2 id="grid-title" className="section-title">{t('grid.title')}</h2>

      {/* Screen reader announcement for current position */}
      {whatPosition && howPosition && (
        <div className="sr-only" role="status" aria-live="polite">
          {t('grid.position')}: WHAT {whatPosition}, HOW {howPosition}. {getCellDescription(whatPosition, howPosition)}
        </div>
      )}

      <div className="grid-container">
        <div className="grid-wrapper">
          {/* Y-axis label */}
          <div className="axis-label y-axis-label" aria-label="Y-axis: WHAT (Goals and Results)">WHAT</div>

          {/* Y-axis numbers */}
          <div className="y-axis" role="presentation">
            <span aria-label="WHAT score 3">3</span>
            <span aria-label="WHAT score 2">2</span>
            <span aria-label="WHAT score 1">1</span>
          </div>

          {/* Grid */}
          <div className="grid" role="grid" aria-label="9-grid performance matrix">
            {gridRows.map((row) => (
              <div key={row.what} role="row" className="grid-row">
                {row.cells.map((cell, idx) => (
                  <div
                    key={idx}
                    role="gridcell"
                    className={`grid-cell ${cell.isPosition ? 'position' : ''}`}
                    style={{ backgroundColor: cell.color }}
                    aria-label={`WHAT ${cell.what}, HOW ${cell.how}: ${cell.description}${cell.isPosition ? ' - Your current position' : ''}`}
                    tabIndex={cell.isPosition ? 0 : -1}
                  >
                    {cell.isPosition && <div className="position-marker" aria-hidden="true">●</div>}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* X-axis numbers */}
          <div className="x-axis" role="presentation">
            <span aria-label="HOW score 1">1</span>
            <span aria-label="HOW score 2">2</span>
            <span aria-label="HOW score 3">3</span>
          </div>

          {/* X-axis label */}
          <div className="axis-label x-axis-label" aria-label="X-axis: HOW (Competencies and Behaviors)">HOW</div>
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
