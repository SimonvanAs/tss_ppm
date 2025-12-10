import { useLanguage } from '../contexts/LanguageContext';
import { useForm } from '../contexts/FormContext';
import { VoiceInputButton } from './VoiceInputButton';
import { calculateTotalWeight, validateWeights, calculateKarWeight, calculateStandardWeight, GOAL_TYPES, SCF_VALUES } from '../utils/scoring';
import './WhatAxis.css';

export function WhatAxis({ karEnabled = true, scfEnabled = true }) {
  const { t } = useLanguage();
  const { formData, updateGoal, addGoal, removeGoal, reorderGoals, validationErrors } = useForm();

  const goals = formData.goals || [];
  const totalWeight = calculateTotalWeight(goals);
  const isValidWeight = validateWeights(goals);
  const karWeight = calculateKarWeight(goals);
  const standardWeight = calculateStandardWeight(goals);
  const scfGoals = goals.filter(g => g.goalType === GOAL_TYPES.SCF);
  const hasScfFail = scfGoals.some(g => g.scfValue === SCF_VALUES.FAIL);

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

      {/* SCF VETO Warning */}
      {hasScfFail && (
        <div className="scf-veto-warning">
          <span className="warning-icon">⚠️</span>
          <span>{t('whatAxis.scfVetoWarning')}</span>
        </div>
      )}

      <div className="goals-list">
        {goals.map((goal, index) => (
          <div
            key={goal.id}
            className={`goal-item ${goal.goalType === GOAL_TYPES.KAR ? 'kar-goal' : ''} ${goal.goalType === GOAL_TYPES.SCF ? 'scf-goal' : ''} ${goal.goalType === GOAL_TYPES.SCF && goal.scfValue === SCF_VALUES.FAIL ? 'scf-fail' : ''}`}
            draggable={goal.goalType !== GOAL_TYPES.SCF}
            onDragStart={(e) => goal.goalType !== GOAL_TYPES.SCF && handleDragStart(e, index)}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
          >
            <div className="goal-header">
              {goal.goalType !== GOAL_TYPES.SCF && (
                <span className="drag-handle" title={t('whatAxis.dragToReorder')}>
                  ☰
                </span>
              )}
              <span className="goal-number">#{index + 1}</span>
              {(karEnabled || scfEnabled) && (
                <select
                  value={goal.goalType || GOAL_TYPES.STANDARD}
                  onChange={(e) => updateGoal(goal.id, { goalType: e.target.value, scfValue: e.target.value === GOAL_TYPES.SCF ? '' : undefined })}
                  className="goal-type-select"
                  title={t('whatAxis.goalType')}
                >
                  <option value={GOAL_TYPES.STANDARD}>{t('whatAxis.standard')}</option>
                  {karEnabled && <option value={GOAL_TYPES.KAR}>{t('whatAxis.kar')}</option>}
                  {scfEnabled && <option value={GOAL_TYPES.SCF}>{t('whatAxis.scf')}</option>}
                </select>
              )}
              {goal.goalType === GOAL_TYPES.KAR && (
                <span className="kar-badge">KAR</span>
              )}
              {goal.goalType === GOAL_TYPES.SCF && (
                <span className={`scf-badge ${goal.scfValue === SCF_VALUES.FAIL ? 'fail' : goal.scfValue === SCF_VALUES.PASS ? 'pass' : ''}`}>
                  SCF {goal.scfValue === SCF_VALUES.PASS ? '✓' : goal.scfValue === SCF_VALUES.FAIL ? '✗' : ''}
                </span>
              )}
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

              {goal.goalType === GOAL_TYPES.SCF ? (
                <div className="goal-scoring scf-scoring">
                  <div className="form-group scf-group">
                    <label>{t('whatAxis.scfResult')}</label>
                    <div className="scf-buttons">
                      <button
                        type="button"
                        className={`scf-button pass ${goal.scfValue === SCF_VALUES.PASS ? 'selected' : ''}`}
                        onClick={() => updateGoal(goal.id, { scfValue: SCF_VALUES.PASS })}
                      >
                        ✓ {t('whatAxis.scfPass')}
                      </button>
                      <button
                        type="button"
                        className={`scf-button fail ${goal.scfValue === SCF_VALUES.FAIL ? 'selected' : ''}`}
                        onClick={() => updateGoal(goal.id, { scfValue: SCF_VALUES.FAIL })}
                      >
                        ✗ {t('whatAxis.scfFail')}
                      </button>
                    </div>
                    {goal.scfValue === SCF_VALUES.FAIL && (
                      <p className="scf-fail-note">{t('whatAxis.scfFailNote')}</p>
                    )}
                  </div>
                </div>
              ) : (
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
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="goals-footer">
        <div className="weight-summary">
          {karEnabled && (standardWeight > 0 || karWeight > 0) && (
            <div className="weight-breakdown">
              <span className="weight-item">{t('whatAxis.standardGoals')}: {standardWeight}%</span>
              <span className="weight-item kar">{t('whatAxis.karObjectives')}: {karWeight}%</span>
            </div>
          )}
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
        </div>

        {goals.length < 9 ? (
          <div className="add-goal-buttons">
            <button
              type="button"
              className="add-goal-button"
              onClick={() => addGoal(GOAL_TYPES.STANDARD)}
            >
              + {t('whatAxis.addGoal')}
            </button>
            {karEnabled && (
              <button
                type="button"
                className="add-goal-button kar"
                onClick={() => addGoal(GOAL_TYPES.KAR)}
                title={t('whatAxis.karDescription')}
              >
                + {t('whatAxis.addKar')}
              </button>
            )}
            {scfEnabled && (
              <button
                type="button"
                className="add-goal-button scf"
                onClick={() => addGoal(GOAL_TYPES.SCF)}
                title={t('whatAxis.scfDescription')}
              >
                + {t('whatAxis.addScf')}
              </button>
            )}
          </div>
        ) : (
          <span className="max-goals">{t('whatAxis.maxGoals')}</span>
        )}
      </div>
    </section>
  );
}
