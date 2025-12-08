import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useForm } from '../contexts/FormContext';
import { getAllSessionsList, deleteSession } from '../utils/session';
import './SessionsList.css';

export function SessionsList({ onBack, onResumeSession }) {
  const { t, language, setLanguage, languageNames, availableLanguages } = useLanguage();
  const { resumeSession } = useForm();
  const [sessions, setSessions] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    setSessions(getAllSessionsList());
  }, []);

  const handleResume = (sessionCode) => {
    resumeSession(sessionCode);
    onResumeSession(sessionCode);
  };

  const handleDelete = (sessionCode) => {
    deleteSession(sessionCode);
    setSessions(getAllSessionsList());
    setConfirmDelete(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString(language, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatLastModified = (isoString) => {
    if (!isoString) return '-';
    try {
      return new Date(isoString).toLocaleString(language, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const getProgressColor = (progress) => {
    if (progress < 50) return '#DC3545';
    if (progress < 80) return '#FFA500';
    return '#28A745';
  };

  return (
    <div className="sessions-page">
      <header className="sessions-header">
        <div className="sessions-header-content">
          <div className="sessions-header-left">
            <img src="/TSS_logo.png" alt="Total Specific Solutions" className="sessions-logo" />
            <h1 className="sessions-title">{t('sessions.title')}</h1>
          </div>
          <div className="sessions-header-right">
            <div className="language-selector-wrapper">
              {availableLanguages.map(lang => (
                <button
                  key={lang}
                  className={`language-flag-button ${language === lang ? 'active' : ''}`}
                  onClick={() => setLanguage(lang)}
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
          </div>
        </div>
      </header>

      <main className="sessions-content">
        <div className="sessions-actions-bar">
          <button className="sessions-back-button" onClick={onBack}>
            ← {t('sessions.backToForm')}
          </button>
          <button className="sessions-new-button" onClick={onBack}>
            + {t('sessions.newSession')}
          </button>
        </div>

        {sessions.length === 0 ? (
          <div className="sessions-empty">
            <p>{t('sessions.noSessions')}</p>
            <button className="sessions-new-button" onClick={onBack}>
              {t('sessions.startNew')}
            </button>
          </div>
        ) : (
          <div className="sessions-list">
            <div className="sessions-table-header">
              <span className="sessions-col-employee">{t('sessions.employee')}</span>
              <span className="sessions-col-code">{t('sessions.code')}</span>
              <span className="sessions-col-date">{t('sessions.reviewDate')}</span>
              <span className="sessions-col-progress">{t('sessions.progress')}</span>
              <span className="sessions-col-modified">{t('sessions.lastModified')}</span>
              <span className="sessions-col-expires">{t('sessions.expires')}</span>
              <span className="sessions-col-actions">{t('sessions.actions')}</span>
            </div>

            {sessions.map((session) => (
              <div key={session.sessionCode} className="sessions-row">
                <span className="sessions-col-employee">
                  {session.employeeName || <em className="sessions-empty-value">{t('sessions.unnamed')}</em>}
                  {session.role && <span className="sessions-role">{session.role}</span>}
                </span>
                <span className="sessions-col-code">
                  <code>{session.sessionCode}</code>
                </span>
                <span className="sessions-col-date">
                  {formatDate(session.reviewDate)}
                </span>
                <span className="sessions-col-progress">
                  <div className="sessions-progress-bar">
                    <div
                      className="sessions-progress-fill"
                      style={{
                        width: `${session.progress}%`,
                        backgroundColor: getProgressColor(session.progress)
                      }}
                    />
                  </div>
                  <span className="sessions-progress-text">{session.progress}%</span>
                </span>
                <span className="sessions-col-modified">
                  {formatLastModified(session.lastModified)}
                </span>
                <span className="sessions-col-expires">
                  {session.daysRemaining} {t('sessions.days')}
                </span>
                <span className="sessions-col-actions">
                  <button
                    className="sessions-action-button resume"
                    onClick={() => handleResume(session.sessionCode)}
                  >
                    {t('sessions.resume')}
                  </button>
                  {confirmDelete === session.sessionCode ? (
                    <>
                      <button
                        className="sessions-action-button confirm-delete"
                        onClick={() => handleDelete(session.sessionCode)}
                      >
                        {t('sessions.confirmDelete')}
                      </button>
                      <button
                        className="sessions-action-button cancel"
                        onClick={() => setConfirmDelete(null)}
                      >
                        {t('app.cancel')}
                      </button>
                    </>
                  ) : (
                    <button
                      className="sessions-action-button delete"
                      onClick={() => setConfirmDelete(session.sessionCode)}
                    >
                      {t('sessions.delete')}
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="sessions-footer">
        <p>{t('sessions.storageNote')}</p>
      </footer>
    </div>
  );
}
