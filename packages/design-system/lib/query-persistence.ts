/**
 * React Query persistence utilities for offline support
 * Simple implementation that works without additional dependencies
 */

import { QueryClient } from "@tanstack/react-query";

/**
 * Simple persistence interface
 */
interface PersistedData {
  timestamp: number;
  data: any;
}

/**
 * LocalStorage persister for React Query
 */
export function createLocalStoragePersister(localStorageKey: string = "reactQueryCache") {
  return {
    persistData: async (data: any) => {
      if (typeof window === "undefined") return;

      try {
        const persistedData: PersistedData = {
          timestamp: Date.now(),
          data,
        };
        localStorage.setItem(localStorageKey, JSON.stringify(persistedData));
      } catch (error) {
        console.warn("Failed to persist query cache to localStorage:", error);
      }
    },

    restoreData: async (): Promise<any | undefined> => {
      if (typeof window === "undefined") return undefined;

      try {
        const cached = localStorage.getItem(localStorageKey);
        if (!cached) return undefined;

        const persistedData: PersistedData = JSON.parse(cached);

        // Check if data is not too old (24 hours)
        const maxAge = 24 * 60 * 60 * 1000;
        if (Date.now() - persistedData.timestamp > maxAge) {
          localStorage.removeItem(localStorageKey);
          return undefined;
        }

        return persistedData.data;
      } catch (error) {
        console.warn("Failed to restore query cache from localStorage:", error);
        return undefined;
      }
    },

    removeData: async () => {
      if (typeof window === "undefined") return;

      try {
        localStorage.removeItem(localStorageKey);
      } catch (error) {
        console.warn("Failed to remove query cache from localStorage:", error);
      }
    },
  };
}

/**
 * Get the appropriate persister
 */
export function getPersister() {
  return createLocalStoragePersister();
}

/**
 * Configuration for query persistence
 */
export const persistenceConfig = {
  // Maximum age of persisted data (24 hours)
  maxAge: 24 * 60 * 60 * 1000,

  // Queries to persist (only critical data)
  persistQueryKeys: [
    "fixed-expenses-list",
    "billable-expenses-list",
    "equipment-expenses-list",
    "users"
  ],

  // Function to determine if a query should be persisted
  shouldPersistQuery: (queryKey: unknown[]) => {
    const key = Array.isArray(queryKey) ? queryKey[0] : queryKey;
    return typeof key === "string" && persistenceConfig.persistQueryKeys.some(
      persistKey => key.includes(persistKey)
    );
  },
};

/**
 * Utility to persist query client data
 */
export async function persistQueryClient(queryClient: QueryClient) {
  if (typeof window === "undefined") return;

  try {
    const persister = getPersister();
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();

    // Filter and serialize queries that should be persisted
    const persistableQueries = queries
      .filter(query => {
        // Only persist successful queries
        if (query.state.status !== "success") return false;

        // Check if query should be persisted
        return persistenceConfig.shouldPersistQuery(query.queryKey);
      })
      .map(query => ({
        queryKey: query.queryKey,
        queryHash: query.queryHash,
        state: query.state,
      }));

    await persister.persistData(persistableQueries);
  } catch (error) {
    console.warn("Failed to persist query client:", error);
  }
}

/**
 * Utility to restore query client data
 */
export async function restoreQueryClient(queryClient: QueryClient) {
  if (typeof window === "undefined") return;

  try {
    const persister = getPersister();
    const persistedQueries = await persister.restoreData();

    if (!persistedQueries || !Array.isArray(persistedQueries)) return;

    // Restore queries to the cache
    persistedQueries.forEach((query: any) => {
      queryClient.setQueryData(query.queryKey, query.state.data);
    });
  } catch (error) {
    console.warn("Failed to restore query client:", error);
  }
}

/**
 * Utility to clear persisted cache
 */
export async function clearPersistedCache() {
  const persister = getPersister();
  await persister.removeData();
}

/**
 * Utility to check if persistence is available
 */
export function isPersistenceAvailable(): boolean {
  if (typeof window === "undefined") return false;

  try {
    // Test localStorage availability
    const testKey = "__test_storage__";
    localStorage.setItem(testKey, "test");
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}