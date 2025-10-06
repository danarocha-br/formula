/**
 * Cache State Inspection Utilities
 * Provides detailed inspection and analysis of React Query cache state
 */

import type { QueryClient, QueryKey, Query } from '@tanstack/react-query';
import { performanceMonitor } from './performance-monitor';

export interface CacheQueryInfo {
  queryKey: QueryKey;
  queryHash: string;
  state: {
    status: string;
    fetchStatus: string;
    data: any;
    dataUpdatedAt: number;
    error: any;
    errorUpdatedAt: number;
    failureCount: number;
    failureReason: any;
    isInvalidated: boolean;
    isStale: boolean;
  };
  observers: number;
  gcTime: number;
  staleTime: number;
  lastFetched: number;
  dataSize: number;
  estimatedMemoryUsage: number;
}

export interface CacheSnapshot {
  timestamp: number;
  totalQueries: number;
  activeQueries: number;
  staleQueries: number;
  invalidQueries: number;
  errorQueries: number;
  totalDataSize: number;
  estimatedMemoryUsage: number;
  queries: CacheQueryInfo[];
  queryKeyPatterns: Record<string, number>;
  features: Record<string, {
    queryCount: number;
    dataSize: number;
    memoryUsage: number;
    staleCount: number;
    errorCount: number;
  }>;
}

export interface CacheAnalysis {
  healthScore: number;
  issues: Array<{
    type: 'memory' | 'stale' | 'error' | 'performance' | 'duplication';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    queryKey?: QueryKey;
    recommendation: string;
  }>;
  recommendations: string[];
  statistics: {
    averageDataSize: number;
    largestQuery: CacheQueryInfo | null;
    oldestQuery: CacheQueryInfo | null;
    mostActiveQuery: CacheQueryInfo | null;
    duplicateQueries: Array<{
      pattern: string;
      count: number;
      queries: CacheQueryInfo[];
    }>;
  };
}

class CacheStateInspector {
  private queryClient: QueryClient | null = null;

  /**
   * Initialize with a QueryClient instance
   */
  initialize(queryClient: QueryClient): void {
    this.queryClient = queryClient;
  }

  /**
   * Get a complete snapshot of the current cache state
   */
  getCacheSnapshot(): CacheSnapshot | null {
    if (!this.queryClient) {
      console.warn('CacheStateInspector not initialized with QueryClient');
      return null;
    }

    const startTime = performance.now();
    const cache = this.queryClient.getQueryCache();
    const queries = cache.getAll();

    const queryInfos: CacheQueryInfo[] = queries.map(query => this.analyzeQuery(query));

    // Analyze query key patterns
    const queryKeyPatterns: Record<string, number> = {};
    const features: Record<string, any> = {};

    queryInfos.forEach(queryInfo => {
      // Extract pattern from query key
      const pattern = this.extractQueryKeyPattern(queryInfo.queryKey);
      queryKeyPatterns[pattern] = (queryKeyPatterns[pattern] || 0) + 1;

      // Extract feature from query key
      const feature = this.extractFeatureFromQueryKey(queryInfo.queryKey);
      if (!features[feature]) {
        features[feature] = {
          queryCount: 0,
          dataSize: 0,
          memoryUsage: 0,
          staleCount: 0,
          errorCount: 0,
        };
      }

      features[feature].queryCount++;
      features[feature].dataSize += queryInfo.dataSize;
      features[feature].memoryUsage += queryInfo.estimatedMemoryUsage;
      if (queryInfo.state.isStale) features[feature].staleCount++;
      if (queryInfo.state.error) features[feature].errorCount++;
    });

    const snapshot: CacheSnapshot = {
      timestamp: Date.now(),
      totalQueries: queries.length,
      activeQueries: queryInfos.filter(q => q.state.fetchStatus === 'fetching').length,
      staleQueries: queryInfos.filter(q => q.state.isStale).length,
      invalidQueries: queryInfos.filter(q => q.state.isInvalidated).length,
      errorQueries: queryInfos.filter(q => q.state.error).length,
      totalDataSize: queryInfos.reduce((sum, q) => sum + q.dataSize, 0),
      estimatedMemoryUsage: queryInfos.reduce((sum, q) => sum + q.estimatedMemoryUsage, 0),
      queries: queryInfos,
      queryKeyPatterns,
      features,
    };

    // Track performance
    const duration = performance.now() - startTime;
    performanceMonitor.trackCacheOperation('getCacheSnapshot', 'cache-inspector', duration, true, {
      queryCount: queries.length,
      totalDataSize: snapshot.totalDataSize,
    });

    return snapshot;
  }

