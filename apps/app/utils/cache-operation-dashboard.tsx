/**
 * Cache Operation Dashboard for Development
 * Provides real-time monitoring and debugging of React Query cache operations
 */

import React, { useState, useEffect, useCallback } from 'react';
import { performanceMonitor } from './performance-monitor';
import { cacheStateInspector } from './cache-state-inspector';
import { cacheHealthChecker } from './cache-health-checker';

interface DashboardMetrics {
  renderMetrics: any[];
  cacheMetrics: any[];
  memoryMetrics: any[];
  alerts: any[];
  healthStatus: any;
  cacheState: any;
}

interface DashboardProps {
  refreshInterval?: number;
  maxAlerts?: number;
  showHealthChecks?: boolean;
  showCacheState?: boolean;
}

export const CacheOperationDashboard: React.FC<DashboardProps> = ({
  refreshInterval = 5000,
  maxAlerts = 20,
  showHealthChecks = true,
  showCacheState = true,
}) => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    renderMetrics: [],
    cacheMetrics: [],
    memoryMetrics: [],
    alerts: [],
    healthStatus: null,
    cacheState: null,
  });
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'cache' | 'performance' | 'health' | 'state'>('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const refreshMetrics = useCallback(() => {
    const newMetrics: DashboardMetrics = {
      renderMetrics: performanceMonitor.getAllRenderMetrics(),
      cacheMetrics: performanceMonitor.getAllCacheMetrics(),
      memoryMetrics: performanceMonitor.getMemoryHistory(10),
      alerts: performanceMonitor.getAlerts(maxAlerts),
      healthStatus: showHealthChecks ? cacheHealthChecker.getHealthStatus() : null,
      cacheState: showCacheState ? cacheStateInspector.getCacheSnapshot() : null,
    };
    setMetrics(newMetrics);
  }, [maxAlerts, showHealthChecks, showCacheState]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(refreshMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshMetrics, refreshInterval, autoRefresh]);

  useEffect(() => {
    // Initial load
    refreshMetrics();
  }, [refreshMetrics]);

  // Keyboard shortcut to toggle dashboard
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (!isVisible) {
    return (
      <div
        style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          zIndex: 10000,
          background: '#333',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          cursor: 'pointer',
          fontFamily: 'monospace',
        }}
        onClick={() => setIsVisible(true)}
        title="Click to open Cache Dashboard (Ctrl+Shift+D)"
      >
        📊 Cache Dashboard
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        width: '800px',
        height: '600px',
        background: 'white',
        border: '2px solid #333',
        borderRadius: '8px',
        zIndex: 10000,
        fontFamily: 'monospace',
        fontSize: '12px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: '#333',
          color: 'white',
          padding: '8px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderRadius: '6px 6px 0 0',
        }}
      >
        <span>🔍 Cache Operation Dashboard</span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
          <button
            onClick={refreshMetrics}
            style={{
              background: '#555',
              color: 'white',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '3px',
              cursor: 'pointer',
            }}
          >
            🔄 Refresh
          </button>
          <button
            onClick={() => setIsVisible(false)}
            style={{
              background: '#d32f2f',
              color: 'white',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '3px',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div
        style={{
          background: '#f5f5f5',
          padding: '8px',
          borderBottom: '1px solid #ddd',
          display: 'flex',
          gap: '4px',
        }}
      >
        {(['overview', 'cache', 'performance', 'health', 'state'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: activeTab === tab ? '#007acc' : '#e0e0e0',
              color: activeTab === tab ? 'white' : '#333',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '3px',
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
        {activeTab === 'overview' && <OverviewTab metrics={metrics} />}
        {activeTab === 'cache' && <CacheTab metrics={metrics} />}
        {activeTab === 'performance' && <PerformanceTab metrics={metrics} />}
        {activeTab === 'health' && <HealthTab metrics={metrics} />}
        {activeTab === 'state' && <StateTab metrics={metrics} />}
      </div>
    </div>
  );
};

const OverviewTab: React.FC<{ metrics: DashboardMetrics }> = ({ metrics }) => {
  const totalCacheOps = metrics.cacheMetrics.reduce((sum, m) => sum + m.operationCount, 0);
  const totalRenders = metrics.renderMetrics.reduce((sum, m) => sum + m.renderCount, 0);
  const criticalAlerts = metrics.alerts.filter(a => a.severity === 'critical').length;
  const latestMemory = metrics.memoryMetrics[metrics.memoryMetrics.length - 1];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      <div>
        <h3 style={{ margin: '0 0 12px 0', color: '#333' }}>📊 System Overview</h3>
        <div style={{ background: '#f9f9f9', padding: '12px', borderRadius: '4px' }}>
          <div style={{ marginBottom: '8px' }}>
            <strong>Cache Operations:</strong> {totalCacheOps.toLocaleString()}
          </div>
          <div style={{ marginBottom: '8px' }}>
            <strong>Component Renders:</strong> {totalRenders.toLocaleString()}
          </div>
          <div style={{ marginBottom: '8px' }}>
            <strong>Active Components:</strong> {metrics.renderMetrics.length}
          </div>
          <div style={{ marginBottom: '8px' }}>
            <strong>Memory Usage:</strong> {latestMemory ? `${(latestMemory.heapUsed / 1024 / 1024).toFixed(2)}MB` : 'N/A'}
          </div>
          <div style={{ color: criticalAlerts > 0 ? '#d32f2f' : '#2e7d32' }}>
            <strong>Critical Alerts:</strong> {criticalAlerts}
          </div>
        </div>
      </div>

      <div>
        <h3 style={{ margin: '0 0 12px 0', color: '#333' }}>🚨 Recent Alerts</h3>
        <div style={{ background: '#f9f9f9', padding: '12px', borderRadius: '4px', maxHeight: '200px', overflow: 'auto' }}>
          {metrics.alerts.length === 0 ? (
            <div style={{ color: '#666' }}>No alerts</div>
          ) : (
            metrics.alerts.slice(-5).map((alert, index) => (
              <div
                key={index}
                style={{
                  marginBottom: '8px',
                  padding: '6px',
                  background: getSeverityColor(alert.severity),
                  borderRadius: '3px',
                  fontSize: '11px',
                }}
              >
                <div style={{ fontWeight: 'bold' }}>{alert.type}</div>
                <div>{alert.message}</div>
                <div style={{ opacity: 0.7 }}>
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ gridColumn: '1 / -1' }}>
        <h3 style={{ margin: '0 0 12px 0', color: '#333' }}>⚡ Top Cache Operations</h3>
        <div style={{ background: '#f9f9f9', padding: '12px', borderRadius: '4px' }}>
          {metrics.cacheMetrics
            .sort((a, b) => b.operationCount - a.operationCount)
            .slice(0, 5)
            .map((metric, index) => (
              <div key={index} style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span>{metric.feature}-{metric.operation}</span>
                <span>
                  {metric.operationCount} ops, avg: {metric.averageDuration.toFixed(2)}ms
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

const CacheTab: React.FC<{ metrics: DashboardMetrics }> = ({ metrics }) => (
  <div>
    <h3 style={{ margin: '0 0 12px 0', color: '#333' }}>💾 Cache Operations</h3>
    <div style={{ maxHeight: '500px', overflow: 'auto' }}>
      {metrics.cacheMetrics.map((metric, index) => (
        <div
          key={index}
          style={{
            background: '#f9f9f9',
            padding: '12px',
            marginBottom: '8px',
            borderRadius: '4px',
            border: metric.failureCount > 0 ? '2px solid #d32f2f' : '1px solid #ddd',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
            {metric.feature} - {metric.operation}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '11px' }}>
            <div>Operations: {metric.operationCount}</div>
            <div>Avg Duration: {metric.averageDuration.toFixed(2)}ms</div>
            <div>Max Duration: {metric.maxDuration.toFixed(2)}ms</div>
            <div style={{ color: '#2e7d32' }}>Success: {metric.successCount}</div>
            <div style={{ color: metric.failureCount > 0 ? '#d32f2f' : '#666' }}>
              Failures: {metric.failureCount}
            </div>
            <div>Last: {new Date(metric.lastOperationTime).toLocaleTimeString()}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const PerformanceTab: React.FC<{ metrics: DashboardMetrics }> = ({ metrics }) => (
  <div>
    <h3 style={{ margin: '0 0 12px 0', color: '#333' }}>🎨 Render Performance</h3>
    <div style={{ maxHeight: '500px', overflow: 'auto' }}>
      {metrics.renderMetrics
        .sort((a, b) => b.renderCount - a.renderCount)
        .map((metric, index) => (
          <div
            key={index}
            style={{
              background: '#f9f9f9',
              padding: '12px',
              marginBottom: '8px',
              borderRadius: '4px',
              border: metric.renderCount > 50 || metric.averageRenderTime > 16 ? '2px solid #ff9800' : '1px solid #ddd',
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
              {metric.componentName}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '11px' }}>
              <div>Renders: {metric.renderCount}</div>
              <div>Avg Time: {metric.averageRenderTime.toFixed(2)}ms</div>
              <div>Max Time: {metric.maxRenderTime.toFixed(2)}ms</div>
              <div>Total Time: {metric.totalRenderTime.toFixed(2)}ms</div>
              <div>Min Time: {metric.minRenderTime.toFixed(2)}ms</div>
              <div>Last: {new Date(metric.lastRenderTime).toLocaleTimeString()}</div>
            </div>
          </div>
        ))}
    </div>
  </div>
);

const HealthTab: React.FC<{ metrics: DashboardMetrics }> = ({ metrics }) => {
  if (!metrics.healthStatus) {
    return <div>Health monitoring disabled</div>;
  }

  return (
    <div>
      <h3 style={{ margin: '0 0 12px 0', color: '#333' }}>🏥 Cache Health Status</h3>
      <div style={{ background: '#f9f9f9', padding: '12px', borderRadius: '4px' }}>
        <div style={{ marginBottom: '16px' }}>
          <strong>Overall Health: </strong>
          <span style={{
            color: metrics.healthStatus.overall === 'healthy' ? '#2e7d32' :
                   metrics.healthStatus.overall === 'warning' ? '#ff9800' : '#d32f2f'
          }}>
            {metrics.healthStatus.overall.toUpperCase()}
          </span>
        </div>

        {metrics.healthStatus.checks && Object.entries(metrics.healthStatus.checks).map(([check, result]: [string, any]) => (
          <div key={check} style={{ marginBottom: '12px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
              {getHealthIcon(result.status)} {check}
            </div>
            <div style={{ fontSize: '11px', color: '#666', marginLeft: '20px' }}>
              {result.message}
            </div>
            {result.details && (
              <div style={{ fontSize: '10px', color: '#999', marginLeft: '20px' }}>
                {JSON.stringify(result.details, null, 2)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const StateTab: React.FC<{ metrics: DashboardMetrics }> = ({ metrics }) => {
  if (!metrics.cacheState) {
    return <div>Cache state inspection disabled</div>;
  }

  return (
    <div>
      <h3 style={{ margin: '0 0 12px 0', color: '#333' }}>🔍 Cache State</h3>
      <div style={{ maxHeight: '500px', overflow: 'auto' }}>
        <pre style={{
          background: '#f9f9f9',
          padding: '12px',
          borderRadius: '4px',
          fontSize: '10px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}>
          {JSON.stringify(metrics.cacheState, null, 2)}
        </pre>
      </div>
    </div>
  );
};

// Utility functions
const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case 'critical': return '#ffebee';
    case 'high': return '#fff3e0';
    case 'medium': return '#fff8e1';
    case 'low': return '#f3e5f5';
    default: return '#f5f5f5';
  }
};

const getHealthIcon = (status: string): string => {
  switch (status) {
    case 'healthy': return '✅';
    case 'warning': return '⚠️';
    case 'error': return '❌';
    default: return '❓';
  }
};

// Development-only component wrapper
export const DevelopmentCacheDashboard: React.FC<DashboardProps> = (props) => {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return <CacheOperationDashboard {...props} />;
};

// Hook to programmatically control dashboard
export const useCacheDashboard = () => {
  const [isVisible, setIsVisible] = useState(false);

  const toggle = useCallback(() => setIsVisible(prev => !prev), []);
  const show = useCallback(() => setIsVisible(true), []);
  const hide = useCallback(() => setIsVisible(false), []);

  return {
    isVisible,
    toggle,
    show,
    hide,
  };
};