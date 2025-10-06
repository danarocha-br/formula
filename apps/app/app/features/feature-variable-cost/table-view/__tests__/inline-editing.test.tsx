import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TableView } from '../index';
import type { EquipmentExpenseItem } from '@/app/types';

// Mock the server action
vi.mock('../server/update-equipment-expense', () => ({
  useUpdateEquipmentExpense: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

// Mock the hooks and utilities
vi.mock('@/hooks/use-translation', () => ({
  useTranslations: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/app/store/currency-store', () => ({
  useCurrencyStore: () => ({
    selectedCurrency: { code: 'USD', symbol: '$' },
  }),
}));

vi.mock('@/utils/format-currency', () => ({
  formatCurrency: (amount: number, options: any) => `${options.currency} ${amount.toFixed(2)}`,
}));

vi.mock('@repo/design-system/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockData: EquipmentExpenseItem[] = [
  {
    id: 1,
    userId: 'user1',
    rank: 1,
    name: 'Test Equipment',
    amount: 1200,
    category: 'computer',
    purchaseDate: new Date('2024-01-01'),
    usage: 80,
    lifeSpan: 24,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
];

const renderTableView = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <TableView
        data={mockData}
        userId="user1"
        getCategoryColor={() => 'bg-blue-500'}
        getCategoryLabel={() => 'Computer'}
      />
    </QueryClientProvider>
  );
};

describe('TableView Inline Editing', () => {
  it('should render table with equipment data', () => {
    renderTableView();

    expect(screen.getByText('Test Equipment')).toBeInTheDocument();
    expect(screen.getByText('Computer')).toBeInTheDocument();
  });

  it('should enable editing on double click for name field', async () => {
    renderTableView();

    const nameCell = screen.getByDisplayValue('Test Equipment');

    // Double click to enable editing
    fireEvent.doubleClick(nameCell.parentElement!);

    // The input should be editable (not readonly)
    await waitFor(() => {
      expect(nameCell).not.toHaveAttribute('readonly');
    });
  });

  it('should enable editing on double click for amount fields', async () => {
    renderTableView();

    // Find amount input fields
    const monthlyAmountInput = screen.getByDisplayValue(/50\.00/); // 1200/24 = 50

    // Double click to enable editing
    fireEvent.doubleClick(monthlyAmountInput.parentElement!);

    // The input should be editable (not readonly)
    await waitFor(() => {
      expect(monthlyAmountInput).not.toHaveAttribute('readonly');
    });
  });

  it('should show category dropdown on double click', async () => {
    renderTableView();

    const categoryCell = screen.getByText('Computer').closest('div');

    // Double click to enable editing
    fireEvent.doubleClick(categoryCell!);

    // Should show combobox for category selection
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });
});