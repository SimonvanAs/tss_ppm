import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { reviewsApi } from '../services/api';
import './SignatureModal.css';

/**
 * Modal for signing performance reviews
 * Supports both employee and manager signing workflows
 */
export function SignatureModal({
  isOpen,
  onClose,
  reviewId,
  signatureType, // 'employee' | 'manager'
  reviewSummary, // { employeeName, year, whatScore, howScore }
  onSuccess,
}) {
  const { t } = useLanguage();
  const [acknowledged, setAcknowledged] = useState(false);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const isEmployee = signatureType === 'employee';
  const title = isEmployee
    ? t('signature.employeeTitle') || 'Employee Acknowledgment'
    : t('signature.managerTitle') || 'Manager Counter-Signature';

  const acknowledgmentText = isEmployee
    ? t('signature.acknowledgment.employee') ||
      'I acknowledge that I have reviewed and discussed this performance evaluation with my manager.'
    : t('signature.acknowledgment.manager') ||
      'I confirm that this performance review has been discussed with the employee and represents my assessment of their performance.';

  const handleSign = async () => {
    if (!acknowledged) {
      setError(t('signature.mustAcknowledge') || 'You must acknowledge before signing.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const signFn = isEmployee ? reviewsApi.signAsEmployee : reviewsApi.signAsManager;
      const result = await signFn(reviewId, {
        acknowledgment: true,
        comment: comment.trim() || undefined,
      });

      if (onSuccess) {
        onSuccess(result);
      }
      onClose();
    } catch (err) {
      console.error('Signature failed:', err);
      setError(err.message || (t('signature.error') || 'Failed to sign review'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose();
    }
  };

  return (
    <div
      className="signature-modal-overlay"
      onClick={handleOverlayClick}
      onKeyDown={(e) => e.key === 'Escape' && !isSubmitting && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="signature-modal">
        <div className="signature-modal-header">
          <h2>{title}</h2>
          <button
            className="signature-modal-close"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="signature-modal-content">
          {/* Review Summary */}
          {reviewSummary && (
            <div className="signature-review-summary">
              <h3>{t('signature.reviewSummary') || 'Review Summary'}</h3>
              <div className="signature-summary-grid">
                <div className="signature-summary-item">
                  <span className="signature-summary-label">
                    {t('employee.name') || 'Employee'}
                  </span>
                  <span className="signature-summary-value">{reviewSummary.employeeName}</span>
                </div>
                <div className="signature-summary-item">
                  <span className="signature-summary-label">
                    {t('pages.myReviews.year') || 'Year'}
                  </span>
                  <span className="signature-summary-value">{reviewSummary.year}</span>
                </div>
                {reviewSummary.whatScore && (
                  <div className="signature-summary-item">
                    <span className="signature-summary-label">
                      {t('grid.whatScore') || 'WHAT Score'}
                    </span>
                    <span className="signature-summary-value signature-score">
                      {reviewSummary.whatScore.toFixed(2)}
                    </span>
                  </div>
                )}
                {reviewSummary.howScore && (
                  <div className="signature-summary-item">
                    <span className="signature-summary-label">
                      {t('grid.howScore') || 'HOW Score'}
                    </span>
                    <span className="signature-summary-value signature-score">
                      {reviewSummary.howScore.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Acknowledgment Section */}
          <div className="signature-acknowledgment">
            <p className="signature-acknowledgment-text">{acknowledgmentText}</p>

            <label className="signature-checkbox-label">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => {
                  setAcknowledged(e.target.checked);
                  if (e.target.checked) setError(null);
                }}
                disabled={isSubmitting}
              />
              <span>{t('signature.checkbox') || 'I understand and agree to sign this review'}</span>
            </label>
          </div>

          {/* Optional Comment */}
          <div className="signature-comment">
            <label htmlFor="signature-comment">
              {t('signature.comment') || 'Additional Comments (Optional)'}
            </label>
            <textarea
              id="signature-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('signature.commentPlaceholder') || 'Enter any additional comments...'}
              rows={3}
              maxLength={2000}
              disabled={isSubmitting}
            />
          </div>

          {/* Error Message */}
          {error && <div className="signature-error">{error}</div>}
        </div>

        <div className="signature-modal-footer">
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {t('common.cancel') || 'Cancel'}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSign}
            disabled={!acknowledged || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="loading-spinner-small"></span>
                {t('common.loading') || 'Loading...'}
              </>
            ) : isEmployee ? (
              t('signature.signButton') || 'Sign Review'
            ) : (
              t('signature.counterSignButton') || 'Counter-Sign Review'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
