"use client";

import { useViewPreferenceStore } from "@/app/store/view-preference-store";
import { ScrollArea } from "@repo/design-system/components/ui/scroll-area";
import { LoadingView } from "../feature-hourly-cost/loading-view";
import { GridView } from "./grid-view";
import { useStableEquipment } from "@/hooks/use-stable-equipment";
import { useExpenseComponentSafeguards } from "@/utils/use-effect-safeguards";
import { useMemoryLeakDetection } from "@/utils/memory-leak-detection";
import { useRenderFrequencyMonitor } from "@/utils/re-render-monitoring";
import { useEffect } from "react";

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

  const { viewPreference } = useViewPreferenceStore();
  const { isLoading: isLoadingExpenses } = useStableEquipment({ userId });

  // Log component health in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && (!isComponentHealthy || isExcessive)) {
      console.warn('VariableCostView component health warning:', {
        isComponentHealthy,
        isExcessive,
        healthReport,
      });
    }
  }, [isComponentHealthy, isExcessive, healthReport]);

  // Register cleanup for component unmount
  useEffect(() => {
    const cleanup = registerCleanup(() => {
      console.log('Cleaning up VariableCostView component');
    });

    return cleanup;
  }, [registerCleanup]);

  return (
    <ScrollArea.Root className="h-[calc(100vh-7.7rem)]">
      {isLoadingExpenses ? (
        <LoadingView />
      ) : (
        <section className="relative">
          <div className='w-full p-2'>
            {viewPreference === "grid" && (
              <GridView userId={userId} />
            )}
          </div>
        </section>
      )}
    </ScrollArea.Root>
  );
};
