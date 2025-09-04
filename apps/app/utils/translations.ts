/**
 * Translation utilities
 */

import type { Locale } from '@/contexts/locale-context';
import { en } from '@/locales/en';
import { ptBR } from '@/locales/pt-BR';
import type { TranslationStructure } from '@/types/translations';

const LOCALE_TRANSLATIONS: Record<Locale, TranslationStructure> = {
  en: en,
  'pt-BR': ptBR,
};

export function getTranslations(locale: Locale = 'en'): TranslationStructure {
  return LOCALE_TRANSLATIONS[locale];
}
