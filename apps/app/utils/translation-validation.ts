/**
 * Translation validation utilities for ensuring completeness and type safety
 */

import { en } from '@/locales/en';
import { ptBR } from '@/locales/pt-BR';
import type { TranslationStructure, } from '@/types/translations';

export interface ValidationResult {
  isValid: boolean;
  missingKeys: string[];
  extraKeys: string[];
  errors: string[];
}

/**
 * Extract all keys from a nested object
 */
function extractKeys(obj: unknown, prefix = ''): string[] {
  const keys: string[] = [];

  if (obj && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'string') {
        keys.push(fullKey);
      } else if (typeof value === 'object' && value !== null) {
        keys.push(...extractKeys(value, fullKey));
      }
    }
  }

  return keys.sort();
}

/**
 * Validate that a translation object has all required keys
 */
export function validateTranslationStructure(
  translations: unknown,
  reference: TranslationStructure,
  locale: string
): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    missingKeys: [],
    extraKeys: [],
    errors: [],
  };

  try {
    const referenceKeys = extractKeys(reference);
    const translationKeys = extractKeys(translations);

    // Find missing keys
    result.missingKeys = referenceKeys.filter(
      (key) => !translationKeys.includes(key)
    );

    // Find extra keys
    result.extraKeys = translationKeys.filter(
      (key) => !referenceKeys.includes(key)
    );

    // Check if structure is valid
    result.isValid = result.missingKeys.length === 0;

    // Add errors for missing keys
    if (result.missingKeys.length > 0) {
      result.errors.push(
        `Missing translation keys in ${locale}: ${result.missingKeys.join(', ')}`
      );
    }

    // Add warnings for extra keys
    if (result.extraKeys.length > 0) {
      result.errors.push(
        `Extra translation keys in ${locale}: ${result.extraKeys.join(', ')}`
      );
    }
  } catch (error) {
    result.isValid = false;
    result.errors.push(`Validation error for ${locale}: ${error}`);
  }

  return result;
}

/**
 * Validate all translation files against the reference structure
 */
export function validateAllTranslations(): Record<string, ValidationResult> {
  const results: Record<string, ValidationResult> = {};

  // Validate English (reference)
  results.en = validateTranslationStructure(en, en, 'en');

  // Validate Portuguese against English reference
  results['pt-BR'] = validateTranslationStructure(ptBR, en, 'pt-BR');

  return results;
}

/**
 * Check if a specific translation key exists in all locales
 */
export function checkKeyExistence(key: string): Record<string, boolean> {
  const translations = { en, 'pt-BR': ptBR };
  const results: Record<string, boolean> = {};

  for (const [locale, translation] of Object.entries(translations)) {
    const keys = key.split('.');
    let current: unknown = translation;
    let exists = true;

    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = (current as Record<string, unknown>)[k];
      } else {
        exists = false;
        break;
      }
    }

    results[locale] = exists && typeof current === 'string';
  }

  return results;
}

/**
 * Generate a report of translation validation results
 */
export function generateValidationReport(): string {
  const results = validateAllTranslations();
  const lines: string[] = [];

  lines.push('Translation Validation Report');
  lines.push('================================');
  lines.push('');

  for (const [locale, result] of Object.entries(results)) {
    lines.push(`${locale.toUpperCase()}:`);
    lines.push(`  Status: ${result.isValid ? '✅ Valid' : '❌ Invalid'}`);

    if (result.missingKeys.length > 0) {
      lines.push(`  Missing keys (${result.missingKeys.length}):`);
      result.missingKeys.forEach(key => lines.push(`    - ${key}`));
    }

    if (result.extraKeys.length > 0) {
      lines.push(`  Extra keys (${result.extraKeys.length}):`);
      result.extraKeys.forEach(key => lines.push(`    - ${key}`));
    }

    if (result.errors.length > 0) {
      lines.push(`  Errors:`);
      result.errors.forEach(error => lines.push(`    - ${error}`));
    }

    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Development-only function to log validation results
 */
export function logValidationResults(): void {
  if (process.env.NODE_ENV === 'development') {
    const report = generateValidationReport();
    console.log(report);
  }
}