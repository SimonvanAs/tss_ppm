import { useWhisperContext } from '../contexts/WhisperContext';
import { useLanguage } from '../contexts/LanguageContext';
import './WhisperLoadingBanner.css';

export function WhisperLoadingBanner() {
  const { t } = useLanguage();
  const {
    activeBackend,
    isModelLoading,
    modelLoadProgress,
    modelLoadStatus,
    isModelReady
  } = useWhisperContext();

  // Only show for browser backend while loading
  if (activeBackend !== 'browser' || isModelReady || !isModelLoading) {
    return null;
  }

  return (
    <div className="whisper-loading-banner">
      <div className="whisper-loading-content">
        <div className="whisper-loading-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </div>
        <div className="whisper-loading-info">
          <span className="whisper-loading-title">{t('voice.preparingDictation')}</span>
          <span className="whisper-loading-status">{modelLoadStatus}</span>
          <span className="whisper-loading-hint">{t('voice.oneTimeDownload')}</span>
        </div>
        <div className="whisper-progress-container">
          <div
            className="whisper-progress-bar"
            style={{ width: `${modelLoadProgress}%` }}
          />
        </div>
        <span className="whisper-progress-text">{modelLoadProgress}%</span>
      </div>
    </div>
  );
}
