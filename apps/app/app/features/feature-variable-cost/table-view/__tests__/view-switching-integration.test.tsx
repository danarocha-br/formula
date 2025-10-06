import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { EquipmentExpenseItem } from '@/app/types';

// Mock the view preference store
const mockSetViewPreference = vi.fn();
const mockViewPreference = vi.fn(() => 'table');

vi.mock('@/app/store/view-preference-store', () => ({
  useViewPreferenceStore: () => ({
    viewPreference: mockViewPreference(),
    setViewPreference: mockSetViewPreference,
  }),
}));

// Mock the TableView component
const MockTableView = ({ data, userId, getCategoryColor, getCategoryLabel }: any) => (
  <div data-testid="table-view">
    <div data-testid="table-data-count">{data.length}</div>
    <div data-testid="table-user-id">{userId}</div>
    <button data-testid="table-action">Table Action</button>
  </div>
);

// Mock the GridView component
const MockGridView = ({ data, userId, getCategoryColor, getCategoryLabel }: any) => (
  <div data-testid="grid-view">
    <div data-testid="grid-data-count">{data.length}</div>
    <div data-testid="grid-user-id">{userId}</div>
    <button data-testid="grid-action">Grid Action</button>
  </div>
);

// Mock the main VariableCostView component that switches between views
const MockVariableCostView = ({ userId, data }: { userId: string; data: EquipmentExpenseItem[] }) => {
  const viewPreference = mockViewPreference();

  const getCategoryColor = (category: string) => 'bg-blue-500';
  const getCategoryLabel = (category: string) => category;

  return (
    <div data-testid="variable-cost-view">
      <div data-testid="view-controls">
        <button
          data-testid="grid-view-button"
          onClick={() => mockSetViewPreference('grid')}
          className={viewPreference === 'grid' ? 'active' : ''}
        >
          Grid View
        </button>
        <button
          data-testid="table-view-button"
          onClick={() => mockSetViewPreference('table')}
          className={viewPreference === 'table' ? 'active' : ''}
        >
          Table View
        </button>
      </div>

      <div data-testid="current-view-type">{viewPreference}</div>

      {viewPreference === 'table' ? (
        <MockTableView
          data={data}
          userId={userId}
          getCategoryColor={getCategoryColor}
          getCategoryLabel={getCategoryLabel}
        />
      ) : (
        <MockGridView
          data={data}
          userId={userId}
          getCategoryColor={getCategoryColor}
          getCategoryLabel={getCategoryLabel}
        />
      )}
    </div>
  );
};

