import { en } from '@/locales/en';
import { ptBR } from '@/locales/pt-BR';

const translations = {
  en,
  "pt-BR": ptBR,
};

export const getTranslations = (locale: string = "pt-BR") => {
  return translations[locale as keyof typeof translations] || translations.en;
};
