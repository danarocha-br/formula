import React, { useMemo } from "react";
import { MasonryGrid } from "@repo/design-system/components/ui/masonry-grid";

import { ExpenseItem } from "@/app/types";
import { getTranslations } from "@/utils/translations";
import { ItemCard } from "@repo/design-system/components/ui/item-card";
import { useCurrencyStore } from "@/app/store/currency-store";
import { EditExpenseForm } from "../edit-expense-form";
import { AddCard } from "../add-expense-card";
import { EmptyView } from "./empty-view";

type GridViewProps = {
  data: ExpenseItem[];
  getCategoryColor: (id: string) => string;
  getCategoryLabel: (id: string) => string;
  getCategoryIcon: (id: string) => string;
  onDelete: (id: number) => void;
  onEdit: (id: number) => void;
  onEditClose: () => void;
  loading?: boolean;
  editingId: number | null;
  userId: string;
};

export const GridView = ({
  data,
  getCategoryColor,
  getCategoryLabel,
  getCategoryIcon,
  loading = false,
  onEdit,
  onDelete,
  onEditClose,
  editingId,
  userId,
}: GridViewProps) => {
  const t = getTranslations();
  const { selectedCurrency } = useCurrencyStore();

  const maxValue = useMemo(
    () => Math.max(...data.map((item) => item.amount)),
    [data]
  );
  return data && data.length === 0 ? (
    <EmptyView userId={userId} />
  ) : (
    <MasonryGrid>
      {data.map((expense) => {
        const isLarge = expense.amount > maxValue * 0.4;

        return (
          <div
            key={expense.id + expense.rank}
            className="relative min-h-[300px] h-[320px]"
            style={{
              height: isLarge ? "420px" : "320px",
              width: "100%",
            }}
          >
            <ItemCard
              data={{
                ...expense,
                currency: selectedCurrency.symbol + " ",
                period:
                  expense.period === "monthly"
                    ? t.common.period.monthly
                    : t.common.period.yearly,
                color: getCategoryColor(expense.category),
                categoryLabel: getCategoryLabel(expense.category),
                categoryIcon: getCategoryIcon(expense.category),
              }}
              loading={loading}
              className="w-full h-full"
              actionDeleteLabel={t.common["delete"]}
              actionEditLabel={t.common["edit"]}
              onDelete={() => onDelete(expense.id)}
              onEdit={() => onEdit(expense.id)}
              isEditMode={editingId === expense.id}
              editModeContent={
                <EditExpenseForm
                  onClose={onEditClose}
                  userId={userId}
                  expenseId={expense.id}
                  rankIndex={expense.rank ?? 0}
                  defaultValues={{
                    name: expense.name,
                    category: {
                      value: expense.category,
                      label: getCategoryLabel(expense.category),
                    },
                    amount: expense.amount,
                    period: expense.period,
                  }}
                />
              }
            />
          </div>
        );
      })}

      <AddCard
        className="h-[320px]"
        userId={userId}
        rankIndex={data.length + 1}
      />
    </MasonryGrid>
  );
};
