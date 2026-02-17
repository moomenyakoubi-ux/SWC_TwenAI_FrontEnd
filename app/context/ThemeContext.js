import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getThemeByMode } from '../styles/theme';

const ThemeContext = createContext({
  themeMode: 'light',
  setThemeMode: () => {},
  toggleTheme: () => {},
  isDark: false,
  isThemeReady: false,
  theme: getThemeByMode('light'),
});

const THEME_STORAGE_KEY = 'twensai_theme';
const normalizeThemeMode = (value) => (String(value || '').trim().toLowerCase() === 'dark' ? 'dark' : 'light');

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeModeState] = useState('light');
  const [isThemeReady, setIsThemeReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (isMounted && storedTheme) {
          setThemeModeState(normalizeThemeMode(storedTheme));
        }
      } catch (_error) {
        // Ignore storage errors to keep app usable.
      } finally {
        if (isMounted) setIsThemeReady(true);
      }
    };

    loadTheme();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isThemeReady) return;
    const persistTheme = async () => {
      try {
        await AsyncStorage.setItem(THEME_STORAGE_KEY, themeMode);
      } catch (_error) {
        // Ignore storage errors to keep app usable.
      }
    };

    persistTheme();
  }, [isThemeReady, themeMode]);

  const setThemeMode = (nextMode) => {
    setThemeModeState(normalizeThemeMode(nextMode));
  };

  const toggleTheme = () => {
    setThemeModeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const value = useMemo(
    () => ({
      themeMode,
      setThemeMode,
      toggleTheme,
      isDark: themeMode === 'dark',
      isThemeReady,
      theme: getThemeByMode(themeMode),
    }),
    [isThemeReady, themeMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useAppTheme = () => useContext(ThemeContext);
