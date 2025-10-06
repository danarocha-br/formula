/**
 * Automated cache cleanup utilities for expense features
 * Provides intelligent cache management, cleanup scheduling, and resource optimization
 */

import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { useEffect, useRef, useCallback } from 'react';
import { memoryLeakDetector } from './memory-leak-detection';
import { performanceMonitor } from './performance-monitor';

interface CacheCleanupConfig {
  maxAge: number; // milliseconds
  maxSize: number; // number of items
  cleanupInterval: number; // milliseconds
  priority: 'low' | 'medium' | 'high';
  feature: string;
}

interface CacheEntry {
  queryKey: QueryKey;
  lastAccessed: number;
  accessCount: number;
  dataSize: number;
  feature: string;
  priority: number;
}

interface CleanupTask {
  id: string;
  type: 'cache_cleanup' | 'memory_cleanup' | 'query_cleanup' | 'component_cleanup';
  feature: string;
  scheduledAt: number;
  executeAt: number;
  priority: number;
  cleanup: () => void | Promise<void>;
  completed: boolean;
}

interface CleanupMetrics {
  totalCleanups: number;
  successfulCleanups: number;
  failedCleanups: number;
  memoryFreed: number;
  cacheEntriesRemoved: number;
  averageCleanupTime: number;
  lastCleanupTime: number;
}

class AutomatedCacheCleanup {
  private queryClient: QueryClient | null = null;
  private cleanupTasks = new Map<string, CleanupTask>();
  private cacheEntries = new Map<string, CacheEntry>();
  private cleanupConfigs = new Map<string, CacheCleanupConfig>();
  private cleanupMetrics: CleanupMetrics = {
    totalCleanups: 0,
    successfulCleanups: 0,
    failedCleanups: 0,
    memoryFreed: 0,
    cacheEntriesRemoved: 0,
    averageCleanupTime: 0,
    lastCleanupTime: 0,
  };

  private cleanupInterval?: NodeJS.Timeout;
  private readonly DEFAULT_CLEANUP_INTERVAL = 60000; // 1 minute
  private readonly MAX_CACHE_SIZE = 1000;
  private readonly MAX_CACHE_AGE = 30 * 60 * 1000; // 30 minutes

  /**
   * Initialize with QueryClient
   */
  initialize(queryClient: QueryClient): void {
    this.queryClient = queryClient;
    this.startAutomaticCleanup();
    console.log('🧹 Automated cache cleanup initialized');
  }

  /**
   * Register cleanup configuration for a feature
   */
  registerFeatureCleanup(feature: string, config: Partial<CacheCleanupConfig> = {}): void {
    const fullConfig: CacheCleanupConfig = {
      maxAge: this.MAX_CACHE_AGE,
      maxSize: this.MAX_CACHE_SIZE,
      cleanupInterval: this.DEFAULT_CLEANUP_INTERVAL,
      priority: 'medium',
      ...config,
      feature,
    };

    this.cleanupConfigs.set(feature, fullConfig);
    console.log(`📝 Registered cleanup config for ${feature}:`, fullConfig);
  }

  /**
   * Schedule a cleanup task
   */
  scheduleCleanup(
    id: string,
    type: CleanupTask['type'],
    feature: string,
    cleanup: () => void | Promise<void>,
    delay = 0,
    priority = 1
  ): void {
    const now = Date.now();
    const task: CleanupTask = {
      id,
      type,
      feature,
      scheduledAt: now,
      executeAt: now + delay,
      priority,
      cleanup,
      completed: false,
    };

    this.cleanupTasks.set(id, task);
  }

  /**
   * Track cache entry access
   */
  trackCacheAccess(queryKey: QueryKey, feature: string, dataSize = 0): void {
    const keyString = JSON.stringify(queryKey);
    const now = Date.now();

    const existing = this.cacheEntries.get(keyString);
    if (existing) {
      existing.lastAccessed = now;
      existing.accessCount += 1;
    } else {
      this.cacheEntries.set(keyString, {
        queryKey,
        lastAccessed: now,
        accessCount: 1,
        dataSize,
        feature,
        priority: this.getPriorityScore(feature),
      });
    }
  }