  /**
   * Analyze cache health and provide recommendations
   */
  analyzeCacheHealth(): CacheAnalysis | null {
    const snapshot = this.getCacheSnapshot();
    if (!snapshot) return null;

    const issues: CacheAnalysis['issues'] = [];
    const recommendations: string[] = [];

    // Memory usage analysis
    const memoryThreshold = 50 * 1024 * 1024; // 50MB
    if (snapshot.estimatedMemoryUsage > memoryThreshold) {
      issues.push({
        type: 'memory',
        severity: 'high',
        message: `High memory usage: ${(snapshot.estimatedMemoryUsage / 1024 / 1024).toFixed(2)}MB`,
        recommendation: 'Consider reducing cache time or implementing cache size limits',
      });
      recommendations.push('Implement cache size limits with LRU eviction');
    }

    // Stale queries analysis
    const stalePercentage = (snapshot.staleQueries / snapshot.totalQueries) * 100;
    if (stalePercentage > 30) {
      issues.push({
        type: 'stale',
        severity: 'medium',
        message: `High percentage of stale queries: ${stalePercentage.toFixed(1)}%`,
        recommendation: 'Review staleTime configuration for frequently accessed data',
      });
      recommendations.push('Optimize staleTime settings for better cache efficiency');
    }

    // Error queries analysis
    const errorPercentage = (snapshot.errorQueries / snapshot.totalQueries) * 100;
    if (errorPercentage > 10) {
      issues.push({
        type: 'error',
        severity: 'high',
        message: `High error rate: ${errorPercentage.toFixed(1)}%`,
        recommendation: 'Investigate and fix failing queries',
      });
      recommendations.push('Implement better error handling and retry strategies');
    }

    // Large query analysis
    const largeQueries = snapshot.queries.filter(q => q.dataSize > 1024 * 1024); // 1MB
    if (largeQueries.length > 0) {
      largeQueries.forEach(query => {
        issues.push({
          type: 'performance',
          severity: 'medium',
          message: `Large query data: ${(query.dataSize / 1024 / 1024).toFixed(2)}MB`,
          queryKey: query.queryKey,
          recommendation: 'Consider pagination or data filtering',
        });
      });
      recommendations.push('Implement pagination for large datasets');
    }

    // Duplicate query analysis
    const duplicateQueries = this.findDuplicateQueries(snapshot.queries);
    if (duplicateQueries.length > 0) {
      duplicateQueries.forEach(duplicate => {
        issues.push({
          type: 'duplication',
          severity: 'low',
          message: `Potential duplicate queries: ${duplicate.count} queries with pattern "${duplicate.pattern}"`,
          recommendation: 'Review query key structure to avoid unnecessary duplicates',
        });
      });
      recommendations.push('Optimize query key structure to reduce duplicates');
    }

    // Calculate health score (0-100)
    let healthScore = 100;
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical': healthScore -= 25; break;
        case 'high': healthScore -= 15; break;
        case 'medium': healthScore -= 10; break;
        case 'low': healthScore -= 5; break;
      }
    });
    healthScore = Math.max(0, healthScore);

    // Statistics
    const statistics = {
      averageDataSize: snapshot.totalDataSize / snapshot.totalQueries || 0,
      largestQuery: snapshot.queries.reduce((largest, query) =>
        !largest || query.dataSize > largest.dataSize ? query : largest, null as CacheQueryInfo | null),
      oldestQuery: snapshot.queries.reduce((oldest, query) =>
        !oldest || query.lastFetched < oldest.lastFetched ? query : oldest, null as CacheQueryInfo | null),
      mostActiveQuery: snapshot.queries.reduce((mostActive, query) =>
        !mostActive || query.observers > mostActive.observers ? query : mostActive, null as CacheQueryInfo | null),
      duplicateQueries,
    };

    return {
      healthScore,
      issues,
      recommendations,
      statistics,
    };
  }

  /**
   * Get detailed information about a specific query
   */
  inspectQuery(queryKey: QueryKey): CacheQueryInfo | null {
    if (!this.queryClient) return null;

    const cache = this.queryClient.getQueryCache();
    const query = cache.find({ queryKey });

    if (!query) return null;

    return this.analyzeQuery(query);
  }

  /**
   * Find queries matching a pattern
   */
  findQueries(pattern: string | RegExp): CacheQueryInfo[] {
    const snapshot = this.getCacheSnapshot();
    if (!snapshot) return [];

    return snapshot.queries.filter(query => {
      const keyString = JSON.stringify(query.queryKey);
      if (typeof pattern === 'string') {
        return keyString.includes(pattern);
      }
      return pattern.test(keyString);
    });
  }

  /**
   * Get cache statistics by feature
   */
  getFeatureStatistics(): Record<string, any> {
    const snapshot = this.getCacheSnapshot();
    return snapshot?.features || {};
  }

  /**
   * Export cache state for debugging
   */
  exportCacheState(): string {
    const snapshot = this.getCacheSnapshot();
    const analysis = this.analyzeCacheHealth();

    return JSON.stringify({
      snapshot,
      analysis,
      exportedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
    }, null, 2);
  }

  /**
   * Clear specific queries from cache
   */
  clearQueries(pattern: string | RegExp): number {
    if (!this.queryClient) return 0;

    const queries = this.findQueries(pattern);
    queries.forEach(queryInfo => {
      this.queryClient!.removeQueries({ queryKey: queryInfo.queryKey });
    });

    return queries.length;
  }

  /**
   * Invalidate queries matching a pattern
   */
  invalidateQueries(pattern: string | RegExp): Promise<void> {
    if (!this.queryClient) return Promise.resolve();

    const queries = this.findQueries(pattern);
    const promises = queries.map(queryInfo =>
      this.queryClient!.invalidateQueries({ queryKey: queryInfo.queryKey })
    );

    return Promise.all(promises).then(() => {});
  }

  /**
   * Get cache operation logs
   */
  getCacheOperationLogs(limit = 50): any[] {
    // This would integrate with the cache logger from query-cache-utils
    // For now, return empty array as placeholder
    return [];
  }

  private analyzeQuery(query: Query): CacheQueryInfo {
    const data = query.state.data;
    const dataSize = this.estimateDataSize(data);
    const estimatedMemoryUsage = dataSize * 1.5; // Rough estimate including overhead

    return {
      queryKey: query.queryKey,
      queryHash: query.queryHash,
      state: {
        status: query.state.status,
        fetchStatus: query.state.fetchStatus,
        data: this.sanitizeDataForInspection(data),
        dataUpdatedAt: query.state.dataUpdatedAt,
        error: query.state.error,
        errorUpdatedAt: query.state.errorUpdatedAt,
        failureCount: query.state.failureCount,
        failureReason: query.state.failureReason,
        isInvalidated: query.state.isInvalidated,
        isStale: query.isStale(),
      },
      observers: query.getObserversCount(),
      gcTime: query.gcTime || 0,
      staleTime: query.options.staleTime || 0,
      lastFetched: query.state.dataUpdatedAt || 0,
      dataSize,
      estimatedMemoryUsage,
    };
  }

  private estimateDataSize(data: any): number {
    if (!data) return 0;

    try {
      const jsonString = JSON.stringify(data);
      return new Blob([jsonString]).size;
    } catch {
      // Fallback for circular references or non-serializable data
      return 1024; // 1KB estimate
    }
  }

  private sanitizeDataForInspection(data: any): any {
    if (!data) return data;

    // For large arrays, show only first few items
    if (Array.isArray(data) && data.length > 10) {
      return {
        __type: 'Array',
        length: data.length,
        sample: data.slice(0, 3),
        __truncated: true,
      };
    }

    // For large objects, show structure but limit depth
    if (typeof data === 'object' && data !== null) {
      const keys = Object.keys(data);
      if (keys.length > 20) {
        const sampleKeys = keys.slice(0, 10);
        const sample: any = {};
        sampleKeys.forEach(key => {
          sample[key] = data[key];
        });
        return {
          __type: 'Object',
          keyCount: keys.length,
          sample,
          __truncated: true,
        };
      }
    }

    return data;
  }

  private extractQueryKeyPattern(queryKey: QueryKey): string {
    if (!Array.isArray(queryKey)) return String(queryKey);

    // Replace specific IDs with placeholders to identify patterns
    return queryKey.map(part => {
      if (typeof part === 'string') {
        // Replace UUIDs and numeric IDs with placeholders
        return part
          .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '{uuid}')
          .replace(/\b\d+\b/g, '{id}');
      }
      return part;
    }).join(':');
  }

  private extractFeatureFromQueryKey(queryKey: QueryKey): string {
    const keyString = JSON.stringify(queryKey).toLowerCase();

    if (keyString.includes('expense')) return 'expenses';
    if (keyString.includes('equipment')) return 'equipment';
    if (keyString.includes('billable')) return 'billable';
    if (keyString.includes('user')) return 'user';
    if (keyString.includes('auth')) return 'auth';

    return 'unknown';
  }

  private findDuplicateQueries(queries: CacheQueryInfo[]): Array<{
    pattern: string;
    count: number;
    queries: CacheQueryInfo[];
  }> {
    const patternGroups: Record<string, CacheQueryInfo[]> = {};

    queries.forEach(query => {
      const pattern = this.extractQueryKeyPattern(query.queryKey);
      if (!patternGroups[pattern]) {
        patternGroups[pattern] = [];
      }
      patternGroups[pattern].push(query);
    });

    return Object.entries(patternGroups)
      .filter(([, queries]) => queries.length > 3) // Consider 3+ similar queries as potential duplicates
      .map(([pattern, queries]) => ({
        pattern,
        count: queries.length,
        queries,
      }));
  }
}

