import { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { adminApi } from '../../services/api';
import './AdminLayout.css';

// Status indicator component
function StatusBadge({ status }) {
  const colors = {
    will_create: { bg: '#d4edda', color: '#155724', label: 'Ready' },
    created: { bg: '#d4edda', color: '#155724', label: 'Created' },
    will_skip: { bg: '#fff3cd', color: '#856404', label: 'Will Skip' },
    skipped: { bg: '#fff3cd', color: '#856404', label: 'Skipped' },
    failed: { bg: '#f8d7da', color: '#721c24', label: 'Failed' },
  };
  const style = colors[status] || colors.skipped;

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '0.75rem',
        fontWeight: 500,
        backgroundColor: style.bg,
        color: style.color,
      }}
    >
      {style.label}
    </span>
  );
}

export function StartNewYear() {
  const { t } = useLanguage();
  const { hasRole } = useAuth();

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear + 1);
  const [includeManagers, setIncludeManagers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [createResult, setCreateResult] = useState(null);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('configure'); // configure, preview, creating, complete

  const isSuperAdmin = hasRole('TSS_SUPER_ADMIN');

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

  const handleCreate = async () => {
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
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(220, 53, 69, 0.1)',
            border: '1px solid #DC3545',
            borderRadius: '8px',
            color: '#DC3545',
            marginBottom: '24px',
          }}
        >
          {error}
        </div>
      )}

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
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '16px',
              marginBottom: '24px',
            }}
          >
            <div className="admin-card" style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#28a745' }}>
                {previewData.created}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#666' }}>
                {t('admin.startNewYear.willCreate')}
              </div>
            </div>
            <div className="admin-card" style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#ffc107' }}>
                {previewData.skipped}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#666' }}>
                {t('admin.startNewYear.willSkip')}
              </div>
            </div>
            <div className="admin-card" style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#004A91' }}>
                {previewData.details.length}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#666' }}>
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
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t('admin.startNewYear.employee')}</th>
                    <th>{t('admin.startNewYear.manager')}</th>
                    <th>{t('admin.startNewYear.tovLevel')}</th>
                    <th>{t('common.status')}</th>
                    <th>{t('admin.startNewYear.notes')}</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.details.map((item) => (
                    <tr key={item.userId}>
                      <td>{item.employeeName}</td>
                      <td>{item.managerName || <span style={{ color: '#dc3545' }}>-</span>}</td>
                      <td>{item.tovLevelCode || <span style={{ color: '#dc3545' }}>-</span>}</td>
                      <td>
                        <StatusBadge status={item.status} />
                      </td>
                      <td style={{ fontSize: '0.875rem', color: '#666' }}>
                        {item.reason || (item.warnings?.join(', '))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={handleReset} className="admin-btn admin-btn-secondary">
              {t('common.back')}
            </button>
            <button
              onClick={handleCreate}
              disabled={loading || previewData.created === 0}
              className="admin-btn admin-btn-primary"
            >
              {t('admin.startNewYear.createReviews', { count: previewData.created })}
            </button>
          </div>

          {previewData.created === 0 && (
            <p style={{ marginTop: '16px', color: '#666' }}>
              {t('admin.startNewYear.noEligibleEmployees')}
            </p>
          )}
        </>
      )}

      {/* Step 3: Creating */}
      {step === 'creating' && (
        <div className="admin-card" style={{ padding: '48px', textAlign: 'center' }}>
          <div className="admin-loading-spinner" style={{ width: '48px', height: '48px', margin: '0 auto 24px' }} />
          <h3>{t('admin.startNewYear.creating')}</h3>
          <p style={{ color: '#666' }}>{t('admin.startNewYear.pleaseWait')}</p>
        </div>
      )}

      {/* Step 4: Complete */}
      {step === 'complete' && createResult && (
        <>
          {/* Success Summary */}
          <div
            className="admin-card"
            style={{
              padding: '24px',
              marginBottom: '24px',
              backgroundColor: '#d4edda',
              border: '1px solid #c3e6cb',
            }}
          >
            <h3 style={{ color: '#155724', marginBottom: '16px' }}>
              {t('admin.startNewYear.complete')}
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '16px',
              }}
            >
              <div>
                <strong style={{ color: '#28a745' }}>{createResult.created}</strong>{' '}
                {t('admin.startNewYear.created')}
              </div>
              <div>
                <strong style={{ color: '#856404' }}>{createResult.skipped}</strong>{' '}
                {t('admin.startNewYear.skipped')}
              </div>
              {createResult.failed > 0 && (
                <div>
                  <strong style={{ color: '#dc3545' }}>{createResult.failed}</strong>{' '}
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
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t('admin.startNewYear.employee')}</th>
                    <th>{t('admin.startNewYear.manager')}</th>
                    <th>{t('admin.startNewYear.tovLevel')}</th>
                    <th>{t('common.status')}</th>
                    <th>{t('admin.startNewYear.notes')}</th>
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
                      <td style={{ fontSize: '0.875rem', color: '#666' }}>
                        {item.reason || (item.warnings?.join(', '))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={handleReset} className="admin-btn admin-btn-primary">
              {t('admin.startNewYear.startAnother')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
