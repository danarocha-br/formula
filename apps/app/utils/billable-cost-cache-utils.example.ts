/**
 * Example usage of billable cost cache utilities
 * This file demonstrates how to use the specialized billable cost cache utilities
 * for form data transformations, optimistic updates, and validation
 */

import { QueryClient } from "@tanstack/react-query";
import {
  billableCostCacheUtils,
  billableCostSpecializedUtils,
  type BillableCostItem,
} from "./query-cache-utils";

// Example: Basic cache operations
export function exampleBasicOperations() {
  const queryClient = new QueryClient();
  const userId = "user-123";

  // Create a billable cost item
  const billableCost: BillableCostItem = {
    id: 1,
    userId,
    workDays: 5,
    hoursPerDay: 8,
    holidaysDays: 12,
    vacationsDays: 20,
    sickLeaveDays: 5,
    monthlySalary: 5000,
    taxes: 25,
    fees: 5,
    margin: 20,
    billableHours: 1800,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Update cache with billable cost data
  billableCostCacheUtils.updateObject(queryClient, userId, billableCost);

  // Check if data exists
  const exists = billableCostCacheUtils.objectExists(queryClient, userId);
  console.log("Billable cost exists:", exists);

  // Get current data
  const currentData = billableCostCacheUtils.getCurrentObject(queryClient, userId);
  console.log("Current billable cost:", currentData);
}

// Example: Form data transformation
export function exampleFormDataTransformation() {
  const queryClient = new QueryClient();
  const userId = "user-123";

  // Form data from UI
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

  // Validate form data
  const validationErrors = billableCostSpecializedUtils.validateFormData(formData);
  if (validationErrors.length > 0) {
    console.error("Validation errors:", validationErrors);
    return;
  }

  // Calculate billable hours
  const billableHours = billableCostSpecializedUtils.calculateBillableHours(formData);
  console.log("Calculated billable hours:", billableHours);

  // Update cache from form data
  billableCostSpecializedUtils.updateFromFormData(
    queryClient,
    userId,
    formData,
    billableHours
  );

  // Get updated data and transform back to form format
  const cacheData = billableCostSpecializedUtils.getCurrentBillableCost(queryClient, userId);
  if (cacheData) {
    const backToFormData = billableCostSpecializedUtils.transformToFormData(cacheData);
    console.log("Transformed back to form data:", backToFormData);
  }
}

// Example: Optimistic updates for mutations
export function exampleOptimisticUpdates() {
  const queryClient = new QueryClient();
  const userId = "user-123";

  // Set initial data
  const initialData: BillableCostItem = {
    id: 1,
    userId,
    workDays: 5,
    hoursPerDay: 8,
    holidaysDays: 12,
    vacationsDays: 20,
    sickLeaveDays: 5,
    monthlySalary: 5000,
    taxes: 25,
    fees: 5,
    margin: 20,
    billableHours: 1800,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  billableCostCacheUtils.updateObject(queryClient, userId, initialData);

  // Create optimistic update
  const partialUpdate = { monthlySalary: 6000, margin: 25 };
  const context = billableCostSpecializedUtils.createOptimisticUpdate(
    queryClient,
    userId,
    partialUpdate
  );

  console.log("Optimistic update context:", context);

  // Simulate mutation success - no rollback needed
  console.log("Mutation succeeded, keeping optimistic update");

  // Or simulate mutation failure - rollback
  // billableCostSpecializedUtils.rollbackOptimisticUpdate(
  //   queryClient,
  //   userId,
  //   context.previousData
  // );
}

// Example: Complete mutation hook pattern
export function exampleMutationPattern() {
  const queryClient = new QueryClient();
  const userId = "user-123";

  // Simulate a mutation function
  const updateBillableCostMutation = async (formData: any) => {
    // Validate form data
    const validationErrors = billableCostSpecializedUtils.validateFormData(formData);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
    }

    // Create optimistic update
    const billableHours = billableCostSpecializedUtils.calculateBillableHours(formData);
    const billableCostItem = billableCostSpecializedUtils.createBillableCostItem(
      userId,
      formData
    );

    const context = billableCostSpecializedUtils.createOptimisticUpdate(
      queryClient,
      userId,
      billableCostItem
    );

    try {
      // Simulate API call
      const response = await fetch("/api/billable-costs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...formData, billableHours }),
      });

      if (!response.ok) {
        throw new Error("API call failed");
      }

      const serverData = await response.json();

      // Transform server response and update cache with real data
      const transformedData = billableCostSpecializedUtils.transformServerResponse(serverData.data);
      billableCostCacheUtils.updateObject(queryClient, userId, transformedData);

      return transformedData;
    } catch (error) {
      // Rollback optimistic update on error
      billableCostSpecializedUtils.rollbackOptimisticUpdate(
        queryClient,
        userId,
        context.previousData
      );
      throw error;
    }
  };

  // Usage
  const formData = {
    work_days: 5,
    hours_per_day: 8,
    holiday_days: 12,
    vacation_days: 20,
    sick_leave: 5,
    monthly_salary: 6000, // Updated value
    taxes: 25,
    fees: 5,
    margin: 20,
  };

  updateBillableCostMutation(formData)
    .then((result) => {
      console.log("Mutation succeeded:", result);
    })
    .catch((error) => {
      console.error("Mutation failed:", error);
    });
}

// Example: Server response transformation
export function exampleServerResponseTransformation() {
  // Typical server response format
  const serverResponse = {
    status: 200,
    success: true,
    data: {
      id: 1,
      userId: "user-123",
      workDays: 5,
      hoursPerDay: 8,
      holidaysDays: 12,
      vacationsDays: 20,
      sickLeaveDays: 5,
      monthlySalary: 5000,
      taxes: 25,
      fees: 5,
      margin: 20,
      billableHours: 1800,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    },
  };

  // Transform to cache format
  const cacheData = billableCostSpecializedUtils.transformServerResponse(serverResponse.data);
  console.log("Transformed cache data:", cacheData);

  // Transform to form format for UI
  const formData = billableCostSpecializedUtils.transformToFormData(cacheData);
  console.log("Transformed form data:", formData);
}

// Example: Error handling and validation
export function exampleErrorHandling() {
  const queryClient = new QueryClient();
  const userId = "user-123";

  // Invalid form data
  const invalidFormData = {
    work_days: 0, // Invalid
    hours_per_day: 25, // Invalid
    holiday_days: -1, // Invalid
    vacation_days: 400, // Invalid
    sick_leave: 200, // Invalid
    monthly_salary: -1000, // Invalid
    taxes: 150, // Invalid
    fees: -5, // Invalid
    margin: 110, // Invalid
  };

  // Validate and handle errors
  const errors = billableCostSpecializedUtils.validateFormData(invalidFormData);
  if (errors.length > 0) {
    console.error("Form validation errors:");
    errors.forEach((error, index) => {
      console.error(`${index + 1}. ${error}`);
    });
    return;
  }

  // If validation passes, proceed with cache update
  const billableHours = billableCostSpecializedUtils.calculateBillableHours(invalidFormData);
  billableCostSpecializedUtils.updateFromFormData(
    queryClient,
    userId,
    invalidFormData,
    billableHours
  );
}

// Export all examples for easy testing
export const billableCostCacheExamples = {
  basicOperations: exampleBasicOperations,
  formDataTransformation: exampleFormDataTransformation,
  optimisticUpdates: exampleOptimisticUpdates,
  mutationPattern: exampleMutationPattern,
  serverResponseTransformation: exampleServerResponseTransformation,
  errorHandling: exampleErrorHandling,
};