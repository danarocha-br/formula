/**
 * Core translation system tests
 * Tests the core translation functionality without React components
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTranslations } from '@/utils/translations';
import type { Locale } from '@/contexts/locale-context';

// Mock the locale files
vi.mock('@/locales/en', () => ({
  en: {
    common: {
      title: 'Welcome',
      search: 'Search...',
      'not-found': 'No results found.',
      categories: {
        equipment: {
          computer: 'Computer',
          phone: 'Phone'
        }
      }
    },
    validation: {
      form: {
        required: 'This field is required.'
      },
      error: {
        'not-found': 'Resource not found.'
      }
    },
    expenses: {
      actions: {
        'add-expense': 'Add expense'
      }
    }
  }
}));

vi.mock('@/locales/pt-BR', () => ({
  ptBR: {
    common: {
      title: 'Bem-vindo',
      search: 'Procurar...',
      'not-found': 'Nenhum resultado encontrado.',
      categories: {
        equipment: {
          computer: 'Computador',
          phone: 'Telefone'
        }
      }
    },
    validation: {
      form: {
        required: 'Este campo é obrigatório.'
      },
      error: {
        'not-found': 'Item não encontrado.'
      }
    },
    expenses: {
      actions: {
        'add-expense': 'Adicionar custo'
      }
    }
  }
}));

describe('Core Translation System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTranslations utility', () => {
    it('should return English translations by default', () => {
      const translations = getTranslations();
      expect(translations.common.title).toBe('Welcome');
      expect(translations.common.search).toBe('Search...');
    });

    it('should return Portuguese translations when specified', () => {
      const translations = getTranslations('pt-BR');
      expect(translations.common.title).toBe('Bem-vindo');
      expect(translations.common.search).toBe('Procurar...');
    });

    it('should handle nested translation keys', () => {
      const enTranslations = getTranslations('en');
      const ptTranslations = getTranslations('pt-BR');

      expect(enTranslations.common.categories.equipment.computer).toBe('Computer');
      expect(ptTranslations.common.categories.equipment.computer).toBe('Computador');
    });

    it('should return consistent structure across locales', () => {
      const enTranslations = getTranslations('en');
      const ptTranslations = getTranslations('pt-BR');

      // Both should have the same structure
      expect(typeof enTranslations.common).toBe('object');
      expect(typeof ptTranslations.common).toBe('object');

      expect(typeof enTranslations.validation).toBe('object');
      expect(typeof ptTranslations.validation).toBe('object');

      expect(typeof enTranslations.expenses).toBe('object');
      expect(typeof ptTranslations.expenses).toBe('object');
    });

    it('should handle special characters in keys', () => {
      const translations = getTranslations('en');

      expect(translations.common['not-found']).toBe('No results found.');
      expect(translations.validation.error['not-found']).toBe('Resource not found.');
      expect(translations.expenses.actions['add-expense']).toBe('Add expense');
    });
  });

  describe('Translation structure validation', () => {
    it('should have consistent key structure between locales', () => {
      const enTranslations = getTranslations('en');
      const ptTranslations = getTranslations('pt-BR');

      // Helper function to get all keys from an object
      function getAllKeys(obj: any, prefix = ''): string[] {
        const keys: string[] = [];

        for (const [key, value] of Object.entries(obj)) {
          const fullKey = prefix ? `${prefix}.${key}` : key;

          if (typeof value === 'string') {
            keys.push(fullKey);
          } else if (typeof value === 'object' && value !== null) {
            keys.push(...getAllKeys(value, fullKey));
          }
        }

        return keys.sort();
      }

      const enKeys = getAllKeys(enTranslations);
      const ptKeys = getAllKeys(ptTranslations);

      // Both locales should have the same keys
      expect(enKeys).toEqual(ptKeys);
    });

    it('should have all required translation categories', () => {
      const translations = getTranslations('en');

      expect(translations).toHaveProperty('common');
      expect(translations).toHaveProperty('validation');
      expect(translations).toHaveProperty('expenses');
    });

    it('should have all required common translations', () => {
      const translations = getTranslations('en');

      expect(translations.common).toHaveProperty('title');
      expect(translations.common).toHaveProperty('search');
      expect(translations.common).toHaveProperty('not-found');
      expect(translations.common).toHaveProperty('categories');
    });

    it('should have all required validation translations', () => {
      const translations = getTranslations('en');

      expect(translations.validation).toHaveProperty('form');
      expect(translations.validation).toHaveProperty('error');
      expect(translations.validation.form).toHaveProperty('required');
    });

    it('should have all required expense translations', () => {
      const translations = getTranslations('en');

      expect(translations.expenses).toHaveProperty('actions');
      expect(translations.expenses.actions).toHaveProperty('add-expense');
    });
  });

  describe('Safe key access patterns', () => {
    it('should handle deep nested key access', () => {
      const translations = getTranslations('en');

      // Test accessing deeply nested keys
      expect(translations.common.categories.equipment.computer).toBe('Computer');
      expect(translations.common.categories.equipment.phone).toBe('Phone');
    });

    it('should provide consistent values across locales for same keys', () => {
      const enTranslations = getTranslations('en');
      const ptTranslations = getTranslations('pt-BR');

      // Same keys should exist in both locales (even if values differ)
      expect(typeof enTranslations.common.title).toBe('string');
      expect(typeof ptTranslations.common.title).toBe('string');

      expect(typeof enTranslations.validation.form.required).toBe('string');
      expect(typeof ptTranslations.validation.form.required).toBe('string');
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle invalid locale gracefully', () => {
      // This should either return English as fallback or handle gracefully
      expect(() => getTranslations('invalid' as Locale)).not.toThrow();
    });

    it('should handle empty strings and special values', () => {
      const translations = getTranslations('en');

      // All translation values should be non-empty strings
      expect(translations.common.title).toBeTruthy();
      expect(translations.common.search).toBeTruthy();
      expect(translations.validation.form.required).toBeTruthy();
    });

    it('should maintain object immutability', () => {
      const translations1 = getTranslations('en');
      const translations2 = getTranslations('en');

      // Should return the same structure
      expect(translations1.common.title).toBe(translations2.common.title);

      // Modifying one shouldn't affect the other
      (translations1 as any).common.title = 'Modified';
      expect(translations2.common.title).toBe('Welcome');
    });
  });

  describe('Performance considerations', () => {
    it('should return translations quickly', () => {
      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        getTranslations('en');
        getTranslations('pt-BR');
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(100); // 100ms for 200 calls
    });

    it('should handle repeated calls efficiently', () => {
      const startTime = performance.now();

      // Multiple calls to same locale
      for (let i = 0; i < 50; i++) {
        const translations = getTranslations('en');
        expect(translations.common.title).toBe('Welcome');
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should be very fast for repeated calls
      expect(duration).toBeLessThan(50); // 50ms for 50 calls
    });
  });
});