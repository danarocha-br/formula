"use client";

import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, arrayMove } from "@dnd-kit/sortable";
import { EquipmentCard } from "@repo/design-system/components/ui/equipment-card";
import { useEffect, useMemo, useState } from "react";
import { AddCard } from "../add-equipment-expense-card";

import { useCurrencyStore } from "@/app/store/currency-store";
import { useViewPreferenceStore } from "@/app/store/view-preference-store";
import type { EquipmentExpenseItem } from "@/app/types";
import { formatCurrency } from "@/utils/format-currency";
import { ScrollArea } from "@repo/design-system/components/ui/scroll-area";
import { useToast } from "@repo/design-system/hooks/use-toast";
import { LoadingView } from "../../feature-hourly-cost/loading-view";
import { EmptyView } from "../empty-view";
import { useDeleteEquipmentExpense } from "../server/delete-equipment-expense";
import { useGetEquipmentExpenses } from "../server/get-equipment-expenses";

type GridViewProps = {
  userId: string;
};

export const GridView = ({ userId }: GridViewProps) => {
  const { data: expenses, isLoading: isLoadingExpenses } = useGetEquipmentExpenses({ userId });
  const { mutate: deleteExpense } = useDeleteEquipmentExpense();

  const { t } = useTranslations();
  const { toast } = useToast();
  const { selectedCurrency } = useCurrencyStore();
  const { viewPreference } = useViewPreferenceStore();

  const [activeCard, setActiveCard] = useState<string | null>(null);
  const [localExpenses, setLocalExpenses] = useState<EquipmentExpenseItem[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    })
  );

  const cardsId = useMemo(() => localExpenses.map((item) => item.id), [localExpenses]);

  useEffect(() => {
    if (expenses) {
      setLocalExpenses(expenses);
    }
  }, [expenses]);

  const handleDelete = (id: string) => {
    deleteExpense(
      { param: { id, userId } },
      {
        onError: () => {
          toast({
            title: t("validation.error.delete-failed", "Failed to delete equipment expense"),
            variant: "destructive",
          });
        },
      }
    );
  };

  if (!expenses) {
    return null;
  }

  function onDragStart(event: DragStartEvent) {
    const { active } = event;

    if (active.data.current?.type === "card") {
      setActiveCard(active.data.current.data);
      return;
    }
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) {
      return;
    }
    if (active.id === over.id) {
      return;
    }

    setLocalExpenses((currentExpenses) => {
      const activeIndex = currentExpenses.findIndex((expense) => expense.id === active.id);
      const overIndex = currentExpenses.findIndex((expense) => expense.id === over.id);
      const newExpenses = arrayMove(currentExpenses, activeIndex, overIndex);

      const updatedExpenses = newExpenses.map((expense, index) => ({
        ...expense,
        rank: index + 1,
      }));

      return updatedExpenses;
    });
  }

  return (
    <ScrollArea.Root className="h-[calc(100vh-7.7rem)]">
      {isLoadingExpenses ? (
        <LoadingView />
      ) : (
        <section className="container relative">
          <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div className="w-full">
              <SortableContext items={cardsId}>
                {localExpenses && viewPreference === "grid" && localExpenses.length > 0 ? (
                  <div key="expense-grid" className="grid w-full @[1200px]:grid-cols-3 @[380px]:grid-cols-1 @[800px]:grid-cols-2 gap-2 text-card-foreground">
                    {localExpenses.map((expense) => (
                      <EquipmentCard
                        key={expense.id}
                        data={{
                          name: expense.name,
                          categoryIcon: expense.category.icon,
                          color: expense.category.color,
                          purchaseDate: expense.purchaseDate instanceof Date ? expense.purchaseDate.toISOString() : expense.purchaseDate,
                          id: expense.id,
                          lifeSpan: `${t("forms.equipment.lifespan", "Lifespan")}: ${expense.lifeSpan} ${t("common.period.months", "months")}`,
                          isEmpty: false,
                          usage: `${expense.usage} h/month`,
                          usageLabel: t("forms.equipment.usageLabel", "Usage"),
                          usagePercent: expense.usage,
                          totalCost: formatCurrency(expense.amount, {
                            currency: selectedCurrency.code,
                          }),
                          totalLabel: t("forms.equipment.totalCost", "Total cost"),
                          hourlyLabel: t("forms.equipment.hourlyCost", "Hourly cost"),
                          hourlyCost: formatCurrency(
                            expense.amount / expense.lifeSpan / expense.usage,
                            {
                              currency: selectedCurrency.code,
                            }
                          ),
                        }}
                        loading={isLoadingExpenses}
                        onDelete={() => handleDelete(expense.id)}
                      />
                    ))}
                    <AddCard
                      userId={userId}
                      rankIndex={localExpenses.length + 1}
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