  /**
   * Clean up stale cache entries
   */
  async cleanupStaleEntries(feature?: string): Promise<number> {
    if (!this.queryClient) return 0;

    const startTime = performance.now();
    const memoryBefore = this.getCurrentMemoryUsage();
    let removedCount = 0;

    try {
      const now = Date.now();
      const entriesToRemove: string[] = [];

      // Find stale entries
      for (const [keyString, entry] of this.cacheEntries.entries()) {
        if (feature && entry.feature !== feature) continue;

        const config = this.cleanupConfigs.get(entry.feature);
        const maxAge = config?.maxAge || this.MAX_CACHE_AGE;

        // Check if entry is stale
        if (now - entry.lastAccessed > maxAge) {
          entriesToRemove.push(keyString);
        }
      }

      // Remove stale entries
      for (const keyString of entriesToRemove) {
        const entry = this.cacheEntries.get(keyString);
        if (entry) {
          this.queryClient.removeQueries({ queryKey: entry.queryKey });
          this.cacheEntries.delete(keyString);
          removedCount++;
        }
      }

      // Update metrics
      const duration = performance.now() - startTime;
      const memoryAfter = this.getCurrentMemoryUsage();
      const memoryFreed = Math.max(0, memoryBefore - memoryAfter);

      this.updateCleanupMetrics(duration, removedCount, memoryFreed, true);

      if (removedCount > 0) {
        console.log(
          `🧹 Cleaned up ${removedCount} stale cache entries` +
          (feature ? ` for ${feature}` : '') +
          `, freed ${(memoryFreed / 1024 / 1024).toFixed(2)}MB`
        );
      }

      return removedCount;
    } catch (error) {
      console.error('Error during cache cleanup:', error);
      this.updateCleanupMetrics(performance.now() - startTime, 0, 0, false);
      return 0;
    }
  }

  /**
   * Clean up cache entries by size limit
   */
  async cleanupBySize(feature?: string): Promise<number> {
    if (!this.queryClient) return 0;

    const startTime = performance.now();
    const memoryBefore = this.getCurrentMemoryUsage();
    let removedCount = 0;

    try {
      const config = feature ? this.cleanupConfigs.get(feature) : null;
      const maxSize = config?.maxSize || this.MAX_CACHE_SIZE;

      // Get entries for the feature (or all entries)
      const entries = Array.from(this.cacheEntries.entries())
        .filter(([, entry]) => !feature || entry.feature === feature)
        .map(([keyString, entry]) => ({ keyString, ...entry }));

      if (entries.length <= maxSize) return 0;

      // Sort by priority (lower priority first) and last accessed time
      entries.sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return a.lastAccessed - b.lastAccessed;
      });

      // Remove excess entries
      const entriesToRemove = entries.slice(0, entries.length - maxSize);

      for (const entry of entriesToRemove) {
        this.queryClient.removeQueries({ queryKey: entry.queryKey });
        this.cacheEntries.delete(entry.keyString);
        removedCount++;
      }

      // Update metrics
      const duration = performance.now() - startTime;
      const memoryAfter = this.getCurrentMemoryUsage();
      const memoryFreed = Math.max(0, memoryBefore - memoryAfter);

      this.updateCleanupMetrics(duration, removedCount, memoryFreed, true);

      if (removedCount > 0) {
        console.log(
          `🧹 Cleaned up ${removedCount} cache entries by size limit` +
          (feature ? ` for ${feature}` : '') +
          `, freed ${(memoryFreed / 1024 / 1024).toFixed(2)}MB`
        );
      }

