import React, { createContext, useContext, useMemo, useState } from 'react';
import translations from '../i18n/translations';

const LanguageContext = createContext({
  language: 'it',
  setLanguage: () => {},
  strings: translations.it,
  isRTL: false,
});

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('it');

  const value = useMemo(() => {
    const currentStrings = translations[language] || translations.it;
    return {
      language,
      setLanguage,
      strings: currentStrings,
      isRTL: language === 'ar',
    };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => useContext(LanguageContext);
