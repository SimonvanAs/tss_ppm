import { useLanguage } from '../contexts/LanguageContext';
import { useForm } from '../contexts/FormContext';
import { VoiceInputButton } from './VoiceInputButton';
import './SelfAssessment.css';

export function SelfAssessment() {
  const { t } = useLanguage();
  const { formData, updateFormData } = useForm();

  const handleChange = (e) => {
    updateFormData({ selfAssessment: e.target.value });
  };

  const handleVoiceInput = (transcript) => {
    updateFormData({
      selfAssessment: formData.selfAssessment
        ? `${formData.selfAssessment} ${transcript}`
        : transcript
    });
  };

  return (
    <section className="section self-assessment">
      <h2 className="section-title">{t('selfAssessment.title')}</h2>

      <div className="form-group">
        <div className="textarea-with-voice">
          <textarea
            id="selfAssessment"
            value={formData.selfAssessment}
            onChange={handleChange}
            placeholder={t('selfAssessment.placeholder')}
            rows={5}
          />
          <VoiceInputButton onTranscript={handleVoiceInput} />
        </div>
      </div>
    </section>
  );
}
