"use client";

import dynamic from "next/dynamic";
import React, { useEffect, useMemo, useState } from "react";

import { FIXED_COST_CATEGORIES } from "@/app/constants";
import { useViewPreferenceStore } from "@/app/store/view-preference-store";
import type { ExpenseItem } from "@/app/types";
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, arrayMove } from "@dnd-kit/sortable";
import { ItemCard } from "@repo/design-system/components/ui/item-card";
import { ScrollArea } from "@repo/design-system/components/ui/scroll-area";
import { LoadingView } from "../loading-view";
import { useToast } from "@repo/design-system/hooks/use-toast";
import { createPortal } from "react-dom";
import { useDeleteFixedExpenses } from "../server/delete-fixed-expenses";
import { useUpdateBatchFixedExpense } from "../server/update-batch-fixed-expenses";
import { TableView } from "../table-view";
import { Grid } from "./grid";
import { useTranslations } from "@/hooks/use-translation";

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

type GridViewProps = {
  expenses: ExpenseItem[];
  setExpenses: React.Dispatch<React.SetStateAction<ExpenseItem[]>>;
  userId: string;
  loading?: boolean;
};

export const GridView = ({
  expenses,
  setExpenses,
  userId,
  loading = false,
}: GridViewProps) => {
  const { t } = useTranslations();
  const [activeCard, setActiveCard] = useState<ExpenseItem | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const { toast } = useToast();
  const { viewPreference } = useViewPreferenceStore();

  const { mutate: deleteExpense, isPending: isDeleting } =
    useDeleteFixedExpenses();
  const { mutate: updateBatchExpenses, isPending: isUpdating } =
    useUpdateBatchFixedExpense();

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

  const getExpenseCategoryIcon = useMemo(
    () => (category: string) => {
      const normalizedCategory = category?.toLowerCase().trim();

      const matchingCategory = FIXED_COST_CATEGORIES.find(
        (item) =>
          item.value.toLowerCase().includes(normalizedCategory) ||
          normalizedCategory.includes(item.value.toLowerCase())
      );

      return matchingCategory?.icon ?? "";
    },
    []
  );

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
              title: t("validation.error.update-failed"),
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
            title: t("validation.error.delete-failed"),
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

  return (
    <ScrollArea className="h-[calc(100vh-7.7rem)]">
      <div className="@container w-full text-card-foreground">
        {loading ? (
          <LoadingView />
        ) : (
          <section className="relative">
            <DndContext
              sensors={sensors}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            >
              <div className="w-full p-2">
                <SortableContext items={cardsId}>
                  {expenses && viewPreference === "grid" && (
                    <Grid
                      userId={userId}
                      data={expenses}
                      getCategoryColor={getExpenseCategoryColor}
                      getCategoryLabel={getExpenseCategoryLabel}
                      getCategoryIcon={getExpenseCategoryIcon}
                      loading={loading || isDeleting || isUpdating}
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
                    />
                  )}
                </SortableContext>
              </div>

              <DragOverlayWrapper activeCard={activeCard} />
            </DndContext>
          </section>
        )}
      </div>
    </ScrollArea>
  );
};
