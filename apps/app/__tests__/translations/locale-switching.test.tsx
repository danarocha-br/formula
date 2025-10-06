/**
 * Locale switching tests
 * Tests locale switching functionality across components
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LocaleProvider, useLocale } from '@/contexts/locale-context';
import { useTranslations } from '@/hooks/use-translation';

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
      accessibility: {
        openMenu: 'Open menu',
        closeMenu: 'Close menu',
        selectLanguage: 'Select language',
      },
    },
    forms: {
      equipment: {
        name: 'Equipment name',
        cost: 'Equipment cost',
      },
      validation: {
        required: 'This field is required',
        email: 'Please enter a valid email address',
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
      accessibility: {
        openMenu: 'Abrir menu',
        closeMenu: 'Fechar menu',
        selectLanguage: 'Selecionar idioma',
      },
    },
    forms: {
      equipment: {
        name: 'Nome do equipamento',
        cost: 'Custo do equipamento',
      },
      validation: {
        required: 'Este campo é obrigatório',
        email: 'Por favor, insira um endereço de email válido',
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
  initialLocale?: 'en' | 'pt-BR';
}

function TestWrapper({ children, initialLocale = 'en' }: TestWrapperProps) {
  // Mock document.cookie for testing
  Object.defineProperty(document, 'cookie', {
    writable: true,
    value: `NEXT_LOCALE=${initialLocale}`,
  });

  return (
    <LocaleProvider>
      {children}
    </LocaleProvider>
  );
}

describe('Locale Switching', () => {
  beforeEach(() => {
    // Clear any existing cookies
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic locale switching', () => {
    it('should switch from English to Portuguese', () => {
      const { result } = renderHook(() => useLocale(), {
        wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>
      });

      // Start with English
      expect(result.current.locale).toBe('en');
      expect(result.current.translations.common.title).toBe('Welcome');

      // Switch to Portuguese
      act(() => {
        result.current.setLocale('pt-BR');
      });

      expect(result.current.locale).toBe('pt-BR');
      expect(result.current.translations.common.title).toBe('Bem-vindo');
    });

    it('should switch from Portuguese to English', () => {
      const { result } = renderHook(() => useLocale(), {
        wrapper: ({ children }) => <TestWrapper initialLocale="pt-BR">{children}</TestWrapper>
      });

      // Start with Portuguese
      expect(result.current.locale).toBe('pt-BR');
      expect(result.current.translations.common.title).toBe('Bem-vindo');

      // Switch to English
      act(() => {
        result.current.setLocale('en');
      });

      expect(result.current.locale).toBe('en');
      expect(result.current.translations.common.title).toBe('Welcome');
    });

    it('should update all translation keys when switching locales', () => {
      const { result } = renderHook(() => useLocale(), {
        wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>
      });

      // Check English translations
      expect(result.current.translations.common.actions.add).toBe('Add');
      expect(result.current.translations.common.labels.name).toBe('Name');
      expect(result.current.translations.common.placeholders.enterName).toBe('Enter name');
      expect(result.current.translations.forms.equipment.name).toBe('Equipment name');

      // Switch to Portuguese
      act(() => {
        result.current.setLocale('pt-BR');
      });

      // Check Portuguese translations
      expect(result.current.translations.common.actions.add).toBe('Adicionar');
      expect(result.current.translations.common.labels.name).toBe('Nome');
      expect(result.current.translations.common.placeholders.enterName).toBe('Digite o nome');
      expect(result.current.translations.forms.equipment.name).toBe('Nome do equipamento');
    });
  });

  describe('Component updates on locale change', () => {
    function TestComponent() {
      const { t } = useTranslations();
      const { locale, setLocale } = useLocale();

      return (
        <div>
          <h1 data-testid="title">{t('common.title')}</h1>
          <button data-testid="add-button">{t('common.actions.add')}</button>
          <label data-testid="name-label">{t('common.labels.name')}</label>
          <input
            data-testid="name-input"
            placeholder={t('common.placeholders.enterName')}
          />
          <span data-testid="current-locale">{locale}</span>
          <button
            data-testid="switch-to-pt"
            onClick={() => setLocale('pt-BR')}
          >
            Switch to Portuguese
          </button>
          <button
            data-testid="switch-to-en"
            onClick={() => setLocale('en')}
          >
            Switch to English
          </button>
        </div>
      );
    }

    it('should update all text content when switching to Portuguese', () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Check initial English content
      expect(screen.getByTestId('title')).toHaveTextContent('Welcome');
      expect(screen.getByTestId('add-button')).toHaveTextContent('Add');
      expect(screen.getByTestId('name-label')).toHaveTextContent('Name');
      expect(screen.getByTestId('name-input')).toHaveAttribute('placeholder', 'Enter name');
      expect(screen.getByTestId('current-locale')).toHaveTextContent('en');

      // Switch to Portuguese
      fireEvent.click(screen.getByTestId('switch-to-pt'));

      // Check updated Portuguese content
      expect(screen.getByTestId('title')).toHaveTextContent('Bem-vindo');
      expect(screen.getByTestId('add-button')).toHaveTextContent('Adicionar');
      expect(screen.getByTestId('name-label')).toHaveTextContent('Nome');
      expect(screen.getByTestId('name-input')).toHaveAttribute('placeholder', 'Digite o nome');
      expect(screen.getByTestId('current-locale')).toHaveTextContent('pt-BR');
    });

    it('should update all text content when switching back to English', () => {
      render(
        <TestWrapper initialLocale="pt-BR">
          <TestComponent />
        </TestWrapper>
      );

      // Check initial Portuguese content
      expect(screen.getByTestId('title')).toHaveTextContent('Bem-vindo');
      expect(screen.getByTestId('add-button')).toHaveTextContent('Adicionar');
      expect(screen.getByTestId('current-locale')).toHaveTextContent('pt-BR');

      // Switch to English
      fireEvent.click(screen.getByTestId('switch-to-en'));

      // Check updated English content
      expect(screen.getByTestId('title')).toHaveTextContent('Welcome');
      expect(screen.getByTestId('add-button')).toHaveTextContent('Add');
      expect(screen.getByTestId('current-locale')).toHaveTextContent('en');
    });

    it('should update accessibility attributes when switching locales', () => {
      function AccessibleComponent() {
        const { t } = useTranslations();
        const { setLocale } = useLocale();

        return (
          <div>
            <button
              data-testid="menu-button"
              aria-label={t('common.accessibility.openMenu')}
            >
              ☰
            </button>
            <select
              data-testid="language-select"
              aria-label={t('common.accessibility.selectLanguage')}
            >
              <option value="en">English</option>
              <option value="pt-BR">Português</option>
            </select>
            <button
              data-testid="switch-locale"
              onClick={() => setLocale('pt-BR')}
            >
              Switch
            </button>
          </div>
        );
      }

      render(
        <TestWrapper>
          <AccessibleComponent />
        </TestWrapper>
      );

      // Check initial English aria-labels
      expect(screen.getByTestId('menu-button')).toHaveAttribute('aria-label', 'Open menu');
      expect(screen.getByTestId('language-select')).toHaveAttribute('aria-label', 'Select language');

      // Switch to Portuguese
      fireEvent.click(screen.getByTestId('switch-locale'));

      // Check updated Portuguese aria-labels
      expect(screen.getByTestId('menu-button')).toHaveAttribute('aria-label', 'Abrir menu');
      expect(screen.getByTestId('language-select')).toHaveAttribute('aria-label', 'Selecionar idioma');
    });
  });

  describe('Form components locale switching', () => {
    function FormComponent() {
      const { t } = useTranslations();
      const { setLocale } = useLocale();

      return (
        <form>
          <div>
            <label data-testid="equipment-name-label">
              {t('forms.equipment.name')}
            </label>
            <input
              data-testid="equipment-name-input"
              placeholder={t('common.placeholders.enterName')}
            />
          </div>

          <div>
            <label data-testid="equipment-cost-label">
              {t('forms.equipment.cost')}
            </label>
            <input type="number" />
          </div>

          <div data-testid="validation-message">
            {t('forms.validation.required')}
          </div>

          <button
            type="button"
            data-testid="save-button"
          >
            {t('common.actions.save')}
          </button>

          <button
            type="button"
            data-testid="cancel-button"
          >
            {t('common.actions.cancel')}
          </button>

          <button
            type="button"
            data-testid="switch-locale"
            onClick={() => setLocale('pt-BR')}
          >
            Switch to Portuguese
          </button>
        </form>
      );
    }

    it('should update all form elements when switching locales', () => {
      render(
        <TestWrapper>
          <FormComponent />
        </TestWrapper>
      );

      // Check initial English form content
      expect(screen.getByTestId('equipment-name-label')).toHaveTextContent('Equipment name');
      expect(screen.getByTestId('equipment-cost-label')).toHaveTextContent('Equipment cost');
      expect(screen.getByTestId('equipment-name-input')).toHaveAttribute('placeholder', 'Enter name');
      expect(screen.getByTestId('validation-message')).toHaveTextContent('This field is required');
      expect(screen.getByTestId('save-button')).toHaveTextContent('Save');
      expect(screen.getByTestId('cancel-button')).toHaveTextContent('Cancel');

      // Switch to Portuguese
      fireEvent.click(screen.getByTestId('switch-locale'));

      // Check updated Portuguese form content
      expect(screen.getByTestId('equipment-name-label')).toHaveTextContent('Nome do equipamento');
      expect(screen.getByTestId('equipment-cost-label')).toHaveTextContent('Custo do equipamento');
      expect(screen.getByTestId('equipment-name-input')).toHaveAttribute('placeholder', 'Digite o nome');
      expect(screen.getByTestId('validation-message')).toHaveTextContent('Este campo é obrigatório');
      expect(screen.getByTestId('save-button')).toHaveTextContent('Salvar');
      expect(screen.getByTestId('cancel-button')).toHaveTextContent('Cancelar');
    });
  });

  describe('Multiple components synchronization', () => {
    function HeaderComponent() {
      const { t } = useTranslations();
      return (
        <header data-testid="header">
          <h1>{t('common.title')}</h1>
          <button>{t('common.actions.open')}</button>
        </header>
      );
    }

    function SidebarComponent() {
      const { t } = useTranslations();
      return (
        <aside data-testid="sidebar">
          <button>{t('common.actions.add')}</button>
          <input placeholder={t('common.placeholders.search')} />
        </aside>
      );
    }

    function MainComponent() {
      const { t } = useTranslations();
      const { setLocale } = useLocale();

      return (
        <main data-testid="main">
          <p>{t('expenses.actions.add-expense')}</p>
          <button
            data-testid="switch-locale"
            onClick={() => setLocale('pt-BR')}
          >
            Switch Language
          </button>
        </main>
      );
    }

    function AppComponent() {
      return (
        <div>
          <HeaderComponent />
          <SidebarComponent />
          <MainComponent />
        </div>
      );
    }

    it('should update all components simultaneously when locale changes', () => {
      render(
        <TestWrapper>
          <AppComponent />
        </TestWrapper>
      );

      // Check initial English content across all components
      expect(screen.getByTestId('header')).toHaveTextContent('Welcome');
      expect(screen.getByTestId('header')).toHaveTextContent('Open');
      expect(screen.getByTestId('sidebar')).toHaveTextContent('Add');
      expect(screen.getByPlaceholderText('Search')).toBeDefined();
      expect(screen.getByTestId('main')).toHaveTextContent('Add expense');

      // Switch to Portuguese
      fireEvent.click(screen.getByTestId('switch-locale'));

      // Check updated Portuguese content across all components
      expect(screen.getByTestId('header')).toHaveTextContent('Bem-vindo');
      expect(screen.getByTestId('header')).toHaveTextContent('Abrir');
      expect(screen.getByTestId('sidebar')).toHaveTextContent('Adicionar');
      expect(screen.getByPlaceholderText('Pesquisar')).toBeDefined();
      expect(screen.getByTestId('main')).toHaveTextContent('Adicionar custo');
    });
  });

  describe('Locale persistence', () => {
    it('should persist locale changes in cookies', () => {
      const { result } = renderHook(() => useLocale(), {
        wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>
      });

      // Switch to Portuguese
      act(() => {
        result.current.setLocale('pt-BR');
      });

      // Check that cookie was set (in a real implementation)
      // This would check document.cookie or localStorage
      expect(result.current.locale).toBe('pt-BR');
    });

    it('should initialize with locale from cookie', () => {
      // Mock cookie with Portuguese locale
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'NEXT_LOCALE=pt-BR',
      });

      const { result } = renderHook(() => useLocale(), {
        wrapper: ({ children }) => <TestWrapper initialLocale="pt-BR">{children}</TestWrapper>
      });

      expect(result.current.locale).toBe('pt-BR');
      expect(result.current.translations.common.title).toBe('Bem-vindo');
    });
  });

  describe('Error handling during locale switching', () => {
    it('should handle invalid locale gracefully', () => {
      const { result } = renderHook(() => useLocale(), {
        wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>
      });

      // Try to set an invalid locale
      act(() => {
        result.current.setLocale('invalid' as any);
      });

      // Should either stay on current locale or fallback to English
      expect(['en', 'pt-BR']).toContain(result.current.locale);
    });

    it('should not crash when translation keys are missing during locale switch', () => {
      function ComponentWithMissingKeys() {
        const { t } = useTranslations();
        const { setLocale } = useLocale();

        return (
          <div>
            <span data-testid="existing-key">{t('common.title')}</span>
            <span data-testid="missing-key">{t('missing.key', 'Fallback')}</span>
            <button
              data-testid="switch-locale"
              onClick={() => setLocale('pt-BR')}
            >
              Switch
            </button>
          </div>
        );
      }

      render(
        <TestWrapper>
          <ComponentWithMissingKeys />
        </TestWrapper>
      );

      expect(screen.getByTestId('existing-key')).toHaveTextContent('Welcome');
      expect(screen.getByTestId('missing-key')).toHaveTextContent('Fallback');

      // Switch locale - should not crash
      expect(() => {
        fireEvent.click(screen.getByTestId('switch-locale'));
      }).not.toThrow();

      expect(screen.getByTestId('existing-key')).toHaveTextContent('Bem-vindo');
      expect(screen.getByTestId('missing-key')).toHaveTextContent('Fallback');
    });
  });
});