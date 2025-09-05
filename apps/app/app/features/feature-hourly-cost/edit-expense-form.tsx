import type React from "react";
import { useState } from "react";
import { z } from "zod";

import { FIXED_COST_CATEGORIES } from "@/app/constants";
import { useCurrencyStore } from "@/app/store/currency-store";
import type { CostStatus } from "@/app/types";
import { useTranslations } from "@/hooks/use-translation";
import { ErrorPatterns, createApiErrorHandler } from "@/utils/api-error-handler";
import { createValidationMessages } from "@/utils/validation-messages";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckIcon } from "@repo/design-system/components/ui/animated-icon/check";
import { Button } from "@repo/design-system/components/ui/button";
import { Combobox } from "@repo/design-system/components/ui/combobox";
import { Icon, type iconPath } from "@repo/design-system/components/ui/icon";
import { Input } from "@repo/design-system/components/ui/input";
import { SliderCard } from "@repo/design-system/components/ui/slider-card";
import { ToggleGroup } from "@repo/design-system/components/ui/toggle-group";
import { useToast } from "@repo/design-system/hooks/use-toast";
import { cn } from "@repo/design-system/lib/utils";
import { Controller, useForm } from "react-hook-form";
import type { ComboboxOption, SelectOption, } from "./add-expense-form";
import { useUpdateFixedExpense } from "./server/update-fixed-expense";

interface EditExpenseForm {
  category: ComboboxOption | undefined;
  amount: number;
  name: string | undefined;
  status?: CostStatus;
  period: "monthly" | "yearly"
}
interface EditExpenseFormProps {
  onClose: () => void;
  userId: string;
  rankIndex: number;
  expenseId: number;
  defaultValues?: EditExpenseForm;
}

export const EditExpenseForm = ({
  onClose,
  expenseId,
  userId,
  rankIndex,
  defaultValues,
}: EditExpenseFormProps) => {
  const { t } = useTranslations();
  const handleApiError = createApiErrorHandler(t);
  const errorPatterns = ErrorPatterns.UPDATE(t);

  const [isHovered, setIsHovered] = useState(false);
  const { selectedCurrency } = useCurrencyStore();
  const [billingPeriod, setBillingPeriod] = useState(
    defaultValues?.period || "monthly"
  );
  const categoriesList = FIXED_COST_CATEGORIES.map((category) => ({
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
  }));

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

  const { toast } = useToast();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditExpenseForm>({
    defaultValues,
    resolver: zodResolver(expenseSchema),
    mode: "onBlur",
  });

  const { mutate: updateFixedExpense } = useUpdateFixedExpense();
  function onSubmit(data: EditExpenseForm) {
    if (!data.category || !data.name) return;

    updateFixedExpense(
      {
        param: { id: String(expenseId) },
        json: {
          name: data.name,
          amount: data.amount,
          category: data.category.value,
          userId,
          rank: rankIndex,
          period: billingPeriod,
        },
      },
      {
        onSuccess: () => {
          reset(defaultValues);
          onClose();
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

  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Closing form");
    onClose();
  };

  return (
    <form
      className='flex h-full flex-col justify-between p-3'
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
        <button type="button" className="hover:bg-neutral-100 rounded p-1" onClick={handleClose}>
          <Icon name="close" className='h-4 w-4' label={t("common.actions.close")} color="body" />
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
                currency={selectedCurrency.symbol + " "}
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
            defaultValue={defaultValues?.period}
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
            <Button
              type="submit"
              className="whitespace-nowrap group/edit-button"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <i>
                <CheckIcon size={20} animated={isHovered} />
              </i>
              {t("expenses.actions.edit-expense")}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
};
