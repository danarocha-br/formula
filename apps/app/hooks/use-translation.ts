"use client";

import { useRouter } from "next/router";
import { getTranslations } from '@/utils/translations';

export const useTranslations = () => {

  const locale = "pt-BR"
  const t = (key: string) => {
    const translations = getTranslations(locale);
    const keys = key.split(".");
    let value: any = translations;

    for (const k of keys) {
      value = value?.[k];
    }

    return value || key;
  };

  return {
    t,
    locale,

  };
};
