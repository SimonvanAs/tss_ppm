import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useReview } from '../contexts/ReviewContext';
import { generateReportFromReview } from '../utils/docxGeneratorReview';
import './Actions.css';

/**
 * ReviewActions - Action buttons for API-backed review form
 * Handles stage transitions, DOCX generation, and signatures
 */
export function ReviewActions() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const {
    review,
    goals,
    competencyScores,
    whatScore,
    howScore,
    isSaving,
    manualSave,
    startStage,
    completeStage,
    canCompleteStage,
    canEditGoals,
    canScoreGoals,
  } = useReview();

  const [isGenerating, setIsGenerating] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleDownload = async (isDraft = false) => {
    setIsGenerating(true);
    try {
      await generateReportFromReview(review, goals, competencyScores, language, isDraft);
    } catch (error) {
      console.error('Error generating report:', error);
      alert(t('actions.downloadError') || 'Error generating report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartStage = async (stage) => {
    if (!canCompleteStage()) return;
    setIsTransitioning(true);
    try {
      await startStage(stage);
    } catch (error) {
      console.error('Error starting stage:', error);
      alert(error.message || 'Failed to start stage');
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleCompleteStage = async (stage) => {
    if (!canCompleteStage()) return;
    setIsTransitioning(true);
    try {
      // Save any pending changes first
      await manualSave();
      await completeStage(stage);
    } catch (error) {
      console.error('Error completing stage:', error);
      alert(error.message || 'Failed to complete stage');
    } finally {
      setIsTransitioning(false);
    }
  };

  // Determine available actions based on current stage
  const renderStageActions = () => {
    if (!review) return null;

    const canComplete = canCompleteStage();
    const status = review.status;

    switch (status) {
      case 'DRAFT':
        return canComplete ? (
          <button
            type="button"
            className="action-button primary"
            onClick={() => handleStartStage('GOAL_SETTING')}
            disabled={isTransitioning}
          >
            {isTransitioning ? '...' : t('review.startGoalSetting')}
          </button>
        ) : null;

      case 'GOAL_SETTING':
        return canComplete ? (
          <button
            type="button"
            className="action-button primary"
            onClick={() => handleCompleteStage('GOAL_SETTING')}
            disabled={isTransitioning}
          >
            {isTransitioning ? '...' : t('review.completeGoalSetting')}
          </button>
        ) : null;

      case 'GOAL_SETTING_COMPLETE':
        return canComplete ? (
          <button
            type="button"
            className="action-button primary"
            onClick={() => handleStartStage('MID_YEAR_REVIEW')}
            disabled={isTransitioning}
          >
            {isTransitioning ? '...' : t('review.startMidYear')}
          </button>
        ) : null;

      case 'MID_YEAR_REVIEW':
        return canComplete ? (
          <button
            type="button"
            className="action-button primary"
            onClick={() => handleCompleteStage('MID_YEAR_REVIEW')}
            disabled={isTransitioning}
          >
            {isTransitioning ? '...' : t('review.completeMidYear')}
          </button>
        ) : null;

      case 'MID_YEAR_COMPLETE':
        return canComplete ? (
          <button
            type="button"
            className="action-button primary"
            onClick={() => handleStartStage('END_YEAR_REVIEW')}
            disabled={isTransitioning}
          >
            {isTransitioning ? '...' : t('review.startEndYear')}
          </button>
        ) : null;

      case 'END_YEAR_REVIEW':
        return canComplete ? (
          <button
            type="button"
            className="action-button primary"
            onClick={() => handleCompleteStage('END_YEAR_REVIEW')}
            disabled={isTransitioning}
          >
            {isTransitioning ? '...' : t('review.completeEndYear')}
          </button>
        ) : null;

      case 'PENDING_SIGNATURES':
        return (
          <div className="signature-actions">
            <p className="signature-note">{t('review.awaitingSignatures')}</p>
            {/* TODO: Add signature buttons when backend supports it */}
          </div>
        );

      case 'COMPLETED':
        return (
          <div className="completed-badge">
            <span className="completed-icon">✓</span>
            <span>{t('review.reviewCompleted')}</span>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <section className="section actions-section card">
      <div className="actions-container">
        {/* Save button */}
        <button
          type="button"
          className="action-button secondary"
          onClick={manualSave}
          disabled={isSaving}
        >
          {isSaving ? '...' : t('actions.save')}
        </button>

        {/* Download draft */}
        <button
          type="button"
          className="action-button secondary"
          onClick={() => handleDownload(true)}
          disabled={isGenerating}
        >
          {isGenerating ? '...' : t('actions.saveDraft')}
        </button>

        {/* Download final */}
        <button
          type="button"
          className="action-button primary"
          onClick={() => handleDownload(false)}
          disabled={isGenerating}
        >
          {isGenerating ? '...' : t('actions.download')}
        </button>

        {/* Stage-specific actions */}
        {renderStageActions()}

        {/* Back button */}
        <button
          type="button"
          className="action-button secondary"
          onClick={() => navigate(-1)}
        >
          {t('common.goBack')}
        </button>
      </div>
    </section>
  );
}
