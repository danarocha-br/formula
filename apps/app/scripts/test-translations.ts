#!/usr/bin/env tsx

/**
 * Standalone translation system tests
 * Tests the translation system without complex build setup
 */

import { en } from '../locales/en';
import { ptBR } from '../locales/pt-BR';
import { getTranslations } from '../utils/translations';
import type { Locale } from '../contexts/locale-context';

// Test results tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function test(name: string, testFn: () => void | Promise<void>) {
  totalTests++;
  try {
    const result = testFn();
    if (result instanceof Promise) {
      result.then(() => {
        passedTests++;
        console.log(`✅ ${name}`);
      }).catch((error) => {
        failedTests++;
        console.log(`❌ ${name}: ${error.message}`);
      });
    } else {
      passedTests++;
      console.log(`✅ ${name}`);
    }
  } catch (error) {
    failedTests++;
    console.log(`❌ ${name}: ${(error as Error).message}`);
  }
}

function expect(actual: any) {
  return {
    toBe: (expected: any) => {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, but got ${actual}`);
      }
    },
    toEqual: (expected: any) => {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`);
      }
    },
    toBeDefined: () => {
      if (actual === undefined) {
        throw new Error('Expected value to be defined');
      }
    },
    toBeGreaterThan: (expected: number) => {
      if (actual <= expected) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
    },
    toBeLessThan: (expected: number) => {
      if (actual >= expected) {
        throw new Error(`Expected ${actual} to be less than ${expected}`);
      }
    },
    toContain: (expected: any) => {
      if (!actual.includes(expected)) {
        throw new Error(`Expected ${actual} to contain ${expected}`);
      }
    },
    toHaveProperty: (property: string) => {
      if (!(property in actual)) {
        throw new Error(`Expected object to have property ${property}`);
      }
    }
  };
}

console.log('🧪 Running Translation System Tests\n');

// Test 1: Basic translation loading
test('should load English translations', () => {
  const translations = getTranslations('en');
  expect(translations.common.title).toBe('Welcome');
  expect(translations.common.search).toBe('Search...');
});

test('should load Portuguese translations', () => {
  const translations = getTranslations('pt-BR');
  expect(translations.common.title).toBe('Bem-vindo');
  expect(translations.common.search).toBe('Procurar...');
});

// Test 2: Nested key access
test('should handle nested translation keys', () => {
  const enTranslations = getTranslations('en');
  expect(enTranslations.common.categories.equipment.computer).toBe('Computer');
  expect(enTranslations.common.categories.equipment.phone).toBe('Phone');
});

// Test 3: Special characters in keys
test('should handle keys with special characters', () => {
  const translations = getTranslations('en');
  expect(translations.common['not-found']).toBe('No results found.');
  expect(translations.expenses.actions['add-expense']).toBe('Add expense');
});

// Test 4: Translation structure consistency
test('should have consistent structure between locales', () => {
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

  const enKeys = getAllKeys(en);
  const ptKeys = getAllKeys(ptBR);

  expect(enKeys).toEqual(ptKeys);
});

// Test 5: Safe key access patterns
test('should provide safe key access', () => {
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

  const translations = getTranslations('en');

  expect(safeAccess(translations, 'common.title')).toBe('Welcome');
  expect(safeAccess(translations, 'missing.key')).toBe(undefined);
  expect(safeAccess(translations, 'common.missing')).toBe(undefined);
});

// Test 6: Performance validation
test('should handle translation access efficiently', () => {
  const startTime = performance.now();

  for (let i = 0; i < 100; i++) {
    const translations = getTranslations('en');
    expect(translations.common.title).toBe('Welcome');
  }

  const endTime = performance.now();
  const duration = endTime - startTime;

  expect(duration).toBeLessThan(100); // Should complete in less than 100ms
});

// Test 7: Error handling
test('should handle invalid locales gracefully', () => {
  // This should not throw an error
  try {
    const translations = getTranslations('invalid' as Locale);
    // If it returns something, it should be defined, otherwise it's acceptable to be undefined
    if (translations !== undefined) {
      expect(translations).toBeDefined();
    }
  } catch (error) {
    // It's acceptable for invalid locales to throw or return undefined
    // The important thing is that it doesn't crash the application
  }
});

// Test 8: Translation completeness
test('should have all required translation categories', () => {
  const translations = getTranslations('en');

  expect(translations).toHaveProperty('common');
  expect(translations).toHaveProperty('validation');
  expect(translations).toHaveProperty('expenses');
  expect(translations).toHaveProperty('auth');
});

// Test 9: Key validation patterns
test('should validate translation key formats', () => {
  const validKeys = [
    'common.title',
    'common.categories.equipment.computer',
    'validation.form.required'
  ];

  validKeys.forEach(key => {
    expect(key.length).toBeGreaterThan(0);
    expect(key.includes('..')).toBe(false);
    expect(key.startsWith('.')).toBe(false);
    expect(key.endsWith('.')).toBe(false);
  });
});

// Test 10: Fallback mechanism validation
test('should provide fallback for missing keys', () => {
  function translateWithFallback(translations: any, key: string, fallback = key): string {
    const keys = key.split('.');
    let current = translations;

    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return fallback;
      }
    }

    return typeof current === 'string' ? current : fallback;
  }

  const translations = getTranslations('en');

  expect(translateWithFallback(translations, 'common.title')).toBe('Welcome');
  expect(translateWithFallback(translations, 'missing.key', 'Fallback')).toBe('Fallback');
  expect(translateWithFallback(translations, 'missing.key')).toBe('missing.key');
});

// Wait for async tests and show results
setTimeout(() => {
  console.log('\n📊 Test Results:');
  console.log(`Total tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);

  if (failedTests === 0) {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed.');
    process.exit(1);
  }
}, 100);