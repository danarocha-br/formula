"use client";
import React, { useEffect, useMemo, useState } from "react";
import { ScrollArea } from "@repo/design-system/components/ui/scroll-area";
import { Resizable } from "@repo/design-system/components/ui/resizable-panel";
import { AnimatedNumber } from "@repo/design-system/components/ui/animated-number";
import { cn } from "@repo/design-system/lib/utils";
import { TabButton } from "@repo/design-system/components/ui/tab-button";
import { Icon } from "@repo/design-system/components/ui/icon";

import { getTranslations } from "@/utils/translations";
import { useCurrencyStore } from "@/app/store/currency-store";
import { useHourlyCostStore } from "@/app/store/hourly-cost-store";
import { useViewPreferenceStore } from "@/app/store/view-preference-store";
import { ExpenseItem } from "@/app/types";
import { BillableCosts } from "../feature-billable-cost";
import { VariableCostView } from "../feature-variable-cost";
import { AnalyticsView } from "./analytics-view";
import { NodeView } from "./node-view";
import { useGetFixedExpenses } from "./server/get-fixed-expenses";
import { GridView } from "./grid-view";

type Props = {
  userId: string;
};

export const FeatureHourlyCost = ({ userId }: Props) => {
  const t = getTranslations();
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
          "hidden md:block rounded-lg",
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

        <div className="mt-auto sticky bottom-0 flex items-center justify-between w-full rounded-br-md rounded-tl-md col-span-full bg-purple-200 h-14">
          <div className="h-full w-full flex justify-between items-center pr-2">
            <div className="flex items-center h-full">
              <TabButton
                isActive={expenseTypeView === "fixed"}
                onClick={() => setExpenseTypeView("fixed")}
              >
                <Icon
                  name="work"
                  size="sm"
                  label={t.navigation["bottom-level"]["fixed-cost"]}
                  color="current"
                />
                {t.navigation["bottom-level"]["fixed-cost"]}
              </TabButton>
              <TabButton
                isActive={expenseTypeView === "variable"}
                onClick={() => setExpenseTypeView("variable")}
              >
                <Icon
                  name="work"
                  size="sm"
                  label={t.navigation["bottom-level"]["variable-cost"]}
                  color="current"
                />
                {t.navigation["bottom-level"]["variable-cost"]}
              </TabButton>
            </div>

            <div className="text-card-foreground flex items-center gap-2 mr-6">
              <AnimatedNumber
                className="text-2xl font-semibold"
                value={totalExpensesCostPerMonth}
                currency={selectedCurrency.code}
                locale={selectedCurrency.locale}
              />
              / {t.expenses.billable.breakeven["per-month"]}
            </div>
          </div>
        </div>
      </Resizable.Panel>

      <Resizable.Handle withHandle />

      <Resizable.Panel defaultSize={40}>
        <section className="bg-neutral-100 text-card-foreground rounded-lg relative flex flex-col justify-between @container">
          <ScrollArea.Root className="w-full h-[calc(100vh-70px)] rounded-b-lg">
            <BillableCosts userId={userId} />

            <div className="sticky bottom-0 mt-auto flex items-center justify-between w-full rounded-b-md h-[54px] px-5 py-4 bg-purple-200">
              <p>{t.expenses.billable.total.title}</p>
              <AnimatedNumber
                className="text-2xl font-semibold "
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
