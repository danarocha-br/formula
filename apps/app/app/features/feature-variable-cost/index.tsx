"use client";

import { useViewPreferenceStore } from "@/app/store/view-preference-store";
import { LoadingView } from "../feature-hourly-cost/loading-view";
import { GridView } from "./grid-view";
import { TableView } from "./table-view";
import { useStableEquipment } from "@/hooks/use-stable-equipment";
import { useExpenseComponentSafeguards } from "@/utils/use-effect-safeguards";
import { useMemoryLeakDetection } from "@/utils/memory-leak-detection";
import { useRenderFrequencyMonitor } from "@/utils/re-render-monitoring";
import { useEquipmentPerformanceMonitor } from "@/utils/equipment-performance-monitor";
import { PerformanceMonitoringProvider } from "@/utils/equipment-performance-dashboard";
import { EQUIPMENT_COST_CATEGORIES } from "@/app/constants";
import { useCallback, useEffect } from "react";

type GridViewProps = {
  userId: string;
};

export const VariableCostView = ({ userId }: GridViewProps) => {
  // Performance safeguards for equipment cost feature
  const {
    isComponentHealthy,
    healthReport,
  } = useExpenseComponentSafeguards('VariableCostView', 'equipment-expenses', {
    maxRenders: 30,
    enableMemoryTracking: true,
  });

  // Memory leak detection
  const { registerCleanup } = useMemoryLeakDetection('VariableCostView');

  // Render frequency monitoring
  const { isExcessive } = useRenderFrequencyMonitor('VariableCostView');

  // Enhanced performance monitoring for infinite loop detection
  const { getMetrics, trackStateUpdate, trackMemoryUsage } = useEquipmentPerformanceMonitor('VariableCostView');

  const { viewPreference } = useViewPreferenceStore();
  const {
    equipment: equipmentExpenses,
    isLoading: isLoadingExpenses,
    isRefetching: isRefetchingExpenses,
    error: equipmentError,
  } = useStableEquipment({ userId });

  // Helper functions for category data with performance tracking
  const getCategoryColor = useCallback((category: string) => {
    const categoryData = EQUIPMENT_COST_CATEGORIES.find(cat => cat.value === category);
    return categoryData?.color || 'bg-gray-300';
  }, []);

  const getCategoryLabel = useCallback((category: string) => {
    const categoryData = EQUIPMENT_COST_CATEGORIES.find(cat => cat.value === category);
    return categoryData?.label || category;
  }, []);

  // Log component health in development with enhanced performance monitoring
  useEffect(() => {
    const metrics = getMetrics();
    if (process.env.NODE_ENV === 'development' && (!isComponentHealthy || isExcessive || metrics?.alertLevel === 'critical')) {
      console.warn('VariableCostView component health warning:', {
        isComponentHealthy,
        isExcessive,
        healthReport,
        performanceMetrics: metrics,
      });
    }
  }, [isComponentHealthy, isExcessive, healthReport, getMetrics]);

  // Track memory usage periodically
  useEffect(() => {
    const interval = setInterval(() => {
      trackMemoryUsage();
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [trackMemoryUsage]);

  // Register cleanup for component unmount
  useEffect(() => {
    const cleanup = registerCleanup(() => {
      console.log('Cleaning up VariableCostView component');
    });

    return cleanup;
  }, [registerCleanup]);

  return (
    <PerformanceMonitoringProvider>
      <div className="h-[calc(100vh-7.7rem)]">
        {isLoadingExpenses ? (
          <LoadingView />
        ) : (
          <section className="relative">
            <div className='w-full p-2'>
              {viewPreference === "grid" && (
                <GridView userId={userId} />
              )}
              {viewPreference === "table" && (
                <TableView
                  data={equipmentExpenses || []}
                  userId={userId}
                  getCategoryColor={getCategoryColor}
                  getCategoryLabel={getCategoryLabel}
                  isLoading={isLoadingExpenses}
                  isRefetching={isRefetchingExpenses}
                  error={equipmentError}
                />
              )}
            </div>
          </section>
        )}
      </div>
    </PerformanceMonitoringProvider>
  );
};
