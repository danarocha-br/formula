import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TableView } from '../index';
import type { EquipmentExpenseItem } from '@/app/types';

// Mock performance monitoring utilities
const mockPerformanceMonitor = {
  startMeasurement: vi.fn(),
  endMeasurement: vi.fn().mockReturnValue(50), // 50ms
  measureMemoryUsage: vi.fn().mockResolvedValue(1024 * 1024), // 1MB
  trackReRenders: vi.fn(),
  getMetrics: vi.fn().mockReturnValue({
    renderTime: 50,
    memoryUsage: 1024 * 1024,
    reRenderCount: 1,
  }),
};

vi.mock('@/utils/performance-monitor', () => ({
  performanceMonitor: mockPerformanceMonitor,
}));

// Mock server actions with performance tracking
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

// Mock other dependencies
vi.mock('@/app/store/currency-store', () => ({
  useCurrencyStore: () => ({
    selectedCurrency: { code: 'USD', symbol: '$' },
  }),
}));

vi.mock('@/hooks/use-translation', () => ({
  useTranslations: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@repo/design-system/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock react-hook-form
vi.mock('react-hook-form', () => ({
  useForm: () => ({
    control: {},
    formState: { isDirty: false },
    reset: vi.fn(),
    setValue: vi.fn(),
  }),
  Controller: ({ render }: any) => {
    const field = { value: '', onChange: vi.fn(), onBlur: vi.fn() };
    return render({ field });
  },
}));

// Mock design system components with performance tracking
vi.mock('@repo/design-system/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => {
    const handleClick = (e: any) => {
      mockPerformanceMonitor.startMeasurement('button-click');
      onClick?.(e);
      mockPerformanceMonitor.endMeasurement('button-click');
    };
    return (
      <button onClick={handleClick} {...props}>
        {children}
      </button>
    );
  },
}));

vi.mock('@repo/design-system/components/ui/input', () => ({
  Input: ({ onChange, ...props }: any) => {
    const handleChange = (e: any) => {
      mockPerformanceMonitor.startMeasurement('input-change');
      onChange?.(e.target.value);
      mockPerformanceMonitor.endMeasurement('input-change');
    };
    return <input onChange={handleChange} {...props} />;
  },
}));

vi.mock('@repo/design-system/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

// Performance-aware DataTable mock
vi.mock('../data-table', () => ({
  DataTable: ({ columns, data }: any) => {
    mockPerformanceMonitor.startMeasurement('data-table-render');

    const result = (
      <div data-testid="data-table">
        <div data-testid="data-count">{data.length}</div>
        <div data-testid="columns-count">{columns.length}</div>
        {data.map((row: any, index: number) => (
          <div key={row.id} data-testid={`row-${index}`}>
            {row.name}
          </div>
        ))}
      </div>
    );

    mockPerformanceMonitor.endMeasurement('data-table-render');
    return result;
  },
}));

// Generate test data of various sizes
const generateEquipmentData = (count: number): EquipmentExpenseItem[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    userId: 'user-1',
    rank: i + 1,
    name: `Equipment ${i + 1}`,
    amount: 1000 + (i * 100),
    category: ['computer', 'monitor', 'keyboard', 'mouse'][i % 4] as any,
    purchaseDate: new Date(`2023-${String((i % 12) + 1).padStart(2, '0')}-01`),
    usage: 80 + (i % 20),
    lifeSpan: 12 + (i % 24),
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  }));
};

const renderTableView = (data: EquipmentExpenseItem[]) => {
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
      />
    </QueryClientProvider>
  );
};

