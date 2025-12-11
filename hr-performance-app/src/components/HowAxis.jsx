import { useLanguage } from '../contexts/LanguageContext';
import { useForm } from '../contexts/FormContext';
import { VoiceInputButton } from './VoiceInputButton';
import { competencies, levelDescriptions } from '../utils/competencies';
import { calculateCompetencyScoreFromBehaviors } from '../utils/scoring';
import './HowAxis.css';

export function HowAxis({ detailedModeEnabled = true }) {
  const { t, language } = useLanguage();
  const {
    formData,
    updateCompetencyScore,
    updateCompetencyNote,
    updateBehaviorScore,
    setDetailedBehaviorMode,
    validationErrors
  } = useForm();

  const selectedLevel = formData.tovLevel;
  const levelCompetencies = selectedLevel ? competencies[selectedLevel] : [];
  const detailedMode = formData.detailedBehaviorMode && detailedModeEnabled;

  const handleVoiceInput = (competencyId) => (transcript) => {
    const currentNote = formData.competencyNotes?.[competencyId] || '';
    updateCompetencyNote(competencyId, currentNote ? `${currentNote} ${transcript}` : transcript);
  };

  if (!selectedLevel) {
    return (
      <section className="section how-axis">
        <h2 className="section-title">{t('howAxis.title')}</h2>
        <div className="no-level-selected">
          <p>{t('validation.selectTovLevel')}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="section how-axis">
      <h2 className="section-title">{t('howAxis.title')}</h2>

      <div className="level-info">
        <div className="level-badge">
          <span className="level-label">{t('howAxis.selectedLevel')}:</span>
          <span className="level-value">{selectedLevel}</span>
        </div>
        <p className="level-description">
          {levelDescriptions[selectedLevel]?.[language] || levelDescriptions[selectedLevel]?.en}
        </p>
      </div>

      <div className="veto-warning">
        <span className="warning-icon">⚠️</span>
        <span>{t('howAxis.vetoWarning')}</span>
      </div>

      {detailedModeEnabled && (
        <div className="scoring-mode-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={detailedMode}
              onChange={(e) => setDetailedBehaviorMode(e.target.checked)}
            />
            <span className="toggle-text">{t('howAxis.detailedMode')}</span>
          </label>
          <span className="toggle-hint">
            {detailedMode ? t('howAxis.scoreBehaviors') : t('howAxis.simpleMode')}
          </span>
        </div>
      )}

      <div className="competencies-list">
        {levelCompetencies.map((comp) => (
          <div key={comp.id} className="competency-item">
            <div className="competency-header">
              <div className="competency-category">
                <span className="category-name">{comp.category}</span>
                <span className="subcategory-name">{comp.subcategory}</span>
              </div>
            </div>

            <div className="competency-content">
              <p className="competency-title">
                {comp.title[language] || comp.title.en}
              </p>

              {detailedMode ? (
                <div className="behavior-scoring-section">
                  <div className="behavior-list">
                    {(comp.indicators[language] || comp.indicators.en).map((indicator, idx) => {
                      const behaviorScore = formData.behaviorScores?.[comp.id]?.[idx];
                      return (
                        <div key={idx} className={`behavior-item ${behaviorScore === 1 ? 'veto-behavior' : ''}`}>
                          <span className="behavior-text">{idx + 1}. {indicator}</span>
                          <div className="behavior-score-buttons">
                            {[1, 2, 3].map((score) => (
                              <button
                                key={score}
                                type="button"
                                className={`behavior-score-button ${behaviorScore === score ? 'selected' : ''} ${score === 1 && behaviorScore === 1 ? 'veto' : ''}`}
                                onClick={() => updateBehaviorScore(comp.id, idx, score)}
                                title={t(`scores.${score}`)}
                              >
                                {score}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {(() => {
                    const indicators = comp.indicators[language] || comp.indicators.en;
                    const result = calculateCompetencyScoreFromBehaviors(
                      formData.behaviorScores?.[comp.id],
                      indicators.length
                    );
                    if (result) {
                      // Auto-update competency score when all behaviors are scored
                      if (formData.competencyScores?.[comp.id] !== result.score) {
                        updateCompetencyScore(comp.id, result.score);
                      }
                      return (
                        <div className={`computed-score ${result.hasVeto ? 'has-veto' : ''}`}>
                          <span className="computed-label">{t('howAxis.computedScore')}:</span>
                          <span className="computed-value">{result.score}</span>
                          <span className="computed-average">({t('howAxis.average')}: {result.average})</span>
                          {result.hasVeto && (
                            <span className="veto-indicator">{t('howAxis.vetoApplied')}</span>
                          )}
                        </div>
                      );
                    }
                    return (
                      <div className="computed-score incomplete">
                        <span className="computed-label">{t('howAxis.allBehaviorsRequired')}</span>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <details className="competency-indicators">
                  <summary>{t('howAxis.behavioralIndicators')}</summary>
                  <ul>
                    {(comp.indicators[language] || comp.indicators.en).map((indicator, idx) => (
                      <li key={idx}>{indicator}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>

            {!detailedMode && (
              <div className="competency-scoring">
                <label className="score-label">{t('whatAxis.score')}:</label>
                <div className="score-buttons">
                  {[1, 2, 3].map((score) => (
                    <button
                      key={score}
                      type="button"
                      className={`score-button ${formData.competencyScores?.[comp.id] === score ? 'selected' : ''} ${score === 1 && formData.competencyScores?.[comp.id] === 1 ? 'veto' : ''}`}
                      onClick={() => updateCompetencyScore(comp.id, score)}
                      title={t(`scores.${score}`)}
                    >
                      {score}
                    </button>
                  ))}
                </div>
                <span className="score-description">
                  {formData.competencyScores?.[comp.id] && t(`scores.${formData.competencyScores[comp.id]}`)}
                </span>
              </div>
            )}

            <div className="competency-notes">
              <div className="textarea-with-voice">
                <textarea
                  className="competency-note-input"
                  placeholder={t('howAxis.notePlaceholder')}
                  value={formData.competencyNotes?.[comp.id] || ''}
                  onChange={(e) => updateCompetencyNote(comp.id, e.target.value)}
                  rows={2}
                />
                <VoiceInputButton onTranscript={handleVoiceInput(comp.id)} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
