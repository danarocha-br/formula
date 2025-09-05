/**
 * Performance Metrics Visualization
 * Provides visual charts and graphs for performance monitoring data
 */

import React, { useMemo } from 'react';
import { performanceMonitor } from './performance-monitor';

interface ChartProps {
  width?: number;
  height?: number;
  data: any[];
  title?: string;
}

interface MetricPoint {
  timestamp: number;
  value: number;
  label?: string;
}

interface BarChartData {
  label: string;
  value: number;
  color?: string;
}

// Simple SVG-based line chart component
const LineChart: React.FC<{
  data: MetricPoint[];
  width?: number;
  height?: number;
  title?: string;
  color?: string;
  yAxisLabel?: string;
}> = ({
  data,
  width = 400,
  height = 200,
  title,
  color = '#007acc',
  yAxisLabel
}) => {
  const { points, maxValue, minValue, xScale, yScale } = useMemo(() => {
    if (data.length === 0) return { points: '', maxValue: 0, minValue: 0, xScale: 1, yScale: 1 };

    const maxValue = Math.max(...data.map(d => d.value));
    const minValue = Math.min(...data.map(d => d.value));
    const valueRange = maxValue - minValue || 1;

    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const xScale = chartWidth / (data.length - 1 || 1);
    const yScale = chartHeight / valueRange;

    const points = data
      .map((point, index) => {
        const x = padding + index * xScale;
        const y = padding + chartHeight - (point.value - minValue) * yScale;
        return `${x},${y}`;
      })
      .join(' ');

    return { points, maxValue, minValue, xScale, yScale };
  }, [data, width, height]);

  return (
    <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: '4px', padding: '8px' }}>
      {title && <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>{title}</h4>}
      <svg width={width} height={height} style={{ display: 'block' }}>
        {/* Grid lines */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f0f0f0" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Axes */}
        <line x1="40" y1="40" x2="40" y2={height - 40} stroke="#666" strokeWidth="1" />
        <line x1="40" y1={height - 40} x2={width - 40} y2={height - 40} stroke="#666" strokeWidth="1" />

        {/* Y-axis labels */}
        <text x="35" y="45" textAnchor="end" fontSize="10" fill="#666">
          {maxValue.toFixed(1)}
        </text>
        <text x="35" y={height - 35} textAnchor="end" fontSize="10" fill="#666">
          {minValue.toFixed(1)}
        </text>

        {/* Y-axis label */}
        {yAxisLabel && (
          <text
            x="15"
            y={height / 2}
            textAnchor="middle"
            fontSize="10"
            fill="#666"
            transform={`rotate(-90, 15, ${height / 2})`}
          >
            {yAxisLabel}
          </text>
        )}

        {/* Data line */}
        {data.length > 1 && (
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="2"
            points={points}
          />
        )}

        {/* Data points */}
        {data.map((point, index) => {
          const x = 40 + index * xScale;
          const y = 40 + (height - 80) - (point.value - minValue) * yScale;
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="3"
              fill={color}
              stroke="white"
              strokeWidth="1"
            >
              <title>{`${point.label || point.timestamp}: ${point.value.toFixed(2)}`}</title>
            </circle>
          );
        })}
      </svg>
    </div>
  );
};

// Simple SVG-based bar chart component
const BarChart: React.FC<{
  data: BarChartData[];
  width?: number;
  height?: number;
  title?: string;
  horizontal?: boolean;
}> = ({
  data,
  width = 400,
  height = 200,
  title,
  horizontal = false
}) => {
  const { maxValue, barWidth, barHeight } = useMemo(() => {
    if (data.length === 0) return { maxValue: 0, barWidth: 0, barHeight: 0 };

    const maxValue = Math.max(...data.map(d => d.value));
    const padding = 40;

    if (horizontal) {
      const barHeight = (height - padding * 2) / data.length * 0.8;
      return { maxValue, barWidth: 0, barHeight };
    } else {
      const barWidth = (width - padding * 2) / data.length * 0.8;
      return { maxValue, barWidth, barHeight: 0 };
    }
  }, [data, width, height, horizontal]);

  return (
    <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: '4px', padding: '8px' }}>
      {title && <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>{title}</h4>}
      <svg width={width} height={height} style={{ display: 'block' }}>
        {/* Axes */}
        <line x1="40" y1="40" x2="40" y2={height - 40} stroke="#666" strokeWidth="1" />
        <line x1="40" y1={height - 40} x2={width - 40} y2={height - 40} stroke="#666" strokeWidth="1" />

        {/* Bars */}
        {data.map((item, index) => {
          if (horizontal) {
            const barLength = (item.value / maxValue) * (width - 80);
            const y = 40 + index * (height - 80) / data.length + (height - 80) / data.length * 0.1;

            return (
              <g key={index}>
                <rect
                  x="40"
                  y={y}
                  width={barLength}
                  height={barHeight}
                  fill={item.color || '#007acc'}
                  opacity="0.8"
                >
                  <title>{`${item.label}: ${item.value}`}</title>
                </rect>
                <text
                  x="35"
                  y={y + barHeight / 2 + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill="#666"
                >
                  {item.label.length > 15 ? item.label.substring(0, 15) + '...' : item.label}
                </text>
                <text
                  x={45 + barLength}
                  y={y + barHeight / 2 + 3}
                  fontSize="10"
                  fill="#333"
                >
                  {item.value.toFixed(1)}
                </text>
              </g>
            );
          } else {
            const barHeight = (item.value / maxValue) * (height - 80);
            const x = 40 + index * (width - 80) / data.length + (width - 80) / data.length * 0.1;

            return (
              <g key={index}>
                <rect
                  x={x}
                  y={height - 40 - barHeight}
                  width={barWidth}
                  height={barHeight}
                  fill={item.color || '#007acc'}
                  opacity="0.8"
                >
                  <title>{`${item.label}: ${item.value}`}</title>
                </rect>
                <text
                  x={x + barWidth / 2}
                  y={height - 25}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#666"
                  transform={`rotate(-45, ${x + barWidth / 2}, ${height - 25})`}
                >
                  {item.label.length > 10 ? item.label.substring(0, 10) + '...' : item.label}
                </text>
                <text
                  x={x + barWidth / 2}
                  y={height - 45 - barHeight}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#333"
                >
                  {item.value.toFixed(1)}
                </text>
              </g>
            );
          }
        })}
      </svg>
    </div>
  );
};

