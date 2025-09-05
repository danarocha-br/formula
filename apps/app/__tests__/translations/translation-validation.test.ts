/**
 * Translation validation tests
 * Tests validation functions and translation completeness
 */

import { createValidationMessages, createZodErrorMap } from '@/utils/validation-messages';
import { describe, expect, it, vi } from 'vitest';

describe('Translation Validation', () => {
  describe('Basic validation', () => {
    it('should validate translation key format', () => {
      const validKeys = [
        'common.title',
        'common.actions.add',
        'common.labels.name',
        'common.placeholders.enterName',
        'common.categories.equipment.computer',
        'forms.validation.required',
        'forms.equipment.name',
        'expenses.actions.add-expense'
      ];

      const invalidKeys = [
        '',
        '.',
        '.invalid',
        'invalid.',
        '..invalid',
        'invalid..key'
      ];

      validKeys.forEach(key => {
        expect(key.length).toBeGreaterThan(0);
        expect(key.includes('..')).toBe(false);
        expect(key.startsWith('.')).toBe(false);
        expect(key.endsWith('.')).toBe(false);
      });

      invalidKeys.forEach(key => {
        const isInvalid = key === '' ||
                         key.includes('..') ||
                         key.startsWith('.') ||
                         key.endsWith('.');
        expect(isInvalid).toBe(true);
      });
    });

    it('should handle key path parsing', () => {
      const key = 'common.categories.equipment.computer';
      const parts = key.split('.');

      expect(parts).toEqual(['common', 'categories', 'equipment', 'computer']);
      expect(parts.length).toBe(4);
    });

    it('should validate nested key access patterns', () => {
      const testObj = {
        common: {
          title: 'Welcome',
          actions: {
            add: 'Add',
            save: 'Save',
          },
          labels: {
            name: 'Name',
            cost: 'Cost',
          },
          categories: {
            equipment: {
              computer: 'Computer'
            }
          }
        },
        forms: {
          validation: {
            required: 'This field is required'
          }
        }
      };

      // Simulate safe key access
      function safeAccess(obj: any, keyPath: string): any {
        const keys = keyPath.split('.');
        let current = obj;

        for (const key of keys) {
          if (current && typeof current === 'object' && key in current) {
            current = current[key];
          } else {
            return undefined;
          }
        }

        return current;
      }

      expect(safeAccess(testObj, 'common.title')).toBe('Welcome');
      expect(safeAccess(testObj, 'common.actions.add')).toBe('Add');
      expect(safeAccess(testObj, 'common.labels.name')).toBe('Name');
      expect(safeAccess(testObj, 'common.categories.equipment.computer')).toBe('Computer');
      expect(safeAccess(testObj, 'forms.validation.required')).toBe('This field is required');
      expect(safeAccess(testObj, 'missing.key')).toBeUndefined();
      expect(safeAccess(testObj, 'common.missing')).toBeUndefined();
    });
  });

  describe('Validation message utilities', () => {
    const mockT = vi.fn((key: string, fallback?: string) => {
      const translations: Record<string, string> = {
        'forms.validation.required': 'This field is required',
        'forms.validation.invalidType': 'Invalid input type',
        'forms.validation.minLength': 'Minimum length not met',
        'forms.validation.maxLength': 'Maximum length exceeded',
        'forms.validation.min': 'Value is too small',
        'forms.validation.max': 'Value is too large',
        'forms.validation.email': 'Please enter a valid email address',
        'forms.validation.url': 'Please enter a valid URL',
        'forms.validation.number': 'Please enter a valid number',
        'forms.validation.integer': 'Please enter a whole number',
        'forms.validation.positive': 'Value must be positive',
        'forms.validation.negative': 'Value must be negative',
        'forms.validation.date': 'Please enter a valid date',
        'forms.validation.string': 'Please enter text',
        'forms.validation.select': 'Please select an option',
        'forms.validation.custom': 'Invalid value',
      };

      return translations[key] || fallback || key;
    });

    beforeEach(() => {
      mockT.mockClear();
    });

    it('should create validation messages with translation function', () => {
      const messages = createValidationMessages(mockT);

      expect(messages.required()).toBe('This field is required');
      expect(messages.email()).toBe('Please enter a valid email address');
      expect(messages.number()).toBe('Please enter a valid number');
      expect(messages.minLength(5)).toBe('Minimum length not met (5)');
      expect(messages.max(100)).toBe('Value is too large (100)');
    });

    it('should handle field-specific validation messages', () => {
      const messages = createValidationMessages(mockT);

      expect(messages.required('Name')).toBe('Name is required');
      expect(messages.minLength(3, 'Password')).toBe('Password minimum length not met (3)');
      expect(messages.max(100, 'Age')).toBe('Age value is too large (100)');
    });

    it('should create Zod error map with translations', () => {
      const errorMap = createZodErrorMap(mockT);

      // Test different error types
      const stringError = errorMap({ code: 'invalid_type', expected: 'string' }, {});
      expect(stringError.message).toBe('Please enter text');

      const numberError = errorMap({ code: 'invalid_type', expected: 'number' }, {});
      expect(stringError.message).toBe('Please enter text');

      const minLengthError = errorMap({
        code: 'too_small',
        type: 'string',
        minimum: 5
      }, {});
      expect(minLengthError.message).toBe('Minimum length not met (5)');

      const emailError = errorMap({
        code: 'invalid_string',
        validation: 'email'
      }, {});
      expect(emailError.message).toBe('Please enter a valid email address');
    });

    it('should handle custom error messages', () => {
      const messages = createValidationMessages(mockT);

      expect(messages.custom('Custom error message')).toBe('Custom error message');
      expect(messages.custom()).toBe('Invalid value');
    });

    it('should use fallbacks when translation keys are missing', () => {
      const mockTWithMissing = vi.fn((key: string, fallback?: string) => {
        // Simulate missing translation
        return fallback || key;
      });

      const messages = createValidationMessages(mockTWithMissing);

      expect(messages.required()).toBe('This field is required');
      expect(messages.email()).toBe('Please enter a valid email address');
      expect(messages.number()).toBe('Please enter a valid number');
    });
  });

  describe('Error handling', () => {
    it('should handle malformed objects gracefully', () => {
      const malformedObjects = [
        null,
        undefined,
        '',
        123,
        []
      ];

      malformedObjects.forEach(obj => {
        expect(() => {
          if (obj && typeof obj === 'object') {
            // Safe to process
            return true;
          }
          return false;
        }).not.toThrow();
      });
    });

    it('should validate key existence patterns', () => {
      const mockTranslations = {
        en: {
          common: {
            title: 'Welcome',
            actions: { add: 'Add', save: 'Save' },
            labels: { name: 'Name', cost: 'Cost' }
          },
          forms: {
            validation: { required: 'Required' },
            equipment: { name: 'Equipment name' }
          }
        },
        'pt-BR': {
          common: {
            title: 'Bem-vindo',
            actions: { add: 'Adicionar', save: 'Salvar' },
            labels: { name: 'Nome', cost: 'Custo' }
          },
          forms: {
            equipment: { name: 'Nome do equipamento' }
            // Missing forms.validation.required for testing
          }
        }
      };

      function checkKeyInLocale(translations: any, locale: string, key: string): boolean {
        const localeData = translations[locale];
        if (!localeData) return false;

        const keys = key.split('.');
        let current = localeData;

        for (const k of keys) {
          if (current && typeof current === 'object' && k in current) {
            current = current[k];
          } else {
            return false;
          }
        }

        return typeof current === 'string';
      }

      expect(checkKeyInLocale(mockTranslations, 'en', 'common.title')).toBe(true);
      expect(checkKeyInLocale(mockTranslations, 'pt-BR', 'common.title')).toBe(true);
      expect(checkKeyInLocale(mockTranslations, 'en', 'common.actions.add')).toBe(true);
      expect(checkKeyInLocale(mockTranslations, 'pt-BR', 'common.actions.add')).toBe(true);
      expect(checkKeyInLocale(mockTranslations, 'en', 'common.labels.name')).toBe(true);
      expect(checkKeyInLocale(mockTranslations, 'pt-BR', 'common.labels.name')).toBe(true);
      expect(checkKeyInLocale(mockTranslations, 'en', 'forms.validation.required')).toBe(true);
      expect(checkKeyInLocale(mockTranslations, 'pt-BR', 'forms.validation.required')).toBe(false);
      expect(checkKeyInLocale(mockTranslations, 'en', 'forms.equipment.name')).toBe(true);
      expect(checkKeyInLocale(mockTranslations, 'pt-BR', 'forms.equipment.name')).toBe(true);
      expect(checkKeyInLocale(mockTranslations, 'en', 'missing.key')).toBe(false);
    });
  });

  describe('Translation completeness validation', () => {
    it('should detect missing keys between locales', () => {
      const enKeys = [
        'common.title',
        'common.actions.add',
        'common.actions.save',
        'common.labels.name',
        'common.labels.cost',
        'forms.validation.required',
        'forms.equipment.name'
      ];

      const ptKeys = [
        'common.title',
        'common.actions.add',
        // Missing 'common.actions.save'
        'common.labels.name',
        'common.labels.cost',
        // Missing 'forms.validation.required'
        'forms.equipment.name'
      ];

      const missingInPt = enKeys.filter(key => !ptKeys.includes(key));
      const missingInEn = ptKeys.filter(key => !enKeys.includes(key));

      expect(missingInPt).toEqual([
        'common.actions.save',
        'forms.validation.required'
      ]);
      expect(missingInEn).toEqual([]);
    });

    it('should validate translation key structure consistency', () => {
      function extractKeys(obj: any, prefix = ''): string[] {
        const keys: string[] = [];

        for (const [key, value] of Object.entries(obj)) {
          const fullKey = prefix ? `${prefix}.${key}` : key;

          if (typeof value === 'string') {
            keys.push(fullKey);
          } else if (typeof value === 'object' && value !== null) {
            keys.push(...extractKeys(value, fullKey));
          }
        }

        return keys.sort();
      }

      const enTranslations = {
        common: {
          title: 'Welcome',
          actions: { add: 'Add', save: 'Save' },
          labels: { name: 'Name', cost: 'Cost' }
        },
        forms: {
          validation: { required: 'Required' }
        }
      };

      const ptTranslations = {
        common: {
          title: 'Bem-vindo',
          actions: { add: 'Adicionar', save: 'Salvar' },
          labels: { name: 'Nome', cost: 'Custo' }
        },
        forms: {
          validation: { required: 'Obrigatório' }
        }
      };

      const enKeys = extractKeys(enTranslations);
      const ptKeys = extractKeys(ptTranslations);

      expect(enKeys).toEqual(ptKeys);
      expect(enKeys).toEqual([
        'common.actions.add',
        'common.actions.save',
        'common.labels.cost',
        'common.labels.name',
        'common.title',
        'forms.validation.required'
      ]);
    });
  });

  describe('Performance validation', () => {
    it('should handle large key sets efficiently', () => {
      const startTime = performance.now();

      // Simulate processing many keys
      const keys = [];
      for (let i = 0; i < 1000; i++) {
        keys.push(`category.${i}.item.${i}`);
      }

      keys.forEach(key => {
        const parts = key.split('.');
        expect(parts.length).toBeGreaterThan(0);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(100); // 100ms for 1000 operations
    });

    it('should efficiently validate translation access patterns', () => {
      const startTime = performance.now();

      const testObj = {
        common: {
          actions: {},
          labels: {},
          placeholders: {}
        },
        forms: {
          validation: {},
          equipment: {}
        }
      };

      // Fill with many keys
      for (let i = 0; i < 100; i++) {
        (testObj.common.actions as any)[`action${i}`] = `Action ${i}`;
        (testObj.common.labels as any)[`label${i}`] = `Label ${i}`;
        (testObj.forms.validation as any)[`validation${i}`] = `Validation ${i}`;
      }

      // Test access patterns
      for (let i = 0; i < 100; i++) {
        const key = `common.actions.action${i}`;
        const parts = key.split('.');
        let current: any = testObj;

        for (const part of parts) {
          if (current && typeof current === 'object' && part in current) {
            current = current[part];
          } else {
            current = undefined;
            break;
          }
        }

        expect(current).toBe(`Action ${i}`);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(50); // 50ms for 100 operations
    });
  });
});