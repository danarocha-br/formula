import { parseCookies } from "nookies";

import { en } from "@/locales/en";
import { ptBR } from "@/locales/pt-BR";

const translations = {
  en,
  "pt-BR": ptBR,
};

export type SupportedLocales = keyof typeof translations;

/**
 * Returns the translations for the current locale.
 *
 * The locale is determined by the NEXT_LOCALE cookie. If the cookie is not set,
 * the default locale is "en".
 *
 * @returns The translations for the current locale.
 */

export const getTranslations = () => {
  const cookies = parseCookies();
  const locale = cookies.NEXT_LOCALE || "en";

  return translations[locale as SupportedLocales] || translations.en;
};
