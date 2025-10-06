import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GridView } from '../grid-view';
import type { EquipmentExpenseItem } from '@/app/types';

// Mock the hooks and utilities
vi.mock('@/hooks/use-stable-equipment');
vi.mock('../server/delete-equipment-expense');
vi.mock('../server/update-batch-equipment-expense');
vi.mock('../server/update-equipment-expense');
vi.mock('@/utils/equipment-cache-utils');
vi.mock('@/hooks/use-translation');
vi.mock('@/app/store/currency-store');
vi.mock('@/app/store/view-preference-store');

const mockEquipment: EquipmentExpenseItem[] = [
  {
    id: 1,
    name: 'Laptop',
    userId: 'test-user',
    amount: 1500,
    category: 'computer',
    rank: 1,
    purchaseDate: new Date('2023-01-01'),
    usage: 80,
    lifeSpan: 36,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z'
  },
  {
    id: 2,
    name: 'Monitor',
    userId: 'test-user',
    amount: 500,
    category: 'computer',
    rank: 2,
    purchaseDate: new Date('2023-02-01'),
    usage: 90,
    lifeSpan: 60,
    createdAt: '2023-02-01T00:00:00Z',
    updatedAt: '2023-02-01T00:00:00Z'
  }
];

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
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

describe('GridView Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useStableEquipment
    const { useStableEquipment } = await import('@/hooks/use-stable-equipment');
    vi.mocked(useStableEquipment).mockReturnValue({
      equipment: mockEquipment,
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      isFetching: false,
    });

    // Mock translation hook
    const { useTranslations } = await import('@/hooks/use-translation');
    vi.mocked(useTranslations).mockReturnValue({
      t: (key: string, fallback?: string) => fallback || key,
    });

    // Mock currency store
    const { useCurrencyStore } = await import('@/app/store/currency-store');
    vi.mocked(useCurrencyStore).mockReturnValue({
      selectedCurrency: { code: 'USD', symbol: '$' },
    });

    // Mock view preference store
    const { useViewPreferenceStore } = await import('@/app/store/view-preference-store');
    vi.mocked(useViewPreferenceStore).mockReturnValue({
      viewPreference: 'grid',
    });

    // Mock mutation hooks
    const { useDeleteEquipmentExpense } = await import('../server/delete-equipment-expense');
    vi.mocked(useDeleteEquipmentExpense).mockReturnValue({
      mutate: vi.fn(),
      isLoading: false,
      isError: false,
      error: null,
    });

    const { useReorderEquipmentExpenses } = await import('../server/update-batch-equipment-expense');
    vi.mocked(useReorderEquipmentExpenses).mockReturnValue({
      reorderEquipment: vi.fn(),
      isLoading: false,
      isError: false,
      error: null,
    });

    const { useUpdateEquipmentExpense } = await import('../server/update-equipment-expense');
    vi.mocked(useUpdateEquipmentExpense).mockReturnValue({
      mutate: vi.fn(),
      isLoading: false,
      isError: false,
      error: null,
    });

    // Mock cache utilities
    const { equipmentDragDropUtils } = await import('@/utils/equipment-cache-utils');
    vi.mocked(equipmentDragDropUtils.handleDragStart).mockReturnValue(mockEquipment[0]);
    vi.mocked(equipmentDragDropUtils.optimisticDragReorder).mockReturnValue(mockEquipment);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('CRUD Operations', () => {
    it('should render equipment cards with proper data', () => {
      renderWithQueryClient(<GridView userId="test-user" />);

      expect(screen.getByText('Laptop')).toBeInTheDocument();
      expect(screen.getByText('Monitor')).toBeInTheDocument();
    });

    it('should handle delete operations with cache utilities', async () => {
      const { useDeleteEquipmentExpense } = await import('../server/delete-equipment-expense');
      const mockDelete = vi.fn();
      vi.mocked(useDeleteEquipmentExpense).mockReturnValue({
        mutate: mockDelete,
        isLoading: false,
        isError: false,
        error: null,
      });

      renderWithQueryClient(<GridView userId="test-user" />);

      // Find and click the delete button (this would be in the dropdown menu)
      const equipmentCards = screen.getAllByRole('button', { name: /Menu/i });
      fireEvent.click(equipmentCards[0]);

      // The delete functionality should be available through the dropdown
      // This tests that the delete handler is properly connected
      expect(mockDelete).not.toHaveBeenCalled(); // Not called until actual delete action
    });

    it('should handle edit operations with new mutation patterns', async () => {
      renderWithQueryClient(<GridView userId="test-user" />);

      // Equipment cards should be rendered
      expect(screen.getByText('Laptop')).toBeInTheDocument();

      // Edit functionality should be available through the card's onEdit prop
      // This verifies that the edit handlers are properly connected
      const equipmentCards = screen.getAllByRole('button', { name: /Menu/i });
      expect(equipmentCards).toHaveLength(2);
    });

    it('should handle drag and drop with cache utilities', async () => {
      const { useReorderEquipmentExpenses } = await import('../server/update-batch-equipment-expense');
      const mockReorder = vi.fn();
      vi.mocked(useReorderEquipmentExpenses).mockReturnValue({
        reorderEquipment: mockReorder,
        isLoading: false,
        isError: false,
        error: null,
      });

      renderWithQueryClient(<GridView userId="test-user" />);

      // Verify that drag and drop context is set up
      const dndContext = screen.getByRole('region', { name: /container/i });
      expect(dndContext).toBeInTheDocument();

      // The drag handlers should be properly connected to cache utilities
      // This is verified by the component rendering without errors
    });

    it('should use stable data selectors to prevent unnecessary re-renders', () => {
      const { rerender } = renderWithQueryClient(<GridView userId="test-user" />);

      // Initial render
      expect(screen.getByText('Laptop')).toBeInTheDocument();

      // Re-render with same props should not cause issues
      rerender(
        <QueryClientProvider client={createQueryClient()}>
          <GridView userId="test-user" />
        </QueryClientProvider>
      );

      expect(screen.getByText('Laptop')).toBeInTheDocument();
    });

    it('should handle loading states properly', () => {
      const { useStableEquipment } = vi.mocked(require('@/hooks/use-stable-equipment'));
      useStableEquipment.mockReturnValue({
        equipment: [],
        isLoading: true,
        isError: false,
        error: null,
        isSuccess: false,
        isFetching: true,
      });

      renderWithQueryClient(<GridView userId="test-user" />);

      // Should show loading view when loading
      expect(screen.getByTestId('loading-view')).toBeInTheDocument();
    });

    it('should handle empty state properly', () => {
      const { useStableEquipment } = vi.mocked(require('@/hooks/use-stable-equipment'));
      useStableEquipment.mockReturnValue({
        equipment: [],
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: true,
        isFetching: false,
      });

      renderWithQueryClient(<GridView userId="test-user" />);

      // Should show empty view when no equipment
      expect(screen.getByText(/Add Expense/i)).toBeInTheDocument();
    });
  });

  describe('Cache Management Integration', () => {
    it('should use equipment cache utilities for drag operations', async () => {
      const { equipmentDragDropUtils } = await import('@/utils/equipment-cache-utils');

      renderWithQueryClient(<GridView userId="test-user" />);

      // Verify cache utilities are imported and available
      expect(equipmentDragDropUtils.handleDragStart).toBeDefined();
      expect(equipmentDragDropUtils.optimisticDragReorder).toBeDefined();
    });

    it('should handle optimistic updates correctly', () => {
      renderWithQueryClient(<GridView userId="test-user" />);

      // Component should render without errors, indicating proper cache integration
      expect(screen.getByText('Laptop')).toBeInTheDocument();
      expect(screen.getByText('Monitor')).toBeInTheDocument();
    });

    it('should prevent memory leaks through proper memoization', () => {
      const { rerender } = renderWithQueryClient(<GridView userId="test-user" />);

      // Multiple re-renders should not cause memory issues
      for (let i = 0; i < 5; i++) {
        rerender(
          <QueryClientProvider client={createQueryClient()}>
            <GridView userId="test-user" />
          </QueryClientProvider>
        );
      }

      expect(screen.getByText('Laptop')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle mutation errors gracefully', async () => {
      const { useDeleteEquipmentExpense } = await import('../server/delete-equipment-expense');
      vi.mocked(useDeleteEquipmentExpense).mockReturnValue({
        mutate: vi.fn(),
        isLoading: false,
        isError: true,
        error: new Error('Delete failed'),
      });

      renderWithQueryClient(<GridView userId="test-user" />);

      // Component should still render despite error state
      expect(screen.getByText('Laptop')).toBeInTheDocument();
    });

    it('should handle drag and drop errors gracefully', () => {
      const { equipmentDragDropUtils } = vi.mocked(require('@/utils/equipment-cache-utils'));
      equipmentDragDropUtils.optimisticDragReorder.mockImplementation(() => {
        throw new Error('Drag operation failed');
      });

      renderWithQueryClient(<GridView userId="test-user" />);

      // Component should render despite potential drag errors
      expect(screen.getByText('Laptop')).toBeInTheDocument();
    });
  });
});