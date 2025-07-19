/**
 * React Query key factory that extends existing database cache keys
 * This ensures consistency between server-side cache keys and client-side React Query keys
 */

import { BillableCostCacheKeys } from "./billable-cost-cache-keys";
import { EquipmentCostCacheKeys } from "./equipment-cost-cache-keys";
import { FixedCostCacheKeys } from "./fixed-cost-cache-keys";
import { UserCacheKeys } from "./user-cache-keys";

/**
 * React Query keys that align with existing database cache key patterns
 * These are used for client-side query caching and invalidation
 */
export const reactQueryKeys = {
  // Fixed expenses queries - aligned with FixedCostCacheKeys
  fixedExpenses: {
    all: () => ["fixed-expenses-list"] as const,
    byUserId: (userId: string) => ["fixed-expenses-list", userId] as const,
    detail: (userId: string, id: string) => ["fixed-expenses-list", userId, id] as const,
  },

  // Billable expenses queries - aligned with BillableCostCacheKeys
  billableExpenses: {
    all: () => ["billable-expenses-list"] as const,
    byUserId: (userId: string) => ["billable-expenses-list", userId] as const,
    detail: (userId: string, id: string) => ["billable-expenses-list", userId, id] as const,
  },

  // Equipment expenses queries - aligned with EquipmentCostCacheKeys
  equipmentExpenses: {
    all: () => ["equipment-expenses-list"] as const,
    byUserId: (userId: string) => ["equipment-expenses-list", userId] as const,
    detail: (userId: string, id: string) => ["equipment-expenses-list", userId, id] as const,
  },

  // User queries - aligned with UserCacheKeys
  user: {
    all: () => ["users"] as const,
    byId: (userId: string) => ["users", userId] as const,
  },
} as const;

/**
 * Utility functions to convert between database cache keys and React Query keys
 * This helps maintain consistency between server and client caching
 */
export const cacheKeyUtils = {
  // Convert database cache key to React Query key format
  fromDatabaseKey: {
    fixedCost: (userId: string, fixedCostId?: string) =>
      fixedCostId
        ? reactQueryKeys.fixedExpenses.detail(userId, fixedCostId)
        : reactQueryKeys.fixedExpenses.byUserId(userId),

    billableCost: (userId: string) =>
      reactQueryKeys.billableExpenses.byUserId(userId),

    equipmentCost: (userId: string, equipmentId?: string) =>
      equipmentId
        ? reactQueryKeys.equipmentExpenses.detail(userId, equipmentId)
        : reactQueryKeys.equipmentExpenses.byUserId(userId),

    user: (userId: string) =>
      reactQueryKeys.user.byId(userId),
  },

  // Get corresponding database cache key for invalidation
  toDatabaseKey: {
    fixedCost: (userId: string, fixedCostId?: string) =>
      fixedCostId
        ? FixedCostCacheKeys.fixedCost(userId, fixedCostId)
        : FixedCostCacheKeys.fixedCostsList(userId),

    billableCost: (userId: string) =>
      BillableCostCacheKeys.billableCost(userId),

    equipmentCost: (userId: string) =>
      EquipmentCostCacheKeys.list(userId),

    user: (userId: string) =>
      UserCacheKeys.user(userId),
  },
};

// Type helpers for query keys
export type ReactQueryKeys = typeof reactQueryKeys;
export type FixedExpensesQueryKeys = ReactQueryKeys["fixedExpenses"];
export type BillableExpensesQueryKeys = ReactQueryKeys["billableExpenses"];
export type EquipmentExpensesQueryKeys = ReactQueryKeys["equipmentExpenses"];
export type UserQueryKeys = ReactQueryKeys["user"];

// Legacy export for backward compatibility
export const queryKeys = reactQueryKeys;