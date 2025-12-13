import { useLanguage } from '../contexts/LanguageContext';
import { useReview } from '../contexts/ReviewContext';
import { VoiceInputButton } from './VoiceInputButton';
import { calculateTotalWeight, validateWeights, GOAL_TYPES, SCF_VALUES } from '../utils/scoring';
import './WhatAxis.css';

/**
 * WhatAxisReview - Goals/WHAT axis component using ReviewContext
 * Persists to database via API instead of localStorage
 */
export function WhatAxisReview({ karEnabled = true, scfEnabled = true }) {
  const { t } = useLanguage();
  const {
    review,
    goals,
    addGoal,
    updateGoal,
    removeGoal,
    reorderGoals,
    canEditGoals,
    canScoreGoals,
  } = useReview();

  // Determine which score field to use based on stage
  const isEndYear = review?.status === 'END_YEAR_REVIEW' ||
                    review?.status === 'PENDING_SIGNATURES' ||
                    review?.status === 'COMPLETED';
  const scoreField = isEndYear ? 'scoreEndYear' : 'scoreMidYear';

  const totalWeight = calculateTotalWeight(goals.map(g => ({ ...g, weight: String(g.weight || 0) })));
  const isValidWeight = validateWeights(goals.map(g => ({ ...g, weight: String(g.weight || 0) })));
  const scfGoals = goals.filter(g => g.goalType === GOAL_TYPES.SCF);
  const hasScfFail = scfGoals.some(g => g.scfValue === SCF_VALUES.FAIL);

  const canEdit = canEditGoals();
  const canScore = canScoreGoals();

  const handleDragStart = (e, index) => {
    if (!canEdit) return;
    e.dataTransfer.setData('text/plain', index);
    e.currentTarget.classList.add('dragging');
  };

  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging');
  };

  const handleDragOver = (e) => {
    if (!canEdit) return;
    e.preventDefault();
  };

  const handleDrop = (e, toIndex) => {
    if (!canEdit) return;
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

  const handleAddGoal = async (goalType) => {
    try {
      await addGoal({
        title: '',
        description: '',
        weight: 0,
        goalType: goalType || GOAL_TYPES.STANDARD,
        sortOrder: goals.length,
      });
    } catch (err) {
      console.error('Failed to add goal:', err);
    }
  };

  const handleUpdateGoal = async (goalId, updates) => {
    try {
      // Handle score field mapping
      if ('score' in updates) {
        updates[scoreField] = updates.score ? parseInt(updates.score) : null;
        delete updates.score;
      }
      // Handle weight conversion
      if ('weight' in updates) {
        updates.weight = parseInt(updates.weight) || 0;
      }
      await updateGoal(goalId, updates);
    } catch (err) {
      console.error('Failed to update goal:', err);
    }
  };

  const handleRemoveGoal = async (goalId) => {
    try {
      await removeGoal(goalId);
    } catch (err) {
      console.error('Failed to remove goal:', err);
    }
  };

  return (
    <section className="section what-axis card">
      <h2 className="section-title">{t('whatAxis.title')}</h2>

      {/* SCF VETO Warning */}
      {hasScfFail && (
        <div className="scf-veto-warning">
          <span className="warning-icon">⚠️</span>
          <span>{t('whatAxis.scfVetoWarning')}</span>
        </div>
      )}

      <div className="goals-list">
        {goals.map((goal, index) => {
          const goalScore = goal[scoreField];
          return (
            <div
              key={goal.id}
              className={`goal-item ${goal.goalType === GOAL_TYPES.KAR ? 'kar-goal' : ''} ${goal.goalType === GOAL_TYPES.SCF ? 'scf-goal' : ''} ${goal.goalType === GOAL_TYPES.SCF && goal.scfValue === SCF_VALUES.FAIL ? 'scf-fail' : ''}`}
              draggable={canEdit && goal.goalType !== GOAL_TYPES.SCF}
              onDragStart={(e) => goal.goalType !== GOAL_TYPES.SCF && handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
            >
              <div className="goal-header">
                {canEdit && goal.goalType !== GOAL_TYPES.SCF && (
                  <span className="drag-handle" title={t('whatAxis.dragToReorder')}>
                    ☰
                  </span>
                )}
                <span className="goal-number">#{index + 1}</span>
                {canEdit && (karEnabled || scfEnabled) && (
                  <select
                    value={goal.goalType || GOAL_TYPES.STANDARD}
                    onChange={(e) => handleUpdateGoal(goal.id, {
                      goalType: e.target.value,
                      scfValue: e.target.value === GOAL_TYPES.SCF ? '' : undefined
                    })}
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
                {canEdit && goals.length > 1 && (
                  <button
                    type="button"
                    className="remove-goal"
                    onClick={() => handleRemoveGoal(goal.id)}
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
                      value={goal.title || ''}
                      onChange={(e) => handleUpdateGoal(goal.id, { title: e.target.value })}
                      placeholder={t('whatAxis.goalTitlePlaceholder')}
                      disabled={!canEdit}
                    />
                    {canEdit && <VoiceInputButton onTranscript={handleVoiceInput(goal.id, 'title')} />}
                  </div>
                </div>

                <div className="form-group">
                  <label>{t('whatAxis.description')}</label>
                  <div className="textarea-with-voice">
                    <textarea
                      value={goal.description || ''}
                      onChange={(e) => handleUpdateGoal(goal.id, { description: e.target.value })}
                      placeholder={t('whatAxis.descriptionPlaceholder')}
                      rows={3}
                      disabled={!canEdit}
                    />
                    {canEdit && <VoiceInputButton onTranscript={handleVoiceInput(goal.id, 'description')} />}
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
                          onClick={() => canScore && handleUpdateGoal(goal.id, { scfValue: SCF_VALUES.PASS })}
                          disabled={!canScore}
                        >
                          ✓ {t('whatAxis.scfPass')}
                        </button>
                        <button
                          type="button"
                          className={`scf-button fail ${goal.scfValue === SCF_VALUES.FAIL ? 'selected' : ''}`}
                          onClick={() => canScore && handleUpdateGoal(goal.id, { scfValue: SCF_VALUES.FAIL })}
                          disabled={!canScore}
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
                        value={goalScore || ''}
                        onChange={(e) => handleUpdateGoal(goal.id, { score: e.target.value })}
                        className={!goalScore && goal.title?.trim() ? 'needs-input' : ''}
                        disabled={!canScore}
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
                        value={goal.weight || ''}
                        onChange={(e) => handleUpdateGoal(goal.id, { weight: e.target.value })}
                        className={!goal.weight && goal.title?.trim() ? 'needs-input' : ''}
                        disabled={!canEdit}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="goals-footer">
        <div className="weight-summary">
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

        {canEdit && goals.length < 9 ? (
          <div className="add-goal-buttons">
            <button
              type="button"
              className="add-goal-button"
              onClick={() => handleAddGoal(GOAL_TYPES.STANDARD)}
            >
              + {t('whatAxis.addGoal')}
            </button>
            {karEnabled && (
              <button
                type="button"
                className="add-goal-button kar"
                onClick={() => handleAddGoal(GOAL_TYPES.KAR)}
                title={t('whatAxis.karDescription')}
              >
                + {t('whatAxis.addKar')}
              </button>
            )}
            {scfEnabled && (
              <button
                type="button"
                className="add-goal-button scf"
                onClick={() => handleAddGoal(GOAL_TYPES.SCF)}
                title={t('whatAxis.scfDescription')}
              >
                + {t('whatAxis.addScf')}
              </button>
            )}
          </div>
        ) : canEdit ? (
          <span className="max-goals">{t('whatAxis.maxGoals')}</span>
        ) : null}
      </div>
    </section>
  );
}
