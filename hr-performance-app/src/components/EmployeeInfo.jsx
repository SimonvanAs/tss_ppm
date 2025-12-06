import { useLanguage } from '../contexts/LanguageContext';
import { useForm } from '../contexts/FormContext';
import { VoiceInputButton } from './VoiceInputButton';
import './EmployeeInfo.css';

export function EmployeeInfo() {
  const { t } = useLanguage();
  const { formData, updateFormData, validationErrors } = useForm();

  const handleChange = (field) => (e) => {
    updateFormData({ [field]: e.target.value });
  };

  const handleVoiceInput = (field) => (transcript) => {
    updateFormData({
      [field]: formData[field] ? `${formData[field]} ${transcript}` : transcript
    });
  };

  const hasError = (field) => validationErrors.includes(field);

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
            />
            <VoiceInputButton onTranscript={handleVoiceInput('employeeName')} />
          </div>
          {hasError('employeeName') && (
            <span className="field-error">{t('validation.required')}</span>
          )}
        </div>

        <div className={`form-group ${hasError('role') ? 'has-error' : ''}`}>
          <label htmlFor="role">{t('employee.role')} *</label>
          <div className="input-with-voice">
            <input
              type="text"
              id="role"
              value={formData.role}
              onChange={handleChange('role')}
              placeholder={t('employee.rolePlaceholder')}
            />
            <VoiceInputButton onTranscript={handleVoiceInput('role')} />
          </div>
          {hasError('role') && (
            <span className="field-error">{t('validation.required')}</span>
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
            />
            <VoiceInputButton onTranscript={handleVoiceInput('businessUnit')} />
          </div>
          {hasError('businessUnit') && (
            <span className="field-error">{t('validation.required')}</span>
          )}
        </div>

        <div className={`form-group ${hasError('tovLevel') ? 'has-error' : ''}`}>
          <label htmlFor="tovLevel">{t('employee.tovLevel')} *</label>
          <select
            id="tovLevel"
            value={formData.tovLevel}
            onChange={handleChange('tovLevel')}
          >
            <option value="">{t('employee.selectLevel')}</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
          </select>
          {hasError('tovLevel') && (
            <span className="field-error">{t('validation.selectTovLevel')}</span>
          )}
        </div>

        <div className={`form-group ${hasError('reviewDate') ? 'has-error' : ''}`}>
          <label htmlFor="reviewDate">{t('employee.reviewDate')} *</label>
          <input
            type="date"
            id="reviewDate"
            value={formData.reviewDate}
            onChange={handleChange('reviewDate')}
          />
          {hasError('reviewDate') && (
            <span className="field-error">{t('validation.required')}</span>
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
