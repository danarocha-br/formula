import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TableView } from '../index';
import type { EquipmentExpenseItem } from '@/app/types';

// Mock all dependencies
vi.mock('@/app/store/currency-store', () => ({
  useCurrencyStore: () => ({
    selectedCurrency: { code: 'USD', symbol: '$' }
  })
}));

vi.mock('@/hooks/use-translation', () => ({
  useTranslations: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'expenses.form.category': 'Category',
        'expenses.form.name': 'Name',
        'expenses.form.value': 'Value',
        'common.period.per-month': 'per month',
        'common.period.per-year': 'per year',
        'forms.accessibility.selectAll': 'Select all',
        'forms.accessibility.selectRow': 'Select row',
        'expenses.actions.delete': 'Delete'
      };
      return translations[key] || key;
    }
  })
}));

vi.mock('@repo/design-system/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

vi.mock('@repo/design-system/components/ui/animated-icon/delete', () => ({
  DeleteIcon: ({ isAnimated }: any) => <div data-testid="delete-icon" data-animated={isAnimated} />
}));

vi.mock('@repo/design-system/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, ...props }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      {...props}
    />
  )
}));

vi.mock('@repo/design-system/components/ui/icon', () => ({
  Icon: ({ name, label }: any) => <div data-testid="icon" data-name={name} aria-label={label} />
}));

vi.mock('@repo/design-system/components/ui/icon-button', () => ({
  iconbutton: () => 'icon-button-class'
}));

vi.mock('@repo/design-system/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' ')
}));

// Mock the DataTable component to capture column definitions
let capturedColumns: any[] = [];
vi.mock('../data-table', () => ({
  DataTable: ({ columns, data }: any) => {
    capturedColumns = columns;
    return (
      <div data-testid="data-table">
        <div data-testid="columns-count">{columns.length}</div>
        <div data-testid="data-count">{data.length}</div>
      </div>
    );
  }
}));

const mockGetCategoryColor = (category: string) => 'bg-blue-300';
const mockGetCategoryLabel = (category: string) => category.charAt(0).toUpperCase() + category.slice(1);

const mockEquipmentData: EquipmentExpenseItem[] = [
  {
    id: 1,
    userId: 'user-1',
    rank: 1,
    name: 'MacBook Pro',
    amount: 2400,
    category: 'computer',
    purchaseDate: new Date('2023-01-01'),
    usage: 100,
    lifeSpan: 24
  }
];

describe('TableView Column Definitions', () => {
  beforeEach(() => {
    capturedColumns = [];
  });

  it('creates correct column structure', () => {
    render(
      <TableView
        data={mockEquipmentData}
        userId="user-1"
        getCategoryColor={mockGetCategoryColor}
        getCategoryLabel={mockGetCategoryLabel}
      />
    );

    expect(capturedColumns).toHaveLength(8);

    // Check column IDs and accessorKeys
    const columnIds = capturedColumns.map(col => col.id || col.accessorKey);
    expect(columnIds).toEqual([
      'select',
      'category',
      'name',
      'amountPerMonth',
      'amountPerYear',
      'categoryLabel',
      'categoryColor',
      'actions'
    ]);
  });

  it('configures select column correctly', () => {
    render(
      <TableView
        data={mockEquipmentData}
        userId="user-1"
        getCategoryColor={mockGetCategoryColor}
        getCategoryLabel={mockGetCategoryLabel}
      />
    );

    const selectColumn = capturedColumns.find(col => col.id === 'select');
    expect(selectColumn).toBeDefined();
    expect(selectColumn.enableSorting).toBe(false);
    expect(selectColumn.enableHiding).toBe(false);
    expect(selectColumn.enableResizing).toBe(false);
    expect(selectColumn.minSize).toBe(30);
    expect(selectColumn.size).toBe(30);
  });

  it('configures category column with proper sizing', () => {
    render(
      <TableView
        data={mockEquipmentData}
        userId="user-1"
        getCategoryColor={mockGetCategoryColor}
        getCategoryLabel={mockGetCategoryLabel}
      />
    );

    const categoryColumn = capturedColumns.find(col => col.accessorKey === 'category');
    expect(categoryColumn).toBeDefined();
    expect(categoryColumn.size).toBe(200);
    expect(categoryColumn.minSize).toBe(150);
  });

  it('configures name column with proper sizing', () => {
    render(
      <TableView
        data={mockEquipmentData}
        userId="user-1"
        getCategoryColor={mockGetCategoryColor}
        getCategoryLabel={mockGetCategoryLabel}
      />
    );

    const nameColumn = capturedColumns.find(col => col.accessorKey === 'name');
    expect(nameColumn).toBeDefined();
    expect(nameColumn.size).toBe(250);
    expect(nameColumn.minSize).toBe(150);
  });

  it('configures amount columns with proper sizing', () => {
    render(
      <TableView
        data={mockEquipmentData}
        userId="user-1"
        getCategoryColor={mockGetCategoryColor}
        getCategoryLabel={mockGetCategoryLabel}
      />
    );

    const monthlyColumn = capturedColumns.find(col => col.accessorKey === 'amountPerMonth');
    const yearlyColumn = capturedColumns.find(col => col.accessorKey === 'amountPerYear');

    expect(monthlyColumn).toBeDefined();
    expect(monthlyColumn.size).toBe(150);
    expect(monthlyColumn.minSize).toBe(120);

    expect(yearlyColumn).toBeDefined();
    expect(yearlyColumn.size).toBe(150);
    expect(yearlyColumn.minSize).toBe(120);
  });

  it('configures actions column correctly', () => {
    render(
      <TableView
        data={mockEquipmentData}
        userId="user-1"
        getCategoryColor={mockGetCategoryColor}
        getCategoryLabel={mockGetCategoryLabel}
      />
    );

    const actionsColumn = capturedColumns.find(col => col.id === 'actions');
    expect(actionsColumn).toBeDefined();
    expect(actionsColumn.enableHiding).toBe(false);
    expect(actionsColumn.enableSorting).toBe(false);
    expect(actionsColumn.size).toBe(60);
    expect(actionsColumn.minSize).toBe(50);
    expect(actionsColumn.maxSize).toBe(80);
  });

  it('hides helper columns', () => {
    render(
      <TableView
        data={mockEquipmentData}
        userId="user-1"
        getCategoryColor={mockGetCategoryColor}
        getCategoryLabel={mockGetCategoryLabel}
      />
    );

    const categoryLabelColumn = capturedColumns.find(col => col.accessorKey === 'categoryLabel');
    const categoryColorColumn = capturedColumns.find(col => col.accessorKey === 'categoryColor');

    expect(categoryLabelColumn).toBeDefined();
    expect(categoryLabelColumn.enableHiding).toBe(true);

    expect(categoryColorColumn).toBeDefined();
    expect(categoryColorColumn.enableHiding).toBe(true);
  });
});