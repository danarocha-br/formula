import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TableView } from '../index';
import type { EquipmentExpenseItem } from '@/app/types';

// Mock the hooks and utilities
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
        'common.search': 'Search',
        'common.not-found': 'Not found',
        'common.accessibility.selectCategory': 'Select category',
        'expenses.success.created': 'Item created successfully!',
        'expenses.success.deleted': 'Item deleted successfully!',
        'validation.error.create-failed': 'Failed to create item',
        'validation.error.update-failed': 'Failed to update item',
        'validation.error.delete-failed': 'Failed to delete item',
        'validation.error.validation-failed': 'Validation failed',
        'validation.required.name': 'Name is required',
        'validation.required.category': 'Category is required',
        'validation.required.amount': 'Amount is required',
        'validation.required.lifespan': 'Lifespan is required',
        'forms.equipment.purchaseDate': 'Purchase Date',
        'forms.equipment.usage': 'Usage',
        'forms.equipment.lifespan': 'Lifespan',
        'common.period.years': 'years',
        'common.actions.save': 'Save',
        'common.actions.cancel': 'Cancel',
        'expenses.actions.delete': 'Delete'
      };
      return translations[key] || key;
    }
  })
}));

// Mock server actions with loading states
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

vi.mock('@repo/design-system/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

// Mock react-hook-form
vi.mock('react-hook-form', () => ({
  useForm: () => ({
    control: {},
    formState: { isDirty: false },
    reset: vi.fn(),
    setValue: vi.fn(),
    _getWatch: vi.fn(() => ({}))
  }),
  Controller: ({ render }: any) => render({ field: { value: '', onChange: vi.fn(), onBlur: vi.fn() } })
}));

const mockEquipmentData: EquipmentExpenseItem[] = [
  {
    id: 1,
    userId: 'user1',
    rank: 1,
    name: 'Laptop',
    amount: 1200,
    category: 'computer',
    purchaseDate: new Date('2023-01-01'),
    usage: 100,
    lifeSpan: 3
  }
];

const mockProps = {
  data: mockEquipmentData,
  userId: 'user1',
  getCategoryColor: (category: string) => 'bg-blue-500',
  getCategoryLabel: (category: string) => category,
  isLoading: false,
  isRefetching: false,
  error: null
};

describe('TableView Loading States and Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading skeleton when isLoading is true', () => {
    render(<TableView {...mockProps} isLoading={true} />);

    // Should show skeleton loading components
    expect(screen.getByTestId('table-skeleton')).toBeInTheDocument();
  });

  it('should show background refetch indicator when isRefetching is true', () => {
    render(<TableView {...mockProps} isRefetching={true} />);

    // Should show refetch indicator
    expect(screen.getByText('Updating...')).toBeInTheDocument();
  });

  it('should show inline loading states during CRUD operations', async () => {
    render(<TableView {...mockProps} />);

    // Mock a pending update operation
    vi.mocked(mockUpdateEquipmentExpense).mockImplementation((params, callbacks) => {
      // Simulate loading state
      setTimeout(() => callbacks?.onSuccess?.(), 100);
    });

    // Find and double-click on a name field to edit
    const nameField = screen.getByDisplayValue('Laptop');
    fireEvent.doubleClick(nameField);

    // Change the value
    fireEvent.change(nameField, { target: { value: 'New Laptop' } });
    fireEvent.blur(nameField);

    // Should show inline loading indicator
    await waitFor(() => {
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  it('should handle create operation errors with toast notifications', async () => {
    const mockToast = vi.fn();
    vi.mocked(require('@repo/design-system/hooks/use-toast').useToast).mockReturnValue({
      toast: mockToast
    });

    render(<TableView {...mockProps} />);

    // Mock create operation failure
    vi.mocked(mockCreateEquipmentExpense).mockImplementation((params, callbacks) => {
      callbacks?.onError?.(new Error('Create failed'));
    });

    // Add a new row
    const addButton = screen.getByText('Add row');
    fireEvent.click(addButton);

    // Fill in the form and trigger save
    // This would trigger the create operation which will fail

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Failed to create item',
        description: 'Create failed',
        variant: 'destructive'
      });
    });
  });

  it('should handle update operation errors with rollback', async () => {
    const mockToast = vi.fn();
    const mockReset = vi.fn();

    vi.mocked(require('@repo/design-system/hooks/use-toast').useToast).mockReturnValue({
      toast: mockToast
    });

    vi.mocked(require('react-hook-form').useForm).mockReturnValue({
      control: {},
      formState: { isDirty: true },
      reset: mockReset,
      setValue: vi.fn(),
      _getWatch: vi.fn(() => ({}))
    });

    render(<TableView {...mockProps} />);

    // Mock update operation failure
    vi.mocked(mockUpdateEquipmentExpense).mockImplementation((params, callbacks) => {
      callbacks?.onError?.(new Error('Update failed'));
    });

    // Find and edit a field
    const nameField = screen.getByDisplayValue('Laptop');
    fireEvent.doubleClick(nameField);
    fireEvent.change(nameField, { target: { value: 'New Laptop' } });
    fireEvent.blur(nameField);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Failed to update item',
        description: 'Update failed',
        variant: 'destructive'
      });
      // Should rollback the form value
      expect(mockReset).toHaveBeenCalled();
    });
  });

  it('should handle delete operation errors with optimistic update rollback', async () => {
    const mockToast = vi.fn();

    vi.mocked(require('@repo/design-system/hooks/use-toast').useToast).mockReturnValue({
      toast: mockToast
    });

    render(<TableView {...mockProps} />);

    // Mock delete operation failure
    vi.mocked(mockDeleteEquipmentExpense).mockImplementation((params, callbacks) => {
      callbacks?.onError?.(new Error('Delete failed'));
    });

    // Find and click delete button
    const deleteButton = screen.getByLabelText('Delete');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Failed to delete item',
        description: 'Delete failed',
        variant: 'destructive'
      });
    });
  });

  it('should show validation errors for new rows', async () => {
    render(<TableView {...mockProps} />);

    // Add a new row
    const addButton = screen.getByText('Add row');
    fireEvent.click(addButton);

    // Try to save without filling required fields
    const saveButton = screen.getByLabelText('Save');
    fireEvent.click(saveButton);

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/Name is required/)).toBeInTheDocument();
    });
  });

  it('should clear errors after successful operations', async () => {
    const mockToast = vi.fn();

    vi.mocked(require('@repo/design-system/hooks/use-toast').useToast).mockReturnValue({
      toast: mockToast
    });

    render(<TableView {...mockProps} />);

    // Mock successful update operation
    vi.mocked(mockUpdateEquipmentExpense).mockImplementation((params, callbacks) => {
      callbacks?.onSuccess?.();
    });

    // Edit a field successfully
    const nameField = screen.getByDisplayValue('Laptop');
    fireEvent.doubleClick(nameField);
    fireEvent.change(nameField, { target: { value: 'New Laptop' } });
    fireEvent.blur(nameField);

    // Should not show any error messages
    await waitFor(() => {
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });
  });
});