      return removedCount;
    } catch (error) {
      console.error('Error during size-based cleanup:', error);
      this.updateCleanupMetrics(performance.now() - startTime, 0, 0, false);
      return 0;
    }
  }

  /**
   * Execute scheduled cleanup tasks
   */
  async executeScheduledTasks(): Promise<void> {
    const now = Date.now();
    const tasksToExecute = Array.from(this.cleanupTasks.values())
      .filter(task => !task.completed && task.executeAt <= now)
      .sort((a, b) => b.priority - a.priority);

    for (const task of tasksToExecute) {
      const startTime = performance.now();

      try {
        await task.cleanup();
        task.completed = true;

        const duration = performance.now() - startTime;
        performanceMonitor.trackCacheOperation(
          `cleanup-${task.type}`,
          task.feature,
          duration,
          true
        );

        console.log(`✅ Completed cleanup task ${task.id} for ${task.feature}`);
      } catch (error) {
        console.error(`❌ Failed cleanup task ${task.id}:`, error);

        const duration = performance.now() - startTime;
        performanceMonitor.trackCacheOperation(
          `cleanup-${task.type}`,
          task.feature,
          duration,
          false
        );
      }
    }

    // Remove completed tasks
    for (const task of tasksToExecute) {
      if (task.completed) {
        this.cleanupTasks.delete(task.id);
      }
    }
  }

  /**
   * Perform comprehensive cleanup
   */
  async performComprehensiveCleanup(): Promise<{
    staleEntriesRemoved: number;
    sizeBasedRemoved: number;
    memoryFreed: number;
    tasksExecuted: number;
  }> {
    console.log('🧹 Starting comprehensive cache cleanup...');

    const memoryBefore = this.getCurrentMemoryUsage();

    // Execute scheduled tasks
    await this.executeScheduledTasks();
    const tasksExecuted = Array.from(this.cleanupTasks.values())
      .filter(t => t.completed).length;

    // Clean up stale entries
    const staleEntriesRemoved = await this.cleanupStaleEntries();

    // Clean up by size
    const sizeBasedRemoved = await this.cleanupBySize();

    // Force garbage collection if available
    if (typeof global !== 'undefined' && global.gc) {
      global.gc();
    }

    const memoryAfter = this.getCurrentMemoryUsage();
    const memoryFreed = Math.max(0, memoryBefore - memoryAfter);

    // Update memory leak detector
    memoryLeakDetector.takeSnapshot();

    const result = {
      staleEntriesRemoved,
      sizeBasedRemoved,
      memoryFreed,
      tasksExecuted,
    };

    console.log('🧹 Comprehensive cleanup completed:', result);
    return result;
  }

  /**
   * Start automatic cleanup
   */
  private startAutomaticCleanup(): void {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(async () => {
      await this.performComprehensiveCleanup();
    }, this.DEFAULT_CLEANUP_INTERVAL);
  }

  /**
   * Stop automatic cleanup
   */
  stopAutomaticCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  /**
   * Get priority score for a feature
   */
  private getPriorityScore(feature: string): number {
    const config = this.cleanupConfigs.get(feature);
    if (!config) return 1;

    const priorityScores = { low: 1, medium: 2, high: 3 };
    return priorityScores[config.priority];
  }

  /**
   * Get current memory usage
   */
  private getCurrentMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    } else if (typeof window !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize || 0;
    }
    return 0;
  }

  /**
   * Update cleanup metrics
   */
  private updateCleanupMetrics(
    duration: number,
    entriesRemoved: number,
    memoryFreed: number,
    success: boolean
  ): void {
    this.cleanupMetrics.totalCleanups += 1;

    if (success) {
      this.cleanupMetrics.successfulCleanups += 1;
    } else {
      this.cleanupMetrics.failedCleanups += 1;
    }

    this.cleanupMetrics.cacheEntriesRemoved += entriesRemoved;
    this.cleanupMetrics.memoryFreed += memoryFreed;
    this.cleanupMetrics.lastCleanupTime = Date.now();

    // Update average cleanup time
    const totalTime = this.cleanupMetrics.averageCleanupTime * (this.cleanupMetrics.totalCleanups - 1) + duration;
    this.cleanupMetrics.averageCleanupTime = totalTime / this.cleanupMetrics.totalCleanups;
  }

  /**
   * Get cleanup metrics
   */
  getMetrics(): CleanupMetrics {
    return { ...this.cleanupMetrics };
  }

  /**
   * Get cache entries
   */
  getCacheEntries(feature?: string): CacheEntry[] {
    return Array.from(this.cacheEntries.values())
      .filter(entry => !feature || entry.feature === feature);
  }

  /**
   * Get scheduled tasks
   */
  getScheduledTasks(feature?: string): CleanupTask[] {
    return Array.from(this.cleanupTasks.values())
      .filter(task => !feature || task.feature === feature);
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.stopAutomaticCleanup();
    this.cleanupTasks.clear();
    this.cacheEntries.clear();
    this.cleanupConfigs.clear();
    this.cleanupMetrics = {
      totalCleanups: 0,
      successfulCleanups: 0,
      failedCleanups: 0,
      memoryFreed: 0,
      cacheEntriesRemoved: 0,
      averageCleanupTime: 0,
      lastCleanupTime: 0,
    };
  }
}

// Singleton instance
export const automatedCacheCleanup = new AutomatedCacheCleanup();

/**
 * Hook for automatic cache cleanup in components
 */
