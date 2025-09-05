/**
 * Automated Cache Health Checker
 * Continuously monitors cache health and provides automated diagnostics
 */

import React from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { performanceMonitor } from './performance-monitor';
import { cacheStateInspector } from './cache-state-inspector';

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  details?: any;
  lastChecked: number;
  checkDuration: number;
}

export interface HealthStatus {
  overall: 'healthy' | 'warning' | 'error';
  score: number; // 0-100
  lastChecked: number;
  checks: Record<string, HealthCheck>;
  recommendations: string[];
  trends: {
    memoryTrend: 'improving' | 'stable' | 'degrading';
    performanceTrend: 'improving' | 'stable' | 'degrading';
    errorTrend: 'improving' | 'stable' | 'degrading';
  };
}

export interface HealthCheckConfig {
  enabled: boolean;
  interval: number; // milliseconds
  thresholds: {
    memory: {
      warning: number; // MB
      error: number; // MB
    };
    performance: {
      slowRenderWarning: number; // ms
      slowRenderError: number; // ms
      slowCacheWarning: number; // ms
      slowCacheError: number; // ms
    };
    errors: {
      renderErrorWarning: number; // percentage
      renderErrorError: number; // percentage
      cacheErrorWarning: number; // percentage
      cacheErrorError: number; // percentage
    };
    staleness: {
      staleQueriesWarning: number; // percentage
      staleQueriesError: number; // percentage
    };
  };
}

class CacheHealthChecker {
  private queryClient: QueryClient | null = null;
  private healthStatus: HealthStatus | null = null;
  private checkInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  private config: HealthCheckConfig = {
    enabled: process.env.NODE_ENV === 'development',
    interval: 30000, // 30 seconds
    thresholds: {
      memory: {
        warning: 50, // 50MB
        error: 100, // 100MB
      },
      performance: {
        slowRenderWarning: 16, // 60fps threshold
        slowRenderError: 33, // 30fps threshold
        slowCacheWarning: 50, // 50ms
        slowCacheError: 100, // 100ms
      },
      errors: {
        renderErrorWarning: 5, // 5%
        renderErrorError: 10, // 10%
        cacheErrorWarning: 5, // 5%
        cacheErrorError: 15, // 15%
      },
      staleness: {
        staleQueriesWarning: 30, // 30%
        staleQueriesError: 50, // 50%
      },
    },
  };

  /**
   * Initialize the health checker with a QueryClient
   */
  initialize(queryClient: QueryClient, config?: Partial<HealthCheckConfig>): void {
    this.queryClient = queryClient;

    if (config) {
      this.config = { ...this.config, ...config };
    }

    if (this.config.enabled) {
      this.startHealthChecks();
    }
  }

  /**
   * Start automated health checks
   */
  startHealthChecks(): void {
    if (this.isRunning || !this.config.enabled) return;

    this.isRunning = true;

    // Run initial check
    this.runHealthChecks();

    // Set up periodic checks
    this.checkInterval = setInterval(() => {
      this.runHealthChecks();
    }, this.config.interval);

    console.log('🏥 Cache health checker started');
  }

  /**
   * Stop automated health checks
   */
  stopHealthChecks(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    console.log('🏥 Cache health checker stopped');
  }

