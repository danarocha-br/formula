# Billable Cost Cache Utilities

This document describes the specialized cache utilities for managing billable cost data in React Query. These utilities provide precise cache management, form data transformations, optimistic updates, and validation specifically designed for billable cost operations.

## Overview

The billable cost cache utilities extend the generic cache utilities framework to handle the specific needs of billable cost management:

- **Single-object cache management** (billable cost is not an array)
- **Form-to-cache data transformations**
- **Optimistic updates with rollback support**
- **Validation utilities for form data**
- **Calculation helpers for billable hours**

## Core Utilities

### Basic Cache Operations

```typescript
import { billableCostCacheUtils } from "@/utils/query-cache-utils";

// Update billable cost object in cache
billableCostCacheUtils.updateObject(queryClient, userId, billableCostItem);

// Get current billable cost data
const currentData = billableCostCacheUtils.getCurrentObject(
  queryClient,
  userId
);

// Check if billable cost exists
const exists = billableCostCacheUtils.objectExists(queryClient, userId);

// Replace entire billable cost object
billableCostCacheUtils.replaceObject(queryClient, userId, newBillableCostItem);
```

### Specialized Utilities

```typescript
import { billableCostSpecializedUtils } from "@/utils/query-cache-utils";

// Update cache from form data
billableCostSpecializedUtils.updateFromFormData(
  queryClient,
  userId,
  formData,
  calculatedBillableHours
);

// Create optimistic update
const context = billableCostSpecializedUtils.createOptimisticUpdate(
  queryClient,
  userId,
  partialUpdate
);

// Rollback on error
billableCostSpecializedUtils.rollbackOptimisticUpdate(
  queryClient,
  userId,
  context.previousData
);
```

## Data Transformations

### Form Data to Cache

The utilities handle transformation between form data format and cache data format:

```typescript
// Form data format (from UI)
const formData = {
  work_days: 5,
  hours_per_day: 8,
  holiday_days: 12,
  vacation_days: 20,
  sick_leave: 5,
  monthly_salary: 5000,
  taxes: 25,
  fees: 5,
  margin: 20,
};

// Transform to cache format
const billableHours =
  billableCostSpecializedUtils.calculateBillableHours(formData);
billableCostSpecializedUtils.updateFromFormData(
  queryClient,
  userId,
  formData,
  billableHours
);
```

### Cache Data to Form

```typescript
// Get cache data
const cacheData = billableCostSpecializedUtils.getCurrentBillableCost(
  queryClient,
  userId
);

// Transform to form format
const formData = billableCostSpecializedUtils.transformToFormData(cacheData);
```

### Server Response Transformation

```typescript
// Transform server response to cache format
const cacheData = billableCostSpecializedUtils.transformServerResponse(
  serverResponse.data
);

// Update cache with transformed data
billableCostCacheUtils.updateObject(queryClient, userId, cacheData);
```

## Optimistic Updates

### Creating Optimistic Updates

```typescript
// Create optimistic update for immediate UI feedback
const partialUpdate = { monthlySalary: 6000, margin: 25 };
const context = billableCostSpecializedUtils.createOptimisticUpdate(
  queryClient,
  userId,
  partialUpdate
);

// The context contains:
// - previousData: Original data for rollback
// - queryKey: Query key for the cache entry
```

### Handling Mutation Success/Failure

```typescript
try {
  // Perform API call
  const response = await updateBillableCostAPI(formData);

  // On success, update cache with real server data
  const transformedData = billableCostSpecializedUtils.transformServerResponse(
    response.data
  );
  billableCostCacheUtils.updateObject(queryClient, userId, transformedData);
} catch (error) {
  // On failure, rollback optimistic update
  billableCostSpecializedUtils.rollbackOptimisticUpdate(
    queryClient,
    userId,
    context.previousData
  );
  throw error;
}
```

## Validation

### Form Data Validation

```typescript
const validationErrors =
  billableCostSpecializedUtils.validateFormData(formData);

if (validationErrors.length > 0) {
  console.error("Validation errors:", validationErrors);
  // Handle validation errors
  return;
}

// Proceed with valid data
```

### Validation Rules

The validation utility checks for:

