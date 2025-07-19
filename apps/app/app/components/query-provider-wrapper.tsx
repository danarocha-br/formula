"use client";

import { QueryProvider } from "@repo/design-system/providers/query-provider";
import { useQueryPersistence } from "@repo/design-system/hooks/use-query-persistence";
import type { ReactNode } from "react";

interface QueryProviderWrapperProps {
  children: ReactNode;
  dehydratedState?: unknown;
  enablePersistence?: boolean;
}

/**
 * Client-side QueryProvider wrapper for pages that don't use server-side prefetching
 */
export function QueryProviderWrapper({
  children,
  dehydratedState,
  enablePersistence = true
}: QueryProviderWrapperProps) {
  return (
    <QueryProvider dehydratedState={dehydratedState}>
      <PersistenceWrapper enablePersistence={enablePersistence}>
        {children}
      </PersistenceWrapper>
    </QueryProvider>
  );
}

/**
 * Inner component that uses the persistence hook
 */
function PersistenceWrapper({
  children,
  enablePersistence
}: {
  children: ReactNode;
  enablePersistence: boolean;
}) {
  // Enable query persistence for offline support
  useQueryPersistence(enablePersistence);

  return <>{children}</>;
}