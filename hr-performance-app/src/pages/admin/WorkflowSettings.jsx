import { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { adminApi } from '../../services/api';

export function WorkflowSettings() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getSettings();
      setSettings(response.settings);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      await adminApi.updateSettings({
        workflow: settings.workflow,
        notifications: settings.notifications,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateReviewCycle = (field, value) => {
    setSettings({
      ...settings,
      workflow: {
        ...settings.workflow,
        reviewCycle: {
          ...settings.workflow.reviewCycle,
          [field]: value || null,
        },
      },
    });
  };

  const updateApprovals = (field, value) => {
    setSettings({
      ...settings,
      workflow: {
        ...settings.workflow,
        approvals: {
          ...settings.workflow.approvals,
          [field]: value,
        },
      },
    });
  };

  const updateSignatures = (field, value) => {
    setSettings({
      ...settings,
      workflow: {
        ...settings.workflow,
        signatures: {
          ...settings.workflow.signatures,
          [field]: value,
        },
      },
    });
  };

  const updateNotifications = (field, value) => {
    setSettings({
      ...settings,
      notifications: {
        ...settings.notifications,
        [field]: value,
      },
    });
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-page-header">
          <h1 className="admin-page-title">{t('admin.settings.title')}</h1>
        </div>
        <div className="admin-loading">{t('common.loading')}</div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="admin-page">
        <div className="admin-page-header">
          <h1 className="admin-page-title">{t('admin.settings.title')}</h1>
        </div>
        <div className="admin-error">{error || 'Failed to load settings'}</div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{t('admin.settings.title')}</h1>
          <p className="admin-page-subtitle">{t('admin.settings.subtitle')}</p>
        </div>
        <button
          className="admin-btn admin-btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? t('common.saving') : t('common.save')}
        </button>
      </div>

      {error && (
        <div className="admin-alert admin-alert-error">
          {error}
        </div>
      )}

      {success && (
        <div className="admin-alert admin-alert-success">
          {t('admin.settings.saved')}
        </div>
      )}

      <div className="admin-settings-grid">
        {/* Review Cycle Dates */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">{t('admin.settings.reviewCycle.title')}</h3>
          </div>
          <div className="admin-card-body">
            <p className="admin-settings-description">
              {t('admin.settings.reviewCycle.description')}
            </p>

            <div className="admin-settings-period">
              <h4>{t('admin.settings.reviewCycle.goalSetting')}</h4>
              <div className="admin-date-range">
                <div className="admin-form-group">
                  <label className="admin-form-label">{t('admin.settings.reviewCycle.start')}</label>
                  <input
                    type="date"
                    className="admin-form-input"
                    value={settings.workflow.reviewCycle.goalSettingStart || ''}
                    onChange={e => updateReviewCycle('goalSettingStart', e.target.value)}
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">{t('admin.settings.reviewCycle.end')}</label>
                  <input
                    type="date"
                    className="admin-form-input"
                    value={settings.workflow.reviewCycle.goalSettingEnd || ''}
                    onChange={e => updateReviewCycle('goalSettingEnd', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="admin-settings-period">
              <h4>{t('admin.settings.reviewCycle.midYear')}</h4>
              <div className="admin-date-range">
                <div className="admin-form-group">
                  <label className="admin-form-label">{t('admin.settings.reviewCycle.start')}</label>
                  <input
                    type="date"
                    className="admin-form-input"
                    value={settings.workflow.reviewCycle.midYearStart || ''}
                    onChange={e => updateReviewCycle('midYearStart', e.target.value)}
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">{t('admin.settings.reviewCycle.end')}</label>
                  <input
                    type="date"
                    className="admin-form-input"
                    value={settings.workflow.reviewCycle.midYearEnd || ''}
                    onChange={e => updateReviewCycle('midYearEnd', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="admin-settings-period">
              <h4>{t('admin.settings.reviewCycle.endYear')}</h4>
              <div className="admin-date-range">
                <div className="admin-form-group">
                  <label className="admin-form-label">{t('admin.settings.reviewCycle.start')}</label>
                  <input
                    type="date"
                    className="admin-form-input"
                    value={settings.workflow.reviewCycle.endYearStart || ''}
                    onChange={e => updateReviewCycle('endYearStart', e.target.value)}
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">{t('admin.settings.reviewCycle.end')}</label>
                  <input
                    type="date"
                    className="admin-form-input"
                    value={settings.workflow.reviewCycle.endYearEnd || ''}
                    onChange={e => updateReviewCycle('endYearEnd', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Approval Requirements */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">{t('admin.settings.approvals.title')}</h3>
          </div>
          <div className="admin-card-body">
            <p className="admin-settings-description">
              {t('admin.settings.approvals.description')}
            </p>

            <table className="admin-settings-table">
              <thead>
                <tr>
                  <th>{t('admin.settings.approvals.stage')}</th>
                  <th>{t('admin.settings.approvals.managerApproval')}</th>
                  <th>{t('admin.settings.approvals.hrApproval')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{t('admin.settings.reviewCycle.goalSetting')}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={settings.workflow.approvals.goalSettingRequiresManager}
                      onChange={e => updateApprovals('goalSettingRequiresManager', e.target.checked)}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={settings.workflow.approvals.goalSettingRequiresHR}
                      onChange={e => updateApprovals('goalSettingRequiresHR', e.target.checked)}
                    />
                  </td>
                </tr>
                <tr>
                  <td>{t('admin.settings.reviewCycle.midYear')}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={settings.workflow.approvals.midYearRequiresManager}
                      onChange={e => updateApprovals('midYearRequiresManager', e.target.checked)}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={settings.workflow.approvals.midYearRequiresHR}
                      onChange={e => updateApprovals('midYearRequiresHR', e.target.checked)}
                    />
                  </td>
                </tr>
                <tr>
                  <td>{t('admin.settings.reviewCycle.endYear')}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={settings.workflow.approvals.endYearRequiresManager}
                      onChange={e => updateApprovals('endYearRequiresManager', e.target.checked)}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={settings.workflow.approvals.endYearRequiresHR}
                      onChange={e => updateApprovals('endYearRequiresHR', e.target.checked)}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Signature Requirements */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">{t('admin.settings.signatures.title')}</h3>
          </div>
          <div className="admin-card-body">
            <p className="admin-settings-description">
              {t('admin.settings.signatures.description')}
            </p>

            <div className="admin-settings-checkboxes">
              <label className="admin-checkbox-label">
                <input
                  type="checkbox"
                  checked={settings.workflow.signatures.requireEmployeeSignature}
                  onChange={e => updateSignatures('requireEmployeeSignature', e.target.checked)}
                />
                <span>{t('admin.settings.signatures.employee')}</span>
              </label>

              <label className="admin-checkbox-label">
                <input
                  type="checkbox"
                  checked={settings.workflow.signatures.requireManagerSignature}
                  onChange={e => updateSignatures('requireManagerSignature', e.target.checked)}
                />
                <span>{t('admin.settings.signatures.manager')}</span>
              </label>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">{t('admin.settings.notifications.title')}</h3>
          </div>
          <div className="admin-card-body">
            <div className="admin-info-banner">
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
              </svg>
              <span>{t('admin.settings.notifications.comingSoon')}</span>
            </div>

            <div className="admin-settings-checkboxes" style={{ marginTop: '16px', opacity: 0.6 }}>
              <label className="admin-checkbox-label">
                <input
                  type="checkbox"
                  checked={settings.notifications.enabled}
                  onChange={e => updateNotifications('enabled', e.target.checked)}
                  disabled
                />
                <span>{t('admin.settings.notifications.enabled')}</span>
              </label>
            </div>

            <div className="admin-form-row" style={{ marginTop: '16px', opacity: 0.6 }}>
              <div className="admin-form-group">
                <label className="admin-form-label">{t('admin.settings.notifications.reminderDays')}</label>
                <input
                  type="number"
                  className="admin-form-input"
                  value={settings.notifications.reminderDaysBeforeDeadline}
                  onChange={e => updateNotifications('reminderDaysBeforeDeadline', parseInt(e.target.value) || 7)}
                  min="1"
                  max="30"
                  disabled
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">{t('admin.settings.notifications.overdueInterval')}</label>
                <input
                  type="number"
                  className="admin-form-input"
                  value={settings.notifications.overdueReminderIntervalDays}
                  onChange={e => updateNotifications('overdueReminderIntervalDays', parseInt(e.target.value) || 3)}
                  min="1"
                  max="14"
                  disabled
                />
              </div>
            </div>

            <div className="admin-settings-checkboxes" style={{ marginTop: '16px', opacity: 0.6 }}>
              <label className="admin-checkbox-label">
                <input
                  type="checkbox"
                  checked={settings.notifications.notifyOnPendingApprovals}
                  onChange={e => updateNotifications('notifyOnPendingApprovals', e.target.checked)}
                  disabled
                />
                <span>{t('admin.settings.notifications.onApprovals')}</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WorkflowSettings;
