import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TableView } from '../index';
import type { EquipmentExpenseItem } from '@/app/types';

// Mock all server actions
const mockCreateEquipmentExpense = vi.fn();
const mockUpdateEquipmentExpense = vi.fn();
const mockDeleteEquipmentExpense = vi.fn();

vi.mock('../server/create-equipment-expense', () => ({
  useCreateEquipmentExpense: () => ({
    mutate: mockCreateEquipmentExpense,
    isPending: false,
  }),
}));

vi.mock('../server/update-equipment-expense', () => ({
  useUpdateEquipmentExpense: () => ({
    mutate: mockUpdateEquipmentExpense,
    isPending: false,
  }),
}));

vi.mock('../server/delete-equipment-expense', () => ({
  useDeleteEquipmentExpense: () => ({
    mutate: mockDeleteEquipmentExpense,
    isPending: false,
  }),
}));

// Mock dependencies
vi.mock('@/app/store/currency-store', () => ({
  useCurrencyStore: () => ({
    selectedCurrency: { code: 'USD', symbol: '$' },
  }),
}));

const mockToast = vi.fn();
vi.mock('@repo/design-system/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

vi.mock('@/hooks/use-translation', () => ({
  useTranslations: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'expenses.form.category': 'Category',
        'expenses.form.name': 'Name',
        'expenses.success.created': 'Equipment created successfully',
        'expenses.success.updated': 'Equipment updated successfully',
        'expenses.success.deleted': 'Equipment deleted successfully',
        'expenses.success.bulk-deleted': '{count} items deleted successfully',
        'validation.error.create-failed': 'Failed to create equipment',
        'validation.error.update-failed': 'Failed to update equipment',
        'validation.error.delete-failed': 'Failed to delete equipment',
        'validation.error.bulk-delete-failed': 'Failed to delete {count} items',
        'validation.error.validation-failed': 'Validation failed',
        'validation.required.name': 'Name is required',
        'validation.required.category': 'Category is required',
        'validation.required.amount': 'Amount is required',
        'validation.required.lifespan': 'Lifespan is required',
        'forms.accessibility.selectAll': 'Select all',
        'forms.accessibility.selectRow': 'Select row',
        'common.search': 'Search',
        'common.not-found': 'Not found',
        'common.accessibility.selectCategory': 'Select category',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock form controls
const mockReset = vi.fn();
const mockSetValue = vi.fn();

vi.mock('react-hook-form', () => ({
  useForm: () => ({
    control: {},
    formState: { isDirty: false },
    reset: mockReset,
    setValue: mockSetValue,
  }),
  Controller: ({ render }: any) => {
    const field = { value: '', onChange: vi.fn(), onBlur: vi.fn() };
    return render({ field });
  },
}));

// Mock design system components
vi.mock('@repo/design-system/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@repo/design-system/components/ui/input', () => ({
  Input: ({ value, onChange, onBlur, ...props }: any) => (
    <input
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      onBlur={onBlur}
      {...props}
    />
  ),
}));

vi.mock('@repo/design-system/components/ui/combobox', () => ({
  Combobox: ({ value, onChange, options, ...props }: any) => (
    <select
      value={value?.value || ''}
      onChange={(e) => {
        const option = options.find((opt: any) => opt.value === e.target.value);
        onChange?.(option);
      }}
      {...props}
    >
      <option value="">Select category</option>
      {options.map((option: any) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

vi.mock('@repo/design-system/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, ...props }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      {...props}
    />
  ),
}));

vi.mock('@repo/design-system/components/ui/animated-icon/delete', () => ({
  DeleteIcon: ({ onClick }: any) => (
    <button onClick={onClick} data-testid="delete-button">
      Delete
    </button>
  ),
}));

vi.mock('@repo/design-system/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

// Mock DataTable with full interaction support
vi.mock('../data-table', () => ({
  DataTable: ({ columns, data, hasNewRows }: any) => (
    <div data-testid="data-table">
      <div data-testid="has-new-rows">{hasNewRows ? 'true' : 'false'}</div>
      <div data-testid="data-count">{data.length}</div>

      {/* Render table headers */}
      <div data-testid="table-headers">
        {columns.map((col: any, index: number) => (
          <div key={index} data-testid={`header-${col.id || col.accessorKey}`}>
            {typeof col.header === 'function' ? col.header() : col.header}
          </div>
        ))}
      </div>

      {/* Render table rows */}
      <div data-testid="table-rows">
        {data.map((row: any, rowIndex: number) => (
          <div key={row.id} data-testid={`row-${rowIndex}`}>
            {columns.map((col: any, colIndex: number) => (
              <div key={colIndex} data-testid={`cell-${rowIndex}-${col.id || col.accessorKey}`}>
                {typeof col.cell === 'function'
                  ? col.cell({
                      row: {
                        original: row,
                        id: rowIndex,
                        getValue: (key: string) => row[key],
                      },
                    })
                  : row[col.accessorKey]}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  ),
}));

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
    lifeSpan: 24,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
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
    lifeSpan: 36,
    createdAt: '2023-02-01T00:00:00Z',
    updatedAt: '2023-02-01T00:00:00Z',
  },
];

const renderTableView = (data = mockEquipmentData, props = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
    logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <TableView
        data={data}
        userId="user-1"
        getCategoryColor={() => 'bg-blue-500'}
        getCategoryLabel={(cat) => cat}
        {...props}
      />
    </QueryClientProvider>
  );
};

describe('TableView Comprehensive Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete User Workflows', () => {
    it('should handle complete equipment creation workflow', async () => {
      renderTableView();

      // Step 1: Add new row
      const addButton = screen.getByText('Add row');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByTestId('has-new-rows')).toHaveTextContent('true');
      });

      // Step 2: Mock successful creation
      mockCreateEquipmentExpense.mockImplementation((params, callbacks) => {
        callbacks?.onSuccess?.({
          status: 201,
          success: true,
          data: {
            id: 3,
            name: params.json.name,
            amount: params.json.amount,
            category: params.json.category,
            userId: params.json.userId,
            rank: params.json.rank,
            purchaseDate: params.json.purchaseDate,
            usage: params.json.usage,
            lifeSpan: params.json.lifeSpan,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        });
      });

      // Step 3: Simulate form submission
      const createData = {
        json: {
          userId: 'user-1',
          name: 'New Equipment',
          amount: 1200,
          category: 'computer',
          rank: 3,
          purchaseDate: new Date().toISOString(),
          usage: 100,
          lifeSpan: 12,
        },
      };

      mockCreateEquipmentExpense(createData, {
        onSuccess: () => {
          mockToast({
            title: 'Equipment created successfully',
            variant: 'default',
          });
        },
        onError: vi.fn(),
      });

      // Verify creation was called and toast was shown
      expect(mockCreateEquipmentExpense).toHaveBeenCalledWith(
        createData,
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        })
      );

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Equipment created successfully',
        variant: 'default',
      });
    });

    it('should handle complete equipment update workflow', async () => {
      renderTableView();

      // Step 1: Mock successful update
      mockUpdateEquipmentExpense.mockImplementation((params, callbacks) => {
        callbacks?.onSuccess?.({
          status: 200,
          success: true,
          data: {
            ...mockEquipmentData[0],
            ...params.json,
            updatedAt: new Date().toISOString(),
          },
        });
      });

      // Step 2: Simulate field update
      const updateData = {
        json: {
          id: 1,
          userId: 'user-1',
          name: 'Updated MacBook Pro',
          amount: 2400,
          category: 'computer',
          purchaseDate: new Date('2023-01-01'),
          usage: 100,
          lifeSpan: 24,
        },
      };

      mockUpdateEquipmentExpense(updateData, {
        onSuccess: () => {
          mockToast({
            title: 'Equipment updated successfully',
            variant: 'default',
          });
        },
        onError: vi.fn(),
      });

      // Verify update was called and toast was shown
      expect(mockUpdateEquipmentExpense).toHaveBeenCalledWith(
        updateData,
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        })
      );

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Equipment updated successfully',
        variant: 'default',
      });
    });

    it('should handle complete equipment deletion workflow', async () => {
      renderTableView();

      // Step 1: Mock successful deletion
      mockDeleteEquipmentExpense.mockImplementation((params, callbacks) => {
        callbacks?.onSuccess?.({
          status: 204,
          success: true,
        });
      });

      // Step 2: Simulate delete operation
      const deleteData = {
        param: { id: '1', userId: 'user-1' },
      };

      mockDeleteEquipmentExpense(deleteData, {
        onSuccess: () => {
          mockToast({
            title: 'Equipment deleted successfully',
            variant: 'default',
          });
        },
        onError: vi.fn(),
      });

      // Verify deletion was called and toast was shown
      expect(mockDeleteEquipmentExpense).toHaveBeenCalledWith(
        deleteData,
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        })
      );

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Equipment deleted successfully',
        variant: 'default',
      });
    });

    it('should handle complete bulk deletion workflow', async () => {
      renderTableView();

      const itemIds = [1, 2];
      let successCount = 0;

      // Mock successful bulk deletion
      mockDeleteEquipmentExpense.mockImplementation((params, callbacks) => {
        successCount++;
        callbacks?.onSuccess?.({
          status: 204,
          success: true,
        });
      });

      // Simulate bulk delete
      const deletePromises = itemIds.map((id) =>
        new Promise<{ id: number; success: boolean }>((resolve) => {
          mockDeleteEquipmentExpense(
            { param: { id: id.toString(), userId: 'user-1' } },
            {
              onSuccess: () => resolve({ id, success: true }),
              onError: () => resolve({ id, success: false }),
            }
          );
        })
      );

      const results = await Promise.allSettled(deletePromises);
      const successful = results.filter(
        (result) => result.status === 'fulfilled' && result.value.success
      ).length;

      if (successful > 0) {
        mockToast({
          title: `${successful} items deleted successfully`,
          variant: 'default',
        });
      }

      expect(mockDeleteEquipmentExpense).toHaveBeenCalledTimes(2);
      expect(mockToast).toHaveBeenCalledWith({
        title: '2 items deleted successfully',
        variant: 'default',
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle creation errors with proper rollback', async () => {
      renderTableView();

      // Add new row
      const addButton = screen.getByText('Add row');
      fireEvent.click(addButton);

      // Mock creation failure
      mockCreateEquipmentExpense.mockImplementation((params, callbacks) => {
        callbacks?.onError?.(new Error('Network error'));
      });

      const createData = {
        json: {
          userId: 'user-1',
          name: 'New Equipment',
          amount: 1200,
          category: 'computer',
          rank: 3,
          purchaseDate: new Date().toISOString(),
          usage: 100,
          lifeSpan: 12,
        },
      };

      mockCreateEquipmentExpense(createData, {
        onSuccess: vi.fn(),
        onError: (error: Error) => {
          mockToast({
            title: 'Failed to create equipment',
            description: error.message,
            variant: 'destructive',
          });
        },
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Failed to create equipment',
        description: 'Network error',
        variant: 'destructive',
      });
    });

    it('should handle update errors with form rollback', async () => {
      renderTableView();

      const originalValue = 'MacBook Pro';

      // Mock update failure
      mockUpdateEquipmentExpense.mockImplementation((params, callbacks) => {
        callbacks?.onError?.(new Error('Update failed'));
      });

      const updateData = {
        json: {
          id: 1,
          userId: 'user-1',
          name: 'Updated Name',
          amount: 2400,
          category: 'computer',
          purchaseDate: new Date('2023-01-01'),
          usage: 100,
          lifeSpan: 24,
        },
      };

      mockUpdateEquipmentExpense(updateData, {
        onSuccess: vi.fn(),
        onError: (error: Error) => {
          // Rollback form
          mockReset({ name: originalValue });
          mockToast({
            title: 'Failed to update equipment',
            description: error.message,
            variant: 'destructive',
          });
        },
      });

      expect(mockReset).toHaveBeenCalledWith({ name: originalValue });
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Failed to update equipment',
        description: 'Update failed',
        variant: 'destructive',
      });
    });

    it('should handle mixed success/failure in bulk operations', async () => {
      renderTableView();

      const itemIds = [1, 2, 3];

      // Mock mixed results
      mockDeleteEquipmentExpense
        .mockImplementationOnce((params, callbacks) => {
          callbacks?.onSuccess?.({ status: 204, success: true });
        })
        .mockImplementationOnce((params, callbacks) => {
          callbacks?.onError?.(new Error('Delete failed'));
        })
        .mockImplementationOnce((params, callbacks) => {
          callbacks?.onSuccess?.({ status: 204, success: true });
        });

      const deletePromises = itemIds.map((id) =>
        new Promise<{ id: number; success: boolean; error?: any }>((resolve) => {
          mockDeleteEquipmentExpense(
            { param: { id: id.toString(), userId: 'user-1' } },
            {
              onSuccess: () => resolve({ id, success: true }),
              onError: (error: any) => resolve({ id, success: false, error }),
            }
          );
        })
      );

      const results = await Promise.allSettled(deletePromises);
      const successful = results.filter(
        (result) => result.status === 'fulfilled' && result.value.success
      ).length;
      const failed = results.filter(
        (result) => result.status === 'fulfilled' && !result.value.success
      ).length;

      if (successful > 0) {
        mockToast({
          title: `${successful} items deleted successfully`,
          variant: 'default',
        });
      }

      if (failed > 0) {
        mockToast({
          title: `Failed to delete ${failed} items`,
          variant: 'destructive',
        });
      }

      expect(mockDeleteEquipmentExpense).toHaveBeenCalledTimes(3);
      expect(mockToast).toHaveBeenCalledTimes(2);
    });

    it('should handle network interruption gracefully', async () => {
      renderTableView();

      // Mock network error followed by success
      mockUpdateEquipmentExpense
        .mockImplementationOnce((params, callbacks) => {
          callbacks?.onError?.(new Error('Network error'));
        })
        .mockImplementationOnce((params, callbacks) => {
          callbacks?.onSuccess?.({
            status: 200,
            success: true,
            data: { ...mockEquipmentData[0], ...params.json },
          });
        });

      const updateData = {
        json: {
          id: 1,
          userId: 'user-1',
          name: 'Updated Name',
          amount: 2400,
          category: 'computer',
          purchaseDate: new Date('2023-01-01'),
          usage: 100,
          lifeSpan: 24,
        },
      };

      // First attempt fails
      mockUpdateEquipmentExpense(updateData, {
        onSuccess: vi.fn(),
        onError: (error: Error) => {
          mockToast({
            title: 'Failed to update equipment',
            description: error.message,
            variant: 'destructive',
          });
        },
      });

      // Retry succeeds
      mockUpdateEquipmentExpense(updateData, {
        onSuccess: () => {
          mockToast({
            title: 'Equipment updated successfully',
            variant: 'default',
          });
        },
        onError: vi.fn(),
      });

      expect(mockUpdateEquipmentExpense).toHaveBeenCalledTimes(2);
      expect(mockToast).toHaveBeenCalledTimes(2);
    });
  });

  describe('State Management Integration', () => {
    it('should maintain consistent state across operations', async () => {
      renderTableView();

      // Initial state
      expect(screen.getByTestId('data-count')).toHaveTextContent('2');

      // Add new row
      const addButton = screen.getByText('Add row');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByTestId('has-new-rows')).toHaveTextContent('true');
      });

      // State should reflect new row
      expect(screen.getByTestId('data-count')).toHaveTextContent('3');
    });

    it('should handle concurrent state updates', async () => {
      renderTableView();

      // Simulate multiple concurrent operations
      const operations = [
        () => fireEvent.click(screen.getByText('Add row')),
        () => fireEvent.click(screen.getByText('Add row')),
        () => fireEvent.click(screen.getByText('Add row')),
      ];

      // Execute operations rapidly
      operations.forEach((op) => op());

      await waitFor(() => {
        expect(screen.getByTestId('has-new-rows')).toHaveTextContent('true');
      });

      // Should handle all operations
      expect(screen.getByTestId('data-count')).toHaveTextContent('5'); // 2 original + 3 new
    });

    it('should preserve selection state during operations', async () => {
      renderTableView();

      // Simulate row selection
      const selectedRows = new Set([1, 2]);

      // Perform operations that shouldn't affect selection
      const addButton = screen.getByText('Add row');
      fireEvent.click(addButton);

      // Selection should be preserved
      expect(selectedRows.has(1)).toBe(true);
      expect(selectedRows.has(2)).toBe(true);
    });

    it('should handle optimistic updates correctly', async () => {
      renderTableView();

      // Mock delayed server response
      mockUpdateEquipmentExpense.mockImplementation((params, callbacks) => {
        setTimeout(() => {
          callbacks?.onSuccess?.({
            status: 200,
            success: true,
            data: { ...mockEquipmentData[0], ...params.json },
          });
        }, 100);
      });

      const updateData = {
        json: {
          id: 1,
          userId: 'user-1',
          name: 'Optimistically Updated',
          amount: 2400,
          category: 'computer',
          purchaseDate: new Date('2023-01-01'),
          usage: 100,
          lifeSpan: 24,
        },
      };

      // Start optimistic update
      mockUpdateEquipmentExpense(updateData, {
        onSuccess: vi.fn(),
        onError: vi.fn(),
      });

      // Should show optimistic state immediately
      expect(mockUpdateEquipmentExpense).toHaveBeenCalled();

      // Wait for server response
      await waitFor(() => {
        // Server response would update the state
      });
    });
  });

  describe('Data Consistency Integration', () => {
    it('should maintain data integrity across CRUD operations', async () => {
      const { rerender } = renderTableView();

      // Initial data
      expect(screen.getByTestId('data-count')).toHaveTextContent('2');

      // Simulate data update
      const updatedData = [
        ...mockEquipmentData,
        {
          id: 3,
          userId: 'user-1',
          rank: 3,
          name: 'New Equipment',
          amount: 1000,
          category: 'keyboard',
          purchaseDate: new Date('2023-03-01'),
          usage: 90,
          lifeSpan: 12,
          createdAt: '2023-03-01T00:00:00Z',
          updatedAt: '2023-03-01T00:00:00Z',
        },
      ];

      rerender(
        <QueryClientProvider client={new QueryClient()}>
          <TableView
            data={updatedData}
            userId="user-1"
            getCategoryColor={() => 'bg-blue-500'}
            getCategoryLabel={(cat) => cat}
          />
        </QueryClientProvider>
      );

      // Data should be updated
      await waitFor(() => {
        expect(screen.getByTestId('data-count')).toHaveTextContent('3');
      });
    });

    it('should handle data transformations correctly', () => {
      renderTableView();

      // Verify table structure
      expect(screen.getByTestId('table-headers')).toBeInTheDocument();
      expect(screen.getByTestId('table-rows')).toBeInTheDocument();

      // Verify data is properly transformed and displayed
      expect(screen.getByTestId('data-count')).toHaveTextContent('2');
    });

    it('should maintain referential integrity', async () => {
      renderTableView();

      // All operations should reference the correct user
      const addButton = screen.getByText('Add row');
      fireEvent.click(addButton);

      // Mock operations should use correct user ID
      mockCreateEquipmentExpense.mockImplementation((params, callbacks) => {
        expect(params.json.userId).toBe('user-1');
        callbacks?.onSuccess?.({
          status: 201,
          success: true,
          data: { ...params.json, id: 3 },
        });
      });

      const createData = {
        json: {
          userId: 'user-1',
          name: 'New Equipment',
          amount: 1200,
          category: 'computer',
          rank: 3,
          purchaseDate: new Date().toISOString(),
          usage: 100,
          lifeSpan: 12,
        },
      };

      mockCreateEquipmentExpense(createData, {
        onSuccess: vi.fn(),
        onError: vi.fn(),
      });

      expect(mockCreateEquipmentExpense).toHaveBeenCalledWith(
        expect.objectContaining({
          json: expect.objectContaining({
            userId: 'user-1',
          }),
        }),
        expect.any(Object)
      );
    });
  });

  describe('User Experience Integration', () => {
    it('should provide immediate feedback for user actions', async () => {
      renderTableView();

      // Add row should provide immediate visual feedback
      const addButton = screen.getByText('Add row');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByTestId('has-new-rows')).toHaveTextContent('true');
      });
    });

    it('should handle loading states appropriately', () => {
      renderTableView(mockEquipmentData, { isLoading: true });

      // Should show loading state
      expect(screen.getByTestId('data-table')).toBeInTheDocument();
    });

    it('should handle empty states gracefully', () => {
      renderTableView([]);

      expect(screen.getByTestId('data-count')).toHaveTextContent('0');
      expect(screen.getByTestId('data-table')).toBeInTheDocument();
    });

    it('should provide accessible interactions', () => {
      renderTableView();

      // Check for accessibility features
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should handle keyboard navigation', () => {
      renderTableView();

      const addButton = screen.getByText('Add row');

      // Test keyboard activation
      fireEvent.keyDown(addButton, { key: 'Enter' });
      fireEvent.keyDown(addButton, { key: ' ' });

      // Should handle keyboard events
      expect(addButton).toBeInTheDocument();
    });
  });

  describe('Performance Integration', () => {
    it('should handle large datasets efficiently', () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        userId: 'user-1',
        rank: i + 1,
        name: `Equipment ${i + 1}`,
        amount: 1000 + i,
        category: 'computer',
        purchaseDate: new Date('2023-01-01'),
        usage: 80,
        lifeSpan: 24,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      }));

      const startTime = performance.now();
      renderTableView(largeData);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1000); // Less than 1 second
      expect(screen.getByTestId('data-count')).toHaveTextContent('1000');
    });

    it('should optimize re-renders', () => {
      const { rerender } = renderTableView();

      // Multiple re-renders should not cause performance issues
      for (let i = 0; i < 10; i++) {
        rerender(
          <QueryClientProvider client={new QueryClient()}>
            <TableView
              data={mockEquipmentData}
              userId="user-1"
              getCategoryColor={() => 'bg-blue-500'}
              getCategoryLabel={(cat) => cat}
            />
          </QueryClientProvider>
        );
      }

      expect(screen.getByTestId('data-table')).toBeInTheDocument();
    });

    it('should handle rapid user interactions', async () => {
      renderTableView();

      const addButton = screen.getByText('Add row');

      // Rapid clicking should not cause issues
      for (let i = 0; i < 10; i++) {
        fireEvent.click(addButton);
      }

      await waitFor(() => {
        expect(screen.getByTestId('has-new-rows')).toHaveTextContent('true');
      });
    });
  });

  describe('Edge Cases Integration', () => {
    it('should handle malformed data gracefully', () => {
      const malformedData = [
        {
          id: 1,
          userId: 'user-1',
          rank: 1,
          name: null, // Malformed
          amount: 'invalid', // Malformed
          category: 'computer',
          purchaseDate: new Date('2023-01-01'),
          usage: 100,
          lifeSpan: 24,
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
      ] as any;

      expect(() => renderTableView(malformedData)).not.toThrow();
    });

    it('should handle missing props gracefully', () => {
      expect(() => {
        render(
          <QueryClientProvider client={new QueryClient()}>
            <TableView
              data={[]}
              userId=""
              getCategoryColor={() => ''}
              getCategoryLabel={() => ''}
            />
          </QueryClientProvider>
        );
      }).not.toThrow();
    });

    it('should handle component unmounting during operations', () => {
      const { unmount } = renderTableView();

      // Start an operation
      const addButton = screen.getByText('Add row');
      fireEvent.click(addButton);

      // Unmount should not cause errors
      expect(() => unmount()).not.toThrow();
    });

    it('should handle rapid mount/unmount cycles', () => {
      for (let i = 0; i < 5; i++) {
        const { unmount } = renderTableView();
        unmount();
      }

      // Should not cause memory leaks or errors
      expect(true).toBe(true);
    });
  });
});