import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { adminApi } from '../../services/api';

function CompetencyModal({ competency, tovLevels, onSave, onClose, t, language }) {
  const [formData, setFormData] = useState({
    competencyId: competency?.competencyId || '',
    tovLevelId: competency?.tovLevelId || '',
    category: competency?.category || '',
    subcategory: competency?.subcategory || '',
    title: competency?.title || { en: '', nl: '', es: '' },
    indicators: competency?.indicators || { en: [], nl: [], es: [] },
    sortOrder: competency?.sortOrder || 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [activeLang, setActiveLang] = useState(language);
  const [indicatorText, setIndicatorText] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.competencyId.trim() || !formData.tovLevelId || !formData.category.trim()) {
      setError(t('admin.competencies.requiredFields'));
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

  const handleTitleChange = (lang, value) => {
    setFormData({
      ...formData,
      title: { ...formData.title, [lang]: value },
    });
  };

  const addIndicator = () => {
    if (indicatorText.trim()) {
      setFormData({
        ...formData,
        indicators: {
          ...formData.indicators,
          [activeLang]: [...(formData.indicators[activeLang] || []), indicatorText.trim()],
        },
      });
      setIndicatorText('');
    }
  };

  const removeIndicator = (index) => {
    const indicators = [...(formData.indicators[activeLang] || [])];
    indicators.splice(index, 1);
    setFormData({
      ...formData,
      indicators: { ...formData.indicators, [activeLang]: indicators },
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
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        className="admin-modal"
        style={{ maxWidth: '700px' }}
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="competency-modal-title"
      >
        <div className="admin-modal-header">
          <h3 id="competency-modal-title" className="admin-modal-title">
            {competency ? t('admin.competencies.edit') : t('admin.competencies.create')}
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="admin-form-group">
                <label className="admin-form-label">{t('admin.competencies.competencyId')} *</label>
                <input
                  type="text"
                  className="admin-form-input"
                  value={formData.competencyId}
                  onChange={e => setFormData({ ...formData, competencyId: e.target.value })}
                  placeholder="result_driven_a"
                  disabled={!!competency}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">{t('admin.competencies.tovLevel')} *</label>
                <select
                  className="admin-form-select"
                  value={formData.tovLevelId}
                  onChange={e => setFormData({ ...formData, tovLevelId: e.target.value })}
                  disabled={!!competency}
                >
                  <option value="">{t('admin.competencies.selectLevel')}</option>
                  {tovLevels.map(tl => (
                    <option key={tl.id} value={tl.id}>
                      {tl.code} - {tl.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="admin-form-group">
                <label className="admin-form-label">{t('admin.competencies.category')} *</label>
                <input
                  type="text"
                  className="admin-form-input"
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Dedicated"
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">{t('admin.competencies.subcategory')}</label>
                <input
                  type="text"
                  className="admin-form-input"
                  value={formData.subcategory}
                  onChange={e => setFormData({ ...formData, subcategory: e.target.value })}
                  placeholder="Result driven"
                />
              </div>
            </div>

            {/* Language Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', marginTop: '16px' }}>
              {['en', 'nl', 'es'].map(lang => (
                <button
                  key={lang}
                  type="button"
                  className={`admin-btn admin-btn-sm ${activeLang === lang ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
                  onClick={() => setActiveLang(lang)}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">{t('admin.competencies.title')} ({activeLang.toUpperCase()})</label>
              <input
                type="text"
                className="admin-form-input"
                value={formData.title[activeLang] || ''}
                onChange={e => handleTitleChange(activeLang, e.target.value)}
                placeholder={t('admin.competencies.titlePlaceholder')}
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">{t('admin.competencies.indicators')} ({activeLang.toUpperCase()})</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="text"
                  className="admin-form-input"
                  value={indicatorText}
                  onChange={e => setIndicatorText(e.target.value)}
                  placeholder={t('admin.competencies.indicatorPlaceholder')}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addIndicator())}
                />
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={addIndicator}
                >
                  {t('common.add')}
                </button>
              </div>

              <div style={{ background: '#f8f9fa', borderRadius: '6px', padding: '12px', minHeight: '80px' }}>
                {(formData.indicators[activeLang] || []).length === 0 ? (
                  <p style={{ margin: 0, color: '#999', fontSize: '13px' }}>
                    {t('admin.competencies.noIndicators')}
                  </p>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    {(formData.indicators[activeLang] || []).map((indicator, index) => (
                      <li key={index} style={{ marginBottom: '6px', fontSize: '13px' }}>
                        <span>{indicator}</span>
                        <button
                          type="button"
                          onClick={() => removeIndicator(index)}
                          style={{
                            marginLeft: '8px',
                            background: 'none',
                            border: 'none',
                            color: '#dc3545',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          {t('common.remove')}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">{t('admin.competencies.sortOrder')}</label>
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

export function Competencies() {
  const { t, language } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [competencies, setCompetencies] = useState([]);
  const [tovLevels, setTovLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [selectedLevel, setSelectedLevel] = useState(searchParams.get('tovLevelId') || '');
  const [search, setSearch] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedLevel) {
      setSearchParams({ tovLevelId: selectedLevel });
    } else {
      setSearchParams({});
    }
  }, [selectedLevel, setSearchParams]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [competenciesData, tovLevelsData] = await Promise.all([
        adminApi.getCompetencies(),
        adminApi.getTovLevels(),
      ]);
      setCompetencies(competenciesData);
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
      // Note: Need to add update endpoint to API
      console.warn('Competency update not implemented');
    } else {
      await adminApi.createCompetency(data);
    }
    await loadData();
  };

  const getTitle = (item) => {
    if (!item.title) return item.subcategory || item.competencyId;
    return item.title[language] || item.title.en || item.subcategory;
  };

  // Filter and group competencies
  const filteredCompetencies = competencies.filter(comp => {
    const matchesLevel = !selectedLevel || comp.tovLevelId === selectedLevel;
    const matchesSearch = !search ||
      getTitle(comp).toLowerCase().includes(search.toLowerCase()) ||
      comp.category?.toLowerCase().includes(search.toLowerCase()) ||
      comp.subcategory?.toLowerCase().includes(search.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  // Group by category
  const groupedCompetencies = filteredCompetencies.reduce((acc, comp) => {
    const category = comp.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(comp);
    return acc;
  }, {});

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
          <div className="admin-empty-title">{t('admin.competencies.error')}</div>
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
        <h1 className="admin-page-title">{t('admin.competencies.title')}</h1>
        <p className="admin-page-subtitle">{t('admin.competencies.subtitle')}</p>
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
            placeholder={t('admin.competencies.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select
          className="admin-filter-select"
          value={selectedLevel}
          onChange={e => setSelectedLevel(e.target.value)}
        >
          <option value="">{t('admin.competencies.allLevels')}</option>
          {tovLevels.map(tl => (
            <option key={tl.id} value={tl.id}>
              {tl.code} - {tl.name}
            </option>
          ))}
        </select>

        <button className="admin-btn admin-btn-primary" onClick={handleCreate}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          {t('admin.competencies.addNew')}
        </button>
      </div>

      {/* Competencies by Category */}
      {Object.keys(groupedCompetencies).length === 0 ? (
        <div className="admin-card">
          <div className="admin-empty">
            <div className="admin-empty-icon">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor" opacity="0.3">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
              </svg>
            </div>
            <div className="admin-empty-title">{t('admin.competencies.noItems')}</div>
            <div className="admin-empty-text">{t('admin.competencies.noItemsDesc')}</div>
            <button className="admin-btn admin-btn-primary" onClick={handleCreate}>
              {t('admin.competencies.addFirst')}
            </button>
          </div>
        </div>
      ) : (
        Object.entries(groupedCompetencies).map(([category, items]) => (
          <div key={category} className="admin-card" style={{ marginBottom: '16px' }}>
            <div className="admin-card-header">
              <h3 className="admin-card-title">{category}</h3>
              <span className="admin-badge admin-badge-info">
                {items.length} {t('admin.competencies.competencies')}
              </span>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              {items.map(comp => (
                <div
                  key={comp.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    padding: '12px',
                    background: '#f8f9fa',
                    borderRadius: '6px',
                    borderLeft: '3px solid #004A91',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span className="admin-badge admin-badge-primary">
                        {comp.tovLevel?.code || '?'}
                      </span>
                      <strong style={{ fontSize: '14px', color: '#333' }}>{getTitle(comp)}</strong>
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {comp.subcategory && <span>{comp.subcategory} • </span>}
                      <span style={{ fontFamily: 'monospace' }}>{comp.competencyId}</span>
                    </div>
                    {comp.indicators?.[language]?.length > 0 && (
                      <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                        <strong>{t('admin.competencies.indicators')}:</strong>{' '}
                        {comp.indicators[language].slice(0, 2).join('; ')}
                        {comp.indicators[language].length > 2 && ` +${comp.indicators[language].length - 2} more`}
                      </div>
                    )}
                  </div>

                  <button
                    className="admin-btn admin-btn-sm admin-btn-secondary"
                    onClick={() => handleEdit(comp)}
                  >
                    {t('common.edit')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <CompetencyModal
          competency={editingItem}
          tovLevels={tovLevels}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
          t={t}
          language={language}
        />
      )}
    </div>
  );
}
