import React from "react";
import { z } from "zod";

import { getTranslations } from "@/utils/translations";
import { CostStatus } from "@/app/types";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateFixedExpenses } from "./server/create-fixed-expenses";
import { Combobox } from "@repo/design-system/components/ui/combobox";
import { FIXED_COST_CATEGORIES } from "@/app/constants";
import { cn } from "@repo/design-system/lib/utils";
import { Icon, iconPath } from "@repo/design-system/components/ui/icon";
import { cva } from "class-variance-authority";
import { Input } from "@repo/design-system/components/ui/input";
import { SliderCard } from "@repo/design-system/components/ui/slider-card";
import { Button } from "@repo/design-system/components/ui/button";
import { useToast } from '@repo/design-system/hooks/use-toast';
import { useCurrencyStore } from '@/app/store/currency-store';

interface NewExpenseForm {
  category: ComboboxOption | undefined;
  amount: number;
  name: string | undefined;
  status?: CostStatus;
  billing_period?: Date;
}

export interface ComboboxOption {
  label: string;
  value: string;
  slot?: React.ReactNode;
}

export interface SelectOption {
  label: string;
  value: string;
  slot?: React.ReactNode;
}
interface AddExpenseFormProps {
  setIsActive: React.Dispatch<React.SetStateAction<boolean>>;
  userId: string;
  rankIndex: number;
  defaultValues?: NewExpenseForm;
}

export const closeButton = cva([
  "absolute",
  "top-2",
  "right-2",
  "flex",
  "items-center",
  "justify-center",
  "rounded-full",
  "h-8",
  "w-8",
  "bg-neutral-50",
  "hover:bg-neutral-100",
  "focus-visible:outline-none",
  "focus-visible:ring-2",
  "focus-visible:ring-ring",
  "focus-visible:ring-offset-2",
]);

export const AddExpenseForm = ({
  setIsActive,
  userId,
  rankIndex,
  defaultValues = {
    name: "",
    category: undefined,
    amount: 0,
  },
}: AddExpenseFormProps) => {
  const t = getTranslations();
  const {toast} = useToast();

  const categoriesList = FIXED_COST_CATEGORIES.map((category) => ({
    label: category.label,
    value: category.icon,
    slot: (
      <div
        className={cn(
          "flex items-center justify-center p-1 h-6 w-6 rounded-[4px]",
          category.color
        )}
      >
        <Icon
          name={category.icon as keyof typeof iconPath}
          label={category.label}
          color="body"
        />
      </div>
    ),
  }));
  const {selectedCurrency} = useCurrencyStore()

  const expenseSchema = z.object({
    category: z.object(
      {
        label: z.string(),
        value: z.string(),
        slot: z.any().optional(),
      },
      {
        required_error: t.validation.form.required,
        invalid_type_error: t.validation.form.select,
      }
    ),
    amount: z.number({
      required_error: t.validation.form.required,
    }),
    name: z
      .string({
        required_error: t.validation.form.required,
      })
      .min(1, {
        message: t.validation.form.required,
      }),
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewExpenseForm>({
    defaultValues,
    resolver: zodResolver(expenseSchema),
    mode: "onBlur",
  });

  const { mutate: createFixedExpense } = useCreateFixedExpenses();
  async function onSubmit(data: NewExpenseForm) {
    if (!data.category || !data.name) return;
    reset(defaultValues);
    setIsActive(false);

    createFixedExpense({
      json: {
        name: data.name,
        amount: data.amount,
        category: data.category.value,
        userId,
        rank: rankIndex,
      },
    }, {
      onError: () => {
        toast({
          title: t.validation.error["create-failed"],
          variant: "destructive",
        });
      }
    });
  }
  return (
    <form
      className="p-3 flex flex-col justify-between h-full"
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="flex w-full justify-between">
        <div onClick={(e) => e.stopPropagation()}>
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <Combobox
                placeholder={t.expenses.form.category}
                searchPlaceholder={t.common["search"]}
                options={categoriesList}
                value={field.value || undefined}
                onChange={(option: SelectOption | SelectOption[]) => {
                  if (!Array.isArray(option)) {
                    field.onChange(option);
                  }
                }}
                emptyMessage={t.common["not-found"]}
                errors={
                  errors?.category?.message
                    ? { message: errors.category.message }
                    : undefined
                }
              />
            )}
          />
        </div>
        <button
          className={closeButton()}
          onClick={() => {
            setIsActive(false);
          }}
        >
          <Icon name="close" className="w-4 h-4" label="close" color="body" />
        </button>
      </div>
      <div>
        <div className="flex flex-col gap-2">
          <Controller
            control={control}
            name="name"
            render={({ field }) => (
              <Input
                variant="secondary"
                placeholder={t.expenses.form.name}
                className="w-full"
                id="name"
                {...field}
                errors={
                  errors?.name?.message
                    ? { message: errors.name.message }
                    : undefined
                }
              />
            )}
          />

          <Controller
            control={control}
            name="amount"
            render={({ field }) => (
              <SliderCard
                suffix={t.expenses.form.period}
                currency={selectedCurrency.symbol}
                min={1}
                max={5000}
                value={field.value}
                onChange={field.onChange}
                removePaddings
                errors={
                  errors?.amount?.message
                    ? { message: errors.amount.message }
                    : undefined
                }
              />
            )}
          />

          <div className="mt-8">
            <Button type="submit" className="whitespace-nowrap">
              <i>
                <Icon name="plus" label="add" color="on-dark" />
              </i>
              {t.expenses.actions["add-expense"]}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
};
