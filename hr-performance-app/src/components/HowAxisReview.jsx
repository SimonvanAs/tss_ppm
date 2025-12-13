import { useLanguage } from '../contexts/LanguageContext';
import { useReview } from '../contexts/ReviewContext';
import { VoiceInputButton } from './VoiceInputButton';
import './HowAxis.css';

/**
 * HowAxisReview - Competencies/HOW axis component using ReviewContext
 * Persists to database via API instead of localStorage
 */
export function HowAxisReview() {
  const { t, language } = useLanguage();
  const {
    review,
    competencyScores,
    updateCompetencyScore,
    canScoreGoals,
  } = useReview();

  // Get competency levels from the review's TOV level
  const tovLevel = review?.tovLevel;
  const competencyLevels = tovLevel?.competencyLevels || [];

  // Determine which score field to use based on stage
  const isEndYear = review?.status === 'END_YEAR_REVIEW' ||
                    review?.status === 'PENDING_SIGNATURES' ||
                    review?.status === 'COMPLETED';
  const scoreField = isEndYear ? 'scoreEndYear' : 'scoreMidYear';
  const notesField = isEndYear ? 'notesEndYear' : 'notesMidYear';

  const canScore = canScoreGoals();

  // Create a lookup for competency scores by competencyLevelId
  const scoresByLevelId = {};
  competencyScores.forEach(cs => {
    scoresByLevelId[cs.competencyLevelId] = cs;
  });

  const handleScoreChange = async (competencyLevelId, score) => {
    const existingScore = scoresByLevelId[competencyLevelId];
    if (!existingScore) {
      console.error('Competency score record not found for:', competencyLevelId);
      return;
    }

    try {
      await updateCompetencyScore(existingScore.id, {
        [scoreField]: score,
      });
    } catch (err) {
      console.error('Failed to update competency score:', err);
    }
  };

  const handleNotesChange = async (competencyLevelId, notes) => {
    const existingScore = scoresByLevelId[competencyLevelId];
    if (!existingScore) {
      console.error('Competency score record not found for:', competencyLevelId);
      return;
    }

    try {
      await updateCompetencyScore(existingScore.id, {
        [notesField]: notes,
      });
    } catch (err) {
      console.error('Failed to update competency notes:', err);
    }
  };

  const handleVoiceInput = (competencyLevelId) => (transcript) => {
    const existingScore = scoresByLevelId[competencyLevelId];
    const currentNote = existingScore?.[notesField] || '';
    handleNotesChange(competencyLevelId, currentNote ? `${currentNote} ${transcript}` : transcript);
  };

  if (!tovLevel) {
    return (
      <section className="section how-axis card">
        <h2 className="section-title">{t('howAxis.title')}</h2>
        <div className="no-level-selected">
          <p>{t('validation.selectTovLevel')}</p>
        </div>
      </section>
    );
  }

  // Check for veto (any competency with score 1)
  const hasVeto = competencyScores.some(cs => cs[scoreField] === 1);

  return (
    <section className="section how-axis card">
      <h2 className="section-title">{t('howAxis.title')}</h2>

      <div className="level-info">
        <div className="level-badge">
          <span className="level-label">{t('howAxis.selectedLevel')}:</span>
          <span className="level-value">{tovLevel.code}</span>
        </div>
        <p className="level-description">
          {tovLevel.name || tovLevel.description}
        </p>
      </div>

      <div className="veto-warning">
        <span className="warning-icon">⚠️</span>
        <span>{t('howAxis.vetoWarning')}</span>
      </div>

      {hasVeto && (
        <div className="veto-active-warning">
          <span className="warning-icon">🚨</span>
          <span>{t('howAxis.vetoApplied')}</span>
        </div>
      )}

      <div className="competencies-list">
        {competencyLevels.map((cl) => {
          const competency = cl.competency;
          const existingScore = scoresByLevelId[cl.id];
          const currentScore = existingScore?.[scoreField];
          const currentNotes = existingScore?.[notesField] || '';

          // Get localized content
          const title = competency?.title?.[language] || competency?.title?.en || competency?.name || 'Competency';
          const indicators = cl.behavioralIndicators?.[language] || cl.behavioralIndicators?.en || [];

          return (
            <div key={cl.id} className={`competency-item ${currentScore === 1 ? 'veto-competency' : ''}`}>
              <div className="competency-header">
                <div className="competency-category">
                  <span className="category-name">{competency?.category || 'Category'}</span>
                  <span className="subcategory-name">{competency?.subcategory || ''}</span>
                </div>
              </div>

              <div className="competency-content">
                <p className="competency-title">{title}</p>

                {indicators.length > 0 && (
                  <details className="competency-indicators">
                    <summary>{t('howAxis.behavioralIndicators')}</summary>
                    <ul>
                      {indicators.map((indicator, idx) => (
                        <li key={idx}>{indicator}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>

              <div className="competency-scoring">
                <label className="score-label">{t('whatAxis.score')}:</label>
                <div className="score-buttons">
                  {[1, 2, 3].map((score) => (
                    <button
                      key={score}
                      type="button"
                      className={`score-button ${currentScore === score ? 'selected' : ''} ${score === 1 && currentScore === 1 ? 'veto' : ''}`}
                      onClick={() => canScore && handleScoreChange(cl.id, score)}
                      title={t(`scores.${score}`)}
                      disabled={!canScore}
                    >
                      {score}
                    </button>
                  ))}
                </div>
                <span className="score-description">
                  {currentScore && t(`scores.${currentScore}`)}
                </span>
              </div>

              <div className="competency-notes">
                <div className="textarea-with-voice">
                  <textarea
                    className="competency-note-input"
                    placeholder={t('howAxis.notePlaceholder')}
                    value={currentNotes}
                    onChange={(e) => handleNotesChange(cl.id, e.target.value)}
                    rows={2}
                    disabled={!canScore}
                  />
                  {canScore && <VoiceInputButton onTranscript={handleVoiceInput(cl.id)} />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
