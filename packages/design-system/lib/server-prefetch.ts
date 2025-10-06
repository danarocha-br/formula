/**
 * Server-side query prefetching utilities for Next.js server components
 * These utilities allow prefetching data on the server and hydrating the client cache
 */

import { QueryClient, dehydrate } from "@tanstack/react-query";

/**
 * Interface for query functions to be prefetched
 */
interface PrefetchQuery {
  queryKey: unknown[];
  queryFn: () => Promise<unknown>;
  staleTime?: number;
}

/**
 * Creates a new QueryClient instance for server-side prefetching
 * Each server request should use a fresh QueryClient
 */
function createServerQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Don't retry on server
        retry: false,
        // Server queries should be fresh
        staleTime: 0,
      },
    },
  });
}

/**
 * Prefetches multiple queries on the server and returns dehydrated state
 * @param queries Array of queries to prefetch
 * @returns Dehydrated state for client hydration
 */
export async function prefetchQueries(queries: PrefetchQuery[]) {
  const queryClient = createServerQueryClient();

  // Prefetch all queries in parallel
  await Promise.all(
    queries.map(({ queryKey, queryFn, staleTime }) =>
      queryClient.prefetchQuery({
        queryKey,
        queryFn,
        staleTime,
      })
    )
  );

  return dehydrate(queryClient);
}

/**
 * Prefetches a single query on the server
 * @param queryKey The query key
 * @param queryFn The query function
 * @param staleTime Optional stale time override
 * @returns Dehydrated state for client hydration
 */
export async function prefetchQuery(
  queryKey: unknown[],
  queryFn: () => Promise<unknown>,
  staleTime?: number
) {
  return prefetchQueries([{ queryKey, queryFn, staleTime }]);
}

/**
 * Creates a server-side query client for more complex prefetching scenarios
 * Use this when you need more control over the prefetching process
 * @returns A fresh QueryClient instance
 */
export function getServerQueryClient() {
  return createServerQueryClient();
}

/**
 * Utility to safely handle server-side query errors
 * Returns null if the query fails, allowing the page to render without the data
 * @param queryFn The query function to execute
 * @returns The query result or null if it fails
 */
export async function safeServerQuery<T>(
  queryFn: () => Promise<T>
): Promise<T | null> {
  try {
    return await queryFn();
  } catch (error) {
    console.error("Server query failed:", error);
    return null;
  }
}