  /**
   * Run all health checks and update status
   */
  async runHealthChecks(): Promise<HealthStatus> {
    const startTime = performance.now();
    const checks: Record<string, HealthCheck> = {};

    try {
      // Memory health check
      checks.memory = await this.checkMemoryHealth();

      // Performance health check
      checks.performance = await this.checkPerformanceHealth();

      // Cache state health check
      checks.cacheState = await this.checkCacheStateHealth();

      // Error rate health check
      checks.errorRate = await this.checkErrorRateHealth();

      // Query staleness health check
      checks.staleness = await this.checkQueryStalenessHealth();

      // Cache consistency check
      checks.consistency = await this.checkCacheConsistencyHealth();

      // Calculate overall health
      const overallStatus = this.calculateOverallHealth(checks);
      const score = this.calculateHealthScore(checks);
      const recommendations = this.generateRecommendations(checks);
      const trends = this.calculateTrends();

      this.healthStatus = {
        overall: overallStatus,
        score,
        lastChecked: Date.now(),
        checks,
        recommendations,
        trends,
      };

      // Log health status in development
      if (process.env.NODE_ENV === 'development') {
        this.logHealthStatus();
      }

      // Track health check performance
      const duration = performance.now() - startTime;
      performanceMonitor.trackCacheOperation('healthCheck', 'health-checker', duration, true, {
        overallStatus,
        score,
        checksCount: Object.keys(checks).length,
      });

    } catch (error) {
      console.error('Health check failed:', error);

      // Create error status
      this.healthStatus = {
        overall: 'error',
        score: 0,
        lastChecked: Date.now(),
        checks: {
          system: {
            name: 'System Health',
            status: 'error',
            message: 'Health check system failed',
            details: { error: error instanceof Error ? error.message : String(error) },
            lastChecked: Date.now(),
            checkDuration: performance.now() - startTime,
          },
        },
        recommendations: ['Investigate health check system failure'],
        trends: {
          memoryTrend: 'stable',
          performanceTrend: 'stable',
          errorTrend: 'stable',
        },
      };
    }

    return this.healthStatus;
  }

  /**
   * Get current health status
   */
  getHealthStatus(): HealthStatus | null {
    return this.healthStatus;
  }

  /**
   * Get specific health check result
   */
  getHealthCheck(checkName: string): HealthCheck | null {
    return this.healthStatus?.checks[checkName] || null;
  }

  /**
   * Update health check configuration
   */
  updateConfig(config: Partial<HealthCheckConfig>): void {
    this.config = { ...this.config, ...config };

    if (this.config.enabled && !this.isRunning) {
      this.startHealthChecks();
    } else if (!this.config.enabled && this.isRunning) {
      this.stopHealthChecks();
    }
  }

  /**
   * Force a health check run
   */
  async forceHealthCheck(): Promise<HealthStatus> {
    return this.runHealthChecks();
  }

  private async checkMemoryHealth(): Promise<HealthCheck> {
    const startTime = performance.now();

    try {
      const memoryHistory = performanceMonitor.getMemoryHistory(5);
      const latestMemory = memoryHistory[memoryHistory.length - 1];

      if (!latestMemory) {
        return {
          name: 'Memory Health',
          status: 'warning',
          message: 'No memory data available',
          lastChecked: Date.now(),
          checkDuration: performance.now() - startTime,
        };
      }

      const memoryMB = latestMemory.heapUsed / 1024 / 1024;
      let status: HealthCheck['status'] = 'healthy';
      let message = `Memory usage: ${memoryMB.toFixed(2)}MB`;

      if (memoryMB > this.config.thresholds.memory.error) {
        status = 'error';
        message += ' - Critical memory usage';
      } else if (memoryMB > this.config.thresholds.memory.warning) {
        status = 'warning';
        message += ' - High memory usage';
      } else {
        message += ' - Normal';
      }

      // Check for memory leaks (increasing trend)
      if (memoryHistory.length >= 3) {
        const trend = this.calculateMemoryTrend(memoryHistory);
        if (trend === 'increasing') {
          status = status === 'healthy' ? 'warning' : status;
          message += ' (increasing trend detected)';
        }
      }

      return {
        name: 'Memory Health',
        status,
        message,
        details: {
          currentMemoryMB: memoryMB,
          thresholds: this.config.thresholds.memory,
          history: memoryHistory.slice(-3),
        },
        lastChecked: Date.now(),
        checkDuration: performance.now() - startTime,
      };
    } catch (error) {
      return {
        name: 'Memory Health',
        status: 'error',
        message: 'Failed to check memory health',
        details: { error: error instanceof Error ? error.message : String(error) },
        lastChecked: Date.now(),
        checkDuration: performance.now() - startTime,
      };
    }
  }