// Singleton instance
export const cacheStateInspector = new CacheStateInspector();

/**
 * React hook to access cache state inspection
 */
export function useCacheStateInspector() {
  return {
    getCacheSnapshot: () => cacheStateInspector.getCacheSnapshot(),
    analyzeCacheHealth: () => cacheStateInspector.analyzeCacheHealth(),
    inspectQuery: (queryKey: QueryKey) => cacheStateInspector.inspectQuery(queryKey),
    findQueries: (pattern: string | RegExp) => cacheStateInspector.findQueries(pattern),
    getFeatureStatistics: () => cacheStateInspector.getFeatureStatistics(),
    exportCacheState: () => cacheStateInspector.exportCacheState(),
    clearQueries: (pattern: string | RegExp) => cacheStateInspector.clearQueries(pattern),
    invalidateQueries: (pattern: string | RegExp) => cacheStateInspector.invalidateQueries(pattern),
  };
}

/**
 * Development utility to log cache state to console
 */
export function logCacheState(): void {
  if (process.env.NODE_ENV !== 'development') return;

  const snapshot = cacheStateInspector.getCacheSnapshot();
  const analysis = cacheStateInspector.analyzeCacheHealth();

  if (!snapshot || !analysis) {
    console.warn('Cache state inspector not initialized');
    return;
  }

  console.group('🔍 Cache State Inspection');

  console.group('📊 Overview');
  console.log(`Total Queries: ${snapshot.totalQueries}`);
  console.log(`Active Queries: ${snapshot.activeQueries}`);
  console.log(`Stale Queries: ${snapshot.staleQueries}`);
  console.log(`Error Queries: ${snapshot.errorQueries}`);
  console.log(`Total Data Size: ${(snapshot.totalDataSize / 1024 / 1024).toFixed(2)}MB`);
  console.log(`Estimated Memory: ${(snapshot.estimatedMemoryUsage / 1024 / 1024).toFixed(2)}MB`);
  console.log(`Health Score: ${analysis.healthScore}/100`);
  console.groupEnd();

  if (analysis.issues.length > 0) {
    console.group('⚠️ Issues');
    analysis.issues.forEach(issue => {
      const icon = issue.severity === 'critical' ? '🚨' :
                   issue.severity === 'high' ? '🔴' :
                   issue.severity === 'medium' ? '🟡' : '🟢';
      console.warn(`${icon} [${issue.type}] ${issue.message}`);
      console.log(`   Recommendation: ${issue.recommendation}`);
    });
    console.groupEnd();
  }

  if (Object.keys(snapshot.features).length > 0) {
    console.group('🏗️ Features');
    Object.entries(snapshot.features).forEach(([feature, stats]) => {
      console.log(`${feature}:`, stats);
    });
    console.groupEnd();
  }

  console.groupEnd();
}

// Auto-initialize in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Make inspector available globally for debugging
  (window as any).cacheStateInspector = cacheStateInspector;
  (window as any).logCacheState = logCacheState;
}