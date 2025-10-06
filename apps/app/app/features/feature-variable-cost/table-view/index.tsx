import type { ColumnDef } from "@tanstack/react-table";
import { cva } from "class-variance-authority";
import React, { useCallback, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { useEquipmentPerformanceMonitor } from "@/utils/equipment-performance-monitor";

import { useCurrencyStore } from "@/app/store/currency-store";
import { useTranslations } from "@/hooks/use-translation";
import { formatCurrency } from "@/utils/format-currency";
import { DeleteIcon } from "@repo/design-system/components/ui/animated-icon/delete";
import { Button } from "@repo/design-system/components/ui/button";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import { Combobox } from "@repo/design-system/components/ui/combobox";
import { DatePicker } from "@repo/design-system/components/ui/date-picker";
import { Icon, type iconPath } from "@repo/design-system/components/ui/icon";
import { iconbutton } from "@repo/design-system/components/ui/icon-button";
import { Input } from "@repo/design-system/components/ui/input";
import { NumberInput } from "@repo/design-system/components/ui/number-input";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { useToast } from "@repo/design-system/hooks/use-toast";
import { cn } from "@repo/design-system/lib/utils";
import {
  TableSkeleton as GenericTableSkeleton,
  InlineLoading,
  BackgroundRefetchIndicator
} from "@repo/design-system/components/ui/query-loading-states";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@repo/design-system/components/ui/dialog";

import { EQUIPMENT_COST_CATEGORIES } from "@/app/constants";
import type { EquipmentExpenseItem } from "@/app/types";

import { useCreateEquipmentExpense } from "../server/create-equipment-expense";
import { useUpdateEquipmentExpense } from "../server/update-equipment-expense";
import { useDeleteEquipmentExpense } from "../server/delete-equipment-expense";
import { DataTable } from "./data-table";
import type { EquipmentExpense, EquipmentCategoryOption, NewEquipmentExpense } from "./types";

// Simplified form schema for all table data
type TableFormData = {
  // Existing rows (for inline editing)
  existingRows: Record<number, {
    name: string;
    category: string;
    amountPerMonth: number;
    amountPerYear: number;
    purchaseDate: Date;
    usage: number;
    lifeSpan: number;
  }>;
  // New rows (for creation)
  newRows: Record<string, {
    name: string;
    category: string;
    amountPerMonth: number;
    purchaseDate: Date;
    usage: number;
    lifeSpan: number;
  }>;
};

type TableViewProps = {
  data: EquipmentExpenseItem[];
  userId: string;
  getCategoryColor: (category: string) => string;
  getCategoryLabel: (category: string) => string;
  isLoading?: boolean;
  isRefetching?: boolean;
  error?: Error | null;
};

const inputStyles = cva([
  "text-md",
  "w-full",
  "rounded-sm",
  "bg-transparent",
  "border",
  "border-transparent",
  "px-2",
  "py-1",
  "transition-all",
  "duration-200",
  "ease-in-out",

  "hover:bg-card/50",
  "hover:border-muted/30",

  "focus:border-primary",
  "focus:bg-card",
  "focus:ring-1",
  "focus:ring-primary/20",
  "focus:outline-none",

  "read-only:bg-transparent",
  "read-only:hover:bg-transparent",
  "read-only:border-transparent",
  "read-only:cursor-default",

  "disabled:opacity-50",
  "disabled:cursor-not-allowed",
]);

// Enhanced skeleton components for different loading states with improved styling and memoization
const TableCellSkeleton = React.memo(({ width = "min-w-40" }: { width?: string }) => {
  return (
    <div className="w-full px-2 py-1">
      <Skeleton className={cn("h-4 bg-muted/30 rounded-sm animate-pulse", width)} />
    </div>
  );
});

const TableRowSkeleton = React.memo(() => {
  return (
    <div className="flex items-center space-x-4 p-2 border-b border-muted/15 bg-card/20 animate-pulse">
      <Skeleton className="h-4 w-6 rounded-sm bg-muted/30" /> {/* Checkbox */}
      <Skeleton className="h-8 w-[150px] rounded-sm bg-muted/30" /> {/* Category */}
      <Skeleton className="h-4 w-[200px] rounded-sm bg-muted/30" /> {/* Name */}
      <Skeleton className="h-4 w-[120px] rounded-sm bg-muted/30" /> {/* Amount per month */}
      <Skeleton className="h-4 w-[120px] rounded-sm bg-muted/30" /> {/* Amount per year */}
      <Skeleton className="h-4 w-[100px] rounded-sm bg-muted/30" /> {/* Purchase date */}
      <Skeleton className="h-4 w-[80px] rounded-sm bg-muted/30" /> {/* Usage */}
      <Skeleton className="h-4 w-[80px] rounded-sm bg-muted/30" /> {/* Lifespan */}
      <Skeleton className="h-8 w-8 rounded-sm bg-muted/30" /> {/* Actions */}
    </div>
  );
});

// Memoized skeleton components for better performance
const TableLoadingSkeleton = React.memo(({ rows = 5 }: { rows?: number }) => {
  return (
    <div className="space-y-1 rounded-md border border-muted/15 overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} />
      ))}
    </div>
  );
});



