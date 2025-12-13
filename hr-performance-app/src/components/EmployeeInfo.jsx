import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useForm } from '../contexts/FormContext';
import { useAuth } from '../contexts/AuthContext';
import { adminApi } from '../services/api';
import { VoiceInputButton } from './VoiceInputButton';
import './EmployeeInfo.css';

export function EmployeeInfo() {
  const { t } = useLanguage();
  const { formData, updateFormData, validationErrors } = useForm();
  const { user, hasMinRole } = useAuth();

  // State for function titles and TOV levels from API
  const [functionTitles, setFunctionTitles] = useState([]);
  const [tovLevels, setTovLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [autoLevelApplied, setAutoLevelApplied] = useState(false);

  // Check if user can override TOV level (HR or higher)
  const canOverrideTovLevel = hasMinRole('HR');

  // Load function titles and TOV levels on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const [ftData, tlData] = await Promise.all([
          adminApi.getFunctionTitles(),
          adminApi.getTovLevels(),
        ]);
        setFunctionTitles(ftData.functionTitles || ftData || []);
        setTovLevels(tlData.tovLevels || tlData || []);
      } catch (err) {
        console.error('Failed to load function titles or TOV levels:', err);
        setLoadError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleChange = (field) => (e) => {
    updateFormData({ [field]: e.target.value });
  };

  // Handle function title selection - auto-populate TOV level if mapped
  const handleFunctionTitleChange = (e) => {
    const selectedId = e.target.value;
    const selectedTitle = functionTitles.find(ft => ft.id === selectedId);

    // Build updates object to batch the state change
    const updates = { functionTitle: selectedId };
    let shouldAutoApply = false;

    // If function title has a mapped TOV level, auto-apply it
    if (selectedTitle?.tovLevelId || selectedTitle?.tovLevel) {
      const tovLevelCode = selectedTitle.tovLevel?.code ||
        tovLevels.find(tl => tl.id === selectedTitle.tovLevelId)?.code;
      if (tovLevelCode) {
        updates.tovLevel = tovLevelCode;
        shouldAutoApply = true;
      }
    }

    // Batch update form data in single call
    updateFormData(updates);
    setAutoLevelApplied(shouldAutoApply);
  };

  // Handle manual TOV level change (only for HR/Admin)
  const handleTovLevelChange = (e) => {
    updateFormData({ tovLevel: e.target.value });
    setAutoLevelApplied(false);
  };

  const handleVoiceInput = (field) => (transcript) => {
    updateFormData({
      [field]: formData[field] ? `${formData[field]} ${transcript}` : transcript
    });
  };

  const hasError = (field) => validationErrors.includes(field);

  // Helper to build aria-describedby from multiple possible IDs
  const getAriaDescribedBy = (...ids) => {
    const validIds = ids.filter(Boolean);
    return validIds.length > 0 ? validIds.join(' ') : undefined;
  };

  // Check if the selected function title has no TOV level mapping
  const hasNoTovLevelMapping = () => {
    if (!formData.functionTitle) return false;
    const selected = functionTitles.find(ft => ft.id === formData.functionTitle);
    return selected && !selected.tovLevelId && !selected.tovLevel;
  };

  return (
    <section className="section employee-info">
      <h2 className="section-title">{t('employee.title')}</h2>

      <div className="form-grid">
        <div className={`form-group ${hasError('employeeName') ? 'has-error' : ''}`}>
          <label htmlFor="employeeName">{t('employee.name')} *</label>
          <div className="input-with-voice">
            <input
              type="text"
              id="employeeName"
              value={formData.employeeName}
              onChange={handleChange('employeeName')}
              placeholder={t('employee.namePlaceholder')}
              aria-describedby={hasError('employeeName') ? 'employeeName-validation' : undefined}
            />
            <VoiceInputButton onTranscript={handleVoiceInput('employeeName')} />
          </div>
          {hasError('employeeName') && (
            <span id="employeeName-validation" className="field-error" role="alert">{t('validation.required')}</span>
          )}
        </div>

        <div className={`form-group ${hasError('functionTitle') ? 'has-error' : ''}`}>
          <label htmlFor="functionTitle">{t('employee.functionTitle')} *</label>
          <select
            id="functionTitle"
            value={formData.functionTitle}
            onChange={handleFunctionTitleChange}
            disabled={loading}
            aria-describedby={getAriaDescribedBy(
              loadError && 'functionTitle-error',
              hasError('functionTitle') && 'functionTitle-validation'
            )}
          >
            <option value="">{loading ? t('common.loading') : t('employee.selectFunctionTitle')}</option>
            {functionTitles.map(ft => (
              <option key={ft.id} value={ft.id}>
                {ft.name}
                {ft.tovLevel?.code ? ` (${ft.tovLevel.code})` : ''}
              </option>
            ))}
          </select>
          {loadError && (
            <span id="functionTitle-error" className="field-warning" role="alert">{t('employee.loadError')}</span>
          )}
          {hasError('functionTitle') && (
            <span id="functionTitle-validation" className="field-error">{t('validation.required')}</span>
          )}
        </div>

        <div className={`form-group ${hasError('businessUnit') ? 'has-error' : ''}`}>
          <label htmlFor="businessUnit">{t('employee.businessUnit')} *</label>
          <div className="input-with-voice">
            <input
              type="text"
              id="businessUnit"
              value={formData.businessUnit}
              onChange={handleChange('businessUnit')}
              placeholder={t('employee.businessUnitPlaceholder')}
              aria-describedby={hasError('businessUnit') ? 'businessUnit-validation' : undefined}
            />
            <VoiceInputButton onTranscript={handleVoiceInput('businessUnit')} />
          </div>
          {hasError('businessUnit') && (
            <span id="businessUnit-validation" className="field-error" role="alert">{t('validation.required')}</span>
          )}
        </div>

        <div className={`form-group ${hasError('tovLevel') ? 'has-error' : ''}`}>
          <label htmlFor="tovLevel">
            {t('employee.tovLevel')} *
            {autoLevelApplied && (
              <span className="auto-applied-badge" id="tovLevel-auto-applied">
                ({t('employee.autoApplied')})
              </span>
            )}
          </label>
          {/* Show dropdown if HR+ OR if function title has no mapping (so non-HR can still select) */}
          {canOverrideTovLevel || hasNoTovLevelMapping() ? (
            <>
              <select
                id="tovLevel"
                value={formData.tovLevel}
                onChange={handleTovLevelChange}
                disabled={loading}
                aria-describedby={
                  hasNoTovLevelMapping() && !canOverrideTovLevel
                    ? 'tovLevel-warning'
                    : hasError('tovLevel')
                    ? 'tovLevel-validation'
                    : autoLevelApplied
                    ? 'tovLevel-auto-applied'
                    : undefined
                }
              >
                <option value="">{t('employee.selectLevel')}</option>
                {tovLevels.length > 0 ? (
                  tovLevels.map(tl => (
                    <option key={tl.id} value={tl.code}>
                      {tl.code} - {tl.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="A">A - Level A</option>
                    <option value="B">B - Level B</option>
                    <option value="C">C - Level C</option>
                    <option value="D">D - Level D</option>
                  </>
                )}
              </select>
              {hasNoTovLevelMapping() && !canOverrideTovLevel && (
                <span id="tovLevel-warning" className="field-warning" role="alert">{t('employee.noTovLevelMapping')}</span>
              )}
            </>
          ) : (
            <div className="tov-level-display">
              <input
                type="text"
                id="tovLevel"
                value={formData.tovLevel || t('employee.selectFunctionTitleFirst')}
                readOnly
                className="read-only-input"
                aria-describedby={autoLevelApplied ? 'tovLevel-auto-applied' : undefined}
              />
            </div>
          )}
          {hasError('tovLevel') && (
            <span id="tovLevel-validation" className="field-error">{t('validation.selectTovLevel')}</span>
          )}
        </div>

        <div className={`form-group ${hasError('reviewDate') ? 'has-error' : ''}`}>
          <label htmlFor="reviewDate">{t('employee.reviewDate')} *</label>
          <input
            type="date"
            id="reviewDate"
            value={formData.reviewDate}
            onChange={handleChange('reviewDate')}
            aria-describedby={hasError('reviewDate') ? 'reviewDate-validation' : undefined}
          />
          {hasError('reviewDate') && (
            <span id="reviewDate-validation" className="field-error" role="alert">{t('validation.required')}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="managerName">{t('employee.managerName')}</label>
          <div className="input-with-voice">
            <input
              type="text"
              id="managerName"
              value={formData.managerName}
              onChange={handleChange('managerName')}
              placeholder={t('employee.managerPlaceholder')}
            />
            <VoiceInputButton onTranscript={handleVoiceInput('managerName')} />
          </div>
        </div>
      </div>
    </section>
  );
}
