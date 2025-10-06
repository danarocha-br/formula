"use client";

import { cn } from "../../lib/utils";
import { Skeleton } from "./skeleton";
import { Icon } from "./icon";
import type { ReactNode } from "react";

interface QueryLoadingProps {
  className?: string;
}

/**
 * Generic skeleton loader for list items
 */
export function ListSkeleton({ className }: QueryLoadingProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
          <Skeleton className="h-8 w-[80px]" />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton loader for expense cards
 */
export function ExpenseCardSkeleton({ className }: QueryLoadingProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-[120px]" />
            <Skeleton className="h-6 w-[80px]" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[80%]" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-[60px]" />
            <div className="flex space-x-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton loader for table rows
 */
export function TableSkeleton({
  rows = 5,
  columns = 4,
  className
}: QueryLoadingProps & { rows?: number; columns?: number }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center space-x-4 p-2">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              className={cn(
                "h-4",
                colIndex === 0 ? "w-[100px]" :
                colIndex === columns - 1 ? "w-[80px]" : "w-[120px]"
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton loader for dashboard cards
 */
export function DashboardCardSkeleton({ className }: QueryLoadingProps) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-6 space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-4 w-4" />
          </div>
          <Skeleton className="h-8 w-[120px]" />
          <Skeleton className="h-3 w-[80px]" />
        </div>
      ))}
    </div>
  );
}

/**
 * Background refetch indicator
 */
interface BackgroundRefetchIndicatorProps {
  isRefetching: boolean;
  className?: string;
}

export function BackgroundRefetchIndicator({
  isRefetching,
  className
}: BackgroundRefetchIndicatorProps) {
  if (!isRefetching) return null;

  return (
    <div className={cn(
      "fixed top-4 right-4 z-50 flex items-center space-x-2 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700 shadow-md border border-blue-200",
      className
    )}>
      <Icon name="refresh-cw" className="h-4 w-4 animate-spin" />
      <span>Updating...</span>
    </div>
  );
}

/**
 * Inline loading indicator for small components
 */
interface InlineLoadingProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

export function InlineLoading({
  size = "md",
  text = "Loading...",
  className
}: InlineLoadingProps) {
  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5"
  };

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <Icon
        name="loader-2"
        className={cn("animate-spin", sizeClasses[size])}
      />
      <span className={cn("text-muted-foreground", textSizeClasses[size])}>
        {text}
      </span>
    </div>
  );
}

/**
 * Full page loading overlay
 */
export function PageLoadingOverlay({
  text = "Loading...",
  className
}: { text?: string; className?: string }) {
  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm",
      className
    )}>
      <div className="flex flex-col items-center space-y-4">
        <Icon name="loader-2" className="h-8 w-8 animate-spin" />
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

/**
 * Query-specific loading wrapper that shows different states
 */
interface QueryLoadingWrapperProps {
  isLoading: boolean;
  isRefetching: boolean;
  error: Error | null;
  children: ReactNode;
  loadingSkeleton?: ReactNode;
  showRefetchIndicator?: boolean;
  className?: string;
}

export function QueryLoadingWrapper({
  isLoading,
  isRefetching,
  error,
  children,
  loadingSkeleton = <ListSkeleton />,
  showRefetchIndicator = true,
  className
}: QueryLoadingWrapperProps) {
  if (error) {
    throw error; // Let error boundary handle this
  }

  if (isLoading) {
    return <div className={className}>{loadingSkeleton}</div>;
  }

  return (
    <div className={cn("relative", className)}>
      {children}
      {showRefetchIndicator && (
        <BackgroundRefetchIndicator isRefetching={isRefetching} />
      )}
    </div>
  );
}