// Memory usage chart
export const MemoryUsageChart: React.FC<{ width?: number; height?: number }> = ({
  width = 400,
  height = 200
}) => {
  const memoryData = useMemo(() => {
    const history = performanceMonitor.getMemoryHistory(20);
    return history.map(metric => ({
      timestamp: metric.timestamp,
      value: metric.heapUsed / 1024 / 1024, // Convert to MB
      label: new Date(metric.timestamp).toLocaleTimeString(),
    }));
  }, []);

  return (
    <LineChart
      data={memoryData}
      width={width}
      height={height}
      title="Memory Usage (MB)"
      color="#d32f2f"
      yAxisLabel="MB"
    />
  );
};

// Cache operations performance chart
export const CacheOperationsChart: React.FC<{ width?: number; height?: number }> = ({
  width = 400,
  height = 200
}) => {
  const cacheData = useMemo(() => {
    const metrics = performanceMonitor.getAllCacheMetrics();
    return metrics
      .sort((a, b) => b.averageDuration - a.averageDuration)
      .slice(0, 10)
      .map(metric => ({
        label: `${metric.feature}-${metric.operation}`,
        value: metric.averageDuration,
        color: metric.averageDuration > 50 ? '#d32f2f' :
               metric.averageDuration > 20 ? '#ff9800' : '#2e7d32',
      }));
  }, []);

  return (
    <BarChart
      data={cacheData}
      width={width}
      height={height}
      title="Cache Operation Performance (ms)"
      horizontal={true}
    />
  );
};

// Component render frequency chart
export const RenderFrequencyChart: React.FC<{ width?: number; height?: number }> = ({
  width = 400,
  height = 200
}) => {
  const renderData = useMemo(() => {
    const metrics = performanceMonitor.getAllRenderMetrics();
    return metrics
      .sort((a, b) => b.renderCount - a.renderCount)
      .slice(0, 10)
      .map(metric => ({
        label: metric.componentName,
        value: metric.renderCount,
        color: metric.renderCount > 100 ? '#d32f2f' :
               metric.renderCount > 50 ? '#ff9800' : '#2e7d32',
      }));
  }, []);

  return (
    <BarChart
      data={renderData}
      width={width}
      height={height}
      title="Component Render Count"
    />
  );
};

// Performance alerts timeline
export const AlertsTimelineChart: React.FC<{ width?: number; height?: number }> = ({
  width = 400,
  height = 200
}) => {
  const alertData = useMemo(() => {
    const alerts = performanceMonitor.getAlerts(50);
    const alertCounts: Record<string, number> = {};

    // Group alerts by hour
    alerts.forEach(alert => {
      const hour = new Date(alert.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
      alertCounts[hour] = (alertCounts[hour] || 0) + 1;
    });

    return Object.entries(alertCounts)
      .map(([time, count]) => ({
        timestamp: Date.now(), // Placeholder
        value: count,
        label: time,
      }))
      .slice(-20); // Last 20 time periods
  }, []);

  return (
    <LineChart
      data={alertData}
      width={width}
      height={height}
      title="Performance Alerts Timeline"
      color="#ff9800"
      yAxisLabel="Alerts"
    />
  );
};

// Cache success rate chart
export const CacheSuccessRateChart: React.FC<{ width?: number; height?: number }> = ({
  width = 400,
  height = 200
}) => {
  const successData = useMemo(() => {
    const metrics = performanceMonitor.getAllCacheMetrics();
    return metrics
      .filter(metric => metric.operationCount > 5) // Only show operations with meaningful data
      .map(metric => {
        const successRate = (metric.successCount / metric.operationCount) * 100;
        return {
          label: `${metric.feature}-${metric.operation}`,
          value: successRate,
          color: successRate > 95 ? '#2e7d32' :
                 successRate > 85 ? '#ff9800' : '#d32f2f',
        };
      })
      .sort((a, b) => a.value - b.value)
      .slice(0, 10);
  }, []);

  return (
    <BarChart
      data={successData}
      width={width}
      height={height}
      title="Cache Success Rate (%)"
      horizontal={true}
    />
  );
};

// Performance metrics dashboard component
export const PerformanceMetricsDashboard: React.FC<{
  showMemory?: boolean;
  showCache?: boolean;
  showRenders?: boolean;
  showAlerts?: boolean;
  showSuccessRate?: boolean;
  chartWidth?: number;
  chartHeight?: number;
}> = ({
  showMemory = true,
  showCache = true,
  showRenders = true,
  showAlerts = true,
  showSuccessRate = true,
  chartWidth = 380,
  chartHeight = 180,
}) => {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
      gap: '16px',
      padding: '16px',
      background: '#f5f5f5',
      borderRadius: '8px',
    }}>
      {showMemory && <MemoryUsageChart width={chartWidth} height={chartHeight} />}
      {showCache && <CacheOperationsChart width={chartWidth} height={chartHeight} />}
      {showRenders && <RenderFrequencyChart width={chartWidth} height={chartHeight} />}
      {showAlerts && <AlertsTimelineChart width={chartWidth} height={chartHeight} />}
      {showSuccessRate && <CacheSuccessRateChart width={chartWidth} height={chartHeight} />}
    </div>
  );
};

