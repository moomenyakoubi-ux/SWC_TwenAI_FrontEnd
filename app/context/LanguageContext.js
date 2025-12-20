import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import translations from '../i18n/translations';

const LanguageContext = createContext({
  language: 'it',
  setLanguage: () => {},
  strings: translations.it,
  isRTL: false,
});

const LANGUAGE_STORAGE_KEY = 'app.language';

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('it');

  useEffect(() => {
    let isMounted = true;
    const loadLanguage = async () => {
      try {
        const storedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (isMounted && storedLanguage && translations[storedLanguage]) {
          setLanguage(storedLanguage);
        }
      } catch (_error) {
        // Ignore storage errors to keep app usable.
      }
    };

    loadLanguage();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const persistLanguage = async () => {
      try {
        await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      } catch (_error) {
        // Ignore storage errors to keep app usable.
      }
    };

    persistLanguage();
  }, [language]);

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
