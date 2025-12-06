import { useLanguage } from '../contexts/LanguageContext';
import { useForm } from '../contexts/FormContext';
import { VoiceInputButton } from './VoiceInputButton';
import { calculateTotalWeight, validateWeights } from '../utils/scoring';
import './WhatAxis.css';

export function WhatAxis() {
  const { t } = useLanguage();
  const { formData, updateGoal, addGoal, removeGoal, reorderGoals, validationErrors } = useForm();

  const goals = formData.goals || [];
  const totalWeight = calculateTotalWeight(goals);
  const isValidWeight = validateWeights(goals);

  const handleDragStart = (e, index) => {
    e.dataTransfer.setData('text/plain', index);
    e.currentTarget.classList.add('dragging');
  };

  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, toIndex) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (fromIndex !== toIndex) {
      reorderGoals(fromIndex, toIndex);
    }
  };

  const handleVoiceInput = (goalId, field) => (transcript) => {
    const goal = goals.find(g => g.id === goalId);
    if (goal) {
      const currentValue = goal[field] || '';
      updateGoal(goalId, {
        [field]: currentValue ? `${currentValue} ${transcript}` : transcript
      });
    }
  };

  return (
    <section className="section what-axis">
      <h2 className="section-title">{t('whatAxis.title')}</h2>

      <div className="goals-list">
        {goals.map((goal, index) => (
          <div
            key={goal.id}
            className="goal-item"
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
          >
            <div className="goal-header">
              <span className="drag-handle" title={t('whatAxis.dragToReorder')}>
                ☰
              </span>
              <span className="goal-number">#{index + 1}</span>
              {goals.length > 1 && (
                <button
                  type="button"
                  className="remove-goal"
                  onClick={() => removeGoal(goal.id)}
                  title={t('whatAxis.removeGoal')}
                >
                  ×
                </button>
              )}
            </div>

            <div className="goal-content">
              <div className="form-group">
                <label>{t('whatAxis.goalTitle')}</label>
                <div className="input-with-voice">
                  <input
                    type="text"
                    value={goal.title}
                    onChange={(e) => updateGoal(goal.id, { title: e.target.value })}
                    placeholder={t('whatAxis.goalTitlePlaceholder')}
                  />
                  <VoiceInputButton onTranscript={handleVoiceInput(goal.id, 'title')} />
                </div>
              </div>

              <div className="form-group">
                <label>{t('whatAxis.description')}</label>
                <div className="textarea-with-voice">
                  <textarea
                    value={goal.description}
                    onChange={(e) => updateGoal(goal.id, { description: e.target.value })}
                    placeholder={t('whatAxis.descriptionPlaceholder')}
                    rows={3}
                  />
                  <VoiceInputButton onTranscript={handleVoiceInput(goal.id, 'description')} />
                </div>
              </div>

              <div className="goal-scoring">
                <div className="form-group score-group">
                  <label>{t('whatAxis.score')}</label>
                  <select
                    value={goal.score}
                    onChange={(e) => updateGoal(goal.id, { score: e.target.value })}
                    className={!goal.score && goal.title.trim() ? 'needs-input' : ''}
                  >
                    <option value="">-</option>
                    <option value="1">1 - {t('scores.1')}</option>
                    <option value="2">2 - {t('scores.2')}</option>
                    <option value="3">3 - {t('scores.3')}</option>
                  </select>
                </div>

                <div className="form-group weight-group">
                  <label>{t('whatAxis.weight')} (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={goal.weight}
                    onChange={(e) => updateGoal(goal.id, { weight: e.target.value })}
                    className={!goal.weight && goal.title.trim() ? 'needs-input' : ''}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="goals-footer">
        <div className="weight-total">
          <span className={`total-label ${!isValidWeight && totalWeight > 0 ? 'error' : ''}`}>
            {t('whatAxis.totalWeight')}: {totalWeight}%
          </span>
          {totalWeight > 0 && !isValidWeight && (
            <span className="weight-error">{t('whatAxis.weightError')}</span>
          )}
          {isValidWeight && totalWeight === 100 && (
            <span className="weight-valid">✓</span>
          )}
        </div>

        {goals.length < 9 ? (
          <button
            type="button"
            className="add-goal-button"
            onClick={addGoal}
          >
            + {t('whatAxis.addGoal')}
          </button>
        ) : (
          <span className="max-goals">{t('whatAxis.maxGoals')}</span>
        )}
      </div>
    </section>
  );
}