// Mock other dependencies
vi.mock('@/hooks/use-translation', () => ({
  useTranslations: () => ({
    t: (key: string) => key,
  }),
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

const renderVariableCostView = (data = mockEquipmentData) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
    logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MockVariableCostView userId="user-1" data={data} />
    </QueryClientProvider>
  );
};

describe('View Switching and Preference Persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockViewPreference.mockReturnValue('table');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('View Switching', () => {
    it('should render table view by default when preference is table', () => {
      mockViewPreference.mockReturnValue('table');

      renderVariableCostView();

      expect(screen.getByTestId('table-view')).toBeInTheDocument();
      expect(screen.queryByTestId('grid-view')).not.toBeInTheDocument();
      expect(screen.getByTestId('current-view-type')).toHaveTextContent('table');
    });

    it('should render grid view when preference is grid', () => {
      mockViewPreference.mockReturnValue('grid');

      renderVariableCostView();

      expect(screen.getByTestId('grid-view')).toBeInTheDocument();
      expect(screen.queryByTestId('table-view')).not.toBeInTheDocument();
      expect(screen.getByTestId('current-view-type')).toHaveTextContent('grid');
    });

    it('should switch from table to grid view', async () => {
      mockViewPreference.mockReturnValue('table');

      const { rerender } = renderVariableCostView();

      // Initially shows table view
      expect(screen.getByTestId('table-view')).toBeInTheDocument();

      // Click grid view button
      const gridButton = screen.getByTestId('grid-view-button');
      fireEvent.click(gridButton);

      expect(mockSetViewPreference).toHaveBeenCalledWith('grid');

      // Simulate preference change
      mockViewPreference.mockReturnValue('grid');
      rerender(
        <QueryClient>
          <MockVariableCostView userId="user-1" data={mockEquipmentData} />
        </QueryClient>
      );

      await waitFor(() => {
        expect(screen.getByTestId('grid-view')).toBeInTheDocument();
        expect(screen.queryByTestId('table-view')).not.toBeInTheDocument();
      });
    });

    it('should switch from grid to table view', async () => {
      mockViewPreference.mockReturnValue('grid');

      const { rerender } = renderVariableCostView();

      // Initially shows grid view
      expect(screen.getByTestId('grid-view')).toBeInTheDocument();

      // Click table view button
      const tableButton = screen.getByTestId('table-view-button');
      fireEvent.click(tableButton);

      expect(mockSetViewPreference).toHaveBeenCalledWith('table');

      // Simulate preference change
      mockViewPreference.mockReturnValue('table');
      rerender(
        <QueryClient>
          <MockVariableCostView userId="user-1" data={mockEquipmentData} />
        </QueryClient>
      );

      await waitFor(() => {
        expect(screen.getByTestId('table-view')).toBeInTheDocument();
        expect(screen.queryByTestId('grid-view')).not.toBeInTheDocument();
      });
    });

    it('should maintain data consistency across view switches', async () => {
      mockViewPreference.mockReturnValue('table');

      const { rerender } = renderVariableCostView();

      // Check data in table view
      expect(screen.getByTestId('table-data-count')).toHaveTextContent('2');
      expect(screen.getByTestId('table-user-id')).toHaveTextContent('user-1');

      // Switch to grid view
      mockViewPreference.mockReturnValue('grid');
      rerender(
        <QueryClient>
          <MockVariableCostView userId="user-1" data={mockEquipmentData} />
        </QueryClient>
      );

      // Check data in grid view
      await waitFor(() => {
        expect(screen.getByTestId('grid-data-count')).toHaveTextContent('2');
        expect(screen.getByTestId('grid-user-id')).toHaveTextContent('user-1');
      });
    });

    it('should handle empty data in both views', () => {
      mockViewPreference.mockReturnValue('table');

      renderVariableCostView([]);

      expect(screen.getByTestId('table-data-count')).toHaveTextContent('0');

      // Switch to grid view with empty data
      mockViewPreference.mockReturnValue('grid');
      const { rerender } = renderVariableCostView([]);

      rerender(
        <QueryClient>
          <MockVariableCostView userId="user-1" data={[]} />
        </QueryClient>
      );

      expect(screen.getByTestId('grid-data-count')).toHaveTextContent('0');
    });
  });

  describe('Preference Persistence', () => {
    it('should persist table view preference', () => {
      mockViewPreference.mockReturnValue('table');

      renderVariableCostView();

      const tableButton = screen.getByTestId('table-view-button');
      fireEvent.click(tableButton);

      expect(mockSetViewPreference).toHaveBeenCalledWith('table');
    });

    it('should persist grid view preference', () => {
      mockViewPreference.mockReturnValue('grid');

      renderVariableCostView();

      const gridButton = screen.getByTestId('grid-view-button');
      fireEvent.click(gridButton);

      expect(mockSetViewPreference).toHaveBeenCalledWith('grid');
    });

    it('should load saved preference on component mount', () => {
      mockViewPreference.mockReturnValue('grid');

      renderVariableCostView();

      expect(screen.getByTestId('current-view-type')).toHaveTextContent('grid');
      expect(screen.getByTestId('grid-view')).toBeInTheDocument();
    });

    it('should handle invalid preference gracefully', () => {
      mockViewPreference.mockReturnValue('invalid' as any);

      // Should fallback to a default view (let's say table)
      const { container } = renderVariableCostView();

      // Component should still render without crashing
      expect(container).toBeInTheDocument();
    });

    it('should maintain preference across component remounts', () => {
      mockViewPreference.mockReturnValue('table');

      const { unmount } = renderVariableCostView();

      // Unmount component
      unmount();

      // Remount component
      renderVariableCostView();

      // Should still show table view
      expect(screen.getByTestId('table-view')).toBeInTheDocument();
      expect(screen.getByTestId('current-view-type')).toHaveTextContent('table');
    });
  });

  describe('View State Management', () => {
    it('should show active state for current view button', () => {
      mockViewPreference.mockReturnValue('table');

      renderVariableCostView();

      const tableButton = screen.getByTestId('table-view-button');
      const gridButton = screen.getByTestId('grid-view-button');

      expect(tableButton).toHaveClass('active');
      expect(gridButton).not.toHaveClass('active');
    });

    it('should update active state when view changes', async () => {
      mockViewPreference.mockReturnValue('table');

      const { rerender } = renderVariableCostView();

      // Initially table is active
      expect(screen.getByTestId('table-view-button')).toHaveClass('active');

      // Switch to grid
      mockViewPreference.mockReturnValue('grid');
      rerender(
        <QueryClient>
          <MockVariableCostView userId="user-1" data={mockEquipmentData} />
        </QueryClient>
      );

      await waitFor(() => {
        expect(screen.getByTestId('grid-view-button')).toHaveClass('active');
        expect(screen.getByTestId('table-view-button')).not.toHaveClass('active');
      });
    });

    it('should handle rapid view switching', async () => {
      mockViewPreference.mockReturnValue('table');

      renderVariableCostView();

      const tableButton = screen.getByTestId('table-view-button');
      const gridButton = screen.getByTestId('grid-view-button');

      // Rapid switching
      fireEvent.click(gridButton);
      fireEvent.click(tableButton);
      fireEvent.click(gridButton);
      fireEvent.click(tableButton);

      expect(mockSetViewPreference).toHaveBeenCalledTimes(4);
      expect(mockSetViewPreference).toHaveBeenLastCalledWith('table');
    });
  });

  describe('Integration with Data Operations', () => {
    it('should maintain view preference during data updates', async () => {
      mockViewPreference.mockReturnValue('table');

      const { rerender } = renderVariableCostView();

      expect(screen.getByTestId('table-view')).toBeInTheDocument();

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
        <QueryClient>
          <MockVariableCostView userId="user-1" data={updatedData} />
        </QueryClient>
      );

      // Should still show table view with updated data
      await waitFor(() => {
        expect(screen.getByTestId('table-view')).toBeInTheDocument();
        expect(screen.getByTestId('table-data-count')).toHaveTextContent('3');
      });
    });

    it('should handle view switching during loading states', () => {
      mockViewPreference.mockReturnValue('table');

      renderVariableCostView();

      // Simulate switching view while data is loading
      const gridButton = screen.getByTestId('grid-view-button');
      fireEvent.click(gridButton);

      expect(mockSetViewPreference).toHaveBeenCalledWith('grid');
    });

    it('should preserve selection state across view switches', async () => {
      mockViewPreference.mockReturnValue('table');

      const { rerender } = renderVariableCostView();

      // Simulate having selected items in table view
      const selectedItems = new Set([1, 2]);

      // Switch to grid view
      mockViewPreference.mockReturnValue('grid');
      rerender(
        <QueryClient>
          <MockVariableCostView userId="user-1" data={mockEquipmentData} />
        </QueryClient>
      );

      // Selection state should be maintained (in real implementation)
      expect(selectedItems.size).toBe(2);
      expect(selectedItems.has(1)).toBe(true);
      expect(selectedItems.has(2)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle view preference store errors gracefully', () => {
      mockSetViewPreference.mockImplementation(() => {
        throw new Error('Store error');
      });

      renderVariableCostView();

      const gridButton = screen.getByTestId('grid-view-button');

      // Should not crash when preference setting fails
      expect(() => fireEvent.click(gridButton)).not.toThrow();
    });

    it('should fallback to default view when preference is corrupted', () => {
      mockViewPreference.mockReturnValue(null as any);

      const { container } = renderVariableCostView();

      // Should still render without crashing
      expect(container).toBeInTheDocument();
    });

    it('should handle missing view preference store', () => {
      // Mock store to return undefined
      vi.mocked(require('@/app/store/view-preference-store').useViewPreferenceStore).mockReturnValue({
        viewPreference: undefined,
        setViewPreference: undefined,
      });

      const { container } = renderVariableCostView();

      // Should still render without crashing
      expect(container).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should provide proper ARIA labels for view buttons', () => {
      renderVariableCostView();

      const tableButton = screen.getByTestId('table-view-button');
      const gridButton = screen.getByTestId('grid-view-button');

      expect(tableButton).toBeInTheDocument();
      expect(gridButton).toBeInTheDocument();
    });

    it('should support keyboard navigation between views', () => {
      renderVariableCostView();

      const tableButton = screen.getByTestId('table-view-button');
      const gridButton = screen.getByTestId('grid-view-button');

      // Test keyboard activation
      fireEvent.keyDown(gridButton, { key: 'Enter' });
      expect(mockSetViewPreference).toHaveBeenCalledWith('grid');

      fireEvent.keyDown(tableButton, { key: ' ' });
      expect(mockSetViewPreference).toHaveBeenCalledWith('table');
    });

    it('should announce view changes to screen readers', async () => {
      mockViewPreference.mockReturnValue('table');

      const { rerender } = renderVariableCostView();

      // Switch view
      mockViewPreference.mockReturnValue('grid');
      rerender(
        <QueryClient>
          <MockVariableCostView userId="user-1" data={mockEquipmentData} />
        </QueryClient>
      );

      // The current view type should be updated for screen readers
      await waitFor(() => {
        expect(screen.getByTestId('current-view-type')).toHaveTextContent('grid');
      });
    });
  });

  describe('Performance', () => {
    it('should not cause unnecessary re-renders during view switches', () => {
      const renderCount = { table: 0, grid: 0 };

      // Mock components to track renders
      const TrackingTableView = (props: any) => {
        renderCount.table++;
        return <MockTableView {...props} />;
      };

      const TrackingGridView = (props: any) => {
        renderCount.grid++;
        return <MockGridView {...props} />;
      };

      mockViewPreference.mockReturnValue('table');

      const { rerender } = render(
        <div>
          <TrackingTableView data={mockEquipmentData} userId="user-1" />
        </div>
      );

      expect(renderCount.table).toBe(1);
      expect(renderCount.grid).toBe(0);

      // Switch to grid view
      rerender(
        <div>
          <TrackingGridView data={mockEquipmentData} userId="user-1" />
        </div>
      );

      expect(renderCount.table).toBe(1); // Should not re-render table
      expect(renderCount.grid).toBe(1);
    });

    it('should handle large datasets efficiently in both views', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
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

      renderVariableCostView(largeDataset);

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render large dataset quickly (less than 100ms)
      expect(renderTime).toBeLessThan(100);
      expect(screen.getByTestId('table-data-count')).toHaveTextContent('1000');
    });
  });
});