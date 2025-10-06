/**
 * Equipment Performance Dashboard
 *
 * Visual dashboard for monitoring equipment cost table performance
 * Displays real-time metrics, alerts, and recommendations
 */

import React, { useEffect, useState, useCallback } from 'react';
import { equipmentPerformanceMonitor } from './equipment-performance-monitor';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import { Progress } from '@repo/design-system/components/ui/progress';
import { Alert, AlertDescription } from '@repo/design-system/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/design-system/components/ui/tabs';
import { cn } from '@repo/design-system/lib/utils';

interface PerformanceDashboardProps {
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const EquipmentPerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  className,
  autoRefresh = true,
  refreshInterval = 5000
}) => {
  const [report, setReport] = useState(equipmentPerformanceMonitor.generateReport());
  const [isVisible, setIsVisible] = useState(false);

  // Refresh data
  const refreshData = useCallback(() => {
    setReport(equipmentPerformanceMonitor.generateReport());
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(refreshData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshData]);

  // Show dashboard only when there are critical issues (not in development by default)
  useEffect(() => {
    const shouldShow = report.summary.criticalAlerts > 0 ||
                      report.summary.componentsWithIssues > 0;
    setIsVisible(shouldShow);
  }, [report]);

  if (!isVisible) return null;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getAlertLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-green-600 bg-green-50';
    }
  };

  const formatMemory = (bytes: number) => {
    return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
  };

  const formatRenderFrequency = (renderCount: number, interval: number) => {
    if (interval === 0) return 'N/A';
    return `${(1000 / interval).toFixed(1)}/sec`;
  };

  return (
    <div className={cn('fixed bottom-4 right-4 w-96 max-h-[80vh] overflow-auto z-50', className)}>
      <Card className="shadow-lg border-2">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              🔍 Equipment Performance Monitor
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshData}
                className="h-6 w-6 p-0"
              >
                🔄
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsVisible(false)}
                className="h-6 w-6 p-0"
              >
                ✕
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-3 text-xs">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="alerts">Alerts</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-3 mt-3">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-2">
                <Card className="p-2">
                  <div className="text-xs text-muted-foreground">Components</div>
                  <div className="text-lg font-semibold">{report.summary.totalComponents}</div>
                </Card>
                <Card className="p-2">
                  <div className="text-xs text-muted-foreground">Total Renders</div>
                  <div className="text-lg font-semibold">{report.summary.totalRenders}</div>
                </Card>
                <Card className="p-2">
                  <div className="text-xs text-muted-foreground">State Updates</div>
                  <div className="text-lg font-semibold">{report.summary.totalStateUpdates}</div>
                </Card>
                <Card className="p-2">
                  <div className="text-xs text-muted-foreground">Memory Usage</div>
                  <div className="text-lg font-semibold">{formatMemory(report.summary.memoryUsage)}</div>
                </Card>
              </div>

              {/* Health Status */}
              <Card className="p-3">
                <div className="text-xs font-medium mb-2">Health Status</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Critical Alerts</span>
                    <Badge variant={report.summary.criticalAlerts > 0 ? 'destructive' : 'outline'}>
                      {report.summary.criticalAlerts}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Components with Issues</span>
                    <Badge variant={report.summary.componentsWithIssues > 0 ? 'secondary' : 'outline'}>
                      {report.summary.componentsWithIssues}
                    </Badge>
                  </div>
                </div>
              </Card>

              {/* Quick Recommendations */}
              {report.recommendations.length > 0 && (
                <Card className="p-3">
                  <div className="text-xs font-medium mb-2">💡 Top Recommendations</div>
                  <div className="space-y-1">
                    {report.recommendations.slice(0, 3).map((rec, index) => (
                      <div key={index} className="text-xs text-muted-foreground">
                        • {rec}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="metrics" className="space-y-3 mt-3">
              {report.metrics.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-4">
                  No metrics available
                </div>
              ) : (
                <div className="space-y-2">
                  {report.metrics.map((metric) => (
                    <Card key={metric.componentName} className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-medium truncate">
                          {metric.componentName}
                        </div>
                        <Badge
                          variant="outline"
                          className={cn('text-xs', getAlertLevelColor(metric.alertLevel))}
                        >
                          {metric.alertLevel}
                        </Badge>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Renders:</span>
                          <span>{metric.renderCount}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span>State Updates:</span>
                          <span>{metric.stateUpdateCount}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span>Render Freq:</span>
                          <span>{formatRenderFrequency(metric.renderCount, metric.averageRenderInterval)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span>Memory:</span>
                          <span>{formatMemory(metric.memoryUsage)}</span>
                        </div>
                      </div>

                      {/* Performance indicators */}
                      <div className="mt-2 space-y-1">
                        {metric.infiniteLoopDetected && (
                          <Badge variant="destructive" className="text-xs">
                            🔄 Infinite Loop
                          </Badge>
                        )}
                        {metric.performanceDegradation && (
                          <Badge variant="secondary" className="text-xs">
                            📉 Performance Degraded
                          </Badge>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="alerts" className="space-y-3 mt-3">
              {report.alerts.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-4">
                  No alerts
                </div>
              ) : (
                <div className="space-y-2">
                  {report.alerts.slice(-10).reverse().map((alert, index) => (
                    <Alert key={index} className="p-2">
                      <AlertDescription className="text-xs">
                        <div className="flex items-start justify-between mb-1">
                          <Badge variant={getSeverityColor(alert.severity) as any} className="text-xs">
                            {alert.type.replace('_', ' ')}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(alert.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="mb-2">{alert.message}</div>
                        {alert.recommendations.length > 0 && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-muted-foreground">
                              Recommendations ({alert.recommendations.length})
                            </summary>
                            <div className="mt-1 space-y-1">
                              {alert.recommendations.map((rec, recIndex) => (
                                <div key={recIndex} className="text-muted-foreground">
                                  • {rec}
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => equipmentPerformanceMonitor.reset()}
              className="text-xs"
            >
              Reset Metrics
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => equipmentPerformanceMonitor.logSummary()}
              className="text-xs"
            >
              Log to Console
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Hook to show/hide performance dashboard
 */
export function usePerformanceDashboard() {
  const [isVisible, setIsVisible] = useState(false);

  const show = useCallback(() => setIsVisible(true), []);
  const hide = useCallback(() => setIsVisible(false), []);
  const toggle = useCallback(() => setIsVisible(prev => !prev), []);

  return {
    isVisible,
    show,
    hide,
    toggle,
    Dashboard: isVisible ? EquipmentPerformanceDashboard : () => null
  };
}

/**
 * Performance monitoring provider component
 */
export const PerformanceMonitoringProvider: React.FC<{
  children: React.ReactNode;
  showDashboard?: boolean;
}> = ({ children, showDashboard = process.env.NODE_ENV === 'development' }) => {
  return (
    <>
      {children}
      {showDashboard && <EquipmentPerformanceDashboard />}
    </>
  );
};