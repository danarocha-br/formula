"use client";
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ItemCard } from "@repo/design-system/components/ui/item-card";
import { ScrollArea } from "@repo/design-system/components/ui/scroll-area";
import { Resizable } from "@repo/design-system/components/ui/resizable-panel";
import { TabButton } from "@repo/design-system/components/ui/tab-button";
import { AnimatedNumber } from "@repo/design-system/components/ui/animated-number";
import { useToast } from "@repo/design-system/hooks/use-toast";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, SortableContext } from "@dnd-kit/sortable";
import dynamic from "next/dynamic";

import { Icon } from "@repo/design-system/components/ui/icon";
import { BillableCosts } from "../feature-billable-cost";
import { ExpenseItem } from "@/app/types";
import { getTranslations } from "@/utils/translations";
import { useGetFixedExpenses } from "./server/get-fixed-expenses";
import { LoadingView } from "./loading-view";
import { FIXED_COST_CATEGORIES } from "@/app/constants";
import { useUpdateBatchFixedExpense } from "./server/update-batch-fixed-expenses";
import { useDeleteFixedExpenses } from "./server/delete-fixed-expenses";
import { useCurrencyStore } from "@/app/store/currency-store";
import { GridView } from "./grid-view";
import { useHourlyCostStore } from "@/app/store/hourly-cost-store";
import { ToggleGroup } from "@repo/design-system/components/ui/toggle-group";
import { TableView } from "./table-view";
import { cn } from "@repo/design-system/lib/utils";

type Props = {
  userId: string;
};

const DragOverlayWrapper = dynamic(
  () =>
    Promise.resolve(({ activeCard }: { activeCard: ExpenseItem | null }) => {
      const [mounted, setMounted] = useState(false);

      useEffect(() => {
        setMounted(true);
      }, []);

      if (!mounted) return null;

      return createPortal(
        <DragOverlay>
          {activeCard && (
            <div
              style={{
                transform: "scale(1.05)",
                cursor: "grabbing",
              }}
            >
              <ItemCard data={activeCard} />
            </div>
          )}
        </DragOverlay>,
        document.body
      );
    }),
  { ssr: false }
);

