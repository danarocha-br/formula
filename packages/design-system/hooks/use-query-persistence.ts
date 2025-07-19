"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  restoreQueryClient,
  persistQueryClient,
  isPersistenceAvailable
} from "../lib/query-persistence";

/**
 * Hook to enable query persistence for offline support
 * Call this hook in your app to automatically persist and restore query data
 */
export function useQueryPersistence(enabled: boolean = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !isPersistenceAvailable()) {
      return;
    }

    let isMounted = true;
    let persistTimeout: NodeJS.Timeout;

    const setupPersistence = async () => {
      try {
        // Restore persisted data on mount
        await restoreQueryClient(queryClient);

        // Set up automatic persistence on cache changes
        const unsubscribe = queryClient.getQueryCache().subscribe(() => {
          if (!isMounted) return;

          // Debounce persistence to avoid too frequent writes
          clearTimeout(persistTimeout);
          persistTimeout = setTimeout(() => {
            if (isMounted) {
              persistQueryClient(queryClient);
            }
          }, 1000);
        });

        // Cleanup function
        return () => {
          unsubscribe();
          clearTimeout(persistTimeout);
        };
      } catch (error) {
        console.warn("Failed to setup query persistence:", error);
      }
    };

    const cleanup = setupPersistence();

    return () => {
      isMounted = false;
      cleanup?.then(cleanupFn => cleanupFn?.());
      clearTimeout(persistTimeout);
    };
  }, [queryClient, enabled]);
}

/**
 * Hook to manually persist query data
 */
export function usePersistQueries() {
  const queryClient = useQueryClient();

  return {
    persist: () => persistQueryClient(queryClient),
    restore: () => restoreQueryClient(queryClient),
  };
}