export function useAutomatedCacheCleanup(
  feature: string,
  config?: Partial<CacheCleanupConfig>
): {
  scheduleCleanup: (id: string, cleanup: () => void | Promise<void>, delay?: number) => void;
  trackAccess: (queryKey: QueryKey, dataSize?: number) => void;
  performCleanup: () => Promise<number>;
} {
  const cleanupRef = useRef<Set<string>>(new Set());

  // Register feature cleanup config
  useEffect(() => {
    automatedCacheCleanup.registerFeatureCleanup(feature, config);
  }, [feature, config]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cancel scheduled cleanups for this component
      cleanupRef.current.forEach(id => {
        const tasks = automatedCacheCleanup.getScheduledTasks(feature);
        const task = tasks.find(t => t.id === id);
        if (task) {
          task.completed = true;
        }
      });
    };
  }, [feature]);

  const scheduleCleanup = useCallback((
    id: string,
    cleanup: () => void | Promise<void>,
    delay = 0
  ) => {
    const fullId = `${feature}-${id}-${Date.now()}`;
    cleanupRef.current.add(fullId);
    automatedCacheCleanup.scheduleCleanup(fullId, 'component_cleanup', feature, cleanup, delay);
  }, [feature]);

  const trackAccess = useCallback((queryKey: QueryKey, dataSize = 0) => {
    automatedCacheCleanup.trackCacheAccess(queryKey, feature, dataSize);
  }, [feature]);

  const performCleanup = useCallback(async () => {
    return automatedCacheCleanup.cleanupStaleEntries(feature);
  }, [feature]);

  return {
    scheduleCleanup,
    trackAccess,
    performCleanup,
  };
}

/**
 * Hook for query-specific cleanup
 */
export function useQueryCleanup(
  queryKey: QueryKey,
  feature: string,
  options: {
    maxAge?: number;
    onCleanup?: () => void;
    trackAccess?: boolean;
  } = {}
): void {
  const { scheduleCleanup, trackAccess } = useAutomatedCacheCleanup(feature);
  const { maxAge = 30 * 60 * 1000, onCleanup, trackAccess: shouldTrackAccess = true } = options;

  // Track access if enabled
  useEffect(() => {
    if (shouldTrackAccess) {
      trackAccess(queryKey);
    }
  }, [queryKey, trackAccess, shouldTrackAccess]);

  // Schedule cleanup
  useEffect(() => {
    const cleanupId = `query-${JSON.stringify(queryKey)}`;

    scheduleCleanup(
      cleanupId,
      async () => {
        if (onCleanup) {
          onCleanup();
        }
        console.log(`🧹 Cleaned up query: ${JSON.stringify(queryKey)}`);
      },
      maxAge
    );
  }, [queryKey, maxAge, onCleanup, scheduleCleanup]);
}

/**
 * Hook for mutation cleanup
 */
export function useMutationCleanup(
  mutationKey: string,
  feature: string,
  cleanup: () => void | Promise<void>
): void {
  const { scheduleCleanup } = useAutomatedCacheCleanup(feature);

  useEffect(() => {
    const cleanupId = `mutation-${mutationKey}`;

    // Schedule immediate cleanup on unmount
    return () => {
      scheduleCleanup(cleanupId, cleanup, 0);
    };
  }, [mutationKey, cleanup, scheduleCleanup]);
}

/**
 * Initialize automated cache cleanup with QueryClient
 */
export function initializeAutomatedCacheCleanup(queryClient: QueryClient): void {
  automatedCacheCleanup.initialize(queryClient);

  // Register default feature configs
  automatedCacheCleanup.registerFeatureCleanup('fixed-expenses', {
    maxAge: 15 * 60 * 1000, // 15 minutes
    maxSize: 500,
    priority: 'high',
  });

  automatedCacheCleanup.registerFeatureCleanup('billable-expenses', {
    maxAge: 10 * 60 * 1000, // 10 minutes
    maxSize: 100,
    priority: 'high',
  });

  automatedCacheCleanup.registerFeatureCleanup('equipment-expenses', {
    maxAge: 20 * 60 * 1000, // 20 minutes
    maxSize: 300,
    priority: 'medium',
  });

  console.log('🧹 Automated cache cleanup initialized with default configs');
}

/**
 * Export utilities for easy access
 */
export {
  type CacheCleanupConfig,
  type CacheEntry,
  type CleanupTask,
  type CleanupMetrics,
};