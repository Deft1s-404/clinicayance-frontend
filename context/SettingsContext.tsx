'use client';

import { createContext, useCallback, useEffect, useMemo, useState } from 'react';

export type SupportedLanguage = 'pt-BR' | 'es';
export type ThemeMode = 'light' | 'dark';

interface SettingsContextValue {
  language: SupportedLanguage;
  theme: ThemeMode;
  setLanguage: (language: SupportedLanguage) => void;
  toggleLanguage: () => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const LANGUAGE_STORAGE_KEY = 'clinicayance_language';
const THEME_STORAGE_KEY = 'clinicayance_theme';

const isBrowser = (): boolean => typeof window !== 'undefined';

const readStoredLanguage = (): SupportedLanguage => {
  if (!isBrowser()) {
    return 'pt-BR';
  }
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return stored === 'es' ? 'es' : 'pt-BR';
};

const readStoredTheme = (): ThemeMode => {
  if (!isBrowser()) {
    return 'light';
  }
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'dark' ? 'dark' : 'light';
};

export const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => readStoredLanguage());
  const [theme, setThemeState] = useState<ThemeMode>(() => readStoredTheme());

  useEffect(() => {
    if (!isBrowser()) {
      return;
    }
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (!isBrowser()) {
      return;
    }
    const root = document.documentElement;
    const nextTheme: ThemeMode = theme === 'dark' ? 'dark' : 'light';
    root.classList.remove('theme-dark', 'theme-light');
    root.classList.add(nextTheme === 'dark' ? 'theme-dark' : 'theme-light');
    root.dataset.theme = nextTheme;
    root.style.setProperty('color-scheme', nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  }, [theme]);

  const setLanguage = useCallback((value: SupportedLanguage) => {
    setLanguageState(value === 'es' ? 'es' : 'pt-BR');
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => (prev === 'es' ? 'pt-BR' : 'es'));
  }, []);

  const setTheme = useCallback((value: ThemeMode) => {
    setThemeState(value === 'dark' ? 'dark' : 'light');
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({
      language,
      theme,
      setLanguage,
      toggleLanguage,
      setTheme,
      toggleTheme
    }),
    [language, theme, setLanguage, toggleLanguage, setTheme, toggleTheme]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};
