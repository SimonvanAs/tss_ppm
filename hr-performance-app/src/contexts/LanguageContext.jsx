import { createContext, useContext, useState, useCallback } from 'react';
import { translations, languageNames, voiceLanguageCodes } from '../languages';

const LanguageContext = createContext();

export function LanguageProvider({ children, initialLanguage = 'en' }) {
  const [language, setLanguage] = useState(initialLanguage);

  const t = useCallback((key, interpolations = {}) => {
    const keys = key.split('.');
    let value = translations[language];

    for (const k of keys) {
      value = value?.[k];
    }

    if (value === undefined) {
      // Fallback to English
      value = translations.en;
      for (const k of keys) {
        value = value?.[k];
      }
    }

    let result = value || key;

    // Handle interpolation: replace {{key}} with values
    if (typeof result === 'string' && interpolations) {
      Object.entries(interpolations).forEach(([k, v]) => {
        result = result.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v);
      });
    }

    return result;
  }, [language]);

  const changeLanguage = useCallback((newLanguage) => {
    if (translations[newLanguage]) {
      setLanguage(newLanguage);
    }
  }, []);

  const getVoiceLanguageCode = useCallback(() => {
    return voiceLanguageCodes[language] || 'en-US';
  }, [language]);

  const value = {
    language,
    setLanguage: changeLanguage,
    t,
    languageNames,
    availableLanguages: Object.keys(translations),
    getVoiceLanguageCode
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
