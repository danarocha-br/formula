/**
 * End-to-end translation testing
 * Tests complete user workflows in both languages
 */

import { LocaleProvider } from '@/contexts/locale-context';
import { useTranslations } from '@/hooks/use-translation';
import { render, screen, } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

// Test component that uses translations
function TestComponent() {
  const { t, locale } = useTranslations();

  return (
    <div>
      <h1 data-testid="title">{t('common.title')}</h1>
      <button data-testid="add-button">{t('common.actions.add')}</button>
      <label data-testid="name-label">{t('common.labels.name')}</label>
      <input
        data-testid="search-input"
        placeholder={t('common.placeholders.search')}
      />
      <span data-testid="current-locale">{locale}</span>
      <div data-testid="currency-symbol">{t('common.currency-symbol')}</div>
      <div data-testid="validation-required">{t('forms.validation.required')}</div>
    </div>
  );
}

// Test wrapper with locale switching capability
function TestWrapper({ locale = 'en', children }: { locale?: string; children: React.ReactNode }) {
  return (
    <LocaleProvider initialLocale={locale}>
      {children}
    </LocaleProvider>
  );
}

describe('End-to-End Translation Testing', () => {
  describe('English locale functionality', () => {
    it('should display all text in English', () => {
      render(
        <TestWrapper locale="en">
          <TestComponent />
        </TestWrapper>
      );

      // Verify English translations
      expect(screen.getByTestId('title')).toHaveTextContent('Welcome');
      expect(screen.getByTestId('add-button')).toHaveTextContent('Add');
      expect(screen.getByTestId('name-label')).toHaveTextContent('Name');
      expect(screen.getByTestId('search-input')).toHaveAttribute('placeholder', 'Search');
      expect(screen.getByTestId('current-locale')).toHaveTextContent('en');
      expect(screen.getByTestId('currency-symbol')).toHaveTextContent('$');
      expect(screen.getByTestId('validation-required')).toHaveTextContent('This field is required');
    });

    it('should handle currency formatting for USD', () => {
      render(
        <TestWrapper locale="en">
          <TestComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('currency-symbol')).toHaveTextContent('$');
    });
  });

  describe('Portuguese locale functionality', () => {
    it('should display all text in Portuguese', () => {
      render(
        <TestWrapper locale="pt-BR">
          <TestComponent />
        </TestWrapper>
      );

      // Verify Portuguese translations
      expect(screen.getByTestId('title')).toHaveTextContent('Bem-vindo');
      expect(screen.getByTestId('add-button')).toHaveTextContent('Adicionar');
      expect(screen.getByTestId('name-label')).toHaveTextContent('Nome');
      expect(screen.getByTestId('search-input')).toHaveAttribute('placeholder', 'Pesquisar');
      expect(screen.getByTestId('current-locale')).toHaveTextContent('pt-BR');
      expect(screen.getByTestId('currency-symbol')).toHaveTextContent('R$');
      expect(screen.getByTestId('validation-required')).toHaveTextContent('Este campo é obrigatório');
    });

    it('should handle currency formatting for BRL', () => {
      render(
        <TestWrapper locale="pt-BR">
          <TestComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('currency-symbol')).toHaveTextContent('R$');
    });

    it('should use appropriate Brazilian Portuguese terminology', () => {
      render(
        <TestWrapper locale="pt-BR">
          <TestComponent />
        </TestWrapper>
      );

      // Verify that we're using proper Brazilian Portuguese
      expect(screen.getByTestId('validation-required')).toHaveTextContent('Este campo é obrigatório');
      // The text should use "é" (with accent) not "e"
      expect(screen.getByTestId('validation-required').textContent).toMatch(/é/);
    });
  });

  describe('Translation completeness', () => {
    it('should not contain any hardcoded English strings in Portuguese mode', () => {
      render(
        <TestWrapper locale="pt-BR">
          <TestComponent />
        </TestWrapper>
      );

      // Get all text content
      const allText = document.body.textContent || '';

      // Common English words that shouldn't appear in Portuguese mode
      const englishWords = ['Welcome', 'Add', 'Name', 'Search', 'required'];

      englishWords.forEach(word => {
        expect(allText).not.toContain(word);
      });
    });

    it('should not contain any hardcoded Portuguese strings in English mode', () => {
      render(
        <TestWrapper locale="en">
          <TestComponent />
        </TestWrapper>
      );

      // Get all text content
      const allText = document.body.textContent || '';

      // Common Portuguese words that shouldn't appear in English mode
      const portugueseWords = ['Bem-vindo', 'Adicionar', 'Nome', 'Pesquisar', 'obrigatório'];

      portugueseWords.forEach(word => {
        expect(allText).not.toContain(word);
      });
    });
  });

  describe('Fallback behavior', () => {
    it('should handle missing translation keys gracefully', () => {
      function ComponentWithMissingKey() {
        const { t } = useTranslations();
        return <div data-testid="missing-key">{t('nonexistent.key' as any)}</div>;
      }

      render(
        <TestWrapper locale="en">
          <ComponentWithMissingKey />
        </TestWrapper>
      );

      // Should fallback to the key itself
      expect(screen.getByTestId('missing-key')).toHaveTextContent('nonexistent.key');
    });

    it('should use provided fallback for missing keys', () => {
      function ComponentWithFallback() {
        const { t } = useTranslations();
        return <div data-testid="fallback">{t('nonexistent.key' as any, 'Fallback Text')}</div>;
      }

      render(
        <TestWrapper locale="en">
          <ComponentWithFallback />
        </TestWrapper>
      );

      expect(screen.getByTestId('fallback')).toHaveTextContent('Fallback Text');
    });
  });

  describe('Form validation translations', () => {
    it('should translate validation messages in English', () => {
      function FormComponent() {
        const { t } = useTranslations();
        return (
          <div>
            <div data-testid="required-msg">{t('forms.validation.required')}</div>
            <div data-testid="email-msg">{t('forms.validation.email')}</div>
            <div data-testid="min-msg">{t('forms.validation.min')}</div>
          </div>
        );
      }

      render(
        <TestWrapper locale="en">
          <FormComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('required-msg')).toHaveTextContent('This field is required');
      expect(screen.getByTestId('email-msg')).toHaveTextContent('Please enter a valid email address');
      expect(screen.getByTestId('min-msg')).toHaveTextContent('Value is too small');
    });

    it('should translate validation messages in Portuguese', () => {
      function FormComponent() {
        const { t } = useTranslations();
        return (
          <div>
            <div data-testid="required-msg">{t('forms.validation.required')}</div>
            <div data-testid="email-msg">{t('forms.validation.email')}</div>
            <div data-testid="min-msg">{t('forms.validation.min')}</div>
          </div>
        );
      }

      render(
        <TestWrapper locale="pt-BR">
          <FormComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('required-msg')).toHaveTextContent('Este campo é obrigatório');
      expect(screen.getByTestId('email-msg')).toHaveTextContent('Por favor, insira um endereço de email válido');
      expect(screen.getByTestId('min-msg')).toHaveTextContent('Valor muito pequeno');
    });
  });

  describe('Equipment form translations', () => {
    it('should translate equipment form labels in English', () => {
      function EquipmentForm() {
        const { t } = useTranslations();
        return (
          <div>
            <label data-testid="equipment-name">{t('forms.equipment.name')}</label>
            <label data-testid="equipment-cost">{t('forms.equipment.cost')}</label>
            <label data-testid="equipment-usage">{t('forms.equipment.usage')}</label>
          </div>
        );
      }

      render(
        <TestWrapper locale="en">
          <EquipmentForm />
        </TestWrapper>
      );

      expect(screen.getByTestId('equipment-name')).toHaveTextContent('Equipment name');
      expect(screen.getByTestId('equipment-cost')).toHaveTextContent('Equipment cost');
      expect(screen.getByTestId('equipment-usage')).toHaveTextContent('Usage percentage');
    });

    it('should translate equipment form labels in Portuguese', () => {
      function EquipmentForm() {
        const { t } = useTranslations();
        return (
          <div>
            <label data-testid="equipment-name">{t('forms.equipment.name')}</label>
            <label data-testid="equipment-cost">{t('forms.equipment.cost')}</label>
            <label data-testid="equipment-usage">{t('forms.equipment.usage')}</label>
          </div>
        );
      }

      render(
        <TestWrapper locale="pt-BR">
          <EquipmentForm />
        </TestWrapper>
      );

      expect(screen.getByTestId('equipment-name')).toHaveTextContent('Nome do equipamento');
      expect(screen.getByTestId('equipment-cost')).toHaveTextContent('Custo do equipamento');
      expect(screen.getByTestId('equipment-usage')).toHaveTextContent('Percentual de uso');
    });
  });

  describe('Accessibility translations', () => {
    it('should translate accessibility labels in English', () => {
      function AccessibleComponent() {
        const { t } = useTranslations();
        return (
          <div>
            <button aria-label={t('common.accessibility.openMenu')} data-testid="menu-button">
              Menu
            </button>
            <button aria-label={t('forms.accessibility.closeDialog')} data-testid="close-button">
              ×
            </button>
          </div>
        );
      }

      render(
        <TestWrapper locale="en">
          <AccessibleComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('menu-button')).toHaveAttribute('aria-label', 'Open menu');
      expect(screen.getByTestId('close-button')).toHaveAttribute('aria-label', 'Close dialog');
    });

    it('should translate accessibility labels in Portuguese', () => {
      function AccessibleComponent() {
        const { t } = useTranslations();
        return (
          <div>
            <button aria-label={t('common.accessibility.openMenu')} data-testid="menu-button">
              Menu
            </button>
            <button aria-label={t('forms.accessibility.closeDialog')} data-testid="close-button">
              ×
            </button>
          </div>
        );
      }

      render(
        <TestWrapper locale="pt-BR">
          <AccessibleComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('menu-button')).toHaveAttribute('aria-label', 'Abrir menu');
      expect(screen.getByTestId('close-button')).toHaveAttribute('aria-label', 'Fechar diálogo');
    });
  });
});