export const TableView = ({
  data,
  getCategoryColor,
  getCategoryLabel,
  userId,
  isLoading = false,
  isRefetching = false,
  error = null,
}: TableViewProps) => {
  const { selectedCurrency } = useCurrencyStore();
  const { t } = useTranslations();
  const { toast } = useToast();

  // Performance monitoring for infinite loop detection and performance tracking
  const { getMetrics, trackStateUpdate, trackMemoryUsage } = useEquipmentPerformanceMonitor('EquipmentTableView');

  // Simplified form state management with React Hook Form
  const {
    control,
    formState: { isDirty, errors: formErrors },
    reset,
    setValue,
    watch,
    handleSubmit,
    unregister,
  } = useForm<TableFormData>({
    defaultValues: {
      existingRows: {},
      newRows: {},
    },
  });

  const { mutate: updateEquipmentExpense, isPending: isUpdating } = useUpdateEquipmentExpense();
  const { mutate: createEquipmentExpense, isPending: isCreating } = useCreateEquipmentExpense();
  const { mutate: deleteEquipmentExpense, isPending: isDeleting } = useDeleteEquipmentExpense();

  // Minimal UI state
  const [uiState, setUiState] = useState<{
    loading: {
      creating: Set<string>;
      updating: Set<number>;
      deleting: Set<number>;
    };
    editing: Set<string>; // cellKey format: "field-rowId"
    errors: Record<string, string>;
  }>({
    loading: {
      creating: new Set(),
      updating: new Set(),
      deleting: new Set(),
    },
    editing: new Set(),
    errors: {},
  });

  // State for managing temporary new rows with conflict prevention
  const [newRows, setNewRows] = useState<NewEquipmentExpense[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // State for row hover effects
  const [hoveredRows, setHoveredRows] = useState<Set<string>>(new Set());

  // State for preventing concurrent operations on the same item
  const [operationQueue, setOperationQueue] = useState<Set<string>>(new Set());

  // Helper functions for managing concurrent operations
  const addToOperationQueue = useCallback((operationKey: string) => {
    setOperationQueue(prev => new Set([...prev, operationKey]));
  }, []);

  const removeFromOperationQueue = useCallback((operationKey: string) => {
    setOperationQueue(prev => {
      const newSet = new Set(prev);
      newSet.delete(operationKey);
      return newSet;
    });
  }, []);

  const isOperationInQueue = useCallback((operationKey: string) => {
    return operationQueue.has(operationKey);
  }, [operationQueue]);

  // Memoized helper functions for row hover state
  const isRowHovered = useCallback((rowKey: string) => {
    return hoveredRows.has(rowKey);
  }, [hoveredRows]);

  const setRowHovered = useCallback((rowKey: string, hovered: boolean) => {
    setHoveredRows(prev => {
      const newSet = new Set(prev);
      if (hovered) {
        newSet.add(rowKey);
      } else {
        newSet.delete(rowKey);
      }
      return newSet;
    });
  }, []);

  // Memoized handlers cache to avoid recreating handlers during render
  const handlersCache = useMemo(() => new Map(), []);

  // Temporarily disabled complex handlers to isolate the infinite loop
  const createOptimizedHandlers = useCallback((tempId: string) => {
    return {
      handleNameChange: () => console.log('handleNameChange called'),
      handleCategoryChange: () => console.log('handleCategoryChange called'),
      handleAmountPerMonthChange: () => console.log('handleAmountPerMonthChange called'),
      handleAmountPerYearChange: () => console.log('handleAmountPerYearChange called'),
      handlePurchaseDateChange: () => console.log('handlePurchaseDateChange called'),
      handleUsageChange: () => console.log('handleUsageChange called'),
      handleLifeSpanChange: () => console.log('handleLifeSpanChange called'),
    };
  }, []);

  // Memoized helper functions for UI state management
  const setItemLoading = useCallback((type: 'updating' | 'creating' | 'deleting', id: number | string, loading: boolean) => {
    trackStateUpdate(`setItemLoading-${type}`);
    setUiState(prev => ({
      ...prev,
      loading: {
        ...prev.loading,
        [type]: loading
          ? new Set([...prev.loading[type], id])
          : new Set([...prev.loading[type]].filter(item => item !== id))
      }
    }));
  }, [trackStateUpdate]);

  const isItemLoading = useCallback((type: 'updating' | 'creating' | 'deleting', id: number | string) => {
    return uiState.loading[type].has(id as any);
  }, [uiState.loading]);

  const setEditingCell = useCallback((cellKey: string, editing: boolean) => {
    trackStateUpdate('setEditingCell');
    setUiState(prev => ({
      ...prev,
      editing: editing
        ? new Set([...prev.editing, cellKey])
        : new Set([...prev.editing].filter(key => key !== cellKey))
    }));
  }, [trackStateUpdate]);

  const isEditingCell = useCallback((cellKey: string) => {
    return uiState.editing.has(cellKey);
  }, [uiState.editing]);

  const setFieldError = useCallback((field: string, error: string) => {
    setUiState(prev => ({
      ...prev,
      errors: { ...prev.errors, [field]: error }
    }));
    // Clear error after 5 seconds
    const timeoutId = setTimeout(() => {
      setUiState(prev => ({
        ...prev,
        errors: { ...prev.errors, [field]: undefined }
      }));
    }, 5000);
    
    // Return cleanup function to allow cancelling if needed
    return () => clearTimeout(timeoutId);
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setUiState(prev => ({
      ...prev,
      errors: { ...prev.errors, [field]: undefined }
    }));
  }, []);

  // State for managing bulk selection and delete operations
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);

  // Ultra-simplified addNewRow to isolate the infinite loop issue
  // TEMPORARILY DISABLED - Complex inline editing causing infinite loops
  const addNewRow = useCallback(() => {
    alert("Add new row functionality temporarily disabled. A simple form will be implemented to replace the problematic inline editing.");
  }, []);

  const removeNewRow = useCallback((tempId: string) => {
    trackStateUpdate('removeNewRow');

    // Remove from new rows list
    setNewRows(prev => prev.filter(row => row.id !== tempId));

    // Remove all form field registrations for this row
    unregister(`newRows.${tempId}`);
    unregister(`equipment.${tempId}`);

    // Clean up handlers cache
    handlersCache.delete(tempId);

    // Clear any editing states for this row
    setUiState(prev => ({
      ...prev,
      editing: new Set([...prev.editing].filter(key => !key.includes(tempId))),
      errors: Object.keys(prev.errors).reduce((acc, key) => {
        if (!key.includes(tempId)) {
          acc[key] = prev.errors[key];
        }
        return acc;
      }, {} as Record<string, string>)
    }));
  }, [trackStateUpdate, unregister, handlersCache]);

  // Enhanced validation with better error messages
  const validateNewRow = useCallback((formData: any) => {
    const errors: string[] = [];

    if (!formData.name || formData.name.trim() === "") {
      errors.push(t("validation.required.name"));
    }

    if (!formData.category || !formData.category.value) {
      errors.push(t("validation.required.category"));
    }

    if (!formData.amountPerMonth || formData.amountPerMonth <= 0) {
      errors.push(t("validation.required.amount"));
    }

    if (!formData.lifeSpan || formData.lifeSpan <= 0) {
      errors.push(t("validation.required.lifespan"));
    }

    if (!formData.purchaseDate) {
      errors.push("Purchase date is required");
    }

    if (formData.usage && (formData.usage < 0 || formData.usage > 100)) {
      errors.push("Usage must be between 0 and 100 hours per month");
    }

    return errors;
  }, [t]);

  // Enhanced submit function with concurrent operation prevention
  const submitNewRow = useCallback((tempId: string) => {
    const operationKey = `submit-${tempId}`;
    
    // Check if operation is already in progress
    if (isOperationInQueue(operationKey)) {
      toast({
        title: "Operation in progress",
        description: "This row is already being submitted",
        variant: "default",
      });
      return;
    }

    // Get current form data from React Hook Form
    const formData = watch(`newRows.${tempId}`);
    if (!formData) {
      toast({
        title: "Error",
        description: "No form data found for this row",
        variant: "destructive",
      });
      return;
    }

    // Validate required fields
    const errors = validateNewRow(formData);
    if (errors.length > 0) {
      setFieldError(`newRow.${tempId}`, errors.join(", "));
      toast({
        title: t("validation.error.validation-failed"),
        description: errors.join(", "),
        variant: "destructive",
      });
      return;
    }

    // Calculate total amount from monthly amount and lifespan
    const totalAmount = formData.amountPerMonth * formData.lifeSpan;
    const currentRank = data.length + newRows.length;

    // Batch all state updates to prevent cascade
    React.startTransition(() => {
      addToOperationQueue(operationKey);
      setItemLoading('creating', tempId, true);
      clearFieldError(`newRow.${tempId}`);
    });

    // Prepare submission data with proper type handling
    const submissionData = {
      userId,
      name: formData.name.trim(),
      amount: totalAmount,
      category: formData.category?.value || formData.category,
      rank: currentRank,
      purchaseDate: formData.purchaseDate instanceof Date 
        ? formData.purchaseDate.toISOString() 
        : new Date(formData.purchaseDate).toISOString(),
      usage: Number(formData.usage) || 100,
      lifeSpan: Number(formData.lifeSpan) || 1,
    };

    createEquipmentExpense({
      json: submissionData,
    }, {
      onSuccess: () => {
        // Batch all cleanup state updates to prevent cascade
        React.startTransition(() => {
          removeFromOperationQueue(operationKey);
          setItemLoading('creating', tempId, false);
          setNewRows(prev => prev.filter(row => row.id !== tempId));
        });
        
        // Form cleanup (these don't trigger re-renders)
        unregister(`newRows.${tempId}`);
        unregister(`equipment.${tempId}`);

        // Clean up handlers cache
        handlersCache.delete(tempId);

        // Clear any editing states for this row
        setUiState(prev => ({
          ...prev,
          editing: new Set([...prev.editing].filter(key => !key.includes(tempId))),
          errors: Object.keys(prev.errors).reduce((acc, key) => {
            if (!key.includes(tempId)) {
              acc[key] = prev.errors[key];
            }
            return acc;
          }, {} as Record<string, string>)
        }));

        toast({
          title: t("expenses.success.created"),
          variant: "default",
        });

        // Track successful creation
        trackStateUpdate('newRowCreated');
      },
      onError: (error) => {
        // Batch error state updates to prevent cascade
        React.startTransition(() => {
          removeFromOperationQueue(operationKey);
          setItemLoading('creating', tempId, false);
          setFieldError(`newRow.${tempId}`, error.message);
        });

        toast({
          title: t("validation.error.create-failed"),
          description: error.message,
          variant: "destructive",
        });

        // Track error for monitoring
        trackStateUpdate('newRowCreationFailed');
      },
    });
  }, [
    isOperationInQueue,
    addToOperationQueue,
    removeFromOperationQueue,
    watch,
    validateNewRow,
    setFieldError,
    clearFieldError,
    setItemLoading,
    createEquipmentExpense,
    userId,
    data.length,
    unregister,
    handlersCache,
    toast,
    t,
    trackStateUpdate
  ]);

  // Enhanced delete handlers with concurrent operation prevention
  const handleDeleteSingle = useCallback((id: number) => {
    const operationKey = `delete-${id}`;
    
    // Check if delete operation is already in progress
    if (isOperationInQueue(operationKey)) {
      toast({
        title: "Operation in progress",
        description: "This item is already being deleted",
        variant: "default",
      });
      return;
    }

    addToOperationQueue(operationKey);
    setItemLoading('deleting', id, true);
    clearFieldError(`delete.${id}`);

    deleteEquipmentExpense(
      { param: { id: id.toString(), userId } },
      {
        onSuccess: () => {
          // Remove from operation queue and clear loading state
          removeFromOperationQueue(operationKey);
          setItemLoading('deleting', id, false);

          // Clear from selected rows
          setSelectedRows(prev => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
          });

          toast({
            title: t("expenses.success.deleted"),
            description: "Equipment expense has been successfully deleted",
            variant: "default",
          });

          // Track successful deletion
          trackStateUpdate('equipmentDeleted');
        },
        onError: (error) => {
          // Remove from operation queue and clear loading state
          removeFromOperationQueue(operationKey);
          setItemLoading('deleting', id, false);
          setFieldError(`delete.${id}`, error.message);

          toast({
            title: t("validation.error.delete-failed"),
            description: `Failed to delete equipment expense: ${error.message}`,
            variant: "destructive",
          });

          // Track error for monitoring
          trackStateUpdate('equipmentDeletionFailed');
        },
      }
    );
  }, [
    isOperationInQueue,
    addToOperationQueue,
    removeFromOperationQueue,
    setItemLoading,
    setFieldError,
    clearFieldError,
    deleteEquipmentExpense,
    userId,
    toast,
    t,
    trackStateUpdate
  ]);

  // Enhanced bulk delete with better error handling and user feedback
  const handleDeleteBulk = useCallback((ids: number[]) => {
    // Clear any existing errors for these items
    ids.forEach(id => clearFieldError(`delete.${id}`));
    
    // Set loading states for all items
    ids.forEach(id => setItemLoading('deleting', id, true));

    // Delete items one by one (could be optimized with a bulk delete API in the future)
    const deletePromises = ids.map(id =>
      new Promise<{ id: number; success: boolean; error?: any }>((resolve) => {
        deleteEquipmentExpense(
          { param: { id: id.toString(), userId } },
          {
            onSuccess: () => resolve({ id, success: true }),
            onError: (error) => resolve({ id, success: false, error }),
          }
        );
      })
    );

    Promise.allSettled(deletePromises).then(results => {
      const successful: number[] = [];
      const failed: { id: number; error: any }[] = [];

      results.forEach((result, index) => {
        const id = ids[index];
        setItemLoading('deleting', id, false);

        if (result.status === 'fulfilled') {
          const { success, error } = result.value;
          if (success) {
            successful.push(id);
          } else {
            failed.push({ id, error });
            setFieldError(`delete.${id}`, error?.message || 'Delete failed');
          }
        } else {
          failed.push({ id, error: result.reason });
          setFieldError(`delete.${id}`, result.reason?.message || 'Delete failed');
        }
      });

      if (successful.length > 0) {
        // Clear selection for successful deletions
        setSelectedRows(prev => {
          const newSet = new Set(prev);
          successful.forEach(id => newSet.delete(id));
          return newSet;
        });

        toast({
          title: successful.length === ids.length 
            ? t("expenses.success.bulk-deleted", { count: successful.length })
            : `${successful.length} items deleted successfully`,
          description: successful.length === ids.length 
            ? "All selected equipment expenses have been deleted"
            : `${successful.length} out of ${ids.length} items deleted successfully`,
          variant: "default",
        });

        // Track successful bulk deletion
        trackStateUpdate('bulkEquipmentDeleted');
      }

      if (failed.length > 0) {
        const failedItemsText = failed.length === 1 ? 'item' : 'items';
        
        toast({
          title: t("validation.error.bulk-delete-failed", { count: failed.length }),
          description: `${failed.length} ${failedItemsText} could not be deleted. Check individual error messages for details.`,
          variant: "destructive",
        });

        // Track error for monitoring
        trackStateUpdate('bulkEquipmentDeletionFailed');
      }
    }).catch((error) => {
      // Handle unexpected promise errors
      ids.forEach(id => setItemLoading('deleting', id, false));
      
      toast({
        title: "Bulk delete failed",
        description: `An unexpected error occurred: ${error.message}`,
        variant: "destructive",
      });

      trackStateUpdate('bulkDeleteUnexpectedError');
    });
  }, [
    setItemLoading,
    setFieldError,
    clearFieldError,
    deleteEquipmentExpense,
    userId,
    toast,
    t,
    trackStateUpdate
  ]);

  // Simplified keyboard navigation support
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    // Handle Escape key to clear selection
    if (event.key === 'Escape') {
      setSelectedRows(new Set());
      event.preventDefault();
    }

    // Handle Delete key for bulk delete
    if (event.key === 'Delete' && selectedRows.size > 0) {
      const ids = Array.from(selectedRows);
      handleDeleteBulk(ids);
      event.preventDefault();
    }

    // Handle Ctrl+A to select all
    if (event.key === 'a' && (event.ctrlKey || event.metaKey)) {
      const allIds = data.map(item => item.id);
      setSelectedRows(new Set(allIds));
      event.preventDefault();
    }
  }, [selectedRows, data, handleDeleteBulk]);

  const handleRowSelection = useCallback((id: number, selected: boolean) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      const allIds = data.map(item => item.id);
      setSelectedRows(new Set(allIds));
    } else {
      setSelectedRows(new Set());
    }
  }, [data]);

  const categoriesList: EquipmentCategoryOption[] = useMemo(
    () =>
      EQUIPMENT_COST_CATEGORIES.map((category) => ({
        label: category.label,
        value: category.value,
        slot: (
          <div
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-[4px] bg-opacity-60 p-1',
              category.color
            )}
          >
            <Icon
              name={category.icon as keyof typeof iconPath}
              label={category.label}
              color="body"
            />
          </div>
        ),
      })),
    []
  );

  // Memoized data transformation with optimized dependencies
  const dataTable = useMemo(() => {
    const existingRows = data
      ? data.map((item) => ({
          id: item.id,
          userId: item.userId,
          rank: item.rank,
          name: item.name,
          // Calculate monthly cost: (total cost / lifespan in months)
          amountPerMonth: formatCurrency(
            item.lifeSpan > 0 ? item.amount / item.lifeSpan : 0,
            {
              currency: selectedCurrency.code,
              decimals: 2,
            }
          ),
          // Calculate yearly cost: monthly cost * 12
          amountPerYear: formatCurrency(
            item.lifeSpan > 0 ? (item.amount / item.lifeSpan) * 12 : 0,
            {
              currency: selectedCurrency.code,
              decimals: 2,
            }
          ),
          category: item.category,
          categoryLabel: getCategoryLabel(item.category),
          categoryColor: getCategoryColor(item.category),
          purchaseDate: item.purchaseDate.toISOString(),
          usage: item.usage,
          lifeSpan: item.lifeSpan,
          // Store original amount for calculations
          originalAmount: item.amount,
          isNewRow: false,
        }))
      : [];

    // TEMPORARILY DISABLED - New rows removed to eliminate infinite loops
    // const newRowsFormatted = newRows.map((newRow) => ({
    //   ...newRow,
    //   isNewRow: true,
    //   originalAmount: 0,
    // }));

    return existingRows; // Only existing rows for now
  }, [data, selectedCurrency.code, getCategoryColor, getCategoryLabel]);

  // Memoized columns with stable references
  const columns = useMemo<ColumnDef<EquipmentExpense>[]>(() => [
    {
      id: "select",
      header: () => {
        const allExistingIds = data.map(item => item.id);
        const isAllSelected = allExistingIds.length > 0 && allExistingIds.every(id => selectedRows.has(id));
        const isSomeSelected = allExistingIds.some(id => selectedRows.has(id));

        return (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={isAllSelected}
              ref={(el) => {
                if (el) el.indeterminate = isSomeSelected && !isAllSelected;
              }}
              onCheckedChange={(value) => handleSelectAll(!!value)}
              aria-label={t("forms.accessibility.selectAll")}
              className="transition-all duration-200 hover:scale-110 focus:scale-110"
            />
          </div>
        );
      },
      cell: ({ row }) => {
        const isNewRow = row.original.isNewRow;
        const id = typeof row.original.id === 'number' ? row.original.id : parseInt(String(row.original.id), 10);

        // Don't show checkbox for new rows
        if (isNewRow) {
          return (
            <div className="flex items-center justify-center h-8">
              <div className="w-4 h-4 rounded-sm bg-muted/20 animate-pulse" />
            </div>
          );
        }

        return (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={selectedRows.has(id)}
              onCheckedChange={(value) => handleRowSelection(id, !!value)}
              aria-label={t("forms.accessibility.selectRow")}
              className="transition-all duration-200 hover:scale-110 focus:scale-110"
            />
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
      enableResizing: false,
      minSize: 40,
      size: 40,
    },
    {
      accessorKey: "category",
      header: t("expenses.form.category"),
      cell: ({ row }) => {
        const isNewRow = row.original.isNewRow;
        const tempId = String(row.original.id);
        const cellKey = `category-${row.original.id}`;
        const isEditing = isEditingCell(cellKey);

        const toggleEditing = () => {
          setEditingCell(cellKey, !isEditing);
        };

        const defaultCategoryOption = (() => {
          if (isNewRow) {
            return watch(`newRows.${tempId}.category`) || undefined;
          }

          const category = EQUIPMENT_COST_CATEGORIES.find(
            (cat) => cat.value === row.getValue("category")
          );
          return category
            ? {
                value: category.value,
                label: category.label,
                slot: (
                  <div
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-[4px] p-1',
                      category.color
                    )}
                  >
                    <Icon
                      name={category.icon as keyof typeof iconPath}
                      label={category.label}
                      color="body"
                    />
                  </div>
                ),
              }
            : undefined;
        })();

        const handleCategoryChange = useCallback((option: EquipmentCategoryOption) => {
            if (isNewRow) {
              // For new rows, let Controller handle the state - no setValue needed
              // The Controller's field.onChange will handle the form state
              return;
            } else {
              // Handle existing row update using batched updates
              const itemId = row.original.id;
              const fieldKey = `existingRows.${row.id}.category`;
              const originalCategory = row.original.category;

              // Simplified state updates
              setItemLoading('updating', itemId, true);
              clearFieldError(fieldKey);
              setEditingCell(cellKey, false);

              updateEquipmentExpense(
                {
                  json: {
                    id: row.original.id,
                    userId: row.original.userId,
                    name: row.original.name,
                    amount: row.original.originalAmount,
                    category: option.value,
                    purchaseDate: new Date(row.original.purchaseDate),
                    usage: row.original.usage,
                    lifeSpan: row.original.lifeSpan,
                  },
                },
                {
                  onSuccess: () => {
                    setItemLoading('updating', itemId, false);
                    // Form value will be updated by data refetch - no setValue needed
                  },
                  onError: (error) => {
                    setItemLoading('updating', itemId, false);
                    setFieldError(fieldKey, error.message);

                    toast({
                      title: t("validation.error.update-failed"),
                      variant: "destructive",
                    });

                    // No setValue reset needed - original data will remain
                  },
                }
              );
            }
          }, [isNewRow, tempId, updateEquipmentExpense, setItemLoading, clearFieldError, setEditingCell, toast, t]);

        return (
          <div
            onDoubleClick={!isNewRow ? toggleEditing : undefined}
            className={cn(
              "group relative",
              !isNewRow && "cursor-pointer",
              "transition-all duration-200",
              "hover:bg-muted/10 rounded-sm p-1 -m-1"
            )}
            title={!isNewRow ? "Double-click to edit category" : undefined}
          >
            <Controller
              name={isNewRow ? `newRows.${tempId}.category` : `existingRows.${row.id}.category`}
              control={control}
              defaultValue={defaultCategoryOption}
              render={({ field }) => (
                <Combobox
                  {...field}
                  placeholder={t("expenses.form.category")}
                  searchPlaceholder={t("common.search")}
                  aria-label={t("common.accessibility.selectCategory")}
                  options={categoriesList}
                  value={field.value || undefined}
                  onChange={(option: any) => {
                    if (!Array.isArray(option)) {
                      if (isNewRow) {
                        // For new rows, update the form field directly with the full option
                        // This stores value, label, and color all in one field
                        field.onChange(option);
                      } else {
                        // For existing rows, use the handler
                        handleCategoryChange(option);
                      }
                    }
                  }}
                  emptyMessage={t("common.not-found")}
                  triggerClassName={cn(
                    inputStyles(),
                    "[&_.combobox-label]:text-md",
                    "group-hover:border-muted/30",
                    "focus:ring-2 focus:ring-primary/20"
                  )}
                />
              )}
            />
            {!isNewRow && (
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                <div className="absolute top-1 right-1 text-xs text-muted-foreground bg-muted/80 px-1 rounded">
                  Edit
                </div>
              </div>
            )}
          </div>
        );
      },
      size: 200,
      minSize: 150,
    },
    {
      accessorKey: "name",
      header: t("expenses.form.name"),
      cell: ({ row }) => {
        const isNewRow = row.original.isNewRow;
        const tempId = String(row.original.id);
        const cellKey = `name-${row.original.id}`;
        const isEditing = isEditingCell(cellKey);

        const toggleEditing = () => {
          setEditingCell(cellKey, !isEditing);
        };

        const handleBlur = useCallback((field: any) => {
            if (isNewRow) {
              // Handle new row name change using optimized handler
              // For new rows, let Controller handle the state - no setValue needed
              // The field.onChange already handles the form state
            } else if (field.value !== row.original.name) {
              // Handle existing row update with loading state and optimistic update
              const itemId = row.original.id;
              const originalName = row.original.name;
              const fieldKey = `equipment.${row.id}.name`;

              setItemLoading('updating', itemId, true);
              clearFieldError(fieldKey);

              updateEquipmentExpense(
                {
                  json: {
                    id: row.original.id,
                    userId: row.original.userId,
                    name: field.value,
                    amount: row.original.originalAmount,
                    category: row.original.category,
                    purchaseDate: new Date(row.original.purchaseDate),
                    usage: row.original.usage,
                    lifeSpan: row.original.lifeSpan,
                  },
                },
                {
                  onSuccess: () => {
                    setItemLoading('updating', itemId, false);
                    setEditingCell(cellKey, false);
                    // Form value will be updated by data refetch - no setValue needed
                  },
                  onError: (error) => {
                    setItemLoading('updating', itemId, false);
                    setFieldError(fieldKey, error.message);
                    setEditingCell(cellKey, false);

                    // No setValue reset needed - original data will remain

                    toast({
                      title: t("validation.error.update-failed"),
                      description: error.message,
                      variant: "destructive",
                    });
                  },
                }
              );
            } else {
              setEditingCell(cellKey, false);
            }
          }, [isNewRow, tempId, row.original.name, updateEquipmentExpense, setItemLoading, clearFieldError, setEditingCell, toast, t]);

        const itemId = typeof row.original.id === 'number' ? row.original.id : parseInt(String(row.original.id), 10);
        const isItemUpdating = !isNewRow && isItemLoading('updating', itemId);
        const isItemCreating = isNewRow && isItemLoading('creating', tempId);
        const fieldKey = `equipment.${row.id}.name`;
        const hasError = uiState.errors[fieldKey];

        return (
          <div
            onDoubleClick={!isNewRow ? toggleEditing : undefined}
            className={cn(
              "group relative",
              !isNewRow && "cursor-pointer",
              "transition-all duration-200",
              "hover:bg-muted/10 rounded-sm p-1 -m-1"
            )}
            title={!isNewRow ? "Double-click to edit name" : undefined}
          >
            {(isItemUpdating || isItemCreating) ? (
              <div className="flex items-center space-x-2 animate-pulse">
                <TableCellSkeleton width="w-full" />
                <InlineLoading size="sm" text="" />
              </div>
            ) : (
              <div className="space-y-1">
                <Controller
                  name={isNewRow ? `newRows.${tempId}.name` : `equipment.${row.id}.name`}
                  control={control}
                  defaultValue={isNewRow ? "" : row.getValue("name")}
                  render={({ field }) => (
                    <Input
                      {...field}
                      onBlur={() => handleBlur(field)}
                      readOnly={!isNewRow && !isEditing}
                      className={cn(
                        inputStyles(),
                        hasError && "border-destructive focus:border-destructive ring-destructive/20",
                        "group-hover:border-muted/30",
                        "focus:ring-2 focus:ring-primary/20"
                      )}
                      placeholder={isNewRow ? t("expenses.form.name") : undefined}
                      aria-describedby={hasError ? `${fieldKey}-error` : undefined}
                    />
                  )}
                />
                {hasError && (
                  <p
                    id={`${fieldKey}-error`}
                    className="text-xs text-destructive flex items-center gap-1"
                    role="alert"
                  >
                    <Icon name="alert" size="xs" color="danger" />
                    {hasError}
                  </p>
                )}
              </div>
            )}
            {!isNewRow && !isEditing && (
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                <div className="absolute top-1 right-1 text-xs text-muted-foreground bg-muted/80 px-1 rounded">
                  Edit
                </div>
              </div>
            )}
          </div>
        );
      },
      size: 250,
      minSize: 150,
    },
    {
      accessorKey: "amountPerMonth",
      header: t("expenses.form.value") + " (" + t("common.period.per-month") + ")",
      cell: ({ row }) => {
        const isNewRow = row.original.isNewRow;
        const tempId = String(row.original.id);
        const cellKey = `amountPerMonth-${row.original.id}`;
        const isEditing = isEditingCell(cellKey);

        const toggleEditing = () => {
          setEditingCell(cellKey, !isEditing);
        };

        const handleBlur = useCallback((field: { value: string | number }) => {
            const monthlyAmount = typeof field.value === "number" ? field.value :
              Number.parseFloat(String(field.value).replace(/[^0-9.,]/g, "").replace(",", "."));

            if (isNewRow) {
              // Handle new row amount change using optimized handler
              // For new rows, let Controller handle the state - no setValue needed
              // The field.onChange already handles the form state
            } else {
              const currentMonthlyAmount = row.original.lifeSpan > 0 ?
                row.original.originalAmount / row.original.lifeSpan : 0;

              if (
                isDirty &&
                !isNaN(monthlyAmount) &&
                Math.abs(monthlyAmount - currentMonthlyAmount) > 0.01
              ) {
                const itemId = row.original.id;
                const fieldKeyMonth = `equipment.${row.id}.amountPerMonth`;
                const fieldKeyYear = `equipment.${row.id}.amountPerYear`;
                const originalMonthlyAmount = row.original.amountPerMonth;
                const originalYearlyAmount = row.original.amountPerYear;

                setItemLoading('updating', itemId, true);
                clearFieldError(fieldKeyMonth);

                // Calculate related amounts
                const yearlyAmount = monthlyAmount * 12;
                const newTotalAmount = monthlyAmount * row.original.lifeSpan;

                updateEquipmentExpense(
                  {
                    json: {
                      id: row.original.id,
                      userId: row.original.userId,
                      name: row.original.name,
                      amount: newTotalAmount,
                      category: row.original.category,
                      purchaseDate: new Date(row.original.purchaseDate),
                      usage: row.original.usage,
                      lifeSpan: row.original.lifeSpan,
                    },
                  },
                  {
                    onSuccess: () => {
                      setItemLoading('updating', itemId, false);
                      setEditingCell(cellKey, false);
                      // Form values will be updated by data refetch - no setValue needed
                    },
                    onError: (error) => {
                      setItemLoading('updating', itemId, false);
                      setFieldError(fieldKeyMonth, error.message);
                      setEditingCell(cellKey, false);

                      // No setValue reset needed - original data will remain

                      toast({
                        title: t("validation.error.update-failed"),
                        description: error.message,
                        variant: "destructive",
                      });
                    },
                  }
                );
              } else {
                setEditingCell(cellKey, false);
                reset({
                  [`equipment.${row.id}.amountPerMonth`]: row.original.amountPerMonth,
                  [`equipment.${row.id}.amountPerYear`]: row.original.amountPerYear,
                });
              }
            }
          }, [isNewRow, tempId, row.original.originalAmount, row.original.lifeSpan, isDirty, updateEquipmentExpense, setItemLoading, clearFieldError, setEditingCell, toast, t, reset]);

        const itemId = typeof row.original.id === 'number' ? row.original.id : parseInt(String(row.original.id), 10);
        const isItemUpdating = !isNewRow && isItemLoading('updating', itemId);
        const isItemCreating = isNewRow && isItemLoading('creating', tempId);
        const fieldKey = `equipment.${row.id}.amountPerMonth`;
        const hasError = uiState.errors[fieldKey];

        return (
          <div className="relative" onDoubleClick={!isNewRow ? toggleEditing : undefined}>
            {(isItemUpdating || isItemCreating) ? (
              <div className="flex items-center space-x-2">
                <TableCellSkeleton width="w-full" />
                <InlineLoading size="sm" text="" />
              </div>
            ) : (
              <div className="space-y-1">
                <Controller
                  name={isNewRow ? `newRows.${tempId}.amountPerMonth` : `equipment.${row.id}.amountPerMonth`}
                  control={control}
                  defaultValue={isNewRow ? 0 : row.getValue("amountPerMonth")}
                  render={({ field }) => (
                    <NumberInput
                      {...field}
                      type="tel"
                      onBlur={() => handleBlur(field)}
                      readOnly={!isNewRow && !isEditing}
                      className={cn(
                        inputStyles(),
                        hasError && "border-destructive focus:border-destructive"
                      )}
                      currency={selectedCurrency.symbol + " "}
                      decimalScale={2}
                      allowNegative={false}
                      allowLeadingZeros
                      onValueChange={(values) => {
                        const { floatValue } = values;
                        field.onChange(floatValue ?? 0);
                      }}
                      value={
                        isNewRow || isEditing ? field.value : row.getValue("amountPerMonth")
                      }
                      placeholder={isNewRow ? "0.00" : undefined}
                    />
                  )}
                />
                {hasError && (
                  <p className="text-xs text-destructive">{hasError}</p>
                )}
              </div>
            )}
          </div>
        );
      },
      size: 150,
      minSize: 120,
    },
    {
      accessorKey: "amountPerYear",
      header: t("expenses.form.value") + " (" + t("common.period.per-year") + ")",
      cell: ({ row }) => {
        const isNewRow = row.original.isNewRow;
        const tempId = String(row.original.id);
        const cellKey = `amountPerYear-${row.original.id}`;
        const isEditing = isEditingCell(cellKey);

        const toggleEditing = () => {
          setEditingCell(cellKey, !isEditing);
        };

        const handleBlur = useCallback((field: { value: string | number }) => {
            const yearlyAmount = typeof field.value === "number" ? field.value :
              Number.parseFloat(String(field.value).replace(/[^0-9.,]/g, "").replace(",", "."));

            if (isNewRow) {
              // Handle new row amount change using optimized handler
              // For new rows, let Controller handle the state - no setValue needed
              // The field.onChange already handles the form state
            } else {
              const currentYearlyAmount = row.original.lifeSpan > 0 ?
                (row.original.originalAmount / row.original.lifeSpan) * 12 : 0;

              if (
                isDirty &&
                !isNaN(yearlyAmount) &&
                Math.abs(yearlyAmount - currentYearlyAmount) > 0.01
              ) {
                // Calculate new total amount from yearly amount
                const monthlyAmount = yearlyAmount / 12;
                const newTotalAmount = monthlyAmount * row.original.lifeSpan;

                updateEquipmentExpense(
                  {
                    json: {
                      id: row.original.id,
                      userId: row.original.userId,
                      name: row.original.name,
                      amount: newTotalAmount,
                      category: row.original.category,
                      purchaseDate: new Date(row.original.purchaseDate),
                      usage: row.original.usage,
                      lifeSpan: row.original.lifeSpan,
                    },
                  },
                  {
                    onSuccess: () => {
                      setEditingCell(cellKey, false);
                      // Form values will be updated by data refetch - no setValue needed
                    },
                    onError: () => {
                      toast({
                        title: t("validation.error.update-failed"),
                        variant: "destructive",
                      });
                      // No setValue reset needed - original data will remain
                    },
                  }
                );
              } else {
                setEditingCell(cellKey, false);
                reset({
                  [`equipment.${row.id}.amountPerYear`]: row.original.amountPerYear,
                  [`equipment.${row.id}.amountPerMonth`]: row.original.amountPerMonth,
                });
              }
            }
          }, [isNewRow, tempId, row.original.originalAmount, row.original.lifeSpan, isDirty, updateEquipmentExpense, setEditingCell, toast, t, reset]);

        const itemId = typeof row.original.id === 'number' ? row.original.id : parseInt(String(row.original.id), 10);
        const isItemUpdating = !isNewRow && isItemLoading('updating', itemId);
        const isItemCreating = isNewRow && isItemLoading('creating', tempId);
        const fieldKey = `equipment.${row.id}.amountPerYear`;
        const hasError = uiState.errors[fieldKey];

        return (
          <div onDoubleClick={!isNewRow ? toggleEditing : undefined}>
            {(isItemUpdating || isItemCreating) ? (
              <div className="flex items-center space-x-2">
                <TableCellSkeleton width="w-full" />
                <InlineLoading size="sm" text="" />
              </div>
            ) : (
              <div className="space-y-1">
                <Controller
                  name={isNewRow ? `newRows.${tempId}.amountPerYear` : `equipment.${row.id}.amountPerYear`}
                  control={control}
                  defaultValue={isNewRow ? 0 : row.getValue("amountPerYear")}
                  render={({ field }) => (
                    <NumberInput
                      {...field}
                      type="tel"
                      onBlur={() => handleBlur(field)}
                      readOnly={!isNewRow && !isEditing}
                      className={cn(
                        inputStyles(),
                        hasError && "border-destructive focus:border-destructive"
                      )}
                      decimalScale={2}
                      allowNegative={false}
                      currency={selectedCurrency.symbol + " "}
                      onValueChange={(values) => {
                        const { floatValue } = values;
                        field.onChange(floatValue ?? 0);
                      }}
                      value={
                        isNewRow || isEditing ? field.value : row.getValue("amountPerYear")
                      }
                      placeholder={isNewRow ? "0.00" : undefined}
                    />
                  )}
                />
                {hasError && (
                  <p className="text-xs text-destructive">{hasError}</p>
                )}
              </div>
            )}
          </div>
        );
      },
      size: 150,
      minSize: 120,
    },
    {
      accessorKey: "purchaseDate",
      header: t("forms.equipment.purchaseDate"),
      cell: ({ row }) => {
        const isNewRow = row.original.isNewRow;
        const tempId = String(row.original.id);

        if (!isNewRow) {
          // For existing rows, just show the date (read-only for now)
          const date = new Date(row.getValue("purchaseDate"));
          return (
            <div className="text-sm text-muted-foreground">
              {date.toLocaleDateString()}
            </div>
          );
        }

        // For new rows, show date picker
        return (
          <Controller
            name={isNewRow ? `newRows.${tempId}.purchaseDate` : `equipment.${row.id}.purchaseDate`}
            control={control}
            defaultValue={isNewRow ? new Date() : row.getValue("purchaseDate")}
            render={({ field }) => (
              <DatePicker
                {...field}
                onChange={(date) => {
                  field.onChange(date);
                  // For new rows, let Controller handle the state - no setValue needed
                }}
                className="w-full"
              />
            )}
          />
        );
      },
      size: 150,
      minSize: 120,
    },
    {
      accessorKey: "usage",
      header: t("forms.equipment.usage"),
      cell: ({ row }) => {
        const isNewRow = row.original.isNewRow;
        const tempId = String(row.original.id);

        if (!isNewRow) {
          // For existing rows, show usage (read-only for now)
          return (
            <div className="text-sm text-muted-foreground">
              {row.getValue("usage")}h/month
            </div>
          );
        }

        // For new rows, show number input
        return (
          <Controller
            name={isNewRow ? `newRows.${tempId}.usage` : `equipment.${row.id}.usage`}
            control={control}
            defaultValue={isNewRow ? 100 : row.getValue("usage")}
            render={({ field }) => (
              <NumberInput
                {...field}
                onValueChange={(values) => {
                  const { floatValue } = values;
                  const value = floatValue ?? 100;
                  field.onChange(value);
                  // For new rows, let Controller handle the state - no setValue needed
                }}
                suffix="h/month"
                className={inputStyles()}
                min={0}
                max={100}
              />
            )}
          />
        );
      },
      size: 120,
      minSize: 100,
    },
    {
      accessorKey: "lifeSpan",
      header: t("forms.equipment.lifespan"),
      cell: ({ row }) => {
        const isNewRow = row.original.isNewRow;
        const tempId = String(row.original.id);

        if (!isNewRow) {
          // For existing rows, show lifespan (read-only for now)
          return (
            <div className="text-sm text-muted-foreground">
              {row.getValue("lifeSpan")} {t("common.period.years")}
            </div>
          );
        }

        // For new rows, show number input
        return (
          <Controller
            name={isNewRow ? `newRows.${tempId}.lifeSpan` : `equipment.${row.id}.lifeSpan`}
            control={control}
            defaultValue={isNewRow ? 1 : row.getValue("lifeSpan")}
            render={({ field }) => (
              <NumberInput
                {...field}
                onValueChange={(values) => {
                  const { floatValue } = values;
                  const value = floatValue ?? 1;
                  field.onChange(value);
                  // For new rows, let Controller handle the state - no setValue needed
                }}
                suffix={t("common.period.years")}
                className={inputStyles()}
                min={1}
              />
            )}
          />
        );
      },
      size: 120,
      minSize: 100,
    },
    {
      accessorKey: "categoryLabel",
      header: "",
      enableHiding: true,
    },
    {
      accessorKey: "categoryColor",
      header: "",
      enableHiding: true,
    },
    {
      id: "actions",
      header: "",
      enableHiding: false,
      enableSorting: false,
      cell: ({ row }) => {
        const isNewRow = row.original.isNewRow;
        const tempId = String(row.original.id);
        const rowKey = `actions-${row.original.id}`;
        const isHovered = isRowHovered(rowKey);

        function handleDeleteRow() {
          const id = typeof row.original.id === 'number' ? row.original.id : parseInt(String(row.original.id), 10);
          handleDeleteSingle(id);
        }

        function handleSaveNewRow() {
          submitNewRow(tempId);
        }

        function handleCancelNewRow() {
          removeNewRow(tempId);
        }

        if (isNewRow) {
          return (
            <div className="flex items-center justify-center gap-1">
              <button
                type="button"
                className={cn(
                  iconbutton({ variant: "tertiary", size: "sm" }),
                  "transition-all duration-200 hover:scale-110 hover:bg-green-500/10 hover:text-green-600",
                  "focus:scale-110 focus:bg-green-500/10 focus:text-green-600",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
                onClick={handleSaveNewRow}
                aria-label={t("common.actions.save")}
                disabled={isCreating}
                title="Save new equipment expense"
              >
                <Icon name="check" size={16} color="body" />
              </button>
              <button
                type="button"
                className={cn(
                  iconbutton({ variant: "tertiary", size: "sm" }),
                  "transition-all duration-200 hover:scale-110 hover:bg-red-500/10 hover:text-red-600",
                  "focus:scale-110 focus:bg-red-500/10 focus:text-red-600",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
                onClick={handleCancelNewRow}
                aria-label={t("common.actions.cancel")}
                disabled={isCreating}
                title="Cancel new equipment expense"
              >
                <Icon name="close" size={16} color="body" />
              </button>
            </div>
          );
        }

        return (
          <div
            className="flex items-center justify-center group"
            onMouseEnter={() => setRowHovered(rowKey, true)}
            onMouseLeave={() => setRowHovered(rowKey, false)}
          >
            <button
              type="button"
              className={cn(
                iconbutton({ variant: "tertiary", size: "sm" }),
                "transition-all duration-200 hover:scale-110 hover:bg-red-500/10 hover:text-red-600",
                "focus:scale-110 focus:bg-red-500/10 focus:text-red-600",
                "group-hover:opacity-100 opacity-60"
              )}
              onClick={handleDeleteRow}
              aria-label={t("expenses.actions.delete")}
              title="Delete equipment expense"
            >
              <DeleteIcon size={18} animated={isHovered} />
            </button>
          </div>
        );
      },
      size: 80,
      minSize: 60,
      maxSize: 100,
    },
  ], [
    t,
    selectedRows,
    handleRowSelection,
    handleSelectAll,
    data,
    categoriesList,
    selectedCurrency.symbol,
  ]);

  return (
    <div
      className="space-y-4"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="Equipment expenses table"
    >
      {/* Enhanced bulk actions bar with better styling and animations */}
      {selectedRows.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20 shadow-sm animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
              <Icon name="check-circle" size={16} color="body" />
            </div>
            <div>
              <span className="text-sm font-semibold text-card-foreground">
                {selectedRows.size} item{selectedRows.size > 1 ? 's' : ''} selected
              </span>
              <p className="text-xs text-muted-foreground">
                Choose an action to perform on selected items
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedRows(new Set())}
              disabled={isDeleting}
              className="transition-all duration-200 hover:scale-105"
            >
              {t("common.actions.cancel")}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDeleteBulk(Array.from(selectedRows))}
              disabled={isDeleting}
              className="flex items-center gap-2 transition-all duration-200 hover:scale-105"
            >
              {isDeleting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <DeleteIcon size={16} />
              )}
              Delete selected
            </Button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={dataTable}
        hasNewRows={false}
        isLoading={isLoading}
        isRefetching={isRefetching}
        error={error}
      />

      {/* Simplified add new row section with modal */}
      <div className="flex items-center justify-between p-4 bg-card/30 rounded-lg border border-muted/20">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 bg-muted/20 rounded-full">
            <Icon name="plus" size={16} color="body" />
          </div>
          <div>
            <span className="text-sm font-medium text-card-foreground">
              Add new equipment expense
            </span>
            <p className="text-xs text-muted-foreground">
              Create a new equipment expense entry
            </p>
          </div>
        </div>
        
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={isCreating}
              className="flex items-center gap-2 transition-all duration-200 hover:scale-105 focus:scale-105"
            >
              <Icon name="plus" size={16} color="body" />
              Add row
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Equipment Expense</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This simplified form will be implemented soon to replace the complex inline editing.
              </p>
              
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    toast({
                      title: "Coming Soon",
                      description: "The simplified form is being developed to fix the table complexity issues.",
                    });
                    setIsModalOpen(false);
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};