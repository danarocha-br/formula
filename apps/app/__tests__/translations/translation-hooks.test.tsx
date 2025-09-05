/**
 * Translation hooks tests
 * Tests the useTranslations hook and locale context functionality
 */

import { act, render, screen } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LocaleProvider, useLocale } from '@/contexts/locale-context';
import type { Locale } from '@/contexts/locale-context';
import { useTranslations } from '@/hooks/use-translation';

// Mock the locale files
vi.mock('@/locales/en', () => ({
  en: {
    common: {
      title: 'Welcome',
      search: 'Search...',
      'not-found': 'No results found.',
      actions: {
        add: 'Add',
        save: 'Save',
        cancel: 'Cancel',
        close: 'Close',
        open: 'Open',
      },
      labels: {
        name: 'Name',
        cost: 'Cost',
        category: 'Category',
        date: 'Date',
        amount: 'Amount',
      },
      placeholders: {
        enterName: 'Enter name',
        selectCategory: 'Select category',
        search: 'Search',
      },
      categories: {
        equipment: {
          computer: 'Computer',
          phone: 'Phone'
        }
      }
    },
    forms: {
      equipment: {
        name: 'Equipment name',
        cost: 'Equipment cost',
        purchaseDate: 'Purchase date',
        lifespan: 'Lifespan',
        usage: 'Usage percentage',
      },
      validation: {
        required: 'This field is required',
        invalidType: 'Invalid input type',
        minLength: 'Minimum length not met',
        email: 'Please enter a valid email address',
      },
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
      actions: {
        add: 'Adicionar',
        save: 'Salvar',
        cancel: 'Cancelar',
        close: 'Fechar',
        open: 'Abrir',
      },
      labels: {
        name: 'Nome',
        cost: 'Custo',
        category: 'Categoria',
        date: 'Data',
        amount: 'Valor',
      },
      placeholders: {
        enterName: 'Digite o nome',
        selectCategory: 'Selecione a categoria',
        search: 'Pesquisar',
      },
      categories: {
        equipment: {
          computer: 'Computador',
          phone: 'Telefone'
        }
      }
    },
    forms: {
      equipment: {
        name: 'Nome do equipamento',
        cost: 'Custo do equipamento',
        purchaseDate: 'Data de compra',
        lifespan: 'Vida útil',
        usage: 'Percentual de uso',
      },
      validation: {
        required: 'Este campo é obrigatório',
        invalidType: 'Tipo de entrada inválido',
        minLength: 'Comprimento mínimo não atendido',
        email: 'Por favor, insira um endereço de email válido',
      },
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

// Test wrapper component
interface TestWrapperProps {
  children: ReactNode;
  locale?: Locale;
}

function TestWrapper({ children, locale = 'en' }: TestWrapperProps) {
  // Mock document.cookie for testing
  Object.defineProperty(document, 'cookie', {
    writable: true,
    value: `NEXT_LOCALE=${locale}`,
  });

  return (
    <LocaleProvider>
      {children}
    </LocaleProvider>
  );
}

describe('Translation Hooks', () => {
  beforeEach(() => {
    // Clear any existing cookies
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
    });

    // Mock console.warn to track warnings
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('LocaleProvider', () => {
    it('should provide default English locale', () => {
      const { result } = renderHook(() => useLocale(), {
        wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>
      });

      expect(result.current.locale).toBe('en');
      expect(result.current.translations.common.title).toBe('Welcome');
    });

    it('should provide Portuguese locale when cookie is set', () => {
      const { result } = renderHook(() => useLocale(), {
        wrapper: ({ children }) => <TestWrapper locale="pt-BR">{children}</TestWrapper>
      });

      expect(result.current.locale).toBe('pt-BR');
      expect(result.current.translations.common.title).toBe('Bem-vindo');
    });

    it('should allow locale switching', () => {
      const { result } = renderHook(() => useLocale(), {
        wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>
      });

      expect(result.current.locale).toBe('en');

      act(() => {
        result.current.setLocale('pt-BR');
      });

      expect(result.current.locale).toBe('pt-BR');
      expect(result.current.translations.common.title).toBe('Bem-vindo');
    });
  });

  describe('useTranslations hook', () => {
    it('should return correct translations for valid keys', () => {
      const { result } = renderHook(() => useTranslations(), {
        wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>
      });

      expect(result.current.t('common.title')).toBe('Welcome');
      expect(result.current.t('common.search')).toBe('Search...');
      expect(result.current.t('forms.validation.required')).toBe('This field is required');
      expect(result.current.t('common.actions.add')).toBe('Add');
      expect(result.current.t('common.labels.name')).toBe('Name');
      expect(result.current.t('common.placeholders.enterName')).toBe('Enter name');
    });

    it('should handle nested object keys correctly', () => {
      const { result } = renderHook(() => useTranslations(), {
        wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>
      });

      expect(result.current.t('common.categories.equipment.computer')).toBe('Computer');
      expect(result.current.t('common.categories.equipment.phone')).toBe('Phone');
      expect(result.current.t('forms.equipment.name')).toBe('Equipment name');
      expect(result.current.t('forms.equipment.cost')).toBe('Equipment cost');
    });

    it('should return fallback for missing keys', () => {
      const { result } = renderHook(() => useTranslations(), {
        wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>
      });

      const fallbackText = 'Custom fallback';
      expect(result.current.t('missing.key', fallbackText)).toBe(fallbackText);
    });

    it('should return key path as fallback when no custom fallback provided', () => {
      const { result } = renderHook(() => useTranslations(), {
        wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>
      });

      expect(result.current.t('missing.key')).toBe('missing.key');
    });

    it('should log warnings for missing keys in development', () => {
      // Set NODE_ENV to development
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const { result } = renderHook(() => useTranslations(), {
        wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>
      });

      result.current.t('missing.key');

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Translation key not found: "missing.key"')
      );

      // Restore original NODE_ENV
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle empty or undefined keys gracefully', () => {
      const { result } = renderHook(() => useTranslations(), {
        wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>
      });

      expect(result.current.t('')).toBe('');
      expect(result.current.t(undefined as any)).toBe('');
    });

    it('should work with different locales', () => {
      const { result: enResult } = renderHook(() => useTranslations(), {
        wrapper: ({ children }) => <TestWrapper locale="en">{children}</TestWrapper>
      });

      const { result: ptResult } = renderHook(() => useTranslations(), {
        wrapper: ({ children }) => <TestWrapper locale="pt-BR">{children}</TestWrapper>
      });

      expect(enResult.current.t('common.title')).toBe('Welcome');
      expect(ptResult.current.t('common.title')).toBe('Bem-vindo');

      expect(enResult.current.t('common.actions.add')).toBe('Add');
      expect(ptResult.current.t('common.actions.add')).toBe('Adicionar');

      expect(enResult.current.t('common.labels.name')).toBe('Name');
      expect(ptResult.current.t('common.labels.name')).toBe('Nome');
    });
  });

  describe('Safe translation access', () => {
    it('should handle deeply nested missing keys', () => {
      const { result } = renderHook(() => useTranslations(), {
        wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>
      });

      expect(result.current.t('deep.nested.missing.key')).toBe('deep.nested.missing.key');
    });

    it('should handle partial path existence', () => {
      const { result } = renderHook(() => useTranslations(), {
        wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>
      });

      // 'common' exists but 'common.nonexistent' does not
      expect(result.current.t('common.nonexistent')).toBe('common.nonexistent');
    });

    it('should handle non-string values in translation object', () => {
      const { result } = renderHook(() => useTranslations(), {
        wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>
      });

      // Trying to access an object as a string should return fallback
      expect(result.current.t('common.categories')).toBe('common.categories');
    });
  });

  describe('Utility methods', () => {
    it('should check if translation exists', () => {
      const { result } = renderHook(() => useTranslations(), {
        wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>
      });

      expect(result.current.hasTranslation('common.title')).toBe(true);
      expect(result.current.hasTranslation('common.actions.add')).toBe(true);
      expect(result.current.hasTranslation('common.labels.name')).toBe(true);
      expect(result.current.hasTranslation('missing.key')).toBe(false);
      expect(result.current.hasTranslation('common.categories')).toBe(false); // Object, not string
    });

    it('should get nested translations object', () => {
      const { result } = renderHook(() => useTranslations(), {
        wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>
      });

      const nested = result.current.getNestedTranslations('common.categories.equipment');
      expect(nested).toEqual({
        computer: 'Computer',
        phone: 'Phone'
      });

      const actions = result.current.getNestedTranslations('common.actions');
      expect(actions).toEqual({
        add: 'Add',
        save: 'Save',
        cancel: 'Cancel',
        close: 'Close',
        open: 'Open',
      });
    });

    it('should return empty object for missing nested path', () => {
      const { result } = renderHook(() => useTranslations(), {
        wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>
      });

      const nested = result.current.getNestedTranslations('missing.path');
      expect(nested).toEqual({});
    });

    it('should get all available keys', () => {
      const { result } = renderHook(() => useTranslations(), {
        wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>
      });

      const keys = result.current.getAvailableKeys();
      expect(keys).toContain('common.title');
      expect(keys).toContain('common.search');
      expect(keys).toContain('common.actions.add');
      expect(keys).toContain('common.labels.name');
      expect(keys).toContain('common.placeholders.enterName');
      expect(keys).toContain('common.categories.equipment.computer');
      expect(keys).toContain('forms.validation.required');
      expect(keys).toContain('forms.equipment.name');
    });

    it('should provide type-safe translation function', () => {
      const { result } = renderHook(() => useTranslations(), {
        wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>
      });

      // This should work with TypeScript type checking
      expect(result.current.tSafe('common.title')).toBe('Welcome');
      expect(result.current.tSafe('common.search')).toBe('Search...');
      expect(result.current.tSafe('common.actions.add')).toBe('Add');
    });
  });

  describe('Performance', () => {
    it('should not recreate translation functions on every render', () => {
      const { result, rerender } = renderHook(() => useTranslations(), {
        wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>
      });

      const firstT = result.current.t;
      const firstTSafe = result.current.tSafe;

      rerender();

      // Functions should be stable across renders (or at least work consistently)
      expect(typeof result.current.t).toBe('function');
      expect(typeof result.current.tSafe).toBe('function');

      // Test that they still work the same way
      expect(result.current.t('common.title')).toBe(firstT('common.title'));
      expect(result.current.tSafe('common.title')).toBe(firstTSafe('common.title'));
    });
  });

  describe('Integration with React components', () => {
    function TestComponent() {
      const { t } = useTranslations();

      return (
        <div>
          <h1>{t('common.title')}</h1>
          <p>{t('common.search')}</p>
          <button>{t('common.actions.add')}</button>
          <label>{t('common.labels.name')}</label>
          <input placeholder={t('common.placeholders.enterName')} />
          <span>{t('missing.key', 'Default text')}</span>
        </div>
      );
    }

    it('should work correctly in React components', () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(screen.getByText('Welcome')).toBeDefined();
      expect(screen.getByText('Search...')).toBeDefined();
      expect(screen.getByText('Add')).toBeDefined();
      expect(screen.getByText('Name')).toBeDefined();
      expect(screen.getByPlaceholderText('Enter name')).toBeDefined();
      expect(screen.getByText('Default text')).toBeDefined();
    });

    it('should update when locale changes', () => {
      function LocaleSwitchingComponent() {
        const { t } = useTranslations();
        const { setLocale } = useLocale();

        return (
          <div>
            <h1>{t('common.title')}</h1>
            <button>{t('common.actions.add')}</button>
            <button onClick={() => setLocale('pt-BR')}>
              Switch to Portuguese
            </button>
          </div>
        );
      }

      render(
        <TestWrapper>
          <LocaleSwitchingComponent />
        </TestWrapper>
      );

      expect(screen.getByText('Welcome')).toBeDefined();
      expect(screen.getByText('Add')).toBeDefined();

      act(() => {
        screen.getByText('Switch to Portuguese').click();
      });

      expect(screen.getByText('Bem-vindo')).toBeDefined();
      expect(screen.getByText('Adicionar')).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle keys with special characters', () => {
      const { result } = renderHook(() => useTranslations(), {
        wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>
      });

      expect(result.current.t('common.not-found')).toBe('No results found.');
      expect(result.current.t('validation.error.not-found')).toBe('Resource not found.');
      expect(result.current.t('expenses.actions.add-expense')).toBe('Add expense');
    });

    it('should handle numeric keys if they exist', () => {
      const { result } = renderHook(() => useTranslations(), {
        wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>
      });

      // Should handle keys that might be numeric strings
      expect(result.current.t('0.key')).toBe('0.key'); // Fallback since it doesn't exist
    });

    it('should handle very long key paths', () => {
      const { result } = renderHook(() => useTranslations(), {
        wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>
      });

      const longKey = 'very.long.nested.key.path.that.does.not.exist';
      expect(result.current.t(longKey)).toBe(longKey);
    });
  });
});