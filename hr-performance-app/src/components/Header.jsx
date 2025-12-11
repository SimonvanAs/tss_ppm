import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useForm } from '../contexts/FormContext';
import { useWhisperContext } from '../contexts/WhisperContext';
import { useAuth } from '../contexts/AuthContext';
import { DevRoleSwitcher } from './DevRoleSwitcher';
import './Header.css';

export function Header() {
  const { activeBackend, setActiveBackend, isModelLoading } = useWhisperContext();
  const { t, language, setLanguage, languageNames, availableLanguages } = useLanguage();
  const { progress, updateFormData } = useForm();
  const { user, logout, isAuthenticated } = useAuth();

  const getProgressColor = () => {
    if (progress < 50) return '#DC3545';
    if (progress < 80) return '#FFA500';
    return '#28A745';
  };

  return (
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
          <DevRoleSwitcher />
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
            <span className="version-label">TSS PPM generator v2.0.0</span>
          </div>

          {isAuthenticated && user && (
            <div className="user-menu">
              <span className="user-name" title={user.email}>
                {user.displayName || user.email}
              </span>
              <span className="user-role">{user.role}</span>
              <button
                className="logout-button"
                onClick={() => logout()}
                title="Logout"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="session-bar">
        <div className="dictation-toggle">
          <label className="toggle-label">
            <span className="toggle-text">{t('voice.browserDictation')}</span>
            <div className="toggle-switch-wrapper">
              <input
                type="checkbox"
                className="toggle-input"
                checked={activeBackend === 'browser'}
                onChange={(e) => setActiveBackend(e.target.checked ? 'browser' : 'server')}
              />
              <span className={`toggle-switch ${isModelLoading ? 'loading' : ''}`}></span>
            </div>
          </label>
        </div>
      </div>
    </header>
  );
}
