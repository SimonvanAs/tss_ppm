import { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { adminApi } from '../../services/api';

function OpCoModal({ opco, onSave, onClose, t }) {
  const [formData, setFormData] = useState({
    name: opco?.name || '',
    displayName: opco?.displayName || '',
    domain: opco?.domain || '',
    isActive: opco?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.displayName.trim()) {
      setError(t('admin.opcos.nameRequired'));
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

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={e => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h3 className="admin-modal-title">
            {opco ? t('admin.opcos.edit') : t('admin.opcos.create')}
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

            <div className="admin-form-group">
              <label className="admin-form-label">{t('admin.opcos.name')} *</label>
              <input
                type="text"
                className="admin-form-input"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                placeholder="my-opco"
                disabled={!!opco}
              />
              <p style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                {t('admin.opcos.nameHint')}
              </p>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">{t('admin.opcos.displayName')} *</label>
              <input
                type="text"
                className="admin-form-input"
                value={formData.displayName}
                onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="My Operating Company"
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">{t('admin.opcos.domain')}</label>
              <input
                type="text"
                className="admin-form-input"
                value={formData.domain}
                onChange={e => setFormData({ ...formData, domain: e.target.value })}
                placeholder="myopco.com"
              />
              <p style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                {t('admin.opcos.domainHint')}
              </p>
            </div>

            {opco && (
              <div className="admin-form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  {t('admin.opcos.active')}
                </label>
              </div>
            )}
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

export function OpCoManagement() {
  const { t } = useLanguage();
  const [opcos, setOpcos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getOpCos();
      setOpcos(data);
    } catch (err) {
      console.error('Failed to load OpCos:', err);
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
      await adminApi.updateOpCo(editingItem.id, data);
    } else {
      await adminApi.createOpCo(data);
    }
    await loadData();
  };

  // Filter OpCos
  const filteredOpcos = opcos.filter(opco =>
    !search ||
    opco.name?.toLowerCase().includes(search.toLowerCase()) ||
    opco.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    opco.domain?.toLowerCase().includes(search.toLowerCase())
  );

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
          <div className="admin-empty-title">{t('admin.opcos.error')}</div>
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
        <h1 className="admin-page-title">{t('admin.opcos.title')}</h1>
        <p className="admin-page-subtitle">{t('admin.opcos.subtitle')}</p>
      </div>

      {/* Super Admin warning */}
      <div className="admin-card" style={{ padding: '16px', marginBottom: '20px', background: 'linear-gradient(135deg, rgba(204, 14, 112, 0.1), rgba(0, 74, 145, 0.1))' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="#CC0E70" style={{ flexShrink: 0, marginTop: '2px' }}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          <div style={{ fontSize: '13px', color: '#333' }}>
            <strong>{t('admin.opcos.superAdminOnly')}</strong>
            <br />
            {t('admin.opcos.superAdminWarning')}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="admin-toolbar">
        <div className="admin-search">
          <svg className="admin-search-icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input
            type="text"
            className="admin-search-input"
            placeholder={t('admin.opcos.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <button className="admin-btn admin-btn-primary" onClick={handleCreate}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          {t('admin.opcos.addNew')}
        </button>
      </div>

      {/* Stats */}
      <div className="admin-stats-grid" style={{ marginBottom: '20px' }}>
        <div className="admin-stat-card">
          <div className="admin-stat-label">{t('admin.opcos.totalOpcos')}</div>
          <div className="admin-stat-value">{opcos.length}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">{t('admin.opcos.activeOpcos')}</div>
          <div className="admin-stat-value">{opcos.filter(o => o.isActive).length}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">{t('admin.opcos.inactiveOpcos')}</div>
          <div className="admin-stat-value">{opcos.filter(o => !o.isActive).length}</div>
        </div>
      </div>

      {/* OpCos Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {filteredOpcos.map(opco => (
          <div key={opco.id} className="admin-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '48px',
                  height: '48px',
                  background: opco.isActive
                    ? 'linear-gradient(135deg, #CC0E70 0%, #004A91 100%)'
                    : '#ccc',
                  color: '#fff',
                  borderRadius: '10px',
                  fontWeight: '700',
                  fontSize: '16px',
                  marginBottom: '8px',
                }}>
                  {opco.displayName?.substring(0, 2).toUpperCase() || 'OP'}
                </div>
                <h3 style={{ margin: '0 0 4px', fontSize: '16px', color: '#333' }}>{opco.displayName}</h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#666', fontFamily: 'monospace' }}>{opco.name}</p>
              </div>
              <span className={`admin-badge ${opco.isActive ? 'admin-badge-success' : 'admin-badge-danger'}`}>
                {opco.isActive ? t('admin.opcos.active') : t('admin.opcos.inactive')}
              </span>
            </div>

            {opco.domain && (
              <p style={{ fontSize: '13px', color: '#666', margin: '0 0 12px' }}>
                <strong>{t('admin.opcos.domain')}:</strong> {opco.domain}
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid #eee' }}>
              <button
                className="admin-btn admin-btn-sm admin-btn-secondary"
                onClick={() => handleEdit(opco)}
              >
                {t('common.edit')}
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredOpcos.length === 0 && (
        <div className="admin-card">
          <div className="admin-empty">
            <div className="admin-empty-icon">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor" opacity="0.3">
                <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2z"/>
              </svg>
            </div>
            <div className="admin-empty-title">{t('admin.opcos.noItems')}</div>
            <div className="admin-empty-text">{t('admin.opcos.noItemsDesc')}</div>
            <button className="admin-btn admin-btn-primary" onClick={handleCreate}>
              {t('admin.opcos.addFirst')}
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <OpCoModal
          opco={editingItem}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
          t={t}
        />
      )}
    </div>
  );
}
