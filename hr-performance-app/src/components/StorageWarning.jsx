import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import './StorageWarning.css';

const STORAGE_WARNING_KEY = 'tss_ppm_storage_warning_dismissed';

export function StorageWarning() {
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    // Check if warning was previously dismissed (stored in sessionStorage so it resets on browser close)
    const dismissed = sessionStorage.getItem(STORAGE_WARNING_KEY);
    if (!dismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsExpanded(false);
    // Store dismissal in sessionStorage (clears when browser closes)
    sessionStorage.setItem(STORAGE_WARNING_KEY, 'true');
  };

  const handleExpand = () => {
    setIsExpanded(true);
    sessionStorage.removeItem(STORAGE_WARNING_KEY);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`storage-warning ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {isExpanded ? (
        <div className="storage-warning-content">
          <div className="storage-warning-icon">⚠️</div>
          <div className="storage-warning-text">
            <strong>{t('storageWarning.title')}</strong>
            <p>{t('storageWarning.message')}</p>
          </div>
          <button
            className="storage-warning-dismiss"
            onClick={handleDismiss}
            aria-label={t('storageWarning.dismiss')}
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          className="storage-warning-collapsed-btn"
          onClick={handleExpand}
          aria-label={t('storageWarning.expand')}
        >
          <span className="storage-warning-collapsed-icon">⚠️</span>
          <span className="storage-warning-collapsed-text">{t('storageWarning.collapsed')}</span>
        </button>
      )}
    </div>
  );
}
