import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Grid } from '../grid-view/grid';
import { FIXED_COST_CATEGORIES } from '@/app/constants';
import type { ExpenseItem } from '@/app/types';

// Mock the translation hook
vi.mock('@/hooks/use-translation', () => ({
  useTranslations: () => ({
    t: (key: string) => key,
  }),
}));

// Mock the currency store
vi.mock('@/app/store/currency-store', () => ({
  useCurrencyStore: () => ({
    selectedCurrency: {
      symbol: '$',
      code: 'USD',
      locale: 'en-US',
    },
  }),
}));

// Mock the AddCard component
vi.mock('../add-expense-card', () => ({
  AddCard: ({ userId, rankIndex, className }: any) => (
    <div data-testid="add-card" data-user-id={userId} data-rank-index={rankIndex} className={className}>
      Add Card
    </div>
  ),
}));

// Mock the EditExpenseForm component
vi.mock('../edit-expense-form', () => ({
  EditExpenseForm: ({ onClose, userId, expenseId }: any) => (
    <div data-testid="edit-form" data-user-id={userId} data-expense-id={expenseId}>
      <button onClick={onClose} data-testid="close-edit">Close</button>
      Edit Form
    </div>
  ),
}));

// Mock the EmptyView component
vi.mock('../grid-view/empty-view', () => ({
  EmptyView: ({ userId }: any) => (
    <div data-testid="empty-view" data-user-id={userId}>
      Empty View
    </div>
  ),
}));

// Mock the MasonryGrid component
vi.mock('@repo/design-system/components/ui/masonry-grid', () => ({
  MasonryGrid: ({ children }: any) => (
    <div data-testid="masonry-grid">{children}</div>
  ),
}));

// Mock the ItemCard component
vi.mock('@repo/design-system/components/ui/item-card', () => ({
  ItemCard: ({ data, onDelete, onEdit, isEditMode, editModeContent, loading, ...props }: any) => (
    <div data-testid="item-card" data-expense-id={data.id} data-loading={loading} {...props}>
      <div>Name: {data.name}</div>
      <div>Amount: {data.currency}{data.amount}</div>
      <div>Category: {data.categoryLabel}</div>
      <div>Period: {data.period}</div>
      <button onClick={onDelete} data-testid={`delete-${data.id}`}>Delete</button>
      <button onClick={onEdit} data-testid={`edit-${data.id}`}>Edit</button>
      {isEditMode && editModeContent}
    </div>
  ),
}));

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