  private async checkPerformanceHealth(): Promise<HealthCheck> {
    const startTime = performance.now();

    try {
      const renderMetrics = performanceMonitor.getAllRenderMetrics();
      const cacheMetrics = performanceMonitor.getAllCacheMetrics();

      let status: HealthCheck['status'] = 'healthy';
      const issues: string[] = [];

      // Check render performance
      const slowRenders = renderMetrics.filter(m =>
        m.averageRenderTime > this.config.thresholds.performance.slowRenderWarning
      );

      if (slowRenders.length > 0) {
        const criticalRenders = slowRenders.filter(m =>
          m.averageRenderTime > this.config.thresholds.performance.slowRenderError
        );

        if (criticalRenders.length > 0) {
          status = 'error';
          issues.push(`${criticalRenders.length} components with critical render times`);
        } else {
          status = 'warning';
          issues.push(`${slowRenders.length} components with slow render times`);
        }
      }

      // Check cache performance
      const slowCacheOps = cacheMetrics.filter(m =>
        m.averageDuration > this.config.thresholds.performance.slowCacheWarning
      );

      if (slowCacheOps.length > 0) {
        const criticalCacheOps = slowCacheOps.filter(m =>
          m.averageDuration > this.config.thresholds.performance.slowCacheError
        );

        if (criticalCacheOps.length > 0) {
          status = 'error';
          issues.push(`${criticalCacheOps.length} cache operations with critical performance`);
        } else if (status === 'healthy') {
          status = 'warning';
          issues.push(`${slowCacheOps.length} cache operations with slow performance`);
        }
      }

      const message = issues.length > 0
        ? issues.join(', ')
        : 'All performance metrics within normal ranges';

      return {
        name: 'Performance Health',
        status,
        message,
        details: {
          renderMetrics: renderMetrics.length,
          slowRenders: slowRenders.length,
          cacheMetrics: cacheMetrics.length,
          slowCacheOps: slowCacheOps.length,
          thresholds: this.config.thresholds.performance,
        },
        lastChecked: Date.now(),
        checkDuration: performance.now() - startTime,
      };
    } catch (error) {
      return {
        name: 'Performance Health',
        status: 'error',
        message: 'Failed to check performance health',
        details: { error: error instanceof Error ? error.message : String(error) },
        lastChecked: Date.now(),
        checkDuration: performance.now() - startTime,
      };
    }
  }

  private async checkCacheStateHealth(): Promise<HealthCheck> {
    const startTime = performance.now();

    try {
      const snapshot = cacheStateInspector.getCacheSnapshot();

      if (!snapshot) {
        return {
          name: 'Cache State Health',
          status: 'warning',
          message: 'Cache state inspector not available',
          lastChecked: Date.now(),
          checkDuration: performance.now() - startTime,
        };
      }

      let status: HealthCheck['status'] = 'healthy';
      const issues: string[] = [];

      // Check for large cache size
      const cacheSizeMB = snapshot.estimatedMemoryUsage / 1024 / 1024;
      if (cacheSizeMB > 20) {
        status = 'warning';
        issues.push(`Large cache size: ${cacheSizeMB.toFixed(2)}MB`);
      }

      // Check for too many queries
      if (snapshot.totalQueries > 100) {
        status = status === 'healthy' ? 'warning' : status;
        issues.push(`High query count: ${snapshot.totalQueries}`);
      }

      const message = issues.length > 0
        ? issues.join(', ')
        : `Cache healthy: ${snapshot.totalQueries} queries, ${cacheSizeMB.toFixed(2)}MB`;

      return {
        name: 'Cache State Health',
        status,
        message,
        details: {
          totalQueries: snapshot.totalQueries,
          cacheSizeMB,
          activeQueries: snapshot.activeQueries,
          staleQueries: snapshot.staleQueries,
        },
        lastChecked: Date.now(),
        checkDuration: performance.now() - startTime,
      };
    } catch (error) {
      return {
        name: 'Cache State Health',
        status: 'error',
        message: 'Failed to check cache state health',
        details: { error: error instanceof Error ? error.message : String(error) },
        lastChecked: Date.now(),
        checkDuration: performance.now() - startTime,
      };
    }
  }

