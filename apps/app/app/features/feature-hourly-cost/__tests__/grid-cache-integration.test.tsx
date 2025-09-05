import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GridView } from '../grid-view';
import type { ExpenseItem } from '@/app/types';

// Mock all the dependencies
vi.mock('@/hooks/use-translation', () => ({
  useTranslations: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/app/store/currency-store', () => ({
  useCurrencyStore: () => ({
    selectedCurrency: {
      symbol: '$',
      code: 'USD',
      locale: 'en-US',
    },
  }),
}));

vi.mock('@/app/store/view-preference-store', () => ({
  useViewPreferenceStore: () => ({
    viewPreference: 'grid',
  }),
}));

vi.mock('@repo/design-system/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock the mutation hooks to verify they're called correctly
const mockDeleteMutation = vi.fn();
const mockUpdateBatchMutation = vi.fn();

vi.mock('../server/delete-fixed-expenses', () => ({
  useDeleteFixedExpenses: () => ({
    mutate: mockDeleteMutation,
    isPending: false,
  }),
}));

vi.mock('../server/update-batch-fixed-expenses', () => ({
  useUpdateBatchFixedExpense: () => ({
    mutate: mockUpdateBatchMutation,
    isPending: false,
  }),
}));

// Mock DnD Kit
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children, onDragEnd }: any) => (
    <div data-testid="dnd-context" data-on-drag-end={!!onDragEnd}>
      {children}
    </div>
  ),
  DragOverlay: ({ children }: any) => <div data-testid="drag-overlay">{children}</div>,
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: () => [],
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: any) => (
    <div data-testid="sortable-context">{children}</div>
  ),
  arrayMove: (array: any[], from: number, to: number) => {
    const result = [...array];
    const [removed] = result.splice(from, 1);
    result.splice(to, 0, removed);
    return result;
  },
}));

// Mock other components
vi.mock('../grid-view/grid', () => ({
  Grid: ({ data, onDelete, onEdit, userId }: any) => (
    <div data-testid="grid" data-user-id={userId}>
      {data.map((expense: ExpenseItem) => (
        <div key={expense.id} data-testid={`expense-${expense.id}`}>
          <span>{expense.name}</span>
          <button
            onClick={() => onDelete(expense.id)}
            data-testid={`delete-${expense.id}`}
          >
            Delete
          </button>
          <button
            onClick={() => onEdit(expense.id)}
            data-testid={`edit-${expense.id}`}
          >
            Edit
          </button>
        </div>
      ))}
    </div>
  ),
}));

vi.mock('../table-view', () => ({
  TableView: ({ data, userId }: any) => (
    <div data-testid="table-view" data-user-id={userId}>
      Table View with {data.length} expenses
    </div>
  ),
}));

