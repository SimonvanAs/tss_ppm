import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import './StorageWarning.css';

const STORAGE_WARNING_KEY = 'tss_ppm_storage_warning_state';

export function StorageWarning() {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load saved state from localStorage
    const savedState = localStorage.getItem(STORAGE_WARNING_KEY);
    if (savedState === 'collapsed') {
      setIsExpanded(false);
    }
    setIsLoaded(true);
  }, []);

  const handleDismiss = () => {
    setIsExpanded(false);
    localStorage.setItem(STORAGE_WARNING_KEY, 'collapsed');
  };

  const handleExpand = () => {
    setIsExpanded(true);
    localStorage.setItem(STORAGE_WARNING_KEY, 'expanded');
  };

  // Don't render until we've loaded the saved state to prevent flicker
  if (!isLoaded) {
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
