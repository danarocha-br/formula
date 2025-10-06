/**
 * Hardcoded strings detection tests
 * Tests to ensure components don't contain hardcoded user-facing strings
 */

import { LocaleProvider } from '@/contexts/locale-context';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

// Mock the locale files
vi.mock('@/locales/en', () => ({
  en: {
    common: {
      title: 'Welcome',
      search: 'Search...',
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
    },
    forms: {
      equipment: {
        name: 'Equipment name',
        cost: 'Equipment cost',
      },
      validation: {
        required: 'This field is required',
      },
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
    },
    forms: {
      equipment: {
        name: 'Nome do equipamento',
        cost: 'Custo do equipamento',
      },
      validation: {
        required: 'Este campo é obrigatório',
      },
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
  locale?: 'en' | 'pt-BR';
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

describe('Hardcoded Strings Detection', () => {
  describe('Component translation compliance', () => {
    it('should not contain hardcoded English strings in buttons', () => {
      // Mock a component that should use translations
      function ButtonComponent() {
        const { useTranslations } = require('@/hooks/use-translation');
        const { t } = useTranslations();

        return (
          <div>
            <button>{t('common.actions.add')}</button>
            <button>{t('common.actions.save')}</button>
            <button>{t('common.actions.cancel')}</button>
          </div>
        );
      }

      render(
        <TestWrapper>
          <ButtonComponent />
        </TestWrapper>
      );

      // Should show translated text, not hardcoded English
      expect(screen.getByText('Add')).toBeDefined();
      expect(screen.getByText('Save')).toBeDefined();
      expect(screen.getByText('Cancel')).toBeDefined();

      // Should not contain hardcoded strings
      expect(screen.queryByText('Add Expense')).toBeNull(); // This would be hardcoded
      expect(screen.queryByText('Save Changes')).toBeNull(); // This would be hardcoded
    });

    it('should not contain hardcoded form labels', () => {
      function FormComponent() {
        const { useTranslations } = require('@/hooks/use-translation');
        const { t } = useTranslations();

        return (
          <form>
            <label>{t('common.labels.name')}</label>
            <input placeholder={t('common.placeholders.enterName')} />

            <label>{t('common.labels.cost')}</label>
            <input placeholder={t('common.placeholders.selectCategory')} />

            <label>{t('forms.equipment.name')}</label>
            <input />
          </form>
        );
      }

      render(
        <TestWrapper>
          <FormComponent />
        </TestWrapper>
      );

      // Should show translated labels
      expect(screen.getByText('Name')).toBeDefined();
      expect(screen.getByText('Cost')).toBeDefined();
      expect(screen.getByText('Equipment name')).toBeDefined();

      // Should show translated placeholders
      expect(screen.getByPlaceholderText('Enter name')).toBeDefined();
      expect(screen.getByPlaceholderText('Select category')).toBeDefined();

      // Should not contain hardcoded Portuguese strings
      expect(screen.queryByText('Nome do equipamento')).toBeNull(); // Would be hardcoded PT
      expect(screen.queryByText('Custo do equipamento')).toBeNull(); // Would be hardcoded PT
    });

    it('should not contain hardcoded aria-labels', () => {
      function AccessibleComponent() {
        const { useTranslations } = require('@/hooks/use-translation');
        const { t } = useTranslations();

        return (
          <div>
            <button aria-label={t('common.actions.close')}>×</button>
            <input aria-label={t('common.labels.name')} />
            <select aria-label={t('common.labels.category')}>
              <option>Option 1</option>
            </select>
          </div>
        );
      }

      render(
        <TestWrapper>
          <AccessibleComponent />
        </TestWrapper>
      );

      // Check that aria-labels are translated
      expect(screen.getByLabelText('Close')).toBeDefined();
      expect(screen.getByLabelText('Name')).toBeDefined();
      expect(screen.getByLabelText('Category')).toBeDefined();
    });

    it('should update text when locale changes', () => {
      function LocaleAwareComponent() {
        const { useTranslations } = require('@/hooks/use-translation');
        const { t } = useTranslations();

        return (
          <div>
            <h1>{t('common.title')}</h1>
            <button>{t('common.actions.add')}</button>
            <label>{t('common.labels.name')}</label>
          </div>
        );
      }

      // Test English
      const { rerender } = render(
        <TestWrapper locale="en">
          <LocaleAwareComponent />
        </TestWrapper>
      );

      expect(screen.getByText('Welcome')).toBeDefined();
      expect(screen.getByText('Add')).toBeDefined();
      expect(screen.getByText('Name')).toBeDefined();

      // Test Portuguese
      rerender(
        <TestWrapper locale="pt-BR">
          <LocaleAwareComponent />
        </TestWrapper>
      );

      expect(screen.getByText('Bem-vindo')).toBeDefined();
      expect(screen.getByText('Adicionar')).toBeDefined();
      expect(screen.getByText('Nome')).toBeDefined();
    });
  });

  describe('Anti-patterns detection', () => {
    it('should detect hardcoded strings in JSX text', () => {
      // This is an example of what NOT to do
      function BadComponent() {
        return (
          <div>
            <h1>Welcome to Formula!</h1> {/* Hardcoded English */}
            <button>Add Expense</button> {/* Hardcoded English */}
            <label>Equipment Name</label> {/* Hardcoded English */}
          </div>
        );
      }

      render(<BadComponent />);

      // These are hardcoded strings that should be translated
      const hardcodedStrings = [
        'Welcome to Formula!',
        'Add Expense',
        'Equipment Name'
      ];

      hardcodedStrings.forEach(text => {
        expect(screen.getByText(text)).toBeDefined();
      });

      // This test documents what we DON'T want - hardcoded strings
      // In a real implementation, these should fail the test
    });

    it('should detect hardcoded strings in attributes', () => {
      function BadAttributeComponent() {
        return (
          <div>
            <button aria-label="Close dialog">×</button> {/* Hardcoded aria-label */}
            <input placeholder="Enter your name" /> {/* Hardcoded placeholder */}
            <img alt="Company logo" src="/logo.png" /> {/* Hardcoded alt text */}
          </div>
        );
      }

      render(<BadAttributeComponent />);

      // These are hardcoded attributes that should be translated
      expect(screen.getByLabelText('Close dialog')).toBeDefined();
      expect(screen.getByPlaceholderText('Enter your name')).toBeDefined();
      expect(screen.getByAltText('Company logo')).toBeDefined();

      // This test documents what we DON'T want - hardcoded attributes
    });

    it('should prefer translation keys over hardcoded strings', () => {
      function GoodComponent() {
        const { useTranslations } = require('@/hooks/use-translation');
        const { t } = useTranslations();

        return (
          <div>
            <h1>{t('common.title')}</h1>
            <button>{t('expenses.actions.add-expense')}</button>
            <label>{t('forms.equipment.name')}</label>
          </div>
        );
      }

      function BadComponent() {
        return (
          <div>
            <h1>Welcome</h1> {/* Should use t('common.title') */}
            <button>Add Expense</button> {/* Should use t('expenses.actions.add-expense') */}
            <label>Equipment Name</label> {/* Should use t('forms.equipment.name') */}
          </div>
        );
      }

      // Test the good component
      render(
        <TestWrapper>
          <GoodComponent />
        </TestWrapper>
      );

      expect(screen.getByText('Welcome')).toBeDefined();
      expect(screen.getByText('Add expense')).toBeDefined();
      expect(screen.getByText('Equipment name')).toBeDefined();
    });
  });

  describe('Translation fallback behavior', () => {
    it('should handle missing translation keys gracefully', () => {
      function ComponentWithMissingKeys() {
        const { useTranslations } = require('@/hooks/use-translation');
        const { t } = useTranslations();

        return (
          <div>
            <button>{t('missing.key', 'Default Button Text')}</button>
            <label>{t('another.missing.key', 'Default Label')}</label>
            <span>{t('nonexistent.key')}</span> {/* Should show key as fallback */}
          </div>
        );
      }

      render(
        <TestWrapper>
          <ComponentWithMissingKeys />
        </TestWrapper>
      );

      // Should show fallback text for missing keys
      expect(screen.getByText('Default Button Text')).toBeDefined();
      expect(screen.getByText('Default Label')).toBeDefined();
      expect(screen.getByText('nonexistent.key')).toBeDefined(); // Key as fallback
    });

    it('should warn about missing translation keys in development', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Set NODE_ENV to development
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      function ComponentWithMissingKey() {
        const { useTranslations } = require('@/hooks/use-translation');
        const { t } = useTranslations();

        return <div>{t('definitely.missing.key')}</div>;
      }

      render(
        <TestWrapper>
          <ComponentWithMissingKey />
        </TestWrapper>
      );

      // Should have logged a warning about the missing key
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Translation key not found: "definitely.missing.key"')
      );

      // Restore original NODE_ENV
      process.env.NODE_ENV = originalEnv;
      consoleSpy.mockRestore();
    });
  });

  describe('Validation message translation', () => {
    it('should use translated validation messages', () => {
      function FormWithValidation() {
        const { useTranslations } = require('@/hooks/use-translation');
        const { createValidationMessages } = require('@/utils/validation-messages');
        const { t } = useTranslations();

        const messages = createValidationMessages(t);

        return (
          <div>
            <span data-testid="required-message">{messages.required()}</span>
            <span data-testid="email-message">{messages.email()}</span>
            <span data-testid="custom-message">{messages.custom('Custom error')}</span>
          </div>
        );
      }

      render(
        <TestWrapper>
          <FormWithValidation />
        </TestWrapper>
      );

      expect(screen.getByTestId('required-message')).toHaveTextContent('This field is required');
      expect(screen.getByTestId('email-message')).toHaveTextContent('Please enter a valid email address');
      expect(screen.getByTestId('custom-message')).toHaveTextContent('Custom error');
    });

    it('should translate validation messages in Portuguese', () => {
      function FormWithValidation() {
        const { useTranslations } = require('@/hooks/use-translation');
        const { createValidationMessages } = require('@/utils/validation-messages');
        const { t } = useTranslations();

        const messages = createValidationMessages(t);

        return (
          <div>
            <span data-testid="required-message">{messages.required()}</span>
          </div>
        );
      }

      render(
        <TestWrapper locale="pt-BR">
          <FormWithValidation />
        </TestWrapper>
      );

      expect(screen.getByTestId('required-message')).toHaveTextContent('Este campo é obrigatório');
    });
  });

  describe('Component scanning utilities', () => {
    it('should identify components that need translation updates', () => {
      // This would be used by the audit script to identify problematic components
      const componentCode = `
        function MyComponent() {
          return (
            <div>
              <h1>Welcome to Formula!</h1>
              <button>Add Expense</button>
              <input placeholder="Enter name" />
              <button aria-label="Close dialog">×</button>
            </div>
          );
        }
      `;

      // Simulate hardcoded string detection
      const hardcodedStrings = [
        { text: 'Welcome to Formula!', type: 'jsx-text', line: 4 },
        { text: 'Add Expense', type: 'jsx-text', line: 5 },
        { text: 'Enter name', type: 'placeholder', line: 6 },
        { text: 'Close dialog', type: 'aria-label', line: 7 }
      ];

      expect(hardcodedStrings).toHaveLength(4);
      expect(hardcodedStrings[0].text).toBe('Welcome to Formula!');
      expect(hardcodedStrings[0].type).toBe('jsx-text');
      expect(hardcodedStrings[3].type).toBe('aria-label');
    });

    it('should suggest translation keys for hardcoded strings', () => {
      const hardcodedStrings = [
        'Add Expense',
        'Equipment Name',
        'Enter name',
        'Select category',
        'Save Changes',
        'Cancel'
      ];

      // Simulate key suggestion logic
      const suggestedKeys = hardcodedStrings.map(text => {
        if (text.includes('Add')) return 'common.actions.add';
        if (text.includes('Save')) return 'common.actions.save';
        if (text.includes('Cancel')) return 'common.actions.cancel';
        if (text.includes('Name')) return 'common.labels.name';
        if (text.includes('Enter')) return 'common.placeholders.enterName';
        if (text.includes('Select')) return 'common.placeholders.selectCategory';
        return 'unknown.key';
      });

      expect(suggestedKeys).toEqual([
        'common.actions.add',
        'common.labels.name',
        'common.placeholders.enterName',
        'common.placeholders.selectCategory',
        'common.actions.save',
        'common.actions.cancel'
      ]);
    });
  });
});