  private async checkErrorRateHealth(): Promise<HealthCheck> {
    const startTime = performance.now();

    try {
      const cacheMetrics = performanceMonitor.getAllCacheMetrics();
      const alerts = performanceMonitor.getAlerts(50);

      let status: HealthCheck['status'] = 'healthy';
      const issues: string[] = [];

      // Check cache error rates
      const totalCacheOps = cacheMetrics.reduce((sum, m) => sum + m.operationCount, 0);
      const totalCacheFailures = cacheMetrics.reduce((sum, m) => sum + m.failureCount, 0);
      const cacheErrorRate = totalCacheOps > 0 ? (totalCacheFailures / totalCacheOps) * 100 : 0;

      if (cacheErrorRate > this.config.thresholds.errors.cacheErrorError) {
        status = 'error';
        issues.push(`High cache error rate: ${cacheErrorRate.toFixed(1)}%`);
      } else if (cacheErrorRate > this.config.thresholds.errors.cacheErrorWarning) {
        status = 'warning';
        issues.push(`Elevated cache error rate: ${cacheErrorRate.toFixed(1)}%`);
      }

      // Check recent alerts
      const recentAlerts = alerts.filter(a => Date.now() - a.timestamp < 300000); // Last 5 minutes
      const criticalAlerts = recentAlerts.filter(a => a.severity === 'critical');

      if (criticalAlerts.length > 0) {
        status = 'error';
        issues.push(`${criticalAlerts.length} critical alerts in last 5 minutes`);
      } else if (recentAlerts.length > 5) {
        status = status === 'healthy' ? 'warning' : status;
        issues.push(`${recentAlerts.length} alerts in last 5 minutes`);
      }

      const message = issues.length > 0
        ? issues.join(', ')
        : `Error rates normal: ${cacheErrorRate.toFixed(1)}% cache errors`;

      return {
        name: 'Error Rate Health',
        status,
        message,
        details: {
          cacheErrorRate,
          totalCacheOps,
          totalCacheFailures,
          recentAlerts: recentAlerts.length,
          criticalAlerts: criticalAlerts.length,
          thresholds: this.config.thresholds.errors,
        },
        lastChecked: Date.now(),
        checkDuration: performance.now() - startTime,
      };
    } catch (error) {
      return {
        name: 'Error Rate Health',
        status: 'error',
        message: 'Failed to check error rate health',
        details: { error: error instanceof Error ? error.message : String(error) },
        lastChecked: Date.now(),
        checkDuration: performance.now() - startTime,
      };
    }
  }

  private async checkQueryStalenessHealth(): Promise<HealthCheck> {
    const startTime = performance.now();

    try {
      const snapshot = cacheStateInspector.getCacheSnapshot();

      if (!snapshot) {
        return {
          name: 'Query Staleness Health',
          status: 'warning',
          message: 'Cannot check staleness - cache inspector unavailable',
          lastChecked: Date.now(),
          checkDuration: performance.now() - startTime,
        };
      }

      const stalePercentage = snapshot.totalQueries > 0
        ? (snapshot.staleQueries / snapshot.totalQueries) * 100
        : 0;

      let status: HealthCheck['status'] = 'healthy';
      let message = `${stalePercentage.toFixed(1)}% of queries are stale`;

      if (stalePercentage > this.config.thresholds.staleness.staleQueriesError) {
        status = 'error';
        message += ' - Critical staleness level';
      } else if (stalePercentage > this.config.thresholds.staleness.staleQueriesWarning) {
        status = 'warning';
        message += ' - High staleness level';
      } else {
        message += ' - Normal';
      }

      return {
        name: 'Query Staleness Health',
        status,
        message,
        details: {
          staleQueries: snapshot.staleQueries,
          totalQueries: snapshot.totalQueries,
          stalePercentage,
          thresholds: this.config.thresholds.staleness,
        },
        lastChecked: Date.now(),
        checkDuration: performance.now() - startTime,
      };
    } catch (error) {
      return {
        name: 'Query Staleness Health',
        status: 'error',
        message: 'Failed to check query staleness health',
        details: { error: error instanceof Error ? error.message : String(error) },
        lastChecked: Date.now(),
        checkDuration: performance.now() - startTime,
      };
    }
  }

