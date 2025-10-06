import { startTransition } from 'react';

/**
 * Interface for defining state update operations
 */
export interface StateUpdateOperation<T = any> {
  type: 'loading' | 'optimistic' | 'error' | 'newRows' | 'newRowForm' | 'editingCells' | 'hoveredRows';
  key?: string;
  value?: T;
  updater?: (prev: T) => T;
}

/**
 * Interface for batched state update configuration
 */
export interface BatchedStateUpdateConfig {
  operations: StateUpdateOperation[];
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

/**
 * State setters interface for the table component
 */
export interface TableStateSetters {
  setLoadingStates: React.Dispatch<React.SetStateAction<{
    updating: Set<number>;
    creating: Set<string>;
    deleting: Set<number>;
  }>>;
  setOptimisticUpdates: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setNewRows?: React.Dispatch<React.SetStateAction<any[]>>;
  setNewRowForm?: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  setEditingCells?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setHoveredRows?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

/**
 * Custom hook for batched state updates using React's startTransition
 * This helps prevent infinite loops by batching related state updates together
 */
export function useBatchedStateUpdates(stateSetters: TableStateSetters) {
  const executeBatchedUpdate = (config: BatchedStateUpdateConfig) => {
    startTransition(() => {
      try {
        config.operations.forEach((operation) => {
          switch (operation.type) {
            case 'loading':
              if (operation.updater) {
                stateSetters.setLoadingStates(operation.updater);
              } else if (operation.value !== undefined) {
                stateSetters.setLoadingStates(operation.value);
              }
              break;

            case 'optimistic':
              if (operation.updater) {
                stateSetters.setOptimisticUpdates(operation.updater);
              } else if (operation.key && operation.value !== undefined) {
                stateSetters.setOptimisticUpdates(prev => ({
                  ...prev,
                  [operation.key!]: operation.value
                }));
              }
              break;

            case 'error':
              if (operation.updater) {
                stateSetters.setErrors(operation.updater);
              } else if (operation.key && operation.value !== undefined) {
                stateSetters.setErrors(prev => ({
                  ...prev,
                  [operation.key!]: operation.value
                }));
              }
              break;

            case 'newRows':
              if (stateSetters.setNewRows) {
                if (operation.updater) {
                  stateSetters.setNewRows(operation.updater);
                } else if (operation.value !== undefined) {
                  stateSetters.setNewRows(operation.value);
                }
              }
              break;

            case 'newRowForm':
              if (stateSetters.setNewRowForm) {
                if (operation.updater) {
                  stateSetters.setNewRowForm(operation.updater);
                } else if (operation.value !== undefined) {
                  stateSetters.setNewRowForm(operation.value);
                }
              }
              break;

            case 'editingCells':
              if (stateSetters.setEditingCells) {
                if (operation.updater) {
                  stateSetters.setEditingCells(operation.updater);
                } else if (operation.key && operation.value !== undefined) {
                  stateSetters.setEditingCells(prev => ({
                    ...prev,
                    [operation.key!]: operation.value
                  }));
                }
              }
              break;

            case 'hoveredRows':
              if (stateSetters.setHoveredRows) {
                if (operation.updater) {
                  stateSetters.setHoveredRows(operation.updater);
                } else if (operation.key && operation.value !== undefined) {
                  stateSetters.setHoveredRows(prev => ({
                    ...prev,
                    [operation.key!]: operation.value
                  }));
                }
              }
              break;

            default:
              console.warn(`Unknown state update operation type: ${operation.type}`);
          }
        });

        config.onComplete?.();
      } catch (error) {
        config.onError?.(error as Error);
      }
    });
  };

  return { executeBatchedUpdate };
}

/**
 * Helper functions for creating common state update operations
 */
export const createStateUpdateOperations = {
  /**
   * Create loading state update operation
   */
  loading: (type: 'updating' | 'creating' | 'deleting', id: number | string, loading: boolean): StateUpdateOperation => ({
    type: 'loading',
    updater: (prev: any) => ({
      ...prev,
      [type]: loading
        ? new Set([...prev[type], id])
        : new Set([...prev[type]].filter((item: any) => item !== id))
    })
  }),

  /**
   * Create optimistic update operation
   */
  optimistic: (key: string, value: any): StateUpdateOperation => ({
    type: 'optimistic',
    key,
    value
  }),

  /**
   * Create error state update operation
   */
  error: (key: string, error: string): StateUpdateOperation => ({
    type: 'error',
    key,
    value: error
  }),

  /**
   * Clear error state operation
   */
  clearError: (key: string): StateUpdateOperation => ({
    type: 'error',
    updater: (prev: Record<string, string>) => {
      const { [key]: removed, ...rest } = prev;
      return rest;
    }
  }),

  /**
   * Clear optimistic update operation
   */
  clearOptimistic: (key: string): StateUpdateOperation => ({
    type: 'optimistic',
    updater: (prev: Record<string, any>) => {
      const { [key]: removed, ...rest } = prev;
      return rest;
    }
  }),

  /**
   * Update editing cell state
   */
  editingCell: (cellKey: string, editing: boolean): StateUpdateOperation => ({
    type: 'editingCells',
    key: cellKey,
    value: editing
  }),

  /**
   * Update new row form data
   */
  newRowForm: (tempId: string, formData: any): StateUpdateOperation => ({
    type: 'newRowForm',
    updater: (prev: Record<string, any>) => ({
      ...prev,
      [tempId]: {
        ...prev[tempId],
        ...formData
      }
    })
  })
};