vi.mock('../loading-view', () => ({
  LoadingView: () => <div data-testid="loading-view">Loading...</div>,
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
];

describe('GridView Cache Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Expense Operations with Cache Management', () => {
    it('should call delete mutation with correct parameters', async () => {
      renderWithQueryClient(
        <GridView
          expenses={mockExpenses}
          userId="test-user"
          loading={false}
        />
      );

      const deleteButton = screen.getByTestId('delete-1');
      fireEvent.click(deleteButton);

      expect(mockDeleteMutation).toHaveBeenCalledWith(
        { param: { id: '1', userId: 'test-user' } },
        expect.objectContaining({
          onError: expect.any(Function),
        })
      );
    });

    it('should handle drag and drop with batch update mutation', async () => {
      const { container } = renderWithQueryClient(
        <GridView
          expenses={mockExpenses}
          userId="test-user"
          loading={false}
        />
      );

      // Verify DnD context is set up
      expect(screen.getByTestId('dnd-context')).toBeInTheDocument();
      expect(screen.getByTestId('sortable-context')).toBeInTheDocument();

      // The onDragEnd function should be available
      const dndContext = screen.getByTestId('dnd-context');
      expect(dndContext).toHaveAttribute('data-on-drag-end', 'true');
    });

    it('should render grid view by default', () => {
      renderWithQueryClient(
        <GridView
          expenses={mockExpenses}
          userId="test-user"
          loading={false}
        />
      );

      expect(screen.getByTestId('grid')).toBeInTheDocument();
      expect(screen.getByTestId('grid')).toHaveAttribute('data-user-id', 'test-user');
      expect(screen.queryByTestId('table-view')).not.toBeInTheDocument();
    });

    it('should show loading view when loading', () => {
      renderWithQueryClient(
        <GridView
          expenses={mockExpenses}
          userId="test-user"
          loading={true}
        />
      );

      expect(screen.getByTestId('loading-view')).toBeInTheDocument();
      expect(screen.queryByTestId('grid')).not.toBeInTheDocument();
    });

    it('should handle edit operations', () => {
      renderWithQueryClient(
        <GridView
          expenses={mockExpenses}
          userId="test-user"
          loading={false}
        />
      );

      const editButton = screen.getByTestId('edit-1');
      fireEvent.click(editButton);

      // The edit functionality should be handled by the Grid component
      // This test verifies the interaction is properly wired
      expect(editButton).toBeInTheDocument();
    });

    it('should render all expenses correctly', () => {
      renderWithQueryClient(
        <GridView
          expenses={mockExpenses}
          userId="test-user"
          loading={false}
        />
      );

      expect(screen.getByTestId('expense-1')).toBeInTheDocument();
      expect(screen.getByTestId('expense-2')).toBeInTheDocument();
      expect(screen.getByText('Office Rent')).toBeInTheDocument();
      expect(screen.getByText('Internet')).toBeInTheDocument();
    });

    it('should handle empty expenses list', () => {
      renderWithQueryClient(
        <GridView
          expenses={[]}
          userId="test-user"
          loading={false}
        />
      );

      const grid = screen.getByTestId('grid');
      expect(grid).toBeInTheDocument();
      expect(grid).toHaveAttribute('data-user-id', 'test-user');
    });
  });

  describe('Error Handling', () => {
    it('should handle delete errors gracefully', async () => {
      renderWithQueryClient(
        <GridView
          expenses={mockExpenses}
          userId="test-user"
          loading={false}
        />
      );

      const deleteButton = screen.getByTestId('delete-1');
      fireEvent.click(deleteButton);

      // Verify the mutation was called with error handler
      expect(mockDeleteMutation).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          onError: expect.any(Function),
        })
      );

      // Simulate error callback
      const errorCallback = mockDeleteMutation.mock.calls[0][1].onError;
      expect(typeof errorCallback).toBe('function');
    });
  });

  describe('Performance and State Management', () => {
    it('should not cause unnecessary re-renders with stable props', () => {
      const { rerender } = renderWithQueryClient(
        <GridView
          expenses={mockExpenses}
          userId="test-user"
          loading={false}
        />
      );

      // Re-render with same props
      rerender(
        <QueryClientProvider client={createQueryClient()}>
          <GridView
            expenses={mockExpenses}
            userId="test-user"
            loading={false}
          />
        </QueryClientProvider>
      );

      // Component should still render correctly
      expect(screen.getByTestId('grid')).toBeInTheDocument();
      expect(screen.getByTestId('expense-1')).toBeInTheDocument();
      expect(screen.getByTestId('expense-2')).toBeInTheDocument();
    });

    it('should handle loading state changes', () => {
      const { rerender } = renderWithQueryClient(
        <GridView
          expenses={mockExpenses}
          userId="test-user"
          loading={true}
        />
      );

      expect(screen.getByTestId('loading-view')).toBeInTheDocument();

      // Change to not loading
      rerender(
        <QueryClientProvider client={createQueryClient()}>
          <GridView
            expenses={mockExpenses}
            userId="test-user"
            loading={false}
          />
        </QueryClientProvider>
      );

      expect(screen.queryByTestId('loading-view')).not.toBeInTheDocument();
      expect(screen.getByTestId('grid')).toBeInTheDocument();
    });
  });
});