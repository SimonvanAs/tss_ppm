import { useLanguage } from '../contexts/LanguageContext';
import { useForm } from '../contexts/FormContext';
import { competencies, levelDescriptions } from '../utils/competencies';
import './HowAxis.css';

export function HowAxis() {
  const { t, language } = useLanguage();
  const { formData, updateCompetencyScore, updateCompetencyNote, validationErrors } = useForm();

  const selectedLevel = formData.tovLevel;
  const levelCompetencies = selectedLevel ? competencies[selectedLevel] : [];

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

              <details className="competency-indicators">
                <summary>Behavioral Indicators</summary>
                <ul>
                  {(comp.indicators[language] || comp.indicators.en).map((indicator, idx) => (
                    <li key={idx}>{indicator}</li>
                  ))}
                </ul>
              </details>
            </div>

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

            <div className="competency-notes">
              <textarea
                className="competency-note-input"
                placeholder={t('howAxis.notePlaceholder')}
                value={formData.competencyNotes?.[comp.id] || ''}
                onChange={(e) => updateCompetencyNote(comp.id, e.target.value)}
                rows={2}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
