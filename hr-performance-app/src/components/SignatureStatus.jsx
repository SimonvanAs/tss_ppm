import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { reviewsApi } from '../services/api';
import { SignatureModal } from './SignatureModal';
import { generateSignedReviewPDF } from '../utils/signedPdfGenerator';
import './SignatureModal.css';

/**
 * Displays signature status and provides sign/counter-sign actions
 */
export function SignatureStatus({
  reviewId,
  reviewStatus,
  reviewSummary, // { employeeName, year, whatScore, howScore }
  reviewData, // Full review data for PDF generation (optional)
  onStatusChange,
  compact = false, // Compact mode for table rows
}) {
  const { t, language } = useLanguage();
  const [signatureData, setSignatureData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [signatureType, setSignatureType] = useState(null); // 'employee' | 'manager'

  // Load signature status when review has signature-related status
  useEffect(() => {
    if (
      reviewId &&
      ['PENDING_EMPLOYEE_SIGNATURE', 'PENDING_MANAGER_SIGNATURE', 'COMPLETED'].includes(reviewStatus)
    ) {
      loadSignatureStatus();
    }
  }, [reviewId, reviewStatus]);

  const loadSignatureStatus = async () => {
    try {
      setIsLoading(true);
      const data = await reviewsApi.getSignatureStatus(reviewId);
      setSignatureData(data);
    } catch (err) {
      console.error('Failed to load signature status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignClick = (type) => {
    setSignatureType(type);
    setShowSignModal(true);
  };

  const handleSignSuccess = (result) => {
    loadSignatureStatus();
    if (onStatusChange) {
      onStatusChange(result.status);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  const handleDownloadPDF = async () => {
    if (!reviewData && !reviewSummary) {
      console.error('No review data available for PDF generation');
      return;
    }

    setIsDownloading(true);
    try {
      // Use reviewData if available, otherwise construct from reviewSummary
      const pdfReviewData = reviewData || {
        id: reviewId,
        employeeName: reviewSummary.employeeName,
        year: reviewSummary.year,
        whatScoreEndYear: reviewSummary.whatScore,
        howScoreEndYear: reviewSummary.howScore,
      };

      await generateSignedReviewPDF(pdfReviewData, signatureData, { language });
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  // Compact view for table rows
  if (compact) {
    return (
      <>
        <CompactSignatureStatus
          reviewStatus={reviewStatus}
          signatureData={signatureData}
          isLoading={isLoading}
          onSignClick={handleSignClick}
          t={t}
        />
        <SignatureModal
          isOpen={showSignModal}
          onClose={() => setShowSignModal(false)}
          reviewId={reviewId}
          signatureType={signatureType}
          reviewSummary={reviewSummary}
          onSuccess={handleSignSuccess}
        />
      </>
    );
  }

  // Full view for detail pages
  return (
    <>
      <div className="signature-status-card">
        <h3 className="signature-status-title">
          {t('signature.title') || 'Signature Status'}
        </h3>

        {isLoading ? (
          <div className="signature-status-loading">
            <span className="loading-spinner-small"></span>
            {t('common.loading') || 'Loading...'}
          </div>
        ) : (
          <div className="signature-status-content">
            {/* Employee Signature */}
            <div className="signature-status-row">
              <div className="signature-status-label">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
                <span>{t('signature.employeeTitle') || 'Employee Acknowledgment'}</span>
              </div>
              <div className="signature-status-info">
                {signatureData?.employee?.signedAt ? (
                  <>
                    <span className="signature-status-badge signed">
                      {t('signature.signed') || 'Signed'}
                    </span>
                    <span className="signature-status-detail">
                      {signatureData.employee.name} - {formatDateTime(signatureData.employee.signedAt)}
                    </span>
                    {signatureData.employee.comment && (
                      <p className="signature-status-comment">
                        "{signatureData.employee.comment}"
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <span className="signature-status-badge pending">
                      {t('signature.pending') || 'Pending'}
                    </span>
                    {signatureData?.permissions?.canSignAsEmployee && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleSignClick('employee')}
                      >
                        {t('signature.signButton') || 'Sign Review'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Manager Signature */}
            <div className="signature-status-row">
              <div className="signature-status-label">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12 5.9c1.16 0 2.1.94 2.1 2.1s-.94 2.1-2.1 2.1S9.9 9.16 9.9 8s.94-2.1 2.1-2.1m0 9c2.97 0 6.1 1.46 6.1 2.1v1.1H5.9V17c0-.64 3.13-2.1 6.1-2.1M12 4C9.79 4 8 5.79 8 8s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 9c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z" />
                </svg>
                <span>{t('signature.managerTitle') || 'Manager Counter-Signature'}</span>
              </div>
              <div className="signature-status-info">
                {signatureData?.manager?.signedAt ? (
                  <>
                    <span className="signature-status-badge signed">
                      {t('signature.signed') || 'Signed'}
                    </span>
                    <span className="signature-status-detail">
                      {signatureData.manager.name} - {formatDateTime(signatureData.manager.signedAt)}
                    </span>
                    {signatureData.manager.comment && (
                      <p className="signature-status-comment">
                        "{signatureData.manager.comment}"
                      </p>
                    )}
                  </>
                ) : reviewStatus === 'PENDING_EMPLOYEE_SIGNATURE' ? (
                  <span className="signature-status-badge waiting">
                    {t('signature.awaitingEmployee') || 'Awaiting Employee Signature'}
                  </span>
                ) : (
                  <>
                    <span className="signature-status-badge pending">
                      {t('signature.pending') || 'Pending'}
                    </span>
                    {signatureData?.permissions?.canSignAsManager && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleSignClick('manager')}
                      >
                        {t('signature.counterSignButton') || 'Counter-Sign Review'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Fully Signed Status */}
            {signatureData?.permissions?.isFullySigned && (
              <div className="signature-status-complete">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="#1B5E20">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
                <span>{t('signature.status.completed') || 'Review Fully Signed'}</span>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleDownloadPDF}
                  disabled={isDownloading}
                  style={{ marginLeft: 'auto' }}
                >
                  {isDownloading ? (
                    <span className="loading-spinner-small"></span>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style={{ marginRight: 4 }}>
                        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                      </svg>
                      {t('signature.downloadPDF') || 'Download PDF'}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <SignatureModal
        isOpen={showSignModal}
        onClose={() => setShowSignModal(false)}
        reviewId={reviewId}
        signatureType={signatureType}
        reviewSummary={reviewSummary}
        onSuccess={handleSignSuccess}
      />
    </>
  );
}

/**
 * Compact signature status for table rows
 */
function CompactSignatureStatus({ reviewStatus, signatureData, isLoading, onSignClick, t }) {
  if (isLoading) {
    return <span className="loading-spinner-small"></span>;
  }

  if (reviewStatus === 'PENDING_EMPLOYEE_SIGNATURE') {
    return (
      <div className="signature-compact">
        <span className="status-badge signature-pending">
          {t('signature.status.pendingEmployee') || 'Awaiting Employee'}
        </span>
        {signatureData?.permissions?.canSignAsEmployee && (
          <button
            className="btn btn-primary btn-xs"
            onClick={() => onSignClick('employee')}
          >
            {t('signature.signNow') || 'Sign Now'}
          </button>
        )}
      </div>
    );
  }

  if (reviewStatus === 'PENDING_MANAGER_SIGNATURE') {
    return (
      <div className="signature-compact">
        <span className="status-badge signature-pending">
          {t('signature.status.pendingManager') || 'Awaiting Manager'}
        </span>
        {signatureData?.permissions?.canSignAsManager && (
          <button
            className="btn btn-primary btn-xs"
            onClick={() => onSignClick('manager')}
          >
            {t('signature.counterSign') || 'Counter-Sign'}
          </button>
        )}
      </div>
    );
  }

  if (reviewStatus === 'COMPLETED' && signatureData?.permissions?.isFullySigned) {
    return (
      <span className="status-badge signature-complete">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
        </svg>
        {t('signature.status.completed') || 'Signed'}
      </span>
    );
  }

  return null;
}
