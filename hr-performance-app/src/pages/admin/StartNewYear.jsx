import { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { adminApi } from '../../services/api';
import './AdminLayout.css';

// Status indicator component with accessibility
function StatusBadge({ status }) {
  const colors = {
    will_create: { className: 'status-badge-success', label: 'Ready' },
    created: { className: 'status-badge-success', label: 'Created' },
    will_skip: { className: 'status-badge-warning', label: 'Will Skip' },
    skipped: { className: 'status-badge-warning', label: 'Skipped' },
    failed: { className: 'status-badge-error', label: 'Failed' },
  };
  const style = colors[status] || colors.skipped;

  return (
    <span className={`status-badge ${style.className}`} role="status">
      {style.label}
    </span>
  );
}

// Confirmation dialog component
function ConfirmDialog({ isOpen, onConfirm, onCancel, title, message, confirmText, cancelText, loading }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="modal-content" style={{ maxWidth: '400px' }}>
        <h3 id="confirm-title" style={{ marginBottom: '16px' }}>{title}</h3>
        <p style={{ marginBottom: '24px', color: 'var(--text-secondary)' }}>{message}</p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            className="admin-btn admin-btn-secondary"
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="admin-btn admin-btn-primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="admin-loading-spinner" style={{ marginRight: '8px' }} aria-hidden="true" />
                {confirmText}
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function StartNewYear() {
  const { t } = useLanguage();

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear + 1);
  const [includeManagers, setIncludeManagers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [createResult, setCreateResult] = useState(null);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('configure'); // configure, preview, creating, complete
  const [showConfirm, setShowConfirm] = useState(false);

  // Generate year options (last year to 2 years ahead)
  const yearOptions = [];
  for (let y = currentYear - 1; y <= currentYear + 2; y++) {
    yearOptions.push(y);
  }

  const handlePreview = async () => {
    setLoading(true);
    setError(null);
    setPreviewData(null);

    try {
      const result = await adminApi.bulkCreateReviewCycles({
        year,
        filters: { includeManagers },
        dryRun: true,
      });
      setPreviewData(result);
      setStep('preview');
    } catch (err) {
      setError(err.message || 'Failed to load preview');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClick = () => {
    setShowConfirm(true);
  };

  const handleConfirmCreate = async () => {
    setShowConfirm(false);
    setLoading(true);
    setError(null);
    setStep('creating');

    try {
      const result = await adminApi.bulkCreateReviewCycles({
        year,
        filters: { includeManagers },
        dryRun: false,
      });
      setCreateResult(result);
      setStep('complete');
    } catch (err) {
      setError(err.message || 'Failed to create review cycles');
      setStep('preview');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep('configure');
    setPreviewData(null);
    setCreateResult(null);
    setError(null);
  };

  // Count stats from preview data
  const getStats = (data) => {
    if (!data) return { ready: 0, skip: 0, total: 0 };
    const ready = data.details.filter(d => d.status === 'will_create' || d.status === 'created').length;
    const skip = data.details.filter(d => d.status === 'will_skip' || d.status === 'skipped').length;
    return { ready, skip, total: data.details.length };
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">{t('admin.startNewYear.title')}</h1>
        <p className="admin-page-subtitle">{t('admin.startNewYear.subtitle')}</p>
      </div>

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showConfirm}
        onConfirm={handleConfirmCreate}
        onCancel={() => setShowConfirm(false)}
        title={t('admin.startNewYear.confirmTitle')}
        message={t('admin.startNewYear.confirmMessage', { count: previewData?.created || 0, year })}
        confirmText={t('admin.startNewYear.confirmCreate')}
        cancelText={t('common.cancel')}
        loading={loading}
      />

      {/* Step 1: Configure */}
      {step === 'configure' && (
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">{t('admin.startNewYear.configureTitle')}</h3>
          </div>
          <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: '24px' }}>
              <label
                htmlFor="year"
                style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}
              >
                {t('admin.startNewYear.selectYear')}
              </label>
              <select
                id="year"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="admin-form-select"
                style={{ maxWidth: '200px' }}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={includeManagers}
                  onChange={(e) => setIncludeManagers(e.target.checked)}
                  style={{ width: '18px', height: '18px' }}
                />
                <span>{t('admin.startNewYear.includeManagers')}</span>
              </label>
              <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '4px', marginLeft: '26px' }}>
                {t('admin.startNewYear.includeManagersHint')}
              </p>
            </div>

            <button
              onClick={handlePreview}
              disabled={loading}
              className="admin-btn admin-btn-primary"
            >
              {loading ? (
                <>
                  <span className="admin-loading-spinner" style={{ marginRight: '8px' }} />
                  {t('common.loading')}
                </>
              ) : (
                t('admin.startNewYear.preview')
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 'preview' && previewData && (
        <>
          {/* Summary Cards */}
          <div className="summary-cards-grid">
            <div className="admin-card summary-card">
              <div className="summary-value text-success">
                {previewData.created}
              </div>
              <div className="summary-label">
                {t('admin.startNewYear.willCreate')}
              </div>
            </div>
            <div className="admin-card summary-card">
              <div className="summary-value text-warning">
                {previewData.skipped}
              </div>
              <div className="summary-label">
                {t('admin.startNewYear.willSkip')}
              </div>
            </div>
            <div className="admin-card summary-card">
              <div className="summary-value text-primary">
                {previewData.details.length}
              </div>
              <div className="summary-label">
                {t('admin.startNewYear.totalEmployees')}
              </div>
            </div>
          </div>

          {/* Employee List */}
          <div className="admin-card" style={{ marginBottom: '24px' }}>
            <div className="admin-card-header">
              <h3 className="admin-card-title">
                {t('admin.startNewYear.previewTitle', { year })}
              </h3>
            </div>
            <div className="table-scroll-container">
              <table className="admin-table" role="table" aria-label={t('admin.startNewYear.previewTitle', { year })}>
                <thead>
                  <tr>
                    <th scope="col">{t('admin.startNewYear.employee')}</th>
                    <th scope="col">{t('admin.startNewYear.manager')}</th>
                    <th scope="col">{t('admin.startNewYear.tovLevel')}</th>
                    <th scope="col">{t('common.status')}</th>
                    <th scope="col">{t('admin.startNewYear.notes')}</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.details.map((item) => (
                    <tr key={item.userId}>
                      <td>{item.employeeName}</td>
                      <td>{item.managerName || <span className="text-error">-</span>}</td>
                      <td>{item.tovLevelCode || <span className="text-error">-</span>}</td>
                      <td>
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="text-secondary text-sm">
                        {item.reason || (item.warnings?.join(', '))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="button-group">
            <button onClick={handleReset} className="admin-btn admin-btn-secondary">
              {t('common.back')}
            </button>
            <button
              onClick={handleCreateClick}
              disabled={loading || previewData.created === 0}
              className="admin-btn admin-btn-primary"
            >
              {t('admin.startNewYear.createReviews', { count: previewData.created })}
            </button>
          </div>

          {previewData.created === 0 && (
            <p className="text-secondary" style={{ marginTop: '16px' }}>
              {t('admin.startNewYear.noEligibleEmployees')}
            </p>
          )}
        </>
      )}

      {/* Step 3: Creating */}
      {step === 'creating' && (
        <div className="admin-card loading-card" role="status" aria-busy="true" aria-label={t('admin.startNewYear.creating')}>
          <div className="admin-loading-spinner loading-spinner-lg" aria-hidden="true" />
          <h3>{t('admin.startNewYear.creating')}</h3>
          <p className="text-secondary">{t('admin.startNewYear.pleaseWait')}</p>
        </div>
      )}

      {/* Step 4: Complete */}
      {step === 'complete' && createResult && (
        <>
          {/* Success Summary */}
          <div className="admin-card alert-success" role="status" aria-live="polite">
            <h3 className="text-success-dark">
              {t('admin.startNewYear.complete')}
            </h3>
            <div className="result-summary-grid">
              <div>
                <strong className="text-success">{createResult.created}</strong>{' '}
                {t('admin.startNewYear.created')}
              </div>
              <div>
                <strong className="text-warning-dark">{createResult.skipped}</strong>{' '}
                {t('admin.startNewYear.skipped')}
              </div>
              {createResult.failed > 0 && (
                <div>
                  <strong className="text-error">{createResult.failed}</strong>{' '}
                  {t('admin.startNewYear.failed')}
                </div>
              )}
            </div>
          </div>

          {/* Details Table */}
          <div className="admin-card" style={{ marginBottom: '24px' }}>
            <div className="admin-card-header">
              <h3 className="admin-card-title">{t('admin.startNewYear.details')}</h3>
            </div>
            <div className="table-scroll-container">
              <table className="admin-table" role="table" aria-label={t('admin.startNewYear.details')}>
                <thead>
                  <tr>
                    <th scope="col">{t('admin.startNewYear.employee')}</th>
                    <th scope="col">{t('admin.startNewYear.manager')}</th>
                    <th scope="col">{t('admin.startNewYear.tovLevel')}</th>
                    <th scope="col">{t('common.status')}</th>
                    <th scope="col">{t('admin.startNewYear.notes')}</th>
                  </tr>
                </thead>
                <tbody>
                  {createResult.details.map((item) => (
                    <tr key={item.userId}>
                      <td>{item.employeeName}</td>
                      <td>{item.managerName || '-'}</td>
                      <td>{item.tovLevelCode || '-'}</td>
                      <td>
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="text-secondary text-sm">
                        {item.reason || (item.warnings?.join(', '))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="button-group">
            <button onClick={handleReset} className="admin-btn admin-btn-primary">
              {t('admin.startNewYear.startAnother')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
