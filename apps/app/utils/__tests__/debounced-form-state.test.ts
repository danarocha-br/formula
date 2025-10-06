import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useDebouncedFormState, useOptimizedFormHandlers } from '../debounced-form-state';

// Mock timers
vi.useFakeTimers();

describe('useDebouncedFormState', () => {
  let mockSetNewRowForm: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSetNewRowForm = vi.fn();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.clearAllMocks();
  });

  it('should debounce form field updates', async () => {
    const { result } = renderHook(() =>
      useDebouncedFormState(mockSetNewRowForm, { debounceMs: 300 })
    );

    // Update a field multiple times quickly
    act(() => {
      result.current.updateFormField('temp-1', 'name', 'Test 1');
      result.current.updateFormField('temp-1', 'name', 'Test 2');
      result.current.updateFormField('temp-1', 'name', 'Test 3');
    });

    // Should not have called setNewRowForm yet
    expect(mockSetNewRowForm).not.toHaveBeenCalled();

    // Fast-forward time to trigger debounced update
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Should have called setNewRowForm once with the latest value
    expect(mockSetNewRowForm).toHaveBeenCalledTimes(1);
    expect(mockSetNewRowForm).toHaveBeenCalledWith(expect.any(Function));

    // Test the updater function
    const updaterFn = mockSetNewRowForm.mock.calls[0][0];
    const result_state = updaterFn({ 'temp-1': { existingField: 'value' } });
    expect(result_state).toEqual({
      'temp-1': {
        existingField: 'value',
        name: 'Test 3'
      }
    });
  });

  it('should batch multiple field updates', async () => {
    const { result } = renderHook(() =>
      useDebouncedFormState(mockSetNewRowForm, { debounceMs: 300 })
    );

    // Update multiple fields
    act(() => {
      result.current.updateFormField('temp-1', 'name', 'Test Name');
      result.current.updateFormField('temp-1', 'amount', 100);
      result.current.updateFormField('temp-1', 'category', 'computer');
    });

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Should have called setNewRowForm once with all updates
    expect(mockSetNewRowForm).toHaveBeenCalledTimes(1);

    const updaterFn = mockSetNewRowForm.mock.calls[0][0];
    const result_state = updaterFn({});
    expect(result_state).toEqual({
      'temp-1': {
        name: 'Test Name',
        amount: 100,
        category: 'computer'
      }
    });
  });

  it('should flush immediately when batch size is reached', async () => {
    const { result } = renderHook(() =>
      useDebouncedFormState(mockSetNewRowForm, { debounceMs: 300, batchSize: 3 })
    );

    // Update fields up to batch size
    act(() => {
      result.current.updateFormField('temp-1', 'field1', 'value1');
      result.current.updateFormField('temp-1', 'field2', 'value2');
      result.current.updateFormField('temp-1', 'field3', 'value3'); // Should trigger immediate flush
    });

    // Should have called setNewRowForm immediately without waiting for debounce
    expect(mockSetNewRowForm).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple forms independently', async () => {
    const { result } = renderHook(() =>
      useDebouncedFormState(mockSetNewRowForm, { debounceMs: 300 })
    );

    // Update different forms
    act(() => {
      result.current.updateFormField('temp-1', 'name', 'Form 1');
      result.current.updateFormField('temp-2', 'name', 'Form 2');
    });

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Should have called setNewRowForm twice, once for each form
    expect(mockSetNewRowForm).toHaveBeenCalledTimes(2);
  });

  it('should support updateFormFields for multiple field updates', async () => {
    const { result } = renderHook(() =>
      useDebouncedFormState(mockSetNewRowForm, { debounceMs: 300 })
    );

    // Update multiple fields at once
    act(() => {
      result.current.updateFormFields('temp-1', {
        name: 'Test Name',
        amount: 100,
        category: 'computer'
      });
    });

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(mockSetNewRowForm).toHaveBeenCalledTimes(1);

    const updaterFn = mockSetNewRowForm.mock.calls[0][0];
    const result_state = updaterFn({});
    expect(result_state).toEqual({
      'temp-1': {
        name: 'Test Name',
        amount: 100,
        category: 'computer'
      }
    });
  });

  it('should flush updates immediately when requested', async () => {
    const { result } = renderHook(() =>
      useDebouncedFormState(mockSetNewRowForm, { debounceMs: 300 })
    );

    // Update a field
    act(() => {
      result.current.updateFormField('temp-1', 'name', 'Test Name');
    });

    // Flush immediately
    act(() => {
      result.current.flushFormUpdates('temp-1');
    });

    // Should have called setNewRowForm immediately
    expect(mockSetNewRowForm).toHaveBeenCalledTimes(1);
  });

  it('should clear form updates when requested', async () => {
    const { result } = renderHook(() =>
      useDebouncedFormState(mockSetNewRowForm, { debounceMs: 300 })
    );

    // Update a field
    act(() => {
      result.current.updateFormField('temp-1', 'name', 'Test Name');
    });

    // Clear updates
    act(() => {
      result.current.clearFormUpdates('temp-1');
    });

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Should not have called setNewRowForm
    expect(mockSetNewRowForm).not.toHaveBeenCalled();
  });

  it('should track pending updates correctly', async () => {
    const { result } = renderHook(() =>
      useDebouncedFormState(mockSetNewRowForm, { debounceMs: 300 })
    );

    // Initially no pending updates
    expect(result.current.hasPendingUpdates('temp-1')).toBe(false);
    expect(result.current.getPendingUpdates('temp-1')).toEqual({});

    // Add some updates
    act(() => {
      result.current.updateFormField('temp-1', 'name', 'Test Name');
      result.current.updateFormField('temp-1', 'amount', 100);
    });

    // Should have pending updates
    expect(result.current.hasPendingUpdates('temp-1')).toBe(true);
    expect(result.current.getPendingUpdates('temp-1')).toEqual({
      name: 'Test Name',
      amount: 100
    });

    // Flush updates
    act(() => {
      result.current.flushFormUpdates('temp-1');
    });

    // Should no longer have pending updates
    expect(result.current.hasPendingUpdates('temp-1')).toBe(false);
    expect(result.current.getPendingUpdates('temp-1')).toEqual({});
  });

  it('should call onUpdate callback when provided', async () => {
    const mockOnUpdate = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedFormState(mockSetNewRowForm, {
        debounceMs: 300,
        onUpdate: mockOnUpdate
      })
    );

    // Update a field
    act(() => {
      result.current.updateFormField('temp-1', 'name', 'Test Name');
    });

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Should have called the callback
    expect(mockOnUpdate).toHaveBeenCalledTimes(1);
    expect(mockOnUpdate).toHaveBeenCalledWith('temp-1', { name: 'Test Name' });
  });
});

