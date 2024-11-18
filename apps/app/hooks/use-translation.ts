"use client";

import { getTranslations } from "@/utils/translations";

export const useTranslations = () => {
  const t = (key: string) => {
    const translations = getTranslations();
    const keys = key.split(".");
    let value: any = translations;

    for (const k of keys) {
      value = value?.[k];
    }

    return value || key;
  };

  return {
    t,
  };
};