const mockExpenses: ExpenseItem[] = [
  {
    id: 1,
    name: 'Office Rent',
    amount: 1500,
    category: 'rent',
    period: 'monthly',
    rank: 1,
    userId: 'test-user',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Internet',
    amount: 100,
    category: 'utilities',
    period: 'monthly',
    rank: 2,
    userId: 'test-user',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 3,
    name: 'Software License',
    amount: 1200,
    category: 'software',
    period: 'yearly',
    rank: 3,
    userId: 'test-user',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

const mockProps = {
  data: mockExpenses,
  getCategoryColor: vi.fn((category: string) => {
    const cat = FIXED_COST_CATEGORIES.find(c => c.value === category);
    return cat?.color || 'bg-gray-100';
  }),
  getCategoryLabel: vi.fn((category: string) => {
    const cat = FIXED_COST_CATEGORIES.find(c => c.value === category);
    return cat?.label || category;
  }),
  getCategoryIcon: vi.fn((category: string) => {
    const cat = FIXED_COST_CATEGORIES.find(c => c.value === category);
    return cat?.icon || 'work';
  }),
  onDelete: vi.fn(),
  onEdit: vi.fn(),
  onEditClose: vi.fn(),
  editingId: null,
  userId: 'test-user',
  loading: false,
};

describe('Grid Component Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render all expenses with proper data', () => {
      renderWithQueryClient(<Grid {...mockProps} />);

      // Check that all expenses are rendered
      expect(screen.getByTestId('masonry-grid')).toBeInTheDocument();
      expect(screen.getAllByTestId('item-card')).toHaveLength(3);

      // Check expense details (verify core data is present)
      expect(screen.getByText('Name: Office Rent')).toBeInTheDocument();
      expect(screen.getByText(/1500/)).toBeInTheDocument();
      expect(screen.getByText('Name: Internet')).toBeInTheDocument();
      expect(screen.getByText(/100/)).toBeInTheDocument();
      expect(screen.getByText('Name: Software License')).toBeInTheDocument();
      expect(screen.getByText(/1200/)).toBeInTheDocument();
    });

    it('should render AddCard with correct rank index', () => {
      renderWithQueryClient(<Grid {...mockProps} />);

      const addCard = screen.getByTestId('add-card');
      expect(addCard).toBeInTheDocument();
      expect(addCard).toHaveAttribute('data-rank-index', '4'); // Next rank after 3 expenses
      expect(addCard).toHaveAttribute('data-user-id', 'test-user');
    });

    it('should show empty view when no expenses', () => {
      renderWithQueryClient(<Grid {...mockProps} data={[]} />);

      expect(screen.getByTestId('empty-view')).toBeInTheDocument();
      expect(screen.getByTestId('empty-view')).toHaveAttribute('data-user-id', 'test-user');
      expect(screen.queryByTestId('masonry-grid')).not.toBeInTheDocument();
    });
  });

  describe('Category Mapping', () => {
    it('should correctly map category colors, labels, and icons', () => {
      renderWithQueryClient(<Grid {...mockProps} />);

      // The category mapping functions should be called for each expense
      expect(mockProps.getCategoryColor).toHaveBeenCalledWith('rent');
      expect(mockProps.getCategoryColor).toHaveBeenCalledWith('utilities');
      expect(mockProps.getCategoryColor).toHaveBeenCalledWith('software');

      expect(mockProps.getCategoryLabel).toHaveBeenCalledWith('rent');
      expect(mockProps.getCategoryLabel).toHaveBeenCalledWith('utilities');
      expect(mockProps.getCategoryLabel).toHaveBeenCalledWith('software');

      expect(mockProps.getCategoryIcon).toHaveBeenCalledWith('rent');
      expect(mockProps.getCategoryIcon).toHaveBeenCalledWith('utilities');
      expect(mockProps.getCategoryIcon).toHaveBeenCalledWith('software');
    });
  });

  describe('User Interactions', () => {
    it('should handle delete button clicks', () => {
      renderWithQueryClient(<Grid {...mockProps} />);

      const deleteButton = screen.getByTestId('delete-1');
      fireEvent.click(deleteButton);

      expect(mockProps.onDelete).toHaveBeenCalledWith(1);
    });

    it('should handle edit button clicks', () => {
      renderWithQueryClient(<Grid {...mockProps} />);

      const editButton = screen.getByTestId('edit-2');
      fireEvent.click(editButton);

      expect(mockProps.onEdit).toHaveBeenCalledWith(2);
    });

    it('should show edit form when expense is being edited', () => {
      renderWithQueryClient(<Grid {...mockProps} editingId={1} />);

      expect(screen.getByTestId('edit-form')).toBeInTheDocument();
      expect(screen.getByTestId('edit-form')).toHaveAttribute('data-expense-id', '1');
      expect(screen.getByTestId('edit-form')).toHaveAttribute('data-user-id', 'test-user');
    });

    it('should handle edit form close', () => {
      renderWithQueryClient(<Grid {...mockProps} editingId={1} />);

      const closeButton = screen.getByTestId('close-edit');
      fireEvent.click(closeButton);

      expect(mockProps.onEditClose).toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should pass loading state to ItemCard components', () => {
      renderWithQueryClient(<Grid {...mockProps} loading={true} />);

      const itemCards = screen.getAllByTestId('item-card');
      itemCards.forEach(card => {
        expect(card).toHaveAttribute('data-loading', 'true');
      });
    });
  });

  describe('Rank Index Calculation', () => {
    it('should calculate correct next rank index for AddCard', () => {
      const expensesWithGaps = [
        { ...mockExpenses[0], rank: 1 },
        { ...mockExpenses[1], rank: 5 },
        { ...mockExpenses[2], rank: 10 },
      ];

      renderWithQueryClient(<Grid {...mockProps} data={expensesWithGaps} />);

      const addCard = screen.getByTestId('add-card');
      expect(addCard).toHaveAttribute('data-rank-index', '11'); // Max rank (10) + 1
    });

    it('should handle expenses with undefined ranks', () => {
      const expensesWithUndefinedRanks = [
        { ...mockExpenses[0], rank: undefined },
        { ...mockExpenses[1], rank: 2 },
        { ...mockExpenses[2], rank: undefined },
      ];

      renderWithQueryClient(<Grid {...mockProps} data={expensesWithUndefinedRanks} />);

      const addCard = screen.getByTestId('add-card');
      expect(addCard).toHaveAttribute('data-rank-index', '3'); // Max defined rank (2) + 1
    });

    it('should default to rank 1 when all expenses have undefined ranks', () => {
      const expensesWithNoRanks = mockExpenses.map(expense => ({ ...expense, rank: undefined }));

      renderWithQueryClient(<Grid {...mockProps} data={expensesWithNoRanks} />);

      const addCard = screen.getByTestId('add-card');
      expect(addCard).toHaveAttribute('data-rank-index', '1');
    });
  });

  describe('Key Generation', () => {
    it('should generate stable keys for expense items', () => {
      const { rerender } = renderWithQueryClient(<Grid {...mockProps} />);

      const initialCards = screen.getAllByTestId('item-card');
      const initialKeys = initialCards.map(card => card.getAttribute('data-expense-id'));

      // Re-render with same data
      rerender(
        <QueryClientProvider client={createQueryClient()}>
          <Grid {...mockProps} />
        </QueryClientProvider>
      );

      const rerenderedCards = screen.getAllByTestId('item-card');
      const rerenderedKeys = rerenderedCards.map(card => card.getAttribute('data-expense-id'));

      expect(rerenderedKeys).toEqual(initialKeys);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty maxValue calculation gracefully', () => {
      renderWithQueryClient(<Grid {...mockProps} data={[]} />);

      // Should show empty view without errors
      expect(screen.getByTestId('empty-view')).toBeInTheDocument();
    });

    it('should handle expenses with zero amounts', () => {
      const expensesWithZero = [
        { ...mockExpenses[0], amount: 0 },
      ];

      renderWithQueryClient(<Grid {...mockProps} data={expensesWithZero} />);

      expect(screen.getByText(/0/)).toBeInTheDocument();
    });

    it('should handle very large amounts', () => {
      const expensesWithLargeAmount = [
        { ...mockExpenses[0], amount: 999999 },
      ];

      renderWithQueryClient(<Grid {...mockProps} data={expensesWithLargeAmount} />);

      expect(screen.getByText(/999999/)).toBeInTheDocument();
    });
  });
});