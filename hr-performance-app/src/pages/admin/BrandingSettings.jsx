import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { adminApi } from '../../services/api';

export function BrandingSettings() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [opcos, setOpcos] = useState([]);
  const [selectedOpcoId, setSelectedOpcoId] = useState(null);
  const [branding, setBranding] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadOpcos();
  }, []);

  useEffect(() => {
    if (selectedOpcoId) {
      loadBranding(selectedOpcoId);
    }
  }, [selectedOpcoId]);

  const loadOpcos = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getOpCos();
      setOpcos(response);
      if (response.length > 0) {
        setSelectedOpcoId(response[0].id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadBranding = async (opcoId) => {
    try {
      setError(null);
      const response = await adminApi.getSettings(opcoId);
      setBranding(response.settings.branding);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSave = async () => {
    if (!selectedOpcoId || !branding) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      await adminApi.updateBranding(selectedOpcoId, {
        logoUrl: branding.logoUrl,
        primaryColor: branding.primaryColor,
        accentColor: branding.accentColor,
        customCss: branding.customCss,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedOpcoId) return;

    try {
      setUploading(true);
      setError(null);
      const response = await adminApi.uploadLogo(selectedOpcoId, file);
      setBranding({
        ...branding,
        logoUrl: response.logoUrl,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = () => {
    setBranding({
      ...branding,
      logoUrl: null,
    });
  };

  const updateBranding = (field, value) => {
    setBranding({
      ...branding,
      [field]: value,
    });
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-page-header">
          <h1 className="admin-page-title">{t('admin.branding.title')}</h1>
        </div>
        <div className="admin-loading">{t('common.loading')}</div>
      </div>
    );
  }

  const selectedOpco = opcos.find(o => o.id === selectedOpcoId);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{t('admin.branding.title')}</h1>
          <p className="admin-page-subtitle">{t('admin.branding.subtitle')}</p>
        </div>
        <button
          className="admin-btn admin-btn-primary"
          onClick={handleSave}
          disabled={saving || !branding}
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
          {t('admin.branding.saved')}
        </div>
      )}

      {/* OpCo Selector */}
      <div className="admin-card" style={{ marginBottom: '24px' }}>
        <div className="admin-card-body">
          <div className="admin-form-group">
            <label className="admin-form-label">{t('admin.branding.selectOpco')}</label>
            <select
              className="admin-form-input"
              value={selectedOpcoId || ''}
              onChange={e => setSelectedOpcoId(e.target.value)}
            >
              {opcos.map(opco => (
                <option key={opco.id} value={opco.id}>
                  {opco.displayName || opco.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {branding && (
        <div className="admin-settings-grid">
          {/* Logo */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h3 className="admin-card-title">{t('admin.branding.logo.title')}</h3>
            </div>
            <div className="admin-card-body">
              <div className="admin-logo-section">
                <div className="admin-logo-preview">
                  {branding.logoUrl ? (
                    <img
                      src={branding.logoUrl}
                      alt={selectedOpco?.displayName || 'Logo'}
                      className="admin-logo-image"
                    />
                  ) : (
                    <div className="admin-logo-placeholder">
                      <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48">
                        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                      </svg>
                      <span>{t('admin.branding.logo.noLogo')}</span>
                    </div>
                  )}
                </div>

                <div className="admin-logo-actions">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    onChange={handleLogoUpload}
                    style={{ display: 'none' }}
                  />
                  <button
                    className="admin-btn admin-btn-secondary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? t('common.uploading') : t('admin.branding.logo.upload')}
                  </button>
                  {branding.logoUrl && (
                    <button
                      className="admin-btn admin-btn-danger"
                      onClick={handleRemoveLogo}
                    >
                      {t('admin.branding.logo.remove')}
                    </button>
                  )}
                </div>

                <p className="admin-hint">{t('admin.branding.logo.uploadHint')}</p>

                <div className="admin-form-group" style={{ marginTop: '16px' }}>
                  <label className="admin-form-label">{t('admin.branding.logo.url')}</label>
                  <input
                    type="url"
                    className="admin-form-input"
                    value={branding.logoUrl || ''}
                    onChange={e => updateBranding('logoUrl', e.target.value || null)}
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Colors */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h3 className="admin-card-title">{t('admin.branding.colors.title')}</h3>
            </div>
            <div className="admin-card-body">
              <div className="admin-color-pickers">
                <div className="admin-form-group">
                  <label className="admin-form-label">{t('admin.branding.colors.primary')}</label>
                  <div className="admin-color-input">
                    <input
                      type="color"
                      value={branding.primaryColor}
                      onChange={e => updateBranding('primaryColor', e.target.value)}
                      className="admin-color-picker"
                    />
                    <input
                      type="text"
                      className="admin-form-input"
                      value={branding.primaryColor}
                      onChange={e => updateBranding('primaryColor', e.target.value)}
                      pattern="^#[0-9A-Fa-f]{6}$"
                      placeholder="#CC0E70"
                    />
                  </div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">{t('admin.branding.colors.accent')}</label>
                  <div className="admin-color-input">
                    <input
                      type="color"
                      value={branding.accentColor}
                      onChange={e => updateBranding('accentColor', e.target.value)}
                      className="admin-color-picker"
                    />
                    <input
                      type="text"
                      className="admin-form-input"
                      value={branding.accentColor}
                      onChange={e => updateBranding('accentColor', e.target.value)}
                      pattern="^#[0-9A-Fa-f]{6}$"
                      placeholder="#004A91"
                    />
                  </div>
                </div>
              </div>

              <div className="admin-color-preview" style={{ marginTop: '24px' }}>
                <h4>{t('admin.branding.colors.preview')}</h4>
                <div className="admin-preview-box">
                  <div
                    className="admin-preview-header"
                    style={{ backgroundColor: branding.primaryColor }}
                  >
                    {selectedOpco?.displayName || 'Company Name'}
                  </div>
                  <div className="admin-preview-body">
                    <button
                      className="admin-preview-button"
                      style={{ backgroundColor: branding.primaryColor }}
                    >
                      Primary Button
                    </button>
                    <button
                      className="admin-preview-button"
                      style={{ backgroundColor: branding.accentColor }}
                    >
                      Accent Button
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Custom CSS */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h3 className="admin-card-title">{t('admin.branding.css.title')}</h3>
            </div>
            <div className="admin-card-body">
              <p className="admin-settings-description">
                {t('admin.branding.css.description')}
              </p>

              <div className="admin-warning-banner">
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                </svg>
                <span>{t('admin.branding.css.warning')}</span>
              </div>

              <div className="admin-form-group" style={{ marginTop: '16px' }}>
                <textarea
                  className="admin-form-textarea"
                  value={branding.customCss || ''}
                  onChange={e => updateBranding('customCss', e.target.value || null)}
                  placeholder="/* Custom CSS */"
                  rows={8}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BrandingSettings;
