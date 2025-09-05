"use client";
import { AnimatedNumber } from "@repo/design-system/components/ui/animated-number";
import { Icon } from "@repo/design-system/components/ui/icon";
import { Resizable } from "@repo/design-system/components/ui/resizable-panel";
import { ScrollArea } from "@repo/design-system/components/ui/scroll-area";
import { TabButton } from "@repo/design-system/components/ui/tab-button";
import { cn } from "@repo/design-system/lib/utils";
import { useMemo, useState } from "react";

import { useCurrencyStore } from "@/app/store/currency-store";
import { useHourlyCostStore } from "@/app/store/hourly-cost-store";
import { usePanelToggleStore } from "@/app/store/panel-toggle-store";
import { useViewPreferenceStore } from "@/app/store/view-preference-store";
import { useStableExpenses } from "@/hooks/use-stable-expenses";
import { useTranslations } from "@/hooks/use-translation";
import { useRenderTracker } from "@/utils/performance-monitor";
import { useSafeEffect } from "@/utils/use-effect-safeguards";
import { BillableCosts } from "../feature-billable-cost";
import { VariableCostView } from "../feature-variable-cost";
import { AnalyticsView } from "./analytics-view";
import { ExpensesErrorBoundary } from './components/expenses-error-boundary';
import { GridView } from "./grid-view";
import { NodeView } from "./node-view";

type Props = {
  userId: string;
};

export const FeatureHourlyCost = ({ userId }: Props) => {
  // Track component renders for performance monitoring
  useRenderTracker('FeatureHourlyCost');

  const { t } = useTranslations();
  const { expenses, isLoading: isLoadingExpenses } = useStableExpenses({ userId });

  const { selectedCurrency } = useCurrencyStore();

  const [expenseTypeView, setExpenseTypeView] = useState<"fixed" | "variable">(
    "fixed"
  );

  const { viewPreference } = useViewPreferenceStore();
  const { isBillablePanelVisible } = usePanelToggleStore();

  const { hourlyCost, setTotalMonthlyExpenses } = useHourlyCostStore();

  const totalExpensesCostPerMonth = useMemo(
    () =>
      expenses.reduce((sum, item) => {
        const cost =
          sum +
          (item.period === "monthly" ? item.amount * 1 : item.amount / 12);

        return cost;
      }, 0),
    [expenses]
  );

  // Update total monthly expenses when calculation changes
  useMemo(() => {
    setTotalMonthlyExpenses(totalExpensesCostPerMonth);
  }, [totalExpensesCostPerMonth, setTotalMonthlyExpenses]);

  // Handle different view preferences
  if (viewPreference === "node") {
    return <NodeView expenses={expenses} userId={userId} />;
  }

  if (viewPreference === "chart") {
    return <AnalyticsView userId={userId} />;
  }

  // Grid view with conditional panel rendering
  const mainContent = (
    <div
      className={cn(
        'rounded-lg h-full',
        viewPreference === "grid" ? "bg-purple-300" : "bg-neutral-100",
        // When panel is hidden, show on mobile and expand to full width
        isBillablePanelVisible ? 'hidden md:block shadow-sm' : 'block w-full shadow-lg'
      )}
    >
      {expenseTypeView === "fixed" && (
        <GridView
          userId={userId}
          expenses={expenses}
          loading={isLoadingExpenses}
        />
      )}

      {expenseTypeView === "variable" && <VariableCostView userId={userId} />}

      <div className='sticky bottom-0 col-span-full mt-auto flex h-14 w-full items-center justify-between rounded-tl-md rounded-br-md bg-purple-200'>
        <div className='flex h-full w-full items-center justify-between pr-2'>
          <div className='flex h-full items-center'>
            <TabButton
              isActive={expenseTypeView === "fixed"}
              onClick={() => setExpenseTypeView("fixed")}
            >
              <Icon
                name="work"
                size="sm"
                label={t("navigation.bottom-level.fixed-cost")}
                color="current"
              />
              {t("navigation.bottom-level.fixed-cost")}
            </TabButton>
            <TabButton
              isActive={expenseTypeView === "variable"}
              onClick={() => setExpenseTypeView("variable")}
            >
              <Icon
                name="work"
                size="sm"
                label={t("navigation.bottom-level.variable-cost")}
                color="current"
              />
              {t("navigation.bottom-level.variable-cost")}
            </TabButton>
          </div>

          <div className='mr-6 flex items-center gap-2 text-card-foreground'>
            <AnimatedNumber
              className='font-semibold text-2xl'
              value={totalExpensesCostPerMonth}
              currency={selectedCurrency.code}
              locale={selectedCurrency.locale}
            />
            / {t("expenses.billable.breakeven.per-month")}
          </div>
        </div>
      </div>
    </div>
  );

  const billablePanel = (
    <section className='@container relative flex flex-col justify-between rounded-lg bg-neutral-100 text-card-foreground h-full'>
      <ScrollArea.Root className='h-[calc(100vh-70px)] w-full rounded-b-lg'>
        <BillableCosts userId={userId} />

        <div className='sticky bottom-0 mt-auto flex h-[54px] w-full items-center justify-between rounded-b-md bg-purple-200 px-5 py-4'>
          <p>{t("expenses.billable.total.title")}</p>
          <AnimatedNumber
            className='font-semibold text-2xl '
            value={hourlyCost}
            currency={selectedCurrency.code}
            locale={selectedCurrency.locale}
          />
        </div>
      </ScrollArea.Root>
    </section>
  );

  // Conditional rendering with smooth transitions wrapped in error boundary
  return (
    <ExpensesErrorBoundary userId={userId}>
      <div className="relative h-full w-full overflow-hidden" data-testid="panel-container">
        {isBillablePanelVisible ? (
          <div
            key="panel-visible"
            className="animate-in fade-in-0 duration-300 h-full w-full"
          >
            <Resizable.Group direction="horizontal" className="h-full">
              <Resizable.Panel defaultSize={60} className="min-w-0">
                <div className="animate-in slide-in-from-left-2 duration-300 ease-out h-full">
                  {mainContent}
                </div>
              </Resizable.Panel>

              <Resizable.Handle
                withHandle
                className="animate-in fade-in-0 duration-200 delay-150 opacity-100 hover:bg-purple-100/10 transition-colors duration-200"
              />

              <Resizable.Panel defaultSize={40} className="min-w-0">
                <div className="animate-in slide-in-from-right-2 duration-300 ease-out delay-75 h-full">
                  {billablePanel}
                </div>
              </Resizable.Panel>
            </Resizable.Group>
          </div>
        ) : (
          <div
            key="panel-hidden"
            className="animate-in fade-in-0 slide-in-from-left-2 duration-300 ease-out h-full w-full"
          >
            {mainContent}
          </div>
        )}
      </div>
    </ExpensesErrorBoundary>
  );
};
