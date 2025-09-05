import { cva } from "class-variance-authority";
import type React from "react";
import { useMemo, useState } from "react";
import { z } from "zod";

import type { CostStatus } from "@/app/types";
import { useTranslations } from "@/hooks/use-translation";
import { ErrorPatterns, createApiErrorHandler } from "@/utils/api-error-handler";
import { createValidationMessages } from "@/utils/validation-messages";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@repo/design-system/components/ui/button";
import { Combobox } from "@repo/design-system/components/ui/combobox";
import { Icon, type iconPath } from "@repo/design-system/components/ui/icon";
import { Input } from "@repo/design-system/components/ui/input";
import { SliderCard } from "@repo/design-system/components/ui/slider-card";
import { ToggleGroup } from "@repo/design-system/components/ui/toggle-group";
import { useToast } from "@repo/design-system/hooks/use-toast";
import { Controller, useForm } from "react-hook-form";
import { useCreateFixedExpenses } from "./server/create-fixed-expenses";

import { FIXED_COST_CATEGORIES } from "@/app/constants";
import { useCurrencyStore } from "@/app/store/currency-store";
import { cn } from "@repo/design-system/lib/utils";

interface NewExpenseForm {
  category: ComboboxOption | undefined;
  amount: number;
  name: string | undefined;
  status?: CostStatus;
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
  const { t } = useTranslations();
  const { toast } = useToast();
  const handleApiError = createApiErrorHandler(t);
  const errorPatterns = ErrorPatterns.CREATE(t);

  const categoriesList = useMemo(
    () =>
      FIXED_COST_CATEGORIES.map((category) => ({
        label: category.label,
        value: category.value,
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
      })),
    [FIXED_COST_CATEGORIES]
  );
  const { selectedCurrency } = useCurrencyStore();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "monthly"
  );

  const validationMessages = createValidationMessages(t);

  const expenseSchema = z.object({
    category: z.object(
      {
        label: z.string(),
        value: z.string(),
        slot: z.any().optional(),
      },
      {
        required_error: validationMessages.required(),
        invalid_type_error: validationMessages.select(),
      }
    ),
    amount: z.number({
      required_error: validationMessages.required(),
      invalid_type_error: validationMessages.number(),
    }).min(1, {
      message: validationMessages.min(1),
    }),
    name: z
      .string({
        required_error: validationMessages.required(),
        invalid_type_error: validationMessages.string(),
      })
      .min(1, {
        message: validationMessages.required(),
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
  function onSubmit(data: NewExpenseForm) {
    if (!data.category || !data.name) return;

    createFixedExpense(
      {
        json: {
          userId,
          name: data.name,
          amount: data.amount,
          category: data.category.value,
          rank: rankIndex,
          period: billingPeriod,
        },
      },
      {
        onSuccess: () => {
          reset(defaultValues);
          setIsActive(false);
        },
        onError: (error) => {
          const errorMessage = handleApiError(error, errorPatterns.default);
          toast({
            title: errorMessage,
            variant: "destructive",
          });
        },
      }
    );
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
                placeholder={t("expenses.form.category")}
                searchPlaceholder={t("common.search")}
                aria-label={t("common.accessibility.selectCategory")}
                options={categoriesList}
                value={field.value || undefined}
                onChange={(option: SelectOption | SelectOption[]) => {
                  if (!Array.isArray(option)) {
                    field.onChange(option);
                  }
                }}
                emptyMessage={t("common.not-found")}
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
          <Icon name="close" className="w-4 h-4" label={t("common.actions.close")} color="body" />
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
                placeholder={t("expenses.form.name")}
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
                suffix={
                  billingPeriod === "monthly"
                    ? t("common.period.monthly")
                    : t("common.period.yearly")
                }
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

          <ToggleGroup.Root
            defaultValue="monthly"
            type="single"
            onValueChange={(value) =>
              setBillingPeriod(value as "monthly" | "yearly")
            }
            className="w-full"
          >
            <ToggleGroup.Item value="monthly" className="w-full">
              {t("common.period.monthly")}
            </ToggleGroup.Item>
            <ToggleGroup.Item value="yearly" className="w-full">
              {t("common.period.yearly")}
            </ToggleGroup.Item>
          </ToggleGroup.Root>

          <div className="mt-4">
            <Button type="submit" className="whitespace-nowrap">
              <i>
                <Icon name="plus" label={t("common.actions.add")} color="on-dark" />
              </i>
              {t("expenses.actions.add-expense")}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
};
