import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { adminApi } from '../../services/api';

function FunctionTitleModal({ functionTitle, onSave, onClose, t }) {
  const [formData, setFormData] = useState({
    name: functionTitle?.name || '',
    description: functionTitle?.description || '',
    sortOrder: functionTitle?.sortOrder || 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError(t('admin.functionTitles.nameRequired'));
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
            {functionTitle ? t('admin.functionTitles.edit') : t('admin.functionTitles.create')}
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
              <label className="admin-form-label">{t('admin.functionTitles.name')} *</label>
              <input
                type="text"
                className="admin-form-input"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('admin.functionTitles.namePlaceholder')}
                autoFocus
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">{t('admin.functionTitles.description')}</label>
              <textarea
                className="admin-form-textarea"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('admin.functionTitles.descriptionPlaceholder')}
                rows={3}
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">{t('admin.functionTitles.sortOrder')}</label>
              <input
                type="number"
                className="admin-form-input"
                value={formData.sortOrder}
                onChange={e => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                min={0}
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

function ConfirmDialog({ title, message, onConfirm, onCancel, t }) {
  return (
    <div className="admin-modal-overlay" onClick={onCancel}>
      <div className="admin-modal" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h3 className="admin-modal-title">{title}</h3>
          <button className="admin-modal-close" onClick={onCancel}>&times;</button>
        </div>
        <div className="admin-modal-body">
          <p>{message}</p>
        </div>
        <div className="admin-modal-footer">
          <button className="admin-btn admin-btn-secondary" onClick={onCancel}>
            {t('common.cancel')}
          </button>
          <button className="admin-btn admin-btn-danger" onClick={onConfirm}>
            {t('common.delete')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function FunctionTitles() {
  const { t } = useLanguage();
  const [functionTitles, setFunctionTitles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);

  // Drag state
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getFunctionTitles();
      setFunctionTitles(data);
    } catch (err) {
      console.error('Failed to load function titles:', err);
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
      await adminApi.updateFunctionTitle(editingItem.id, data);
    } else {
      await adminApi.createFunctionTitle(data);
    }
    await loadData();
  };

  const handleDelete = async () => {
    if (deletingItem) {
      await adminApi.deleteFunctionTitle(deletingItem.id);
      setDeletingItem(null);
      await loadData();
    }
  };

  // Drag and drop handlers
  const handleDragStart = (index) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = async () => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      const items = [...functionTitles];
      const draggedItem = items[dragItem.current];
      items.splice(dragItem.current, 1);
      items.splice(dragOverItem.current, 0, draggedItem);

      // Update sort orders
      const updates = items.map((item, index) => ({
        id: item.id,
        sortOrder: index,
      }));

      setFunctionTitles(items);

      // Update each item's sort order
      try {
        await Promise.all(
          updates.map(u => adminApi.updateFunctionTitle(u.id, { sortOrder: u.sortOrder }))
        );
      } catch (err) {
        console.error('Failed to update sort order:', err);
        await loadData(); // Reload on error
      }
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  // Filter function titles
  const filteredItems = functionTitles.filter(item =>
    !search ||
    item.name?.toLowerCase().includes(search.toLowerCase()) ||
    item.description?.toLowerCase().includes(search.toLowerCase())
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
          <div className="admin-empty-title">{t('admin.functionTitles.error')}</div>
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
        <h1 className="admin-page-title">{t('admin.functionTitles.title')}</h1>
        <p className="admin-page-subtitle">{t('admin.functionTitles.subtitle')}</p>
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
            placeholder={t('admin.functionTitles.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <button className="admin-btn admin-btn-primary" onClick={handleCreate}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          {t('admin.functionTitles.addNew')}
        </button>
      </div>

      {/* Drag hint */}
      <div className="admin-card" style={{ padding: '12px 16px', marginBottom: '16px', background: '#f8f9fa' }}>
        <span style={{ fontSize: '13px', color: '#666' }}>
          {t('admin.functionTitles.dragHint')}
        </span>
      </div>

      {/* Function Titles List */}
      <div className="admin-card">
        {filteredItems.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor" opacity="0.3">
                <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/>
              </svg>
            </div>
            <div className="admin-empty-title">{t('admin.functionTitles.noItems')}</div>
            <div className="admin-empty-text">{t('admin.functionTitles.noItemsDesc')}</div>
            <button className="admin-btn admin-btn-primary" onClick={handleCreate}>
              {t('admin.functionTitles.addFirst')}
            </button>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}></th>
                <th>{t('admin.functionTitles.name')}</th>
                <th>{t('admin.functionTitles.description')}</th>
                <th style={{ width: '80px' }}>{t('admin.functionTitles.order')}</th>
                <th style={{ width: '120px' }}>{t('admin.functionTitles.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item, index) => (
                <tr
                  key={item.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragEnter={() => handleDragEnter(index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={e => e.preventDefault()}
                  style={{ cursor: 'grab' }}
                >
                  <td>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="#999">
                      <path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                    </svg>
                  </td>
                  <td><strong>{item.name}</strong></td>
                  <td style={{ color: item.description ? '#333' : '#999' }}>
                    {item.description || '-'}
                  </td>
                  <td style={{ textAlign: 'center' }}>{item.sortOrder}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        className="admin-btn admin-btn-sm admin-btn-secondary"
                        onClick={() => handleEdit(item)}
                      >
                        {t('common.edit')}
                      </button>
                      <button
                        className="admin-btn admin-btn-sm admin-btn-icon"
                        onClick={() => setDeletingItem(item)}
                        style={{ color: '#dc3545' }}
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <FunctionTitleModal
          functionTitle={editingItem}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
          t={t}
        />
      )}

      {/* Delete Confirmation */}
      {deletingItem && (
        <ConfirmDialog
          title={t('admin.functionTitles.deleteTitle')}
          message={t('admin.functionTitles.deleteMessage', { name: deletingItem.name })}
          onConfirm={handleDelete}
          onCancel={() => setDeletingItem(null)}
          t={t}
        />
      )}
    </div>
  );
}
