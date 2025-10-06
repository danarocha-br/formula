import { useCallback, useRef, useMemo } from 'react';
import { startTransition } from 'react';

/**
 * Interface for form field update operations
 */
export interface FormFieldUpdate {
  field: string;
  value: any;
}

/**
 * Interface for batched form updates
 */
export interface BatchedFormUpdate {
  tempId: string;
  updates: Record<string, any>;
}

/**
 * Configuration for debounced form state management
 */
export interface DebouncedFormConfig {
  debounceMs?: number;
  batchSize?: number;
  onUpdate?: (tempId: string, updates: Record<string, any>) => void;
}

/**
 * Custom hook for managing debounced form state updates
 * Reduces unnecessary re-renders by batching and debouncing form field changes
 */
export function useDebouncedFormState(
  setNewRowForm: React.Dispatch<React.SetStateAction<Record<string, any>>>,
  config: DebouncedFormConfig = {}
) {
  const {
    debounceMs = 300,
    batchSize = 5,
    onUpdate
  } = config;

  // Store pending updates for each form
  const pendingUpdatesRef = useRef<Record<string, Record<string, any>>>({});
  const timeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
  const updateCountRef = useRef<Record<string, number>>({});

  /**
   * Flush pending updates for a specific form
   */
  const flushUpdates = useCallback((tempId: string) => {
    const updates = pendingUpdatesRef.current[tempId];
    if (!updates || Object.keys(updates).length === 0) return;

    // Clear the pending updates
    delete pendingUpdatesRef.current[tempId];
    delete updateCountRef.current[tempId];

    // Clear any existing timeout
    if (timeoutRef.current[tempId]) {
      clearTimeout(timeoutRef.current[tempId]);
      delete timeoutRef.current[tempId];
    }

    // Apply the batched updates using startTransition
    startTransition(() => {
      setNewRowForm(prev => ({
        ...prev,
        [tempId]: {
          ...prev[tempId],
          ...updates
        }
      }));

      // Call the optional callback
      onUpdate?.(tempId, updates);
    });
  }, [setNewRowForm, onUpdate]);

  /**
   * Schedule a debounced update for a form field
   */
  const scheduleUpdate = useCallback((tempId: string, field: string, value: any) => {
    // Initialize pending updates for this form if needed
    if (!pendingUpdatesRef.current[tempId]) {
      pendingUpdatesRef.current[tempId] = {};
      updateCountRef.current[tempId] = 0;
    }

    // Add the update to pending updates
    pendingUpdatesRef.current[tempId][field] = value;
    updateCountRef.current[tempId] = (updateCountRef.current[tempId] || 0) + 1;

    // Clear existing timeout
    if (timeoutRef.current[tempId]) {
      clearTimeout(timeoutRef.current[tempId]);
    }

    // Check if we should flush immediately due to batch size
    if (updateCountRef.current[tempId] >= batchSize) {
      flushUpdates(tempId);
      return;
    }

    // Schedule debounced flush
    timeoutRef.current[tempId] = setTimeout(() => {
      flushUpdates(tempId);
    }, debounceMs);
  }, [flushUpdates, debounceMs, batchSize]);

  /**
   * Update a single form field with debouncing
   */
  const updateFormField = useCallback((tempId: string, field: string, value: any) => {
    scheduleUpdate(tempId, field, value);
  }, [scheduleUpdate]);

  /**
   * Update multiple form fields at once
   */
  const updateFormFields = useCallback((tempId: string, updates: Record<string, any>) => {
    Object.entries(updates).forEach(([field, value]) => {
      scheduleUpdate(tempId, field, value);
    });
  }, [scheduleUpdate]);

  /**
   * Immediately flush all pending updates for a form
   */
  const flushFormUpdates = useCallback((tempId: string) => {
    flushUpdates(tempId);
  }, [flushUpdates]);

  /**
   * Immediately flush all pending updates for all forms
   */
  const flushAllUpdates = useCallback(() => {
    Object.keys(pendingUpdatesRef.current).forEach(tempId => {
      flushUpdates(tempId);
    });
  }, [flushUpdates]);

  /**
   * Clear all pending updates for a form (useful when removing a form)
   */
  const clearFormUpdates = useCallback((tempId: string) => {
    delete pendingUpdatesRef.current[tempId];
    delete updateCountRef.current[tempId];

    if (timeoutRef.current[tempId]) {
      clearTimeout(timeoutRef.current[tempId]);
      delete timeoutRef.current[tempId];
    }
  }, []);

  /**
   * Get current pending updates for a form (useful for debugging)
   */
  const getPendingUpdates = useCallback((tempId: string) => {
    return pendingUpdatesRef.current[tempId] || {};
  }, []);

  /**
   * Check if a form has pending updates
   */
  const hasPendingUpdates = useCallback((tempId: string) => {
    const updates = pendingUpdatesRef.current[tempId];
    return Boolean(updates && Object.keys(updates).length > 0);
  }, []);

  // Memoize the return object to prevent unnecessary re-renders
  return useMemo(() => ({
    updateFormField,
    updateFormFields,
    flushFormUpdates,
    flushAllUpdates,
    clearFormUpdates,
    getPendingUpdates,
    hasPendingUpdates
  }), [
    updateFormField,
    updateFormFields,
    flushFormUpdates,
    flushAllUpdates,
    clearFormUpdates,
    getPendingUpdates,
    hasPendingUpdates
  ]);
}

/**
 * Higher-order component for form field optimization
 * Provides optimized handlers for common form field patterns
 */
export function useOptimizedFormHandlers(
  debouncedForm: ReturnType<typeof useDebouncedFormState>
) {
  /**
   * Create an optimized handler for text input fields
   */
  const createTextFieldHandler = useCallback((tempId: string, fieldName: string) => {
    return (value: string) => {
      debouncedForm.updateFormField(tempId, fieldName, value);
    };
  }, [debouncedForm]);

  /**
   * Create an optimized handler for number input fields
   */
  const createNumberFieldHandler = useCallback((tempId: string, fieldName: string, relatedFields?: Record<string, (value: number) => any>) => {
    return (value: number) => {
      const updates: Record<string, any> = { [fieldName]: value };

      // Calculate related fields if provided
      if (relatedFields) {
        Object.entries(relatedFields).forEach(([relatedField, calculator]) => {
          updates[relatedField] = calculator(value);
        });
      }

      debouncedForm.updateFormFields(tempId, updates);
    };
  }, [debouncedForm]);

  /**
   * Create an optimized handler for date fields
   */
  const createDateFieldHandler = useCallback((tempId: string, fieldName: string) => {
    return (date: Date) => {
      debouncedForm.updateFormField(tempId, fieldName, date);
    };
  }, [debouncedForm]);

  /**
   * Create an optimized handler for select/dropdown fields
   */
  const createSelectFieldHandler = useCallback((tempId: string, fieldName: string) => {
    return (option: any) => {
      debouncedForm.updateFormField(tempId, fieldName, option);
    };
  }, [debouncedForm]);

  return useMemo(() => ({
    createTextFieldHandler,
    createNumberFieldHandler,
    createDateFieldHandler,
    createSelectFieldHandler
  }), [
    createTextFieldHandler,
    createNumberFieldHandler,
    createDateFieldHandler,
    createSelectFieldHandler
  ]);
}