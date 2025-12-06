import { useLanguage } from '../contexts/LanguageContext';
import { useForm } from '../contexts/FormContext';
import { VoiceInputButton } from './VoiceInputButton';
import './Comments.css';

export function Comments() {
  const { t } = useLanguage();
  const { formData, updateFormData } = useForm();

  const handleChange = (e) => {
    updateFormData({ comments: e.target.value });
  };

  const handleVoiceInput = (transcript) => {
    updateFormData({
      comments: formData.comments
        ? `${formData.comments} ${transcript}`
        : transcript
    });
  };

  return (
    <section className="section comments">
      <h2 className="section-title">{t('comments.title')}</h2>

      <div className="form-group">
        <div className="textarea-with-voice">
          <textarea
            id="comments"
            value={formData.comments}
            onChange={handleChange}
            placeholder={t('comments.placeholder')}
            rows={5}
          />
          <VoiceInputButton onTranscript={handleVoiceInput} />
        </div>
      </div>
    </section>
  );
}
