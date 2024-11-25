"use client";

import React, { useEffect, useMemo, useState } from "react";
import { parseCookies } from "nookies";
import { EquipmentCard } from "@repo/design-system/components/ui/equipment-card";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, SortableContext } from "@dnd-kit/sortable";

import { useCurrencyStore } from "@/app/store/currency-store";
import { formatCurrency } from "@/utils/format-currency";
import { EquipmentExpenseItem } from "@/app/types";
import { getTranslations } from "@/utils/translations";
import { useGetEquipmentExpenses } from "../server/get-equipment-expenses";
import { ScrollArea } from "@repo/design-system/components/ui/scroll-area";
import { LoadingView } from "../../feature-hourly-cost/loading-view";
import { useViewPreferenceStore } from "@/app/store/view-preference-store";
import { useToast } from "@repo/design-system/hooks/use-toast";
import { EmptyView } from "../empty-view";

type GridViewProps = {
  expenses: EquipmentExpenseItem[];
  setExpenses: React.Dispatch<React.SetStateAction<EquipmentExpenseItem[]>>;
  userId: string;
  loading?: boolean;
};

export const GridView = ({ userId, loading }: GridViewProps) => {
  const cookies = parseCookies();
  const locale = cookies.NEXT_LOCALE || navigator.language || "en";
  const { toast } = useToast();

  const { selectedCurrency } = useCurrencyStore();
  const { viewPreference } = useViewPreferenceStore();

  const t = getTranslations();
  const { data: initialExpenses, isLoading: isLoadingExpenses } =
    useGetEquipmentExpenses({ userId });
  const [expenses, setExpenses] = useState<EquipmentExpenseItem[] | []>([]);
  const [activeCard, setActiveCard] = useState<EquipmentExpenseItem | null>(
    null
  );
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    if (initialExpenses) {
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    })
  );

  const cardsId = useMemo(() => expenses.map((item) => item.id), [expenses]);

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

      // updateBatchExpenses(
      //   {
      //     json: {
      //       updates: updatedExpenses.map((expense) => ({
      //         id: expense.id,
      //         data: { rank: expense.rank },
      //       })),
      //       userId,
      //     },
      //   },
      //   {
      //     onError: () => {
      //       toast({
      //         title: t.validation.error["update-failed"],
      //         variant: "destructive",
      //       });
      //     },
      //   }
      // );

      return updatedExpenses;
    });
  }

  return (
    <ScrollArea.Root className="h-[calc(100vh-7.7rem)]">
      {loading ? (
        <LoadingView />
      ) : (
        <section className="relative @container">
          <DndContext
            sensors={sensors}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          >
            <div className="w-full">
              <SortableContext items={cardsId}>
                {expenses &&
                viewPreference === "grid" &&
                expenses.length > 0 ? (
                  <div className="w-full text-card-foreground grid gap-2 @[380px]:grid-cols-1 @[800px]:grid-cols-2 @[1200px]:grid-cols-3">
                    <EquipmentCard
                      data={{
                        name: "Macbook Pro 14",
                        categoryIcon: "computer",
                        color: "bg-froly-200",
                        purchaseDate: new Date().toLocaleDateString(locale),
                        id: 1,
                        lifeSpan: "Lifespan: 32 months",
                        isEmpty: false,
                        usage: "32 h/month",
                        usageLabel: "Usage",
                        usagePercent: 32,
                        totalCost: formatCurrency(1000, {
                          currency: selectedCurrency.code,
                        }),
                        totalLabel: "Total cost",
                        hourlyLabel: "Hourly cost",
                        hourlyCost: formatCurrency(1000, {
                          currency: selectedCurrency.code,
                        }),
                      }}
                      loading={loading}
                    />
                  </div>
                ) : (
                  <EmptyView userId={userId} />
                )}
              </SortableContext>
            </div>
          </DndContext>
        </section>
      )}
    </ScrollArea.Root>
  );
};
