import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useForm } from '../contexts/FormContext';
import { generateReport } from '../utils/docxGenerator';
import { competencies, levelDescriptions } from '../utils/competencies';
import {
  calculateWhatScore,
  calculateHowScore,
  roundToGridPosition,
  mapLevelToGrid,
  getGridColor
} from '../utils/scoring';
import './Actions.css';

export function Actions() {
  const { t } = useLanguage();
  const { formData, sessionCode, validate, clearSession, showSaveIndicator, manualSave } = useForm();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Handle Ctrl+S to save
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        manualSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [manualSave]);

  const handleDownload = async (isDraft = false) => {
    if (!isDraft) {
      const validation = validate();
      if (!validation.isValid) {
        alert(t('validation.formIncomplete'));
        return;
      }
    }

    setIsGenerating(true);
    try {
      await generateReport(formData, sessionCode, isDraft);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClear = () => {
    if (window.confirm(t('actions.confirmClear'))) {
      clearSession();
    }
  };

  return (
    <>
      <section className="section actions-section">
        <div className="actions-container">
          <button
            type="button"
            className="action-button secondary"
            onClick={() => setShowPreview(true)}
          >
            {t('actions.preview')}
          </button>

          <button
            type="button"
            className="action-button secondary"
            onClick={() => handleDownload(true)}
            disabled={isGenerating}
          >
            {isGenerating ? '...' : t('actions.saveDraft')}
          </button>

          <button
            type="button"
            className="action-button primary"
            onClick={() => handleDownload(false)}
            disabled={isGenerating}
          >
            {isGenerating ? '...' : t('actions.download')}
          </button>

          <button
            type="button"
            className="action-button danger"
            onClick={handleClear}
          >
            {t('actions.clearSession')}
          </button>

          {showSaveIndicator && (
            <div className="save-indicator">
              <span className="save-indicator-icon">✓</span>
              <span className="save-indicator-text">{t('actions.saved')}</span>
            </div>
          )}
        </div>
      </section>

      {showPreview && (
        <PreviewModal
          formData={formData}
          sessionCode={sessionCode}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
}

function PreviewModal({ formData, sessionCode, onClose }) {
  const { t, language } = useLanguage();

  const selectedLevel = formData.tovLevel;
  const levelCompetencies = selectedLevel ? competencies[selectedLevel] : [];

  // Calculate scores for grid
  const whatResult = calculateWhatScore(formData.goals || []);
  const whatScore = whatResult?.score ?? null;
  const hasScfVeto = whatResult?.hasScfVeto ?? false;
  const howScore = calculateHowScore(formData.competencyScores || {});
  const levelPosition = mapLevelToGrid(formData.tovLevel);
  const whatPosition = whatScore ? roundToGridPosition(whatScore) : null;
  const howPosition = howScore ? roundToGridPosition(howScore) : levelPosition;

  // Generate grid cells
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
    <div
      className="modal-overlay"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      role="button"
      tabIndex={-1}
      aria-label="Close preview"
    >
      <div
        className="preview-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-title"
      >
        <div className="preview-header">
          <h2 id="preview-title">{t('actions.preview')}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="preview-content">
          <div className="preview-document">
            <h1 className="preview-title">
              {language === 'nl' ? 'Beoordelingsrapport' : language === 'es' ? 'Informe de Evaluación' : 'Performance Review Report'}
            </h1>
            <h2 className="preview-employee">{formData.employeeName || 'Employee Name'}</h2>
            <p className="preview-subtitle">{formData.role} | {formData.businessUnit}</p>

            <div className="preview-section">
              <h3>{t('employee.title')}</h3>
              <table className="preview-table">
                <tbody>
                  <tr><td>{t('employee.name')}:</td><td>{formData.employeeName}</td></tr>
                  <tr><td>{t('employee.role')}:</td><td>{formData.role}</td></tr>
                  <tr><td>{t('employee.businessUnit')}:</td><td>{formData.businessUnit}</td></tr>
                  <tr><td>{t('employee.tovLevel')}:</td><td>{formData.tovLevel}</td></tr>
                  <tr><td>{t('employee.reviewDate')}:</td><td>{formData.reviewDate}</td></tr>
                  <tr><td>{t('employee.managerName')}:</td><td>{formData.managerName}</td></tr>
                </tbody>
              </table>
            </div>

            {formData.summary && (
              <div className="preview-section">
                <h3>{t('summary.title')}</h3>
                <p>{formData.summary}</p>
              </div>
            )}

            <div className="preview-section">
              <h3>{t('whatAxis.title')}</h3>
              {formData.goals?.filter(g => g.title.trim()).map((goal, idx) => (
                <div key={goal.id} className="preview-goal">
                  <strong>{idx + 1}. {goal.title}</strong> ({goal.weight}%)
                  <p>{goal.description}</p>
                  <span className="preview-score">Score: {goal.score} - {t(`scores.${goal.score}`)}</span>
                </div>
              ))}
            </div>

            <div className="preview-section">
              <h3>{t('howAxis.title')}</h3>
              {formData.tovLevel && (
                <div className="preview-level-info">
                  <p className="preview-level-badge">
                    <strong>Level {formData.tovLevel}:</strong> {levelDescriptions[formData.tovLevel]?.[language] || levelDescriptions[formData.tovLevel]?.en || ''}
                  </p>
                </div>
              )}
              {levelCompetencies.map((comp) => {
                const score = formData.competencyScores?.[comp.id];
                const note = formData.competencyNotes?.[comp.id];
                return (
                  <div key={comp.id} className="preview-competency">
                    <div className="preview-competency-header">
                      <div className="preview-competency-category">
                        <span className="preview-category-name">{comp.category}</span>
                        <span className="preview-subcategory-name">{comp.subcategory}</span>
                      </div>
                      {score && (
                        <span className="preview-competency-score">
                          Score: {score} - {t(`scores.${score}`)}
                        </span>
                      )}
                    </div>
                    <p className="preview-competency-title">
                      {comp.title[language] || comp.title.en}
                    </p>
                    {note && (
                      <div className="preview-competency-note">
                        <strong>Note:</strong> {note}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 9-Grid Visualization */}
            <div className="preview-section">
              <h3>{t('grid.title')}</h3>
              <div className="preview-grid-container">
                <div className="preview-grid-wrapper">
                  {/* Y-axis label */}
                  <div className="preview-axis-label preview-y-axis-label">WHAT</div>

                  {/* Y-axis numbers */}
                  <div className="preview-y-axis">
                    <span>3</span>
                    <span>2</span>
                    <span>1</span>
                  </div>

                  {/* Grid */}
                  <div className="preview-grid">
                    {gridCells.map((cell, idx) => (
                      <div
                        key={idx}
                        className={`preview-grid-cell ${cell.isPosition ? 'preview-position' : ''}`}
                        style={{ backgroundColor: cell.color }}
                      >
                        {cell.isPosition && <div className="preview-position-marker">●</div>}
                      </div>
                    ))}
                  </div>

                  {/* X-axis numbers */}
                  <div className="preview-x-axis">
                    <span>1</span>
                    <span>2</span>
                    <span>3</span>
                  </div>

                  {/* X-axis label */}
                  <div className="preview-axis-label preview-x-axis-label">HOW</div>
                </div>

                {/* Scores display */}
                <div className="preview-scores-display">
                  <div className={`preview-score-item ${hasScfVeto ? 'veto-active' : ''}`}>
                    <span className="preview-score-name">{t('grid.whatScore')}:</span>
                    <span className="preview-score-value">
                      {whatScore !== null ? whatScore.toFixed(2) : '-'}
                    </span>
                    {hasScfVeto && <span className="preview-veto-badge">{t('grid.scfVeto')}</span>}
                  </div>
                  <div className="preview-score-item">
                    <span className="preview-score-name">{t('grid.howScore')}:</span>
                    <span className="preview-score-value">
                      {howScore !== null ? howScore.toFixed(2) : '-'}
                    </span>
                  </div>
                  {whatPosition && howPosition && (
                    <div className="preview-position-info">
                      <span>{t('grid.position')}: ({whatPosition}, {howPosition})</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Legend */}
              <div className="preview-grid-legend">
                <div className="preview-legend-item">
                  <span className="preview-legend-color" style={{ backgroundColor: '#DC3545' }} />
                  <span>{t('grid.legend.immediateAttention') || 'Immediate attention'}</span>
                </div>
                <div className="preview-legend-item">
                  <span className="preview-legend-color" style={{ backgroundColor: '#FFA500' }} />
                  <span>{t('grid.legend.developmentArea') || 'Development area'}</span>
                </div>
                <div className="preview-legend-item">
                  <span className="preview-legend-color" style={{ backgroundColor: '#28A745' }} />
                  <span>{t('grid.legend.goodPerformance') || 'Good performance'}</span>
                </div>
                <div className="preview-legend-item">
                  <span className="preview-legend-color" style={{ backgroundColor: '#1B5E20' }} />
                  <span>{t('grid.legend.exceptional') || 'Exceptional'}</span>
                </div>
              </div>
            </div>

            {formData.selfAssessment && (
              <div className="preview-section">
                <h3>{t('selfAssessment.title')}</h3>
                <p>{formData.selfAssessment}</p>
              </div>
            )}

            {formData.comments && (
              <div className="preview-section">
                <h3>{t('comments.title')}</h3>
                <p>{formData.comments}</p>
              </div>
            )}

            <div className="preview-footer">
              <small>Session Code: {sessionCode} | Generated: {new Date().toLocaleDateString()}</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
