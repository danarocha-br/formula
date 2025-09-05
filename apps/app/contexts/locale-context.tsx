'use client';

import { en } from '@/locales/en';
import { ptBR } from '@/locales/pt-BR';
import type { TranslationStructure } from '@/types/translations';
import { type ReactNode, createContext, useContext, useState } from 'react';

export type Locale = 'en' | 'pt-BR';

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  translations: TranslationStructure;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

const LOCALE_TRANSLATIONS: Record<Locale, TranslationStructure> = {
  en: en,
  'pt-BR': ptBR,
};

interface LocaleProviderProps {
  children: ReactNode;
  initialLocale?: Locale;
}

export function LocaleProvider({
  children,
  initialLocale,
}: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    // Try to get locale from cookie on client side
    if (typeof window !== 'undefined') {
      const cookieLocale = document.cookie
        .split('; ')
        .find((row) => row.startsWith('NEXT_LOCALE='))
        ?.split('=')[1] as Locale;

      if (cookieLocale && (cookieLocale === 'en' || cookieLocale === 'pt-BR')) {
        return cookieLocale;
      }
    }

    return initialLocale || 'en';
  });

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);

    // Update cookie using a safer approach
    if (typeof window !== 'undefined') {
      const maxAge = 60 * 60 * 24 * 365; // 1 year
      const cookieString = `NEXT_LOCALE=${newLocale}; path=/; max-age=${maxAge}; SameSite=Lax`;
      document.cookie = cookieString;
    }
  };

  const translations = LOCALE_TRANSLATIONS[locale];

  const value: LocaleContextType = {
    locale,
    setLocale,
    translations,
  };

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextType {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}
