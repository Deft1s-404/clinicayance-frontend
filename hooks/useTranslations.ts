'use client';

import { useMemo } from 'react';

import { useSettings } from './useSettings';
import { getTranslationsFor, TranslationKey } from '../lib/i18n';

export const useTranslations = () => {
  const { language } = useSettings();
  const messages = useMemo(() => getTranslationsFor(language), [language]);

  const t = (key: TranslationKey): string => messages[key] ?? key;

  return { t, language, messages };
};