export const FeatureHourlyCost = ({ userId }: Props) => {
  const t = getTranslations();
  const { data: initialExpenses, isLoading: isLoadingExpenses } =
    useGetFixedExpenses({ userId });
  const { mutate: deleteExpense, isPending: isDeleting } =
    useDeleteFixedExpenses();
  const { mutate: updateBatchExpenses, isPending: isUpdating } =
    useUpdateBatchFixedExpense();

  const { selectedCurrency } = useCurrencyStore();

  const [activeCard, setActiveCard] = useState<ExpenseItem | null>(null);
  const [expenses, setExpenses] = useState<ExpenseItem[] | []>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewPreference, setViewPreference] = useState<"grid" | "table">(
    "grid"
  );

  const { toast } = useToast();
  const { hourlyCost, setTotalMonthlyExpenses } = useHourlyCostStore();

  const getExpenseCategoryColor = useMemo(
    () => (category: string) => {
      const normalizedCategory = category?.toLowerCase().trim();

      const matchingCategory = FIXED_COST_CATEGORIES.find(
        (item) =>
          item.value.toLowerCase().includes(normalizedCategory) ||
          normalizedCategory.includes(item.value.toLowerCase())
      );

      return matchingCategory?.color ?? "bg-neutral-100";
    },
    []
  );

  const getExpenseCategoryLabel = useMemo(
    () => (category: string) => {
      const normalizedCategory = category?.toLowerCase().trim();
      console.log(normalizedCategory);

      const matchingCategory = FIXED_COST_CATEGORIES.find(
        (item) =>
          item.value.toLowerCase().includes(normalizedCategory) ||
          normalizedCategory.includes(item.value.toLowerCase())
      );

      return matchingCategory?.label ?? "";
    },
    []
  );

  const getExpenseCategoryIcon = useMemo(
    () => (category: string) => {
      const normalizedCategory = category?.toLowerCase().trim();
      console.log(normalizedCategory);

      const matchingCategory = FIXED_COST_CATEGORIES.find(
        (item) =>
          item.value.toLowerCase().includes(normalizedCategory) ||
          normalizedCategory.includes(item.value.toLowerCase())
      );

      return matchingCategory?.icon ?? "";
    },
    []
  );

  useEffect(() => {
    if (initialExpenses) {
      //@ts-ignore
      setExpenses(initialExpenses);
    }
  }, [initialExpenses]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    })
  );

  const cardsId = useMemo(() => expenses.map((item) => item.id), [expenses]);

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

  function onDragStart(event: DragStartEvent) {
    const { active } = event;

    if (active.data.current?.type === "card") {
      setActiveCard(active.data.current.data);
      return;
    }
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) return;
    if (active.id === over.id) return;

    setExpenses((expenses) => {
      const activeIndex = expenses.findIndex(
        (expense) => expense.id === active.id
      );
      const overIndex = expenses.findIndex((expense) => expense.id === over.id);
      const newExpenses = arrayMove(expenses, activeIndex, overIndex);

      const updatedExpenses = newExpenses.map((expense, index) => ({
        ...expense,
        rank: index + 1,
      }));

      updateBatchExpenses(
        {
          json: {
            updates: updatedExpenses.map((expense) => ({
              id: expense.id,
              data: { rank: expense.rank },
            })),
            userId,
          },
        },
        {
          onError: () => {
            toast({
              title: t.validation.error["update-failed"],
              variant: "destructive",
            });
          },
        }
      );

      return updatedExpenses;
    });
  }

  function handleDeleteExpense(id: number) {
    deleteExpense(
      { param: { id: String(id), userId } },
      {
        onError: () => {
          toast({
            title: t.validation.error["delete-failed"],
            variant: "destructive",
          });
        },
      }
    );
  }

  function handleEditCard(id: number) {
    setEditingId((currentId) => (currentId === id ? null : id));
  }
  const handleEditOnClose = React.useCallback(() => {
    setEditingId(null);
  }, []);

  useEffect(() => {
    if (initialExpenses) {
      const sortedExpenses = [...initialExpenses].sort(
        (a, b) => (a.rank ?? 0) - (b.rank ?? 0)
      );
      // @ts-ignore
      setExpenses(sortedExpenses);
    }
  }, [initialExpenses]);

  return (
    <Resizable.Group direction="horizontal">
      <Resizable.Panel
        defaultSize={60}
        className={cn(
          "hidden md:block rounded-lg",
          viewPreference === "grid" ? "bg-purple-300" : "bg-neutral-100"
        )}
      >
        <ScrollArea.Root className="rounded-b-lg">
          <div className="w-full text-card-foreground @container h-[calc(100vh-70px)]">
            {isLoadingExpenses ? (
              <LoadingView />
            ) : (
              <section className="relative">
                <DndContext
                  sensors={sensors}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                >
                  <div className="p-2 w-full min-h-dvh">
                    <SortableContext items={cardsId}>
                      {expenses && viewPreference === "grid" && (
                        <GridView
                          userId={userId}
                          data={expenses}
                          getCategoryColor={getExpenseCategoryColor}
                          getCategoryLabel={getExpenseCategoryLabel}
                          getCategoryIcon={getExpenseCategoryIcon}
                          loading={
                            isLoadingExpenses || isDeleting || isUpdating
                          }
                          onEdit={handleEditCard}
                          onDelete={handleDeleteExpense}
                          onEditClose={handleEditOnClose}
                          editingId={editingId}
                        />
                      )}

                      {expenses && viewPreference === "table" && (
                        <TableView
                          userId={userId}
                          data={expenses}
                          getCategoryColor={getExpenseCategoryColor}
                          getCategoryLabel={getExpenseCategoryLabel}
                          loading={isLoadingExpenses}
                          onEdit={handleEditCard}
                          onDelete={handleDeleteExpense}
                          onEditClose={handleEditOnClose}
                          editingId={editingId}
                        />
                      )}
                    </SortableContext>
                  </div>

                  <DragOverlayWrapper activeCard={activeCard} />
                </DndContext>
              </section>
            )}

            <div className="mt-auto sticky bottom-0 flex items-center justify-between w-full rounded-br-md rounded-tl-md col-span-full bg-purple-200 h-14">
              <div className="h-full w-full flex justify-between items-center pr-2">
                <div className="flex items-center h-full">
                  <TabButton isActive>
                    <Icon
                      name="work"
                      size="sm"
                      label={t.navigation["bottom-level"]["fixed-cost"]}
                      color="current"
                    />
                    {t.navigation["bottom-level"]["fixed-cost"]}
                  </TabButton>
                  <TabButton>
                    <Icon
                      name="work"
                      size="sm"
                      label={t.navigation["bottom-level"]["variable-cost"]}
                      color="current"
                    />
                    {t.navigation["bottom-level"]["variable-cost"]}
                  </TabButton>
                </div>

                <div className="flex items-center gap-2">
                  <AnimatedNumber
                    className="text-2xl font-semibold"
                    value={totalExpensesCostPerMonth}
                    currency={selectedCurrency.code}
                    locale={selectedCurrency.locale}
                  />
                  / {t.expenses.billable.breakeven["per-month"]}
                  <div className="ml-4">
                    <ToggleGroup.Root
                      type="single"
                      variant="outline"
                      value={viewPreference}
                      onValueChange={(value: "grid" | "table") =>
                        setViewPreference(value)
                      }
                      className="bg-transparent scale-90"
                    >
                      <ToggleGroup.Item
                        value="table"
                        className="p-2 bg-transparent"
                      >
                        <Icon name="table" label="table view" />
                      </ToggleGroup.Item>

                      <ToggleGroup.Item
                        value="grid"
                        className="p-2 bg-transparent"
                      >
                        <Icon name="grid" label="cards view" />
                      </ToggleGroup.Item>
                    </ToggleGroup.Root>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea.Root>
      </Resizable.Panel>

      <Resizable.Handle withHandle />

      <Resizable.Panel defaultSize={40}>
        <section className="bg-neutral-100 text-card-foreground rounded-lg relative flex flex-col justify-between @container">
          <ScrollArea.Root className="w-full h-[calc(100vh-70px)] rounded-b-lg">
            <BillableCosts userId={userId} />

            <div className="sticky bottom-0 mt-auto flex items-center justify-between w-full rounded-b-md h-[54px] px-5 py-4 bg-purple-200">
              <p>{t.expenses.billable.total.title}</p>
              <AnimatedNumber
                className="text-2xl font-semibold"
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
