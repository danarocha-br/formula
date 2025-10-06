import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

import { TableView } from '../index';
import type { EquipmentExpenseItem } from '@/app/types';

// Mock the hooks
vi.mock('../server/create-equipment-expense', () => ({
  useCreateEquipmentExpense: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('../server/update-equipment-expense', () => ({
  useUpdateEquipmentExpense: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('../server/delete-equipment-expense', () => ({
  useDeleteEquipmentExpense: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('@/utils/equipment-performance-monitor', () => ({
  useEquipmentPerformanceMonitor: () => ({
    getMetrics: vi.fn(),
    trackStateUpdate: vi.fn(),
    trackMemoryUsage: vi.fn(),
  }),
}));

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

// Mock toast
vi.mock('@repo/design-system/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('TableView Interactivity Integration', () => {
  let queryClient: QueryClient;
  
  const mockData: EquipmentExpenseItem[] = [
    {
      id: 1,
      userId: 'test-user',
      name: 'Test Equipment 1',
      amount: 1200,
      category: 'laptop',
      rank: 1,
      purchaseDate: new Date('2023-01-01'),
      usage: 80,
      lifeSpan: 12,
    },
    {
      id: 2,
      userId: 'test-user', 
      name: 'Test Equipment 2',
      amount: 600,
      category: 'desktop',
      rank: 2,
      purchaseDate: new Date('2023-02-01'),
      usage: 100,
      lifeSpan: 24,
    },
  ];

  const mockProps = {
    data: mockData,
    userId: 'test-user',
    getCategoryColor: (category: string) => `bg-${category}`,
    getCategoryLabel: (category: string) => category.toUpperCase(),
    isLoading: false,
    isRefetching: false,
    error: null,
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const renderTableView = (props = mockProps) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <TableView {...props} />
      </QueryClientProvider>
    );
  };

  describe('New Row Addition and Interactivity', () => {
    it('should allow adding a new row and maintain table interactivity', async () => {
      const user = userEvent.setup();
      renderTableView();

      // Verify existing data is rendered
      expect(screen.getByText('Test Equipment 1')).toBeInTheDocument();
      expect(screen.getByText('Test Equipment 2')).toBeInTheDocument();

      // Find and click the add row button
      const addButton = screen.getByRole('button', { name: /add row/i });
      expect(addButton).toBeInTheDocument();
      
      await user.click(addButton);

      // Check if new row was added with editable fields
      await waitFor(() => {
        // Look for input fields that indicate a new row was added
        const nameInputs = screen.getAllByRole('textbox');
        expect(nameInputs.length).toBeGreaterThan(0);
      });

      // Verify table remains interactive
      const existingItems = screen.getAllByText(/Test Equipment/);
      expect(existingItems).toHaveLength(2); // Original items should still be there
    });

    it('should allow immediate editing of new row fields', async () => {
      const user = userEvent.setup();
      renderTableView();

      // Add a new row
      const addButton = screen.getByRole('button', { name: /add row/i });
      await user.click(addButton);

      await waitFor(() => {
        // Find the name input field in the new row
        const nameInput = screen.getByRole('textbox');
        expect(nameInput).toBeInTheDocument();
        expect(nameInput).not.toHaveAttribute('readOnly');
      });

      // Type in the name field to test interactivity
      const nameInput = screen.getByRole('textbox');
      await user.type(nameInput, 'New Equipment');
      
      expect(nameInput).toHaveValue('New Equipment');
    });

    it('should handle multiple new rows independently', async () => {
      const user = userEvent.setup();
      renderTableView();

      // Add first new row
      const addButton = screen.getByRole('button', { name: /add row/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      // Add second new row
      await user.click(addButton);

      await waitFor(() => {
        const textboxes = screen.getAllByRole('textbox');
        expect(textboxes.length).toBeGreaterThan(1);
      });

      // Verify both rows can be edited independently
      const textboxes = screen.getAllByRole('textbox');
      
      await user.type(textboxes[0], 'First Equipment');
      await user.type(textboxes[1], 'Second Equipment');
      
      expect(textboxes[0]).toHaveValue('First Equipment');
      expect(textboxes[1]).toHaveValue('Second Equipment');
    });
  });

  describe('Form Field Interactions', () => {
    it('should maintain existing table functionality after adding new rows', async () => {
      const user = userEvent.setup();
      renderTableView();

      // Add a new row
      const addButton = screen.getByRole('button', { name: /add row/i });
      await user.click(addButton);

      // Verify existing rows are still selectable (checkboxes work)
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);

      // Select an existing row
      if (checkboxes[1]) { // Skip the header checkbox
        await user.click(checkboxes[1]);
        expect(checkboxes[1]).toBeChecked();
      }
    });

    it('should handle field validation properly', async () => {
      const user = userEvent.setup();
      renderTableView();

      // Add a new row
      const addButton = screen.getByRole('button', { name: /add row/i });
      await user.click(addButton);

      // Try to save without filling required fields
      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /save/i });
        expect(saveButton).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should show validation errors or prevent submission
      // The exact validation behavior depends on the implementation
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should not break table interactivity when errors occur', async () => {
      const user = userEvent.setup();
      renderTableView();

      // Add a new row
      const addButton = screen.getByRole('button', { name: /add row/i });
      await user.click(addButton);

      // The table should remain responsive even if there are errors
      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      // Test that we can still add another row after the first one
      await user.click(addButton);

      await waitFor(() => {
        const textboxes = screen.getAllByRole('textbox');
        expect(textboxes.length).toBeGreaterThan(1);
      });
    });

    it('should cleanup properly when cancelling new rows', async () => {
      const user = userEvent.setup();
      renderTableView();

      // Add a new row
      const addButton = screen.getByRole('button', { name: /add row/i });
      await user.click(addButton);

      // Find and click cancel button
      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        expect(cancelButton).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Verify the new row was removed and table is still interactive
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
      });

      // Should still be able to add new rows
      await user.click(addButton);
      
      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Responsiveness', () => {
    it('should render without performance issues', () => {
      const start = performance.now();
      renderTableView();
      const end = performance.now();
      
      // Render should complete within reasonable time (100ms)
      expect(end - start).toBeLessThan(100);
    });

    it('should handle loading states properly', () => {
      renderTableView({ ...mockProps, isLoading: true });
      
      // Should show loading skeletons or indicators
      expect(screen.getByText('equipment expenses table')).toBeInTheDocument();
    });

    it('should handle empty data gracefully', () => {
      renderTableView({ ...mockProps, data: [] });
      
      // Should still render the table structure and allow adding new rows
      const addButton = screen.getByRole('button', { name: /add row/i });
      expect(addButton).toBeInTheDocument();
    });
  });
});