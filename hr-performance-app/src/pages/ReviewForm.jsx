import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { ReviewProvider, useReview } from '../contexts/ReviewContext';
import { WhatAxisReview } from '../components/WhatAxisReview';
import { HowAxisReview } from '../components/HowAxisReview';
import { PerformanceGridReview } from '../components/PerformanceGridReview';
import { ReviewActions } from '../components/ReviewActions';
import { VoiceInputButton } from '../components/VoiceInputButton';
import './Pages.css';
import './ReviewForm.css';

/**
 * ReviewForm - API-backed review form page
 * Wraps content with ReviewProvider for the specific reviewId
 */
export function ReviewForm() {
  const { reviewId } = useParams();

  return (
    <ReviewProvider reviewId={reviewId}>
      <ReviewFormContent />
    </ReviewProvider>
  );
}

/**
 * Inner content component that consumes ReviewContext
 */
function ReviewFormContent() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const {
    review,
    goals,
    competencyScores,
    isLoading,
    isSaving,
    error,
    isDirty,
    whatScore,
    howScore,
    hasScfVeto,
    updateReview,
  } = useReview();

  // Loading state
  if (isLoading) {
    return (
      <div className="page">
        <div className="review-loading">
          <div className="loading-spinner-small" />
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="page">
        <div className="card review-error">
          <div className="error-icon">⚠️</div>
          <h2>{t('common.error')}</h2>
          <p>{error}</p>
          <button
            className="admin-btn admin-btn-primary"
            onClick={() => navigate(-1)}
          >
            {t('common.goBack')}
          </button>
        </div>
      </div>
    );
  }

  // Not found state
  if (!review) {
    return (
      <div className="page">
        <div className="card review-not-found">
          <div className="error-icon">🔍</div>
          <h2>{t('review.notFound')}</h2>
          <p>{t('review.notFoundDesc')}</p>
          <button
            className="admin-btn admin-btn-primary"
            onClick={() => navigate('/my-reviews')}
          >
            {t('common.goBack')}
          </button>
        </div>
      </div>
    );
  }

  // Get employee and manager info from review
  const employee = review.employee || {};
  const manager = review.manager || {};
  const tovLevel = review.tovLevel || {};

  // Stage display
  const stageLabels = {
    DRAFT: t('review.stages.draft'),
    GOAL_SETTING: t('review.stages.goalSetting'),
    GOAL_SETTING_COMPLETE: t('review.stages.goalSettingComplete'),
    MID_YEAR_REVIEW: t('review.stages.midYear'),
    MID_YEAR_COMPLETE: t('review.stages.midYearComplete'),
    END_YEAR_REVIEW: t('review.stages.endYear'),
    PENDING_SIGNATURES: t('review.stages.pendingSignatures'),
    COMPLETED: t('review.stages.completed'),
  };

  return (
    <div className="page review-form-page">
      {/* Back Navigation */}
      <div className="review-back-nav">
        <button
          className="back-link"
          onClick={() => navigate(-1)}
        >
          ← {t('common.goBack')}
        </button>
        <div className="save-status">
          {isSaving && (
            <span className="save-status-saving">
              <span className="save-spinner" />
              {t('review.saving')}
            </span>
          )}
          {!isSaving && isDirty && (
            <span className="save-status-unsaved">{t('review.unsaved')}</span>
          )}
          {!isSaving && !isDirty && !isLoading && (
            <span className="save-status-saved">✓ {t('review.saved')}</span>
          )}
        </div>
      </div>

      {/* Review Header */}
      <div className="review-header-card card">
        <div className="review-header-content">
          <div className="review-employee-info">
            <h1 className="review-employee-name">
              {employee.firstName} {employee.lastName}
            </h1>
            <p className="review-employee-details">
              {employee.functionTitle?.name || employee.functionTitle} | {review.year}
            </p>
          </div>
          <div className="review-meta">
            <span className={`review-stage-badge stage-${review.status?.toLowerCase()}`}>
              {stageLabels[review.status] || review.status}
            </span>
            <span className="review-tov-level">
              {t('employee.tovLevel')}: {tovLevel.code || review.tovLevelId}
            </span>
          </div>
        </div>
        {manager.firstName && (
          <p className="review-manager-info">
            {t('employee.managerName')}: {manager.firstName} {manager.lastName}
          </p>
        )}
      </div>

      {/* Summary Section */}
      <SummarySection review={review} updateReview={updateReview} />

      {/* Goals (WHAT axis) */}
      <WhatAxisReview />

      {/* Competencies (HOW axis) */}
      <HowAxisReview />

      {/* Performance Grid */}
      <PerformanceGridReview />

      {/* Self Assessment */}
      <SelfAssessmentSection review={review} updateReview={updateReview} />

      {/* Comments */}
      <CommentsSection review={review} updateReview={updateReview} />

      {/* Actions */}
      <ReviewActions />
    </div>
  );
}

