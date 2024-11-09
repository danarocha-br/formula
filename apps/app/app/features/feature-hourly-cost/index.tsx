"use client";
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ItemCard } from "@repo/design-system/components/ui/item-card";
import { ScrollArea } from "@repo/design-system/components/ui/scroll-area";
import { Resizable } from "@repo/design-system/components/ui/resizable-panel";
import { TabButton } from "@repo/design-system/components/ui/tab-button";
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
import { EmptyView } from "./empty-view";
import { MasonryGrid } from "@repo/design-system/components/ui/masonry-grid";
import { BillableCosts } from "../feature-billable-cost";
import { ExpenseItem } from "@/app/types";
import { getTranslations } from "@/utils/translations";
import { AddCard } from "./add-expense-card";
import { useGetFixedExpenses } from "./server/get-fixed-expenses";
import { LoadingView } from "./loading-view";
import { FIXED_COST_CATEGORIES } from "@/app/constants";
import { useUpdateBatchFixedExpense } from "./server/update-batch-fixed-expenses";
import { useDeleteFixedExpenses } from "./server/delete-fixed-expenses";
import { EditExpenseForm } from "./edit-expense-form";

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
  const { mutate: deleteExpense } = useDeleteFixedExpenses();
  const { mutate: updateBatchExpenses } = useUpdateBatchFixedExpense();

  const [activeCard, setActiveCard] = useState<ExpenseItem | null>(null);
  const [expenses, setExpenses] = useState<ExpenseItem[] | []>([]);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { toast } = useToast();

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

      const matchingCategory = FIXED_COST_CATEGORIES.find(
        (item) =>
          item.value.toLowerCase().includes(normalizedCategory) ||
          normalizedCategory.includes(item.value.toLowerCase())
      );

      return matchingCategory?.label ?? "";
    },
    []
  );

  useEffect(() => {
    if (initialExpenses) {
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

  const maxValue = useMemo(
    () => Math.max(...expenses.map((item) => item.amount)),
    [expenses]
  );

  const cardsId = useMemo(() => expenses.map((item) => item.id), [expenses]);

  const totalValue = useMemo(
    () => expenses.reduce((sum, item) => sum + item.amount, 0),
    [expenses]
  );

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

      let hasShownError = false;

      updateBatchExpenses(
        {
          json: {
            updates: newExpenses.map((expense, index) => ({
              id: expense.id,
              data: { rank: index },
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

      return newExpenses;
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
    console.log("Handling edit close");
    setEditingId(null);
  }, []);

  useEffect(() => {
    if (initialExpenses) {
      const sortedExpenses = [...initialExpenses].sort(
        (a, b) => (a.rank ?? 0) - (b.rank ?? 0)
      );
      setExpenses(sortedExpenses);
    }
  }, [initialExpenses]);

  return (
    <Resizable.Group direction="horizontal">
      <Resizable.Panel
        defaultSize={60}
        className="hidden md:block bg-purple-300 rounded-lg"
      >
        <ScrollArea.Root className="rounded-b-lg">
          <div className="w-full text-card-foreground @container h-[calc(100vh-72px)]">
            {isLoadingExpenses ? (
              <LoadingView />
            ) : expenses && expenses.length === 0 ? (
              <EmptyView userId={userId} />
            ) : (
              <DndContext
                sensors={sensors}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              >
                <div className="p-2 w-full min-h-dvh">
                  <SortableContext items={cardsId}>
                    <MasonryGrid>
                      {expenses.map((expense) => {
                        const isLarge = expense.amount > maxValue * 0.4;

                        return (
                          <div
                            key={expense.id}
                            className="relative"
                            style={{
                              height: isLarge ? "380px" : "260px",
                              width: "100%",
                            }}
                          >
                            <ItemCard
                              data={{
                                ...expense,
                                currency: t.common["currency-symbol"],
                                period: t.common.period["per-month"],
                                color: getExpenseCategoryColor(
                                  expense.category
                                ),
                                categoryLabel: getExpenseCategoryLabel(
                                  expense.category
                                ),
                              }}
                              loading={isLoadingExpenses}
                              className="w-full h-full"
                              actionDeleteLabel={t.common["delete"]}
                              actionEditLabel={t.common["edit"]}
                              onDelete={() => handleDeleteExpense(expense.id)}
                              onEdit={() => handleEditCard(expense.id)}
                              isEditMode={editingId === expense.id}
                              editModeContent={
                                <EditExpenseForm
                                  onClose={handleEditOnClose}
                                  userId={userId}
                                  expenseId={expense.id}
                                  rankIndex={expense.rank ?? 0}
                                  defaultValues={{
                                    name: expense.name,
                                    category: {
                                      value: expense.category,
                                      label: getExpenseCategoryLabel(
                                        expense.category
                                      ),
                                    },
                                    amount: expense.amount,
                                  }}
                                />
                              }
                            />
                          </div>
                        );
                      })}

                      <AddCard
                        className="h-full "
                        userId={userId}
                        rankIndex={expenses.length + 1}
                      />
                    </MasonryGrid>
                  </SortableContext>
                </div>

                <DragOverlayWrapper activeCard={activeCard} />
              </DndContext>
            )}

            <div className="mt-auto sticky bottom-0 flex items-center justify-between w-full rounded-br-md rounded-tl-md col-span-full bg-purple-200 h-14 opacity-95">
              <div className="h-full flex">
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
                <TabButton>
                  <Icon
                    name="work"
                    size="sm"
                    label={t.navigation["bottom-level"]["equipment-cost"]}
                    color="current"
                  />
                  {t.navigation["bottom-level"]["equipment-cost"]}
                </TabButton>
              </div>
            </div>
          </div>
        </ScrollArea.Root>
      </Resizable.Panel>

      <Resizable.Handle withHandle />

      <Resizable.Panel defaultSize={40}>
        <section className="bg-neutral-100 text-card-foreground rounded-lg relative flex flex-col justify-between @container">
          <ScrollArea.Root className="w-full h-[calc(100vh-70px)] rounded-b-lg">
            <BillableCosts />

            <div className="sticky bottom-0 mt-auto flex items-center justify-between w-full rounded-b-md h-14 px-5 py-4 bg-purple-200 opacity-95">
              <p>{t.expenses.billable.total.title}</p>
              <span className="text-2xl font-semibold">
                {t.common["currency-symbol"]} {totalValue.toFixed(2)}
              </span>
            </div>
          </ScrollArea.Root>
        </section>
      </Resizable.Panel>
    </Resizable.Group>
  );
};