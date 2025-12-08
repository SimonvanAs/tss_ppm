import { useState } from 'react';
import { useWhisper } from '../hooks/useWhisper';
import { useLanguage } from '../contexts/LanguageContext';
import './VoiceInputButton.css';

export function VoiceInputButton({ onTranscript, disabled = false }) {
  const { t, getVoiceLanguageCode } = useLanguage();
  const [error, setError] = useState(null);

  const handleResult = (transcript) => {
    setError(null);
    if (onTranscript) {
      onTranscript(transcript);
    }
  };

  const handleError = (errorMessage) => {
    setError(errorMessage);
    // Clear error after 5 seconds
    setTimeout(() => setError(null), 5000);
  };

  const {
    isListening,
    isSupported,
    isProcessing,
    startListening,
    stopListening,
    // Browser Whisper state (from shared context)
    activeBackend,
    isModelLoading,
    isModelReady,
    modelBackend
  } = useWhisper({
    language: getVoiceLanguageCode(),
    onResult: handleResult,
    onError: handleError
  });

  if (!isSupported) {
    return (
      <span className="voice-not-supported" title={t('voice.notSupported')}>
        🎤
      </span>
    );
  }

  const handleMouseDown = (e) => {
    e.preventDefault();
    setError(null);
    startListening();
  };

  const handleMouseUp = (e) => {
    e.preventDefault();
    stopListening();
  };

  const handleMouseLeave = () => {
    if (isListening) {
      stopListening();
    }
  };

  // Touch events for mobile
  const handleTouchStart = (e) => {
    e.preventDefault();
    setError(null);
    startListening();
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    stopListening();
  };

  // Disable button while model is loading (central banner shows progress)
  const isDisabledByLoading = isModelLoading && activeBackend === 'browser';
  const buttonClass = `voice-input-button ${isListening ? 'listening' : ''} ${isProcessing ? 'processing' : ''} ${error ? 'has-error' : ''} ${isDisabledByLoading ? 'loading-model' : ''}`;

  return (
    <div className="voice-input-wrapper">
      <button
        type="button"
        className={buttonClass}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        disabled={disabled || isProcessing || isDisabledByLoading}
        title={isDisabledByLoading ? t('voice.loadingModel') : t('voice.holdToSpeak')}
        aria-label={t('voice.holdToSpeak')}
      >
        <div className="voice-button-content">
          {isProcessing ? (
            <div className="processing-spinner"></div>
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mic-icon"
            >
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          )}
          {isListening && (
            <div className="listening-overlay">
              <div className="sound-wave">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
        </div>
        {isListening && <span className="listening-label">{t('voice.listening')}</span>}
        {isProcessing && <span className="listening-label">{t('voice.processing')}</span>}
      </button>
      {/* Backend indicator (shown when browser backend is active and ready) */}
      {activeBackend === 'browser' && isModelReady && !isListening && !isProcessing && (
        <div className="backend-indicator" title={`${modelBackend?.toUpperCase()} - Local processing`}>
          <span className="backend-dot"></span>
        </div>
      )}
      {error && (
        <div className="voice-error-tooltip">
          <span className="voice-error-icon">!</span>
          <span className="voice-error-text">{t('voice.error')}</span>
        </div>
      )}
    </div>
  );
}