describe('useOptimizedFormHandlers', () => {
  let mockDebouncedForm: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockDebouncedForm = {
      updateFormField: vi.fn(),
      updateFormFields: vi.fn(),
      flushFormUpdates: vi.fn(),
      flushAllUpdates: vi.fn(),
      clearFormUpdates: vi.fn(),
      getPendingUpdates: vi.fn(),
      hasPendingUpdates: vi.fn()
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create text field handler', () => {
    const { result } = renderHook(() =>
      useOptimizedFormHandlers(mockDebouncedForm as any)
    );

    const handler = result.current.createTextFieldHandler('temp-1', 'name');

    act(() => {
      handler('Test Name');
    });

    expect(mockDebouncedForm.updateFormField).toHaveBeenCalledWith('temp-1', 'name', 'Test Name');
  });

  it('should create number field handler with related fields', () => {
    const { result } = renderHook(() =>
      useOptimizedFormHandlers(mockDebouncedForm as any)
    );

    const handler = result.current.createNumberFieldHandler('temp-1', 'amountPerMonth', {
      amountPerYear: (value: number) => value * 12
    });

    act(() => {
      handler(100);
    });

    expect(mockDebouncedForm.updateFormFields).toHaveBeenCalledWith('temp-1', {
      amountPerMonth: 100,
      amountPerYear: 1200
    });
  });

  it('should create date field handler', () => {
    const { result } = renderHook(() =>
      useOptimizedFormHandlers(mockDebouncedForm as any)
    );

    const testDate = new Date('2024-01-01');
    const handler = result.current.createDateFieldHandler('temp-1', 'purchaseDate');

    act(() => {
      handler(testDate);
    });

    expect(mockDebouncedForm.updateFormField).toHaveBeenCalledWith('temp-1', 'purchaseDate', testDate);
  });

  it('should create select field handler', () => {
    const { result } = renderHook(() =>
      useOptimizedFormHandlers(mockDebouncedForm as any)
    );

    const option = { value: 'computer', label: 'Computer' };
    const handler = result.current.createSelectFieldHandler('temp-1', 'category');

    act(() => {
      handler(option);
    });

    expect(mockDebouncedForm.updateFormField).toHaveBeenCalledWith('temp-1', 'category', option);
  });
});