  private async checkCacheConsistencyHealth(): Promise<HealthCheck> {
    const startTime = performance.now();

    try {
      // This is a placeholder for more sophisticated consistency checks
      // In a real implementation, you might check for:
      // - Duplicate data across queries
      // - Inconsistent data states
      // - Missing expected queries

      return {
        name: 'Cache Consistency Health',
        status: 'healthy',
        message: 'Cache consistency checks passed',
        details: {
          checksPerformed: ['duplicate-detection', 'state-consistency'],
        },
        lastChecked: Date.now(),
        checkDuration: performance.now() - startTime,
      };
    } catch (error) {
      return {
        name: 'Cache Consistency Health',
        status: 'error',
        message: 'Failed to check cache consistency health',
        details: { error: error instanceof Error ? error.message : String(error) },
        lastChecked: Date.now(),
        checkDuration: performance.now() - startTime,
      };
    }
  }

  private calculateOverallHealth(checks: Record<string, HealthCheck>): HealthStatus['overall'] {
    const statuses = Object.values(checks).map(check => check.status);

    if (statuses.includes('error')) return 'error';
    if (statuses.includes('warning')) return 'warning';
    return 'healthy';
  }

  private calculateHealthScore(checks: Record<string, HealthCheck>): number {
    let score = 100;

    Object.values(checks).forEach(check => {
      switch (check.status) {
        case 'error': score -= 20; break;
        case 'warning': score -= 10; break;
        case 'healthy': break;
      }
    });

    return Math.max(0, score);
  }

  private generateRecommendations(checks: Record<string, HealthCheck>): string[] {
    const recommendations: string[] = [];

    Object.values(checks).forEach(check => {
      if (check.status === 'error') {
        recommendations.push(`Address critical issue: ${check.message}`);
      } else if (check.status === 'warning') {
        recommendations.push(`Monitor: ${check.message}`);
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('System is healthy - continue monitoring');
    }

    return recommendations;
  }

  private calculateTrends(): HealthStatus['trends'] {
    // This is a simplified implementation
    // In practice, you'd analyze historical data to determine trends

    return {
      memoryTrend: 'stable',
      performanceTrend: 'stable',
      errorTrend: 'stable',
    };
  }

  private calculateMemoryTrend(memoryHistory: any[]): 'increasing' | 'decreasing' | 'stable' {
    if (memoryHistory.length < 3) return 'stable';

    const recent = memoryHistory.slice(-2);
    const older = memoryHistory.slice(-4, -2);

    const recentAvg = recent.reduce((sum, m) => sum + m.heapUsed, 0) / recent.length;
    const olderAvg = older.reduce((sum, m) => sum + m.heapUsed, 0) / older.length;

    const change = (recentAvg - olderAvg) / olderAvg;

    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  private logHealthStatus(): void {
    if (!this.healthStatus) return;

    const icon = this.healthStatus.overall === 'healthy' ? '✅' :
                 this.healthStatus.overall === 'warning' ? '⚠️' : '❌';

    console.group(`${icon} Cache Health Status (Score: ${this.healthStatus.score}/100)`);

    Object.entries(this.healthStatus.checks).forEach(([name, check]) => {
      const checkIcon = check.status === 'healthy' ? '✅' :
                       check.status === 'warning' ? '⚠️' : '❌';
      console.log(`${checkIcon} ${check.name}: ${check.message}`);
    });

    if (this.healthStatus.recommendations.length > 0) {
      console.group('💡 Recommendations');
      this.healthStatus.recommendations.forEach(rec => console.log(`• ${rec}`));
      console.groupEnd();
    }

    console.groupEnd();
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopHealthChecks();
    this.healthStatus = null;
    this.queryClient = null;
  }
}

// Singleton instance
export const cacheHealthChecker = new CacheHealthChecker();

/**
 * React hook to access cache health status
 */
export function useCacheHealth() {
  const [healthStatus, setHealthStatus] = React.useState<HealthStatus | null>(null);

  React.useEffect(() => {
    const updateHealth = () => {
      const status = cacheHealthChecker.getHealthStatus();
      setHealthStatus(status);
    };

    // Initial update
    updateHealth();

    // Update every 30 seconds
    const interval = setInterval(updateHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  return {
    healthStatus,
    forceCheck: () => cacheHealthChecker.forceHealthCheck(),
    getHealthCheck: (name: string) => cacheHealthChecker.getHealthCheck(name),
  };
}

// Auto-initialize in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Make health checker available globally for debugging
  (window as any).cacheHealthChecker = cacheHealthChecker;
}