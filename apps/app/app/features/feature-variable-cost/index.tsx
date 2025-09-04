"use client";

import { useViewPreferenceStore } from "@/app/store/view-preference-store";
import type { EquipmentExpenseItem } from "@/app/types";
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  arrayMove,
} from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { ScrollArea } from "@repo/design-system/components/ui/scroll-area";
import { useEffect, useMemo, useState } from "react";
import { GridView } from "./grid-view";
import { LoadingView } from "../feature-hourly-cost/loading-view";
import { useGetEquipmentExpenses } from "./server/get-equipment-expenses";

type GridViewProps = {
  userId: string;
};

export const VariableCostView = ({ userId }: GridViewProps) => {
  const { viewPreference } = useViewPreferenceStore();
  const { data: initialExpenses, isLoading: isLoadingExpenses } = useGetEquipmentExpenses({ userId });
  const [expenses, setExpenses] = useState<EquipmentExpenseItem[] | []>([]);
  const [activeCard, setActiveCard] = useState<EquipmentExpenseItem | null>(null);
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

    setExpenses((expenses: EquipmentExpenseItem[]) => {
      const activeIndex = expenses.findIndex(
        (expense: EquipmentExpenseItem) => expense.id === active.id
      );
      const overIndex = expenses.findIndex((expense: EquipmentExpenseItem) => expense.id === over.id);
      const newExpenses = arrayMove(expenses, activeIndex, overIndex);

      const updatedExpenses = newExpenses.map((expense: EquipmentExpenseItem, index: number) => ({
        ...expense,
        rank: index + 1,
      }));

      //     },
      //   }
      // );

      return updatedExpenses;
    });
  }

  return (
    <ScrollArea.Root className="h-[calc(100vh-7.7rem)]">
      {isLoadingExpenses ? (
        <LoadingView />
      ) : (
        <section className="relative">
          <DndContext
            sensors={sensors}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          >
            <div className='w-full p-2'>
              <SortableContext items={cardsId}>
                {expenses && viewPreference === "grid" && (
                  <GridView
                    expenses={expenses}
                    setExpenses={setExpenses}
                    userId={userId}
                    loading={isLoadingExpenses}
                  />
                )}
              </SortableContext>
            </div>
          </DndContext>
        </section>
      )}
    </ScrollArea.Root>
  );
};
