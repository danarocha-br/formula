"use client";
import { AnimatedNumber } from "@repo/design-system/components/ui/animated-number";
import { Icon } from "@repo/design-system/components/ui/icon";
import { Resizable } from "@repo/design-system/components/ui/resizable-panel";
import { ScrollArea } from "@repo/design-system/components/ui/scroll-area";
import { TabButton } from "@repo/design-system/components/ui/tab-button";
import { cn } from "@repo/design-system/lib/utils";
import { useEffect, useMemo, useState } from "react";

import { useCurrencyStore } from "@/app/store/currency-store";
import { useHourlyCostStore } from "@/app/store/hourly-cost-store";
import { useViewPreferenceStore } from "@/app/store/view-preference-store";
import type { ExpenseItem } from "@/app/types";
import { BillableCosts } from "../feature-billable-cost";
import { VariableCostView } from "../feature-variable-cost";
import { AnalyticsView } from "./analytics-view";
import { GridView } from "./grid-view";
import { NodeView } from "./node-view";
import { useGetFixedExpenses } from "./server/get-fixed-expenses";

type Props = {
  userId: string;
};

export const FeatureHourlyCost = ({ userId }: Props) => {
  const { t } = useTranslations();
  const { data: initialExpenses, isLoading: isLoadingExpenses } =
    useGetFixedExpenses({ userId });

  const { selectedCurrency } = useCurrencyStore();

  const [expenses, setExpenses] = useState<ExpenseItem[] | []>([]);
  const [expenseTypeView, setExpenseTypeView] = useState<"fixed" | "variable">(
    "fixed"
  );

  const { viewPreference } = useViewPreferenceStore();

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

  useEffect(() => {
    setTotalMonthlyExpenses(totalExpensesCostPerMonth);
  }, [totalExpensesCostPerMonth]);

  useEffect(() => {
    if (initialExpenses) {
      //@ts-ignore
      setExpenses(initialExpenses);
    }
  }, [initialExpenses]);

  useEffect(() => {
    if (initialExpenses) {
      const sortedExpenses = [...initialExpenses].sort(
        (a, b) => (a.rank ?? 0) - (b.rank ?? 0)
      );
      // @ts-ignore
      setExpenses(sortedExpenses);
    }
  }, [initialExpenses]);

  return viewPreference === "node" ? (
    <NodeView expenses={expenses} userId={userId} />
  ) : viewPreference === "chart" ? (
    <AnalyticsView userId={userId} />
  ) : (
    <Resizable.Group direction="horizontal">
      <Resizable.Panel
        defaultSize={60}
        className={cn(
          'hidden rounded-lg md:block',
          viewPreference === "grid" ? "bg-purple-300" : "bg-neutral-100"
        )}
      >
        {expenseTypeView === "fixed" && (
          <GridView
            userId={userId}
            expenses={expenses}
            setExpenses={setExpenses}
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
      </Resizable.Panel>

      <Resizable.Handle withHandle />

      <Resizable.Panel defaultSize={40}>
        <section className='@container relative flex flex-col justify-between rounded-lg bg-neutral-100 text-card-foreground'>
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
      </Resizable.Panel>
    </Resizable.Group>
  );
};
