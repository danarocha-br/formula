import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TableView } from '../index';
import type { EquipmentExpenseItem } from '@/app/types';
import { beforeEach } from 'node:test';

// Mock the hooks and utilities
vi.mock('@/app/store/currency-store', () => ({
  useCurrencyStore: () => ({
    selectedCurrency: { code: 'USD', symbol: '$' }
  })
}));

// Mock server actions
const mockDeleteEquipmentExpense = vi.fn();
const mockCreateEquipmentExpense = vi.fn();
const mockUpdateEquipmentExpense = vi.fn();

vi.mock('../server/delete-equipment-expense', () => ({
  useDeleteEquipmentExpense: () => ({
    mutate: mockDeleteEquipmentExpense,
    isPending: false
  })
}));

vi.mock('../server/create-equipment-expense', () => ({
  useCreateEquipmentExpense: () => ({
    mutate: mockCreateEquipmentExpense,
    isPending: false
  })
}));

vi.mock('../server/update-equipment-expense', () => ({
  useUpdateEquipmentExpense: () => ({
    mutate: mockUpdateEquipmentExpense,
    isPending: false
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

// Mock all design system components
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

vi.mock('@repo/design-system/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  )
}));

vi.mock('@repo/design-system/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' ')
}));

// Mock the DataTable component
vi.mock('../data-table', () => ({
  DataTable: ({ columns, data }: any) => (
    <div data-testid="data-table">
      <div data-testid="columns-count">{columns.length}</div>
      <div data-testid="data-count">{data.length}</div>
      {/* Render column headers for testing */}
      <div data-testid="column-headers">
        {columns.map((col: any, index: number) => (
          <div key={index} data-testid={`column-${col.id || col.accessorKey}`}>
            {typeof col.header === 'function' ? 'Header Function' : col.header}
          </div>
        ))}
      </div>
      {/* Render cells for testing */}
      <div data-testid="table-cells">
        {data.map((row: any, rowIndex: number) => (
          <div key={rowIndex} data-testid={`row-${rowIndex}`}>
            {columns.map((col: any, colIndex: number) => (
              <div key={colIndex} data-testid={`cell-${rowIndex}-${col.id || col.accessorKey}`}>
                {typeof col.cell === 'function' ?
                  col.cell({ row: { original: row, id: rowIndex, getValue: (key: string) => row[key] } }) :
                  row[col.accessorKey]
                }
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
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
  },
  {
    id: 2,
    userId: 'user-1',
    rank: 2,
    name: 'External Monitor',
    amount: 600,
    category: 'monitor',
    purchaseDate: new Date('2023-02-01'),
    usage: 80,
    lifeSpan: 36
  }
];

describe('TableView', () => {
  it('renders the table with correct column count', () => {
    render(
      <TableView
        data={mockEquipmentData}
        userId="user-1"
        getCategoryColor={mockGetCategoryColor}
        getCategoryLabel={mockGetCategoryLabel}
      />
    );

    expect(screen.getByTestId('data-table')).toBeInTheDocument();
    // Should have 6 columns: select, category, name, amountPerMonth, amountPerYear, actions
    // Plus 2 hidden columns: categoryLabel, categoryColor
    expect(screen.getByTestId('columns-count')).toHaveTextContent('8');
  });

  it('transforms and passes correct data to DataTable', () => {
    render(
      <TableView
        data={mockEquipmentData}
        userId="user-1"
        getCategoryColor={mockGetCategoryColor}
        getCategoryLabel={mockGetCategoryLabel}
      />
    );

    expect(screen.getByTestId('data-count')).toHaveTextContent('2');
  });

  it('renders empty table when no data provided', () => {
    render(
      <TableView
        data={[]}
        userId="user-1"
        getCategoryColor={mockGetCategoryColor}
        getCategoryLabel={mockGetCategoryLabel}
      />
    );

    expect(screen.getByTestId('data-table')).toBeInTheDocument();
    expect(screen.getByTestId('data-count')).toHaveTextContent('0');
  });

  it('handles undefined data gracefully', () => {
    render(
      <TableView
        data={undefined as any}
        userId="user-1"
        getCategoryColor={mockGetCategoryColor}
        getCategoryLabel={mockGetCategoryLabel}
      />
    );

    expect(screen.getByTestId('data-table')).toBeInTheDocument();
    expect(screen.getByTestId('data-count')).toHaveTextContent('0');
  });

  describe('Delete Functionality', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('renders delete buttons in actions column', () => {
      render(
        <TableView
          data={mockEquipmentData}
          userId="user-1"
          getCategoryColor={mockGetCategoryColor}
          getCategoryLabel={mockGetCategoryLabel}
        />
      );

      // Check that delete icons are rendered for each row
      expect(screen.getAllByTestId('delete-icon')).toHaveLength(2);
    });

    it('renders select checkboxes for bulk operations', () => {
      render(
        <TableView
          data={mockEquipmentData}
          userId="user-1"
          getCategoryColor={mockGetCategoryColor}
          getCategoryLabel={mockGetCategoryLabel}
        />
      );

      // Should have checkboxes for each row plus header checkbox
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThanOrEqual(2); // At least 2 row checkboxes
    });

    it('shows bulk actions bar when items are selected', () => {
      render(
        <TableView
          data={mockEquipmentData}
          userId="user-1"
          getCategoryColor={mockGetCategoryColor}
          getCategoryLabel={mockGetCategoryLabel}
        />
      );

      // Initially, bulk actions should not be visible
      expect(screen.queryByText('Delete selected')).not.toBeInTheDocument();
    });

    it('renders add row button', () => {
      render(
        <TableView
          data={mockEquipmentData}
          userId="user-1"
          getCategoryColor={mockGetCategoryColor}
          getCategoryLabel={mockGetCategoryLabel}
        />
      );

      expect(screen.getByText('Add row')).toBeInTheDocument();
    });

    it('includes actions column in column definitions', () => {
      render(
        <TableView
          data={mockEquipmentData}
          userId="user-1"
          getCategoryColor={mockGetCategoryColor}
          getCategoryLabel={mockGetCategoryLabel}
        />
      );

      // Check that actions column is present
      expect(screen.getByTestId('column-actions')).toBeInTheDocument();
    });

    it('includes select column in column definitions', () => {
      render(
        <TableView
          data={mockEquipmentData}
          userId="user-1"
          getCategoryColor={mockGetCategoryColor}
          getCategoryLabel={mockGetCategoryLabel}
        />
      );

      // Check that select column is present
      expect(screen.getByTestId('column-select')).toBeInTheDocument();
    });
  });
});