- Work days: 1-7
- Hours per day: 1-24
- Holiday days: 0-365
- Vacation days: 0-365
- Sick leave days: 0-180
- Monthly salary: >= 0
- Taxes: 0-100%
- Fees: 0-100%
- Margin: 0-100%

## Calculations

### Billable Hours Calculation

```typescript
const billableHours = billableCostSpecializedUtils.calculateBillableHours({
  work_days: 5,
  hours_per_day: 8,
  holiday_days: 12,
  vacation_days: 20,
  sick_leave: 5,
});

// Calculation:
// Work days per year: 5 * 52 = 260
// Time off: 12 + 20 + 5 = 37
// Actual work days: 260 - 37 = 223
// Billable hours: 223 * 8 = 1784
```

## Complete Mutation Hook Pattern

Here's how to use these utilities in a mutation hook:

```typescript
export const useUpdateBillableExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ json: formData }) => {
      // Validate form data
      const validationErrors =
        billableCostSpecializedUtils.validateFormData(formData);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
      }

      // Calculate billable hours
      const billableHours =
        billableCostSpecializedUtils.calculateBillableHours(formData);

      // Make API call
      const response = await client.api.expenses["billable-costs"].$patch({
        json: { ...formData, billableHours },
      });

      if (!response.ok) {
        throw new Error("API call failed");
      }

      return response.json();
    },

    onMutate: async ({ json: formData }) => {
      const userId = formData.userId;
      const queryKey = reactQueryKeys.billableExpenses.byUserId(userId);

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Create optimistic update
      const billableCostItem =
        billableCostSpecializedUtils.createBillableCostItem(userId, formData);

      const context = billableCostSpecializedUtils.createOptimisticUpdate(
        queryClient,
        userId,
        billableCostItem
      );

      return context;
    },

    onError: (error, variables, context) => {
      if (context) {
        // Rollback optimistic update
        billableCostSpecializedUtils.rollbackOptimisticUpdate(
          queryClient,
          variables.json.userId,
          context.previousData
        );
      }
    },

    onSuccess: (data, variables) => {
      // Update cache with real server data (no invalidation needed)
      const transformedData =
        billableCostSpecializedUtils.transformServerResponse(data.data);
      billableCostCacheUtils.updateObject(
        queryClient,
        variables.json.userId,
        transformedData
      );
    },
  });
};
```

## Error Handling

The utilities include comprehensive error handling:

```typescript
try {
  billableCostSpecializedUtils.updateFromFormData(
    queryClient,
    userId,
    formData,
    billableHours
  );
} catch (error) {
  if (error.operation === "update") {
    console.error("Cache update failed:", error.message);
    // Handle cache update error
  }
}
```

## Performance Considerations

1. **Precise Cache Updates**: Uses `setQueryData` instead of `invalidateQueries` to avoid unnecessary refetches
2. **Optimistic Updates**: Provides immediate UI feedback while API calls are in progress
3. **Validation**: Client-side validation prevents unnecessary API calls
4. **Memoization**: Calculations are memoized to prevent unnecessary recalculations
5. **Error Recovery**: Automatic rollback on mutation failures maintains cache consistency

## Testing

The utilities include comprehensive tests covering:

- Basic cache operations
- Form data transformations
- Optimistic updates and rollbacks
- Validation logic
- Calculation accuracy
- Error handling scenarios

Run tests with:

```bash
npm test -- utils/__tests__/billable-cost-cache-utils.test.ts --run
```

## Migration from Existing Code

To migrate from the current invalidation-based approach:

1. Replace `invalidateQueries` in `onSettled` with precise cache updates in `onSuccess`
2. Add optimistic updates in `onMutate` using the specialized utilities
3. Add proper error handling and rollback in `onError`
4. Use form data validation before making API calls
5. Transform data between form and cache formats as needed

## Related Files

- `apps/app/utils/query-cache-utils.ts` - Core implementation
- `apps/app/utils/__tests__/billable-cost-cache-utils.test.ts` - Test suite
- `apps/app/utils/billable-cost-cache-utils.example.ts` - Usage examples
- `apps/app/app/features/feature-billable-cost/` - Feature implementation
