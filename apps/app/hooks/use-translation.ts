'use client';

import { useLocale } from '@/contexts/locale-context';
import type { AllTranslationKeys } from '@/types/translations';

/**
 * Safe translation access function that handles missing keys gracefully
 * @param obj - The translation object to traverse
 * @param keys - Array of keys representing the path to the translation
 * @param fallback - Optional fallback value to return if key is not found
 * @returns The translation value or fallback
 */
function safeTranslationAccess(
  obj: unknown,
  keys: string[],
  fallback?: string
): string {
  let current: unknown = obj;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      // Log warning in development mode
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `Translation key not found: "${keys.join('.')}" - using fallback: "${
            fallback || keys.join('.')
          }"`
        );
      }
      return fallback || keys.join('.');
    }
  }

  // Ensure we return a string
  if (typeof current === 'string') {
    return current;
  }

  // If we got an object or other type, log warning and return fallback
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      `Translation key "${keys.join(
        '.'
      )}" resolved to non-string value:`,
      current,
      `- using fallback: "${fallback || keys.join('.')}"`
    );
  }

  return fallback || keys.join('.');
}

export const useTranslations = () => {
  const { translations, locale } = useLocale();

  /**
   * Get translation by key with safe access and fallback mechanism
   * @param key - Dot-separated translation key (e.g., "common.categories.equipment.computer")
   * @param fallback - Optional fallback value if translation is not found
   * @returns The translated string or fallback value
   */
  const t = (key: AllTranslationKeys | string, fallback?: string): string => {
    if (!key) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Translation key is empty or undefined');
      }
      return fallback || '';
    }

    const keys = key.split('.');
    return safeTranslationAccess(translations, keys, fallback);
  };

  /**
   * Get nested translation object safely
   * @param key - Dot-separated translation key
   * @returns The nested translation object or empty object if not found
   */
  const getNestedTranslations = (key: string): Record<string, unknown> => {
    if (!key) {
      return {};
    }

    const keys = key.split('.');
    let current: unknown = translations;

    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = (current as Record<string, unknown>)[k];
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`Nested translation key not found: "${key}"`);
        }
        return {};
      }
    }

    return typeof current === 'object' && current !== null
      ? (current as Record<string, unknown>)
      : {};
  };

  /**
   * Check if a translation key exists
   * @param key - Dot-separated translation key
   * @returns True if the key exists and resolves to a string
   */
  const hasTranslation = (key: string): boolean => {
    if (!key) return false;

    const keys = key.split('.');
    let current: unknown = translations;

    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = (current as Record<string, unknown>)[k];
      } else {
        return false;
      }
    }

    return typeof current === 'string';
  };

  /**
   * Get all available translation keys (for debugging)
   * @returns Array of all available translation keys
   */
  const getAvailableKeys = (): string[] => {
    const keys: string[] = [];

    function traverse(obj: unknown, prefix = ''): void {
      if (obj && typeof obj === 'object') {
        for (const [key, value] of Object.entries(obj)) {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          if (typeof value === 'string') {
            keys.push(fullKey);
          } else if (typeof value === 'object' && value !== null) {
            traverse(value, fullKey);
          }
        }
      }
    }

    traverse(translations);
    return keys.sort();
  };

  /**
   * Type-safe translation function with IntelliSense support
   * @param key - Type-safe translation key
   * @param fallback - Optional fallback value
   * @returns The translated string or fallback value
   */
  const tSafe = <K extends AllTranslationKeys>(
    key: K,
    fallback?: string
  ): string => {
    return t(key, fallback);
  };

  return {
    t,
    tSafe,
    getNestedTranslations,
    hasTranslation,
    getAvailableKeys,
    locale,
  };
};