/**
 * Summary section for review overview
 */
function SummarySection({ review, updateReview }) {
  const { t } = useLanguage();

  const handleVoiceInput = (transcript) => {
    const current = review.summary || '';
    updateReview({ summary: current ? `${current} ${transcript}` : transcript });
  };

  return (
    <section className="section card">
      <h2 className="section-title">{t('summary.title')}</h2>
      <div className="form-group">
        <div className="textarea-with-voice">
          <textarea
            value={review.summary || ''}
            onChange={(e) => updateReview({ summary: e.target.value })}
            placeholder={t('summary.placeholder')}
            rows={3}
          />
          <VoiceInputButton onTranscript={handleVoiceInput} />
        </div>
      </div>
    </section>
  );
}

/**
 * Self assessment section
 */
function SelfAssessmentSection({ review, updateReview }) {
  const { t } = useLanguage();
  const { canEditGoals } = useReview();

  // Determine which field to use based on stage
  const isEndYear = review.status === 'END_YEAR_REVIEW' || review.status === 'PENDING_SIGNATURES' || review.status === 'COMPLETED';
  const fieldName = isEndYear ? 'employeeSummaryEndYear' : 'employeeSummaryMidYear';
  const value = review[fieldName] || '';

  const handleChange = (newValue) => {
    updateReview({ [fieldName]: newValue });
  };

  const handleVoiceInput = (transcript) => {
    handleChange(value ? `${value} ${transcript}` : transcript);
  };

  return (
    <section className="section card">
      <h2 className="section-title">{t('selfAssessment.title')}</h2>
      <div className="form-group">
        <div className="textarea-with-voice">
          <textarea
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={t('selfAssessment.placeholder')}
            rows={5}
          />
          <VoiceInputButton onTranscript={handleVoiceInput} />
        </div>
      </div>
    </section>
  );
}

/**
 * Manager comments section
 */
function CommentsSection({ review, updateReview }) {
  const { t } = useLanguage();
  const { canScoreGoals } = useReview();

  // Determine which field to use based on stage
  const isEndYear = review.status === 'END_YEAR_REVIEW' || review.status === 'PENDING_SIGNATURES' || review.status === 'COMPLETED';
  const fieldName = isEndYear ? 'managerSummaryEndYear' : 'managerSummaryMidYear';
  const value = review[fieldName] || '';

  const handleChange = (newValue) => {
    updateReview({ [fieldName]: newValue });
  };

  const handleVoiceInput = (transcript) => {
    handleChange(value ? `${value} ${transcript}` : transcript);
  };

  // Only managers can add comments
  if (!canScoreGoals()) {
    if (!value) return null;
    return (
      <section className="section card">
        <h2 className="section-title">{t('comments.title')}</h2>
        <div className="readonly-content">
          <p>{value}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="section card">
      <h2 className="section-title">{t('comments.title')}</h2>
      <div className="form-group">
        <div className="textarea-with-voice">
          <textarea
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={t('comments.placeholder')}
            rows={5}
          />
          <VoiceInputButton onTranscript={handleVoiceInput} />
        </div>
      </div>
    </section>
  );
}
