import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import translations from '../i18n/translations';

const LanguageContext = createContext({
  language: 'it',
  setLanguage: () => {},
  hasStoredLanguage: false,
  strings: translations.it,
  isRTL: false,
});

const LANGUAGE_STORAGE_KEY = 'twensai_lang';
const LEGACY_LANGUAGE_STORAGE_KEY = 'app.language';
const normalizeLanguage = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  return translations[normalized] ? normalized : 'it';
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState('it');
  const [hasStoredLanguage, setHasStoredLanguage] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadLanguage = async () => {
      try {
        const storedLanguage =
          (await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)) ||
          (await AsyncStorage.getItem(LEGACY_LANGUAGE_STORAGE_KEY));
        if (isMounted && storedLanguage) {
          setLanguageState(normalizeLanguage(storedLanguage));
          setHasStoredLanguage(true);
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
    if (!hasStoredLanguage) return;
    const persistLanguage = async () => {
      try {
        await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      } catch (_error) {
        // Ignore storage errors to keep app usable.
      }
    };

    persistLanguage();
  }, [hasStoredLanguage, language]);

  const setLanguage = (nextLanguage) => {
    setHasStoredLanguage(true);
    setLanguageState(normalizeLanguage(nextLanguage));
  };

  const value = useMemo(() => {
    const currentStrings = translations[language] || translations.it;
    return {
      language,
      setLanguage,
      hasStoredLanguage,
      strings: currentStrings,
      isRTL: language === 'ar',
    };
  }, [hasStoredLanguage, language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => useContext(LanguageContext);
