import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useForm } from '../contexts/FormContext';
import { generateReport } from '../utils/docxGenerator';
import './Actions.css';

export function Actions() {
  const { t } = useLanguage();
  const { formData, sessionCode, validate, clearSession, showSaveIndicator, manualSave } = useForm();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Handle Ctrl+S to save
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        manualSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [manualSave]);

  const handleDownload = async (isDraft = false) => {
    if (!isDraft) {
      const validation = validate();
      if (!validation.isValid) {
        alert(t('validation.formIncomplete'));
        return;
      }
    }

    setIsGenerating(true);
    try {
      await generateReport(formData, sessionCode, isDraft);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClear = () => {
    if (window.confirm(t('actions.confirmClear'))) {
      clearSession();
    }
  };

  return (
    <>
      <section className="section actions-section">
        <div className="actions-container">
          <button
            type="button"
            className="action-button secondary"
            onClick={() => setShowPreview(true)}
          >
            {t('actions.preview')}
          </button>

          <button
            type="button"
            className="action-button secondary"
            onClick={() => handleDownload(true)}
            disabled={isGenerating}
          >
            {isGenerating ? '...' : t('actions.saveDraft')}
          </button>

          <button
            type="button"
            className="action-button primary"
            onClick={() => handleDownload(false)}
            disabled={isGenerating}
          >
            {isGenerating ? '...' : t('actions.download')}
          </button>

          <button
            type="button"
            className="action-button danger"
            onClick={handleClear}
          >
            {t('actions.clearSession')}
          </button>

          {showSaveIndicator && (
            <div className="save-indicator">
              <span className="save-indicator-icon">✓</span>
              <span className="save-indicator-text">{t('actions.saved')}</span>
            </div>
          )}
        </div>
      </section>

      {showPreview && (
        <PreviewModal
          formData={formData}
          sessionCode={sessionCode}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
}

function PreviewModal({ formData, sessionCode, onClose }) {
  const { t, language } = useLanguage();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="preview-header">
          <h2>{t('actions.preview')}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="preview-content">
          <div className="preview-document">
            <h1 className="preview-title">
              {language === 'nl' ? 'Beoordelingsrapport' : language === 'es' ? 'Informe de Evaluación' : 'Performance Review Report'}
            </h1>
            <h2 className="preview-employee">{formData.employeeName || 'Employee Name'}</h2>
            <p className="preview-subtitle">{formData.role} | {formData.businessUnit}</p>

            <div className="preview-section">
              <h3>{t('employee.title')}</h3>
              <table className="preview-table">
                <tbody>
                  <tr><td>{t('employee.name')}:</td><td>{formData.employeeName}</td></tr>
                  <tr><td>{t('employee.role')}:</td><td>{formData.role}</td></tr>
                  <tr><td>{t('employee.businessUnit')}:</td><td>{formData.businessUnit}</td></tr>
                  <tr><td>{t('employee.tovLevel')}:</td><td>{formData.tovLevel}</td></tr>
                  <tr><td>{t('employee.reviewDate')}:</td><td>{formData.reviewDate}</td></tr>
                  <tr><td>{t('employee.managerName')}:</td><td>{formData.managerName}</td></tr>
                </tbody>
              </table>
            </div>

            {formData.summary && (
              <div className="preview-section">
                <h3>{t('summary.title')}</h3>
                <p>{formData.summary}</p>
              </div>
            )}

            <div className="preview-section">
              <h3>{t('whatAxis.title')}</h3>
              {formData.goals?.filter(g => g.title.trim()).map((goal, idx) => (
                <div key={goal.id} className="preview-goal">
                  <strong>{idx + 1}. {goal.title}</strong> ({goal.weight}%)
                  <p>{goal.description}</p>
                  <span className="preview-score">Score: {goal.score} - {t(`scores.${goal.score}`)}</span>
                </div>
              ))}
            </div>

            <div className="preview-section">
              <h3>{t('howAxis.title')}</h3>
              <p>Level: {formData.tovLevel}</p>
            </div>

            {formData.selfAssessment && (
              <div className="preview-section">
                <h3>{t('selfAssessment.title')}</h3>
                <p>{formData.selfAssessment}</p>
              </div>
            )}

            {formData.comments && (
              <div className="preview-section">
                <h3>{t('comments.title')}</h3>
                <p>{formData.comments}</p>
              </div>
            )}

            <div className="preview-footer">
              <small>Session Code: {sessionCode} | Generated: {new Date().toLocaleDateString()}</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
