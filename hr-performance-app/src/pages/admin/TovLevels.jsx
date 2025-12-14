import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { adminApi } from '../../services/api';

function TovLevelModal({ tovLevel, onSave, onClose, t, language }) {
  const [formData, setFormData] = useState({
    code: tovLevel?.code || '',
    name: tovLevel?.name || '',
    description: tovLevel?.description || { en: '', nl: '', es: '' },
    sortOrder: tovLevel?.sortOrder || 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [descLang, setDescLang] = useState(language);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim()) {
      setError(t('admin.tovLevels.codeNameRequired'));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDescriptionChange = (lang, value) => {
    setFormData({
      ...formData,
      description: {
        ...formData.description,
        [lang]: value,
      },
    });
  };

  return (
    <div
      className="admin-modal-overlay"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      role="button"
      tabIndex={-1}
      aria-label="Close modal"
    >
      <div
        className="admin-modal"
        style={{ maxWidth: '600px' }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tov-level-modal-title"
      >
        <div className="admin-modal-header">
          <h3 id="tov-level-modal-title" className="admin-modal-title">
            {tovLevel ? t('admin.tovLevels.edit') : t('admin.tovLevels.create')}
          </h3>
          <button className="admin-modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="admin-modal-body">
            {error && (
              <div style={{ padding: '10px', background: '#f8d7da', color: '#721c24', borderRadius: '6px', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
              <div className="admin-form-group">
                <label className="admin-form-label">{t('admin.tovLevels.code')} *</label>
                <input
                  type="text"
                  className="admin-form-input"
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="A, B, C, D"
                  maxLength={2}
                  disabled={!!tovLevel}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">{t('admin.tovLevels.name')} *</label>
                <input
                  type="text"
                  className="admin-form-input"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('admin.tovLevels.namePlaceholder')}
                />
              </div>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">{t('admin.tovLevels.description')}</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                {['en', 'nl', 'es'].map(lang => (
                  <button
                    key={lang}
                    type="button"
                    className={`admin-btn admin-btn-sm ${descLang === lang ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
                    onClick={() => setDescLang(lang)}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>
              <textarea
                className="admin-form-textarea"
                value={formData.description[descLang] || ''}
                onChange={e => handleDescriptionChange(descLang, e.target.value)}
                placeholder={t('admin.tovLevels.descriptionPlaceholder')}
                rows={4}
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">{t('admin.tovLevels.sortOrder')}</label>
              <input
                type="number"
                className="admin-form-input"
                value={formData.sortOrder}
                onChange={e => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                min={0}
                style={{ width: '100px' }}
              />
            </div>
          </div>

          <div className="admin-modal-footer">
            <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function TovLevels() {
  const { t, language } = useLanguage();
  const [tovLevels, setTovLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getTovLevels();
      setTovLevels(data);
    } catch (err) {
      console.error('Failed to load TOV levels:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleSave = async (data) => {
    if (editingItem) {
      // Note: Need to add PATCH endpoint to API
      await adminApi.updateTovLevel?.(editingItem.id, data) ||
        console.warn('updateTovLevel not implemented');
    } else {
      await adminApi.createTovLevel(data);
    }
    await loadData();
  };

  const getDescription = (item) => {
    if (!item.description) return '-';
    return item.description[language] || item.description.en || '-';
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-loading-spinner" />
        {t('common.loading')}
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-card">
        <div className="admin-empty">
          <div className="admin-empty-title">{t('admin.tovLevels.error')}</div>
          <div className="admin-empty-text">{error}</div>
          <button className="admin-btn admin-btn-primary" onClick={loadData}>
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">{t('admin.tovLevels.title')}</h1>
        <p className="admin-page-subtitle">{t('admin.tovLevels.subtitle')}</p>
      </div>

      {/* Info box */}
      <div className="admin-card" style={{ padding: '16px', marginBottom: '20px', background: '#e3f2fd' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="#1565c0" style={{ flexShrink: 0, marginTop: '2px' }}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
          </svg>
          <div style={{ fontSize: '13px', color: '#1565c0' }}>
            {t('admin.tovLevels.info')}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="admin-toolbar">
        <div style={{ flex: 1 }} />
        <button className="admin-btn admin-btn-primary" onClick={handleCreate}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          {t('admin.tovLevels.addNew')}
        </button>
      </div>

      {/* TOV Levels Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {tovLevels.map(item => (
          <div key={item.id} className="admin-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  background: 'linear-gradient(135deg, #CC0E70 0%, #004A91 100%)',
                  color: '#fff',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '18px',
                  marginBottom: '8px',
                }}>
                  {item.code}
                </div>
                <h3 style={{ margin: '0 0 4px', fontSize: '16px', color: '#333' }}>{item.name}</h3>
              </div>
              <button
                className="admin-btn admin-btn-sm admin-btn-secondary"
                onClick={() => handleEdit(item)}
              >
                {t('common.edit')}
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#666', margin: '0 0 12px', lineHeight: '1.5' }}>
              {getDescription(item)}
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #eee' }}>
              <span style={{ fontSize: '12px', color: '#999' }}>
                {t('admin.tovLevels.sortOrder')}: {item.sortOrder}
              </span>
              <Link
                to={`/admin/competencies?tovLevelId=${item.id}`}
                className="admin-btn admin-btn-sm admin-btn-secondary"
                style={{ textDecoration: 'none' }}
              >
                {t('admin.tovLevels.viewCompetencies')}
              </Link>
            </div>
          </div>
        ))}
      </div>

      {tovLevels.length === 0 && (
        <div className="admin-card">
          <div className="admin-empty">
            <div className="admin-empty-icon">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor" opacity="0.3">
                <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
              </svg>
            </div>
            <div className="admin-empty-title">{t('admin.tovLevels.noItems')}</div>
            <div className="admin-empty-text">{t('admin.tovLevels.noItemsDesc')}</div>
            <button className="admin-btn admin-btn-primary" onClick={handleCreate}>
              {t('admin.tovLevels.addFirst')}
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <TovLevelModal
          tovLevel={editingItem}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
          t={t}
          language={language}
        />
      )}
    </div>
  );
}