// Compact metrics summary component
export const MetricsSummary: React.FC = () => {
  const summary = useMemo(() => {
    const report = performanceMonitor.generateReport();
    return {
      components: report.summary.totalComponents,
      cacheOps: report.summary.totalCacheOperations,
      alerts: report.summary.totalAlerts,
      criticalAlerts: report.summary.criticalAlerts,
      memoryMB: (report.summary.memoryUsage / 1024 / 1024).toFixed(1),
      regressions: report.summary.regressions,
    };
  }, []);

  return (
    <div style={{
      display: 'flex',
      gap: '16px',
      padding: '12px',
      background: 'white',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '12px',
      fontFamily: 'monospace',
    }}>
      <div>
        <div style={{ fontWeight: 'bold', color: '#666' }}>Components</div>
        <div style={{ fontSize: '16px', color: '#333' }}>{summary.components}</div>
      </div>
      <div>
        <div style={{ fontWeight: 'bold', color: '#666' }}>Cache Ops</div>
        <div style={{ fontSize: '16px', color: '#333' }}>{summary.cacheOps.toLocaleString()}</div>
      </div>
      <div>
        <div style={{ fontWeight: 'bold', color: '#666' }}>Memory</div>
        <div style={{ fontSize: '16px', color: '#333' }}>{summary.memoryMB}MB</div>
      </div>
      <div>
        <div style={{ fontWeight: 'bold', color: '#666' }}>Alerts</div>
        <div style={{
          fontSize: '16px',
          color: summary.criticalAlerts > 0 ? '#d32f2f' : '#333'
        }}>
          {summary.alerts} ({summary.criticalAlerts} critical)
        </div>
      </div>
      <div>
        <div style={{ fontWeight: 'bold', color: '#666' }}>Regressions</div>
        <div style={{
          fontSize: '16px',
          color: summary.regressions > 0 ? '#d32f2f' : '#2e7d32'
        }}>
          {summary.regressions}
        </div>
      </div>
    </div>
  );
};

// Export utility functions for custom visualizations
export const visualizationUtils = {
  /**
   * Convert performance data to chart format
   */
  formatDataForChart: (data: any[], valueKey: string, labelKey: string): MetricPoint[] => {
    return data.map(item => ({
      timestamp: item.timestamp || Date.now(),
      value: item[valueKey] || 0,
      label: item[labelKey] || '',
    }));
  },

  /**
   * Create color scale based on value ranges
   */
  getColorForValue: (value: number, thresholds: { low: number; medium: number; high: number }) => {
    if (value <= thresholds.low) return '#2e7d32';
    if (value <= thresholds.medium) return '#ff9800';
    if (value <= thresholds.high) return '#d32f2f';
    return '#9c27b0';
  },

  /**
   * Calculate trend direction from data points
   */
  calculateTrend: (data: MetricPoint[]): 'up' | 'down' | 'stable' => {
    if (data.length < 2) return 'stable';

    const recent = data.slice(-5);
    const older = data.slice(-10, -5);

    if (recent.length === 0 || older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, p) => sum + p.value, 0) / recent.length;
    const olderAvg = older.reduce((sum, p) => sum + p.value, 0) / older.length;

    const change = (recentAvg - olderAvg) / olderAvg;

    if (change > 0.1) return 'up';
    if (change < -0.1) return 'down';
    return 'stable';
  },
};

// Development-only wrapper
export const DevelopmentPerformanceVisualizer: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  if (process.env.NODE_ENV !== 'development') {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <div style={{
        position: 'fixed',
        bottom: '10px',
        left: '10px',
        zIndex: 9999,
        maxWidth: '300px',
      }}>
        <MetricsSummary />
      </div>
    </>
  );
};