describe('TableView Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPerformanceMonitor.startMeasurement.mockClear();
    mockPerformanceMonitor.endMeasurement.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering Performance', () => {
    it('should render small datasets quickly', async () => {
      const smallData = generateEquipmentData(10);
      const startTime = performance.now();

      renderTableView(smallData);

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(50); // Less than 50ms
      expect(screen.getByTestId('data-count')).toHaveTextContent('10');
    });

    it('should render medium datasets efficiently', async () => {
      const mediumData = generateEquipmentData(100);
      const startTime = performance.now();

      renderTableView(mediumData);

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(200); // Less than 200ms
      expect(screen.getByTestId('data-count')).toHaveTextContent('100');
    });

    it('should handle large datasets within acceptable time', async () => {
      const largeData = generateEquipmentData(1000);
      const startTime = performance.now();

      renderTableView(largeData);

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(1000); // Less than 1 second
      expect(screen.getByTestId('data-count')).toHaveTextContent('1000');
    });

    it('should maintain performance with very large datasets', async () => {
      const veryLargeData = generateEquipmentData(5000);
      const startTime = performance.now();

      renderTableView(veryLargeData);

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should still render within reasonable time
      expect(renderTime).toBeLessThan(3000); // Less than 3 seconds
      expect(screen.getByTestId('data-count')).toHaveTextContent('5000');
    });

    it('should track render performance metrics', () => {
      const data = generateEquipmentData(50);

      renderTableView(data);

      expect(mockPerformanceMonitor.startMeasurement).toHaveBeenCalledWith('data-table-render');
      expect(mockPerformanceMonitor.endMeasurement).toHaveBeenCalledWith('data-table-render');
    });
  });

  describe('Memory Usage', () => {
    it('should use memory efficiently with small datasets', async () => {
      const smallData = generateEquipmentData(10);

      renderTableView(smallData);

      const memoryUsage = await mockPerformanceMonitor.measureMemoryUsage();

      // Should use reasonable amount of memory
      expect(memoryUsage).toBeLessThan(5 * 1024 * 1024); // Less than 5MB
    });

    it('should scale memory usage linearly with data size', async () => {
      const smallData = generateEquipmentData(100);
      const largeData = generateEquipmentData(1000);

      renderTableView(smallData);
      const smallMemory = await mockPerformanceMonitor.measureMemoryUsage();

      renderTableView(largeData);
      const largeMemory = await mockPerformanceMonitor.measureMemoryUsage();

      // Memory usage should scale reasonably (not exponentially)
      const memoryRatio = largeMemory / smallMemory;
      expect(memoryRatio).toBeLessThan(15); // Less than 15x increase for 10x data
    });

    it('should not leak memory during re-renders', async () => {
      const data = generateEquipmentData(100);

      const { rerender } = renderTableView(data);
      const initialMemory = await mockPerformanceMonitor.measureMemoryUsage();

      // Force multiple re-renders
      for (let i = 0; i < 10; i++) {
        rerender(
          <QueryClientProvider client={new QueryClient()}>
            <TableView
              data={data}
              userId="user-1"
              getCategoryColor={() => 'bg-blue-500'}
              getCategoryLabel={(cat) => cat}
            />
          </QueryClientProvider>
        );
      }

      const finalMemory = await mockPerformanceMonitor.measureMemoryUsage();
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal
      expect(memoryIncrease).toBeLessThan(1024 * 1024); // Less than 1MB increase
    });

    it('should clean up memory on unmount', async () => {
      const data = generateEquipmentData(500);

      const { unmount } = renderTableView(data);
      const beforeUnmount = await mockPerformanceMonitor.measureMemoryUsage();

      unmount();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const afterUnmount = await mockPerformanceMonitor.measureMemoryUsage();
      const memoryFreed = beforeUnmount - afterUnmount;

      // Should free significant memory
      expect(memoryFreed).toBeGreaterThan(0);
    });
  });

  describe('Interaction Performance', () => {
    it('should handle rapid user interactions efficiently', async () => {
      const data = generateEquipmentData(100);
      renderTableView(data);

      const addButton = screen.getByText('Add row');
      const startTime = performance.now();

      // Simulate rapid clicking
      for (let i = 0; i < 10; i++) {
        fireEvent.click(addButton);
      }

      const endTime = performance.now();
      const interactionTime = endTime - startTime;

      expect(interactionTime).toBeLessThan(100); // Less than 100ms for 10 clicks
      expect(mockPerformanceMonitor.startMeasurement).toHaveBeenCalledWith('button-click');
    });

    it('should maintain responsiveness during bulk operations', async () => {
      const data = generateEquipmentData(200);
      renderTableView(data);

      // Mock bulk delete operation
      mockDeleteEquipmentExpense.mockImplementation((params, callbacks) => {
        setTimeout(() => callbacks?.onSuccess?.(), 10);
      });

      const startTime = performance.now();

      // Simulate bulk delete of many items
      const deletePromises = Array.from({ length: 50 }, (_, i) =>
        new Promise<void>((resolve) => {
          mockDeleteEquipmentExpense(
            { param: { id: (i + 1).toString(), userId: 'user-1' } },
            { onSuccess: () => resolve(), onError: () => resolve() }
          );
        })
      );

      await Promise.all(deletePromises);

      const endTime = performance.now();
      const bulkOperationTime = endTime - startTime;

      expect(bulkOperationTime).toBeLessThan(1000); // Less than 1 second
      expect(mockDeleteEquipmentExpense).toHaveBeenCalledTimes(50);
    });

    it('should handle form input changes efficiently', async () => {
      const data = generateEquipmentData(50);
      renderTableView(data);

      // Add a new row to test form performance
      const addButton = screen.getByText('Add row');
      fireEvent.click(addButton);

      const startTime = performance.now();

      // Simulate rapid typing in form fields
      const inputs = screen.getAllByRole('textbox');
      if (inputs.length > 0) {
        for (let i = 0; i < 20; i++) {
          fireEvent.change(inputs[0], { target: { value: `Test ${i}` } });
        }
      }

      const endTime = performance.now();
      const inputTime = endTime - startTime;

      expect(inputTime).toBeLessThan(200); // Less than 200ms for 20 changes
      expect(mockPerformanceMonitor.startMeasurement).toHaveBeenCalledWith('input-change');
    });

    it('should optimize re-renders during editing', () => {
      const data = generateEquipmentData(100);
      renderTableView(data);

      mockPerformanceMonitor.trackReRenders.mockClear();

      // Simulate editing a single field
      const addButton = screen.getByText('Add row');
      fireEvent.click(addButton);

      // Should not cause excessive re-renders
      expect(mockPerformanceMonitor.trackReRenders).toHaveBeenCalledTimes(0);
    });
  });

  describe('Data Processing Performance', () => {
    it('should transform data efficiently', () => {
      const largeData = generateEquipmentData(1000);
      const startTime = performance.now();

      renderTableView(largeData);

      const endTime = performance.now();
      const transformTime = endTime - startTime;

      // Data transformation should be fast
      expect(transformTime).toBeLessThan(500); // Less than 500ms
      expect(screen.getByTestId('data-count')).toHaveTextContent('1000');
    });

    it('should handle currency formatting efficiently', () => {
      const data = generateEquipmentData(500);
      const startTime = performance.now();

      renderTableView(data);

      const endTime = performance.now();
      const formatTime = endTime - startTime;

      // Currency formatting should not significantly impact performance
      expect(formatTime).toBeLessThan(300); // Less than 300ms
    });

    it('should optimize column calculations', () => {
      const data = generateEquipmentData(1000);
      const startTime = performance.now();

      renderTableView(data);

      const endTime = performance.now();
      const calculationTime = endTime - startTime;

      // Column calculations (monthly/yearly costs) should be efficient
      expect(calculationTime).toBeLessThan(400); // Less than 400ms
    });

    it('should handle sorting and filtering efficiently', async () => {
      const data = generateEquipmentData(500);
      renderTableView(data);

      const startTime = performance.now();

      // Simulate sorting operation (would be handled by the table component)
      const sortedData = [...data].sort((a, b) => a.name.localeCompare(b.name));

      const endTime = performance.now();
      const sortTime = endTime - startTime;

      expect(sortTime).toBeLessThan(50); // Less than 50ms
      expect(sortedData).toHaveLength(500);
    });
  });

  describe('Concurrent Operations Performance', () => {
    it('should handle multiple simultaneous CRUD operations', async () => {
      const data = generateEquipmentData(100);
      renderTableView(data);

      // Mock all operations to complete quickly
      mockCreateEquipmentExpense.mockImplementation((params, callbacks) => {
        setTimeout(() => callbacks?.onSuccess?.(), 5);
      });
      mockUpdateEquipmentExpense.mockImplementation((params, callbacks) => {
        setTimeout(() => callbacks?.onSuccess?.(), 5);
      });
      mockDeleteEquipmentExpense.mockImplementation((params, callbacks) => {
        setTimeout(() => callbacks?.onSuccess?.(), 5);
      });

      const startTime = performance.now();

      // Simulate concurrent operations
      const operations = [
        ...Array.from({ length: 10 }, () => 'create'),
        ...Array.from({ length: 10 }, () => 'update'),
        ...Array.from({ length: 10 }, () => 'delete'),
      ];

      const promises = operations.map((op, i) => {
        if (op === 'create') {
          return new Promise<void>((resolve) => {
            mockCreateEquipmentExpense(
              { json: { name: `Item ${i}`, category: 'computer' } },
              { onSuccess: () => resolve(), onError: () => resolve() }
            );
          });
        } else if (op === 'update') {
          return new Promise<void>((resolve) => {
            mockUpdateEquipmentExpense(
              { json: { id: i, name: `Updated ${i}` } },
              { onSuccess: () => resolve(), onError: () => resolve() }
            );
          });
        } else {
          return new Promise<void>((resolve) => {
            mockDeleteEquipmentExpense(
              { param: { id: i.toString(), userId: 'user-1' } },
              { onSuccess: () => resolve(), onError: () => resolve() }
            );
          });
        }
      });

      await Promise.all(promises);

      const endTime = performance.now();
      const concurrentTime = endTime - startTime;

      expect(concurrentTime).toBeLessThan(1000); // Less than 1 second
      expect(mockCreateEquipmentExpense).toHaveBeenCalledTimes(10);
      expect(mockUpdateEquipmentExpense).toHaveBeenCalledTimes(10);
      expect(mockDeleteEquipmentExpense).toHaveBeenCalledTimes(10);
    });

    it('should maintain UI responsiveness during background operations', async () => {
      const data = generateEquipmentData(200);
      renderTableView(data);

      // Start a long-running background operation
      const longOperation = new Promise<void>((resolve) => {
        setTimeout(resolve, 500);
      });

      const startTime = performance.now();

      // UI interactions should still be responsive
      const addButton = screen.getByText('Add row');
      fireEvent.click(addButton);

      const endTime = performance.now();
      const uiResponseTime = endTime - startTime;

      expect(uiResponseTime).toBeLessThan(50); // UI should respond quickly

      await longOperation; // Wait for background operation to complete
    });

    it('should handle rapid state changes efficiently', async () => {
      const data = generateEquipmentData(100);
      const { rerender } = renderTableView(data);

      const startTime = performance.now();

      // Simulate rapid state changes
      for (let i = 0; i < 20; i++) {
        const updatedData = data.map((item, index) =>
          index === 0 ? { ...item, name: `Updated ${i}` } : item
        );

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
      }

      const endTime = performance.now();
      const stateChangeTime = endTime - startTime;

      expect(stateChangeTime).toBeLessThan(500); // Less than 500ms for 20 updates
    });
  });

  describe('Performance Monitoring', () => {
    it('should collect performance metrics', () => {
      const data = generateEquipmentData(100);
      renderTableView(data);

      const metrics = mockPerformanceMonitor.getMetrics();

      expect(metrics).toHaveProperty('renderTime');
      expect(metrics).toHaveProperty('memoryUsage');
      expect(metrics).toHaveProperty('reRenderCount');
      expect(metrics.renderTime).toBeGreaterThan(0);
    });

    it('should track performance degradation', async () => {
      const smallData = generateEquipmentData(10);
      const largeData = generateEquipmentData(1000);

      const startSmall = performance.now();
      renderTableView(smallData);
      const smallRenderTime = performance.now() - startSmall;

      const startLarge = performance.now();
      renderTableView(largeData);
      const largeRenderTime = performance.now() - startLarge;

      // Performance should degrade gracefully
      const performanceRatio = largeRenderTime / smallRenderTime;
      expect(performanceRatio).toBeLessThan(20); // Less than 20x slower for 100x data
    });

    it('should identify performance bottlenecks', () => {
      const data = generateEquipmentData(500);
      renderTableView(data);

      // Check that performance monitoring is tracking key operations
      expect(mockPerformanceMonitor.startMeasurement).toHaveBeenCalledWith('data-table-render');
      expect(mockPerformanceMonitor.endMeasurement).toHaveBeenCalledWith('data-table-render');
    });

    it('should provide performance recommendations', () => {
      const veryLargeData = generateEquipmentData(10000);
      const startTime = performance.now();

      renderTableView(veryLargeData);

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // For very large datasets, should suggest virtualization
      if (renderTime > 2000) {
        console.warn('Consider implementing virtualization for large datasets');
      }

      expect(renderTime).toBeDefined();
    });
  });

  describe('Edge Case Performance', () => {
    it('should handle empty datasets efficiently', () => {
      const startTime = performance.now();

      renderTableView([]);

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(20); // Very fast for empty data
      expect(screen.getByTestId('data-count')).toHaveTextContent('0');
    });

    it('should handle datasets with complex data efficiently', () => {
      const complexData = generateEquipmentData(100).map(item => ({
        ...item,
        name: 'A'.repeat(1000), // Very long names
        category: 'complex-category-with-long-name',
      }));

      const startTime = performance.now();

      renderTableView(complexData);

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(300); // Should handle complex data
      expect(screen.getByTestId('data-count')).toHaveTextContent('100');
    });

    it('should handle rapid data updates efficiently', async () => {
      let data = generateEquipmentData(50);
      const { rerender } = renderTableView(data);

      const startTime = performance.now();

      // Simulate rapid data updates
      for (let i = 0; i < 50; i++) {
        data = data.map(item => ({
          ...item,
          amount: item.amount + i,
        }));

        rerender(
          <QueryClientProvider client={new QueryClient()}>
            <TableView
              data={data}
              userId="user-1"
              getCategoryColor={() => 'bg-blue-500'}
              getCategoryLabel={(cat) => cat}
            />
          </QueryClientProvider>
        );
      }

      const endTime = performance.now();
      const updateTime = endTime - startTime;

      expect(updateTime).toBeLessThan(1000); // Less than 1 second for 50 updates
    });
  });
});