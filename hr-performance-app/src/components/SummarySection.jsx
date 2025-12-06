import { useLanguage } from '../contexts/LanguageContext';
import { useForm } from '../contexts/FormContext';
import { VoiceInputButton } from './VoiceInputButton';
import './SummarySection.css';

export function SummarySection() {
  const { t } = useLanguage();
  const { formData, updateFormData } = useForm();

  const handleChange = (e) => {
    updateFormData({ summary: e.target.value });
  };

  const handleVoiceInput = (transcript) => {
    updateFormData({
      summary: formData.summary ? `${formData.summary} ${transcript}` : transcript
    });
  };

  return (
    <section className="section summary-section">
      <h2 className="section-title">{t('summary.title')}</h2>

      <div className="form-group">
        <div className="textarea-with-voice">
          <textarea
            id="summary"
            value={formData.summary}
            onChange={handleChange}
            placeholder={t('summary.placeholder')}
            rows={5}
          />
          <VoiceInputButton onTranscript={handleVoiceInput} />
        </div>
      </div>
    </section>
  );
}
