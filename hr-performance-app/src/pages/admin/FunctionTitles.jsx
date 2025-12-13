import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { adminApi } from '../../services/api';
import { saveAs } from 'file-saver';

function FunctionTitleModal({ functionTitle, tovLevels, onSave, onClose, t }) {
  const [formData, setFormData] = useState({
    name: functionTitle?.name || '',
    description: functionTitle?.description || '',
    tovLevelId: functionTitle?.tovLevelId || '',
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
      // Convert empty string to null for tovLevelId
      const dataToSave = {
        ...formData,
        tovLevelId: formData.tovLevelId || null,
      };
      await onSave(dataToSave);
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
              <label className="admin-form-label">{t('admin.functionTitles.tovLevel')}</label>
              <select
                className="admin-form-select"
                value={formData.tovLevelId}
                onChange={e => setFormData({ ...formData, tovLevelId: e.target.value })}
              >
                <option value="">{t('admin.functionTitles.noTovLevel')}</option>
                {tovLevels.map(tl => (
                  <option key={tl.id} value={tl.id}>
                    {tl.code} - {tl.name}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                {t('admin.functionTitles.tovLevelHint')}
              </div>
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

function AssignedUsersWarningDialog({ functionTitle, userCount, users, onClose, t }) {
  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h3 className="admin-modal-title">{t('admin.functionTitles.cannotDelete')}</h3>
          <button className="admin-modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="admin-modal-body">
          <div style={{ padding: '12px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '6px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="#856404">
                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
              </svg>
              <strong style={{ color: '#856404' }}>
                {t('admin.functionTitles.deleteBlocked', { count: userCount })}
              </strong>
            </div>
            <p style={{ margin: 0, color: '#856404', fontSize: '14px' }}>
              {t('admin.functionTitles.deleteBlockedMessage', { name: functionTitle.name, count: userCount })}
            </p>
          </div>

          <h4 style={{ marginTop: '16px', marginBottom: '12px', fontSize: '14px' }}>
            {t('admin.functionTitles.assignedUsersTitle')} ({userCount})
          </h4>

          <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px' }}>
            <table style={{ width: '100%', fontSize: '13px' }}>
              <thead style={{ backgroundColor: '#f8f9fa', position: 'sticky', top: 0 }}>
                <tr>
                  <th style={{ padding: '8px', textAlign: 'left' }}>{t('admin.users.name')}</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>{t('admin.users.email')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} style={{ borderTop: '1px solid #eee' }}>
                    <td style={{ padding: '8px' }}>{user.firstName} {user.lastName}</td>
                    <td style={{ padding: '8px', color: '#666' }}>{user.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {userCount > users.length && (
            <p style={{ marginTop: '8px', fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
              {t('admin.functionTitles.andMoreUsers', { count: userCount - users.length })}
            </p>
          )}

          <div style={{ marginTop: '16px', padding: '12px', background: '#f8f9fa', borderRadius: '6px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
              {t('admin.functionTitles.reassignInstructions')}
            </p>
          </div>
        </div>
        <div className="admin-modal-footer">
          <button className="admin-btn admin-btn-primary" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}

function ImportModal({ tovLevels, onClose, onImportComplete, t }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ];
      const validExtensions = ['.xlsx', '.xls'];
      const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));

      if (!validTypes.includes(selectedFile.type) && !validExtensions.includes(fileExtension)) {
        setError(t('admin.functionTitles.import.invalidFileType'));
        setFile(null);
        return;
      }

      if (selectedFile.size > 10 * 1024 * 1024) {
        setError(t('admin.functionTitles.import.fileTooLarge'));
        setFile(null);
        return;
      }

      setFile(selectedFile);
      setError(null);
      setResults(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError(t('admin.functionTitles.import.noFileSelected'));
      return;
    }

    setIsUploading(true);
    setError(null);
    setResults(null);

    try {
      const data = await adminApi.bulkImportFunctionTitles(file);
      setResults(data.results);
    } catch (err) {
      console.error('Import error:', err);
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResults(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    if (results && (results.created > 0 || results.updated > 0)) {
      onImportComplete();
    }
    onClose();
  };

  return (
    <div className="admin-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="import-modal-title" onClick={handleClose}>
      <div className="admin-modal" style={{ maxWidth: '700px' }} onClick={e => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h3 id="import-modal-title" className="admin-modal-title">{t('admin.functionTitles.import.title')}</h3>
          <button className="admin-modal-close" onClick={handleClose} aria-label={t('common.close')}>&times;</button>
        </div>

        <div className="admin-modal-body">
          {/* Instructions */}
          {!results && (
            <div style={{ marginBottom: '20px', padding: '12px', background: '#f8f9fa', borderRadius: '6px' }}>
              <h4 style={{ marginTop: 0, marginBottom: '8px', fontSize: '14px' }}>
                {t('admin.functionTitles.import.instructions')}
              </h4>
              <ul style={{ marginLeft: '20px', marginBottom: '8px', fontSize: '13px' }}>
                <li><strong>Name</strong> (required)</li>
                <li><strong>TOV Level</strong> (optional) - {tovLevels.map(tl => tl.code).join(', ')}</li>
                <li><strong>Description</strong> (optional)</li>
              </ul>
              <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>
                {t('admin.functionTitles.import.note')}
              </p>
            </div>
          )}

          {/* File Upload */}
          {!results && (
            <>
              <div style={{ marginBottom: '16px' }}>
                <label
                  htmlFor="file-upload-ft"
                  className="file-upload-label"
                >
                  {t('admin.functionTitles.import.selectFile')}
                </label>
                <input
                  ref={fileInputRef}
                  id="file-upload-ft"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  disabled={isUploading}
                />
                {file && (
                  <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <strong>{file.name}</strong>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                          {(file.size / 1024).toFixed(2)} KB
                        </div>
                      </div>
                      <button
                        onClick={handleReset}
                        className="admin-btn admin-btn-ghost"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                        disabled={isUploading}
                      >
                        {t('common.remove')}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="alert alert-error" role="alert" style={{ marginBottom: '16px', fontSize: '13px' }}>
                  {error}
                </div>
              )}
            </>
          )}

          {/* Results */}
          {results && (
            <div>
              <div style={{
                padding: '16px',
                backgroundColor: '#d4edda',
                border: '1px solid #c3e6cb',
                borderRadius: '4px',
                marginBottom: '16px',
              }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#155724' }}>
                  {t('admin.functionTitles.import.complete')}
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '14px' }}>
                  <div>
                    <strong>{t('admin.functionTitles.import.totalRows')}:</strong> {results.total}
                  </div>
                  <div style={{ color: '#28a745' }}>
                    <strong>{t('admin.functionTitles.import.created')}:</strong> {results.created}
                  </div>
                  <div style={{ color: '#004A91' }}>
                    <strong>{t('admin.functionTitles.import.updated')}:</strong> {results.updated}
                  </div>
                  <div style={{ color: '#ffc107' }}>
                    <strong>{t('admin.functionTitles.import.skipped')}:</strong> {results.skipped}
                  </div>
                </div>
              </div>

              {results.errors && results.errors.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ marginBottom: '8px', fontSize: '14px' }}>
                    {t('admin.functionTitles.import.errors')} ({results.errors.length})
                  </h4>
                  <div style={{
                    maxHeight: '250px',
                    overflowY: 'auto',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                  }}>
                    <table style={{ width: '100%', fontSize: '13px' }}>
                      <thead style={{ backgroundColor: '#f8f9fa', position: 'sticky', top: 0 }}>
                        <tr>
                          <th style={{ padding: '8px', textAlign: 'left' }}>Row</th>
                          <th style={{ padding: '8px', textAlign: 'left' }}>Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.errors.map((err, idx) => (
                          <tr key={idx} style={{ borderTop: '1px solid #eee' }}>
                            <td style={{ padding: '8px' }}>{err.row}</td>
                            <td style={{ padding: '8px', color: '#DC3545' }}>{err.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="admin-modal-footer">
          {!results ? (
            <>
              <button className="admin-btn admin-btn-secondary" onClick={handleClose}>
                {t('common.cancel')}
              </button>
              <button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="admin-btn admin-btn-primary"
              >
                {isUploading ? (
                  <>
                    <span className="admin-loading-spinner" style={{ marginRight: '8px' }} />
                    {t('admin.functionTitles.import.uploading')}
                  </>
                ) : (
                  t('admin.functionTitles.import.upload')
                )}
              </button>
            </>
          ) : (
            <button className="admin-btn admin-btn-primary" onClick={handleClose}>
              {t('common.close')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function FunctionTitles() {
  const { t } = useLanguage();
  const [functionTitles, setFunctionTitles] = useState([]);
  const [tovLevels, setTovLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [assignedUsersWarning, setAssignedUsersWarning] = useState(null);

  // Drag state
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [functionTitlesData, tovLevelsData] = await Promise.all([
        adminApi.getFunctionTitles(),
        adminApi.getTovLevels(),
      ]);
      setFunctionTitles(functionTitlesData);
      setTovLevels(tovLevelsData);
    } catch (err) {
      console.error('Failed to load data:', err);
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
      try {
        await adminApi.deleteFunctionTitle(deletingItem.id);
        setDeletingItem(null);
        await loadData();
      } catch (err) {
        console.error('Delete error:', err);
        // Check if error is due to assigned users
        if (err.userCount && err.users) {
          setDeletingItem(null);
          setAssignedUsersWarning({
            functionTitle: deletingItem,
            userCount: err.userCount,
            users: err.users,
          });
        } else {
          setError(err.message);
          setDeletingItem(null);
        }
      }
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const blob = await adminApi.exportFunctionTitles();
      saveAs(blob, 'function-titles.xlsx');
    } catch (err) {
      console.error('Export error:', err);
      setError(err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportComplete = () => {
    setShowImportModal(false);
    loadData();
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

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="admin-btn admin-btn-secondary"
            onClick={handleExport}
            disabled={isExporting || functionTitles.length === 0}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2z"/>
            </svg>
            {isExporting ? t('admin.functionTitles.export.exporting') : t('admin.functionTitles.export.button')}
          </button>

          <button
            className="admin-btn admin-btn-secondary"
            onClick={() => setShowImportModal(true)}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/>
            </svg>
            {t('admin.functionTitles.import.button')}
          </button>

          <button className="admin-btn admin-btn-primary" onClick={handleCreate}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            {t('admin.functionTitles.addNew')}
          </button>
        </div>
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
                <th style={{ width: '120px' }}>{t('admin.functionTitles.tovLevel')}</th>
                <th style={{ width: '100px' }}>{t('admin.functionTitles.assignedUsers')}</th>
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
                  <td>
                    {item.tovLevel ? (
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        background: '#e7f3ff',
                        color: '#004A91',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {item.tovLevel.code}
                      </span>
                    ) : (
                      <span style={{ color: '#999' }}>-</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {item._count?.users > 0 ? (
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        background: item._count.users > 0 ? '#fff3cd' : '#f8f9fa',
                        color: item._count.users > 0 ? '#856404' : '#666',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {item._count.users}
                      </span>
                    ) : (
                      <span style={{ color: '#999' }}>0</span>
                    )}
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
          tovLevels={tovLevels}
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

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          tovLevels={tovLevels}
          onClose={() => setShowImportModal(false)}
          onImportComplete={handleImportComplete}
          t={t}
        />
      )}

      {/* Assigned Users Warning Dialog */}
      {assignedUsersWarning && (
        <AssignedUsersWarningDialog
          functionTitle={assignedUsersWarning.functionTitle}
          userCount={assignedUsersWarning.userCount}
          users={assignedUsersWarning.users}
          onClose={() => setAssignedUsersWarning(null)}
          t={t}
        />
      )}
    </div>
  );
}
