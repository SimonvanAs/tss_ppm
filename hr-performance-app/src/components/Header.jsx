import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useForm } from '../contexts/FormContext';
import './Header.css';

export function Header() {
  const { t, language, setLanguage, languageNames, availableLanguages } = useLanguage();
  const { sessionCode, progress, lastSaved, resumeSession, updateFormData } = useForm();
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [resumeCode, setResumeCode] = useState('');
  const [resumeError, setResumeError] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [sessionBarHidden, setSessionBarHidden] = useState(false);
  const lastScrollY = useRef(0);

  // Hide session bar on scroll down (mobile only)
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const isMobile = window.innerWidth <= 768;

      if (isMobile) {
        if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
          setSessionBarHidden(true);
        } else {
          setSessionBarHidden(false);
        }
      } else {
        setSessionBarHidden(false);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(sessionCode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleEmailCode = () => {
    const subject = encodeURIComponent('Performance Review Session Code');
    const body = encodeURIComponent(
      `Your performance review session code: ${sessionCode}\n\n` +
      `This code will expire in 14 days.\n` +
      `Resume your review at: ${window.location.origin}`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleResume = () => {
    if (!resumeCode.trim()) return;

    const success = resumeSession(resumeCode.trim());
    if (success) {
      setShowResumeModal(false);
      setResumeCode('');
      setResumeError('');
    } else {
      setResumeError(t('app.invalidCode'));
    }
  };

  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value;
    setLanguage(newLanguage);
    updateFormData({ language: newLanguage });
  };

  const getProgressColor = () => {
    if (progress < 50) return '#DC3545';
    if (progress < 80) return '#FFA500';
    return '#28A745';
  };

  return (
    <>
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <img src="/TSS_logo.png" alt="Total Specific Solutions" className="header-logo" />
            <h1 className="header-title">{t('app.title')}</h1>
          </div>

          <div className="header-center">
            <div className="progress-container">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: getProgressColor()
                  }}
                />
              </div>
              <span className="progress-text">{progress}% {t('app.progress')}</span>
            </div>
          </div>

          <div className="header-right">
            <div className="language-version-container">
              <div className="language-selector-wrapper">
                {availableLanguages.map(lang => (
                  <button
                    key={lang}
                    className={`language-flag-button ${language === lang ? 'active' : ''}`}
                    onClick={() => {
                      setLanguage(lang);
                      updateFormData({ language: lang });
                    }}
                    title={languageNames[lang]}
                    aria-label={languageNames[lang]}
                  >
                    {lang === 'en' && (
                      <svg className="flag-icon" viewBox="0 0 60 30" width="24" height="12">
                        <clipPath id="gb-s"><path d="M0,0 v30 h60 v-30 z"/></clipPath>
                        <clipPath id="gb-t"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z"/></clipPath>
                        <g clipPath="url(#gb-s)">
                          <path d="M0,0 v30 h60 v-30 z" fill="#012169"/>
                          <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
                          <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#gb-t)" stroke="#C8102E" strokeWidth="4"/>
                          <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10"/>
                          <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6"/>
                        </g>
                      </svg>
                    )}
                    {lang === 'nl' && (
                      <svg className="flag-icon" viewBox="0 0 9 6" width="24" height="16">
                        <rect fill="#21468B" width="9" height="6"/>
                        <rect fill="#FFF" width="9" height="4"/>
                        <rect fill="#AE1C28" width="9" height="2"/>
                      </svg>
                    )}
                    {lang === 'es' && (
                      <svg className="flag-icon" viewBox="0 0 750 500" width="24" height="16">
                        <rect width="750" height="500" fill="#c60b1e"/>
                        <rect width="750" height="250" y="125" fill="#ffc400"/>
                      </svg>
                    )}
                  </button>
                ))}
              </div>
              <span className="version-label">TSS PPM generator v1.0.7</span>
            </div>
          </div>
        </div>

        <div className={`session-bar ${sessionBarHidden ? 'session-bar-hidden' : ''}`}>
          <div className="session-code">
            <span className="session-label">{t('app.sessionCode')}:</span>
            <span className="session-value">{sessionCode}</span>
            <button
              className="session-button"
              onClick={handleCopyCode}
              title={t('app.copyCode')}
            >
              {copySuccess ? '✓' : t('app.copyCode')}
            </button>
            <button
              className="session-button"
              onClick={handleEmailCode}
              title={t('app.emailCode')}
            >
              {t('app.emailCode')}
            </button>
          </div>

          <div className="session-actions">
            {lastSaved && (
              <span className="last-saved">
                Saved: {lastSaved.toLocaleTimeString()}
              </span>
            )}
            <button
              className="session-button resume-button"
              onClick={() => setShowResumeModal(true)}
            >
              {t('app.resumeSession')}
            </button>
          </div>
        </div>
      </header>

      {showResumeModal && (
        <div className="modal-overlay" onClick={() => setShowResumeModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{t('app.resumeSession')}</h2>
            <div className="modal-content">
              <input
                type="text"
                className="modal-input"
                placeholder={t('app.enterCode')}
                value={resumeCode}
                onChange={(e) => {
                  setResumeCode(e.target.value.toUpperCase());
                  setResumeError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleResume()}
                autoFocus
              />
              {resumeError && <p className="error-message">{resumeError}</p>}
            </div>
            <div className="modal-actions">
              <button
                className="modal-button cancel"
                onClick={() => setShowResumeModal(false)}
              >
                {t('app.cancel')}
              </button>
              <button
                className="modal-button primary"
                onClick={handleResume}
              >
                {t('app.resume')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
