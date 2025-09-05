import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@repo/design-system/components/ui/button";
import { Combobox } from "@repo/design-system/components/ui/combobox";
import { DatePicker } from "@repo/design-system/components/ui/date-picker";
import { Icon, type iconPath } from "@repo/design-system/components/ui/icon";
import { Input } from "@repo/design-system/components/ui/input";
import { SliderCard } from "@repo/design-system/components/ui/slider-card";
import { useToast } from "@repo/design-system/hooks/use-toast";
import { cva } from "class-variance-authority";
import type React from "react";
import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { EQUIPMENT_COST_CATEGORIES } from "@/app/constants";
import { useCurrencyStore } from "@/app/store/currency-store";
import { useTranslations } from "@/hooks/use-translation";
import { createApiErrorHandler, ErrorPatterns } from "@/utils/api-error-handler";
import { createValidationMessages } from "@/utils/validation-messages";
import { Label } from "@repo/design-system/components/ui/label";
import { NumberInput } from "@repo/design-system/components/ui/number-input";
import { cn } from "@repo/design-system/lib/utils";
import { parseCookies } from "nookies";
import { useCreateEquipmentExpense } from "./server/create-equipment-expense";

interface NewExpenseForm {
  name: string | undefined;
  category: ComboboxOption | undefined;
  amount: number;
  purchaseDate: Date;
  usage: number;
  lifeSpan: number;
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

export const AddEquipmentExpenseForm = ({
  setIsActive,
  userId,
  rankIndex,
  defaultValues = {
    name: "",
    category: undefined,
    amount: 0,
    purchaseDate: new Date(),
    usage: 0,
    lifeSpan: 0,
  },
}: AddExpenseFormProps) => {
  const { t } = useTranslations();
  const { toast } = useToast();
  const handleApiError = createApiErrorHandler(t);
  const errorPatterns = ErrorPatterns.CREATE(t);
  const cookies = parseCookies();
  const userLocale = cookies.NEXT_LOCALE || navigator.language || "en";

  const categoriesList = useMemo(
    () =>
      EQUIPMENT_COST_CATEGORIES.map((category) => ({
        label: category.label,
        value: category.value,
        slot: (
          <div
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-[4px] p-1',
              'ategoh-6 ry.color w-6 p-1'
            )}
          >
            <Icon
              name={category.icon as keyof typeof iconPath}
              label={category.label}
              color="body"
            />
          </div>
        ),
      })).sort((a, b) => a.label.localeCompare(b.label)),
    [EQUIPMENT_COST_CATEGORIES]
  );
  const { selectedCurrency } = useCurrencyStore();

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
    usage: z.number({
      required_error: validationMessages.required(),
      invalid_type_error: validationMessages.number(),
    }).min(0, {
      message: validationMessages.min(0),
    }).max(100, {
      message: validationMessages.max(100),
    }),
    lifeSpan: z.number({
      required_error: validationMessages.required(),
      invalid_type_error: validationMessages.number(),
    }).min(1, {
      message: validationMessages.min(1),
    }),
    purchaseDate: z.date({
      required_error: validationMessages.required(),
      invalid_type_error: validationMessages.date(),
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

  const { mutate: createEquipmentExpense } = useCreateEquipmentExpense();
  async function onSubmit(data: NewExpenseForm) {
    if (!data.category || !data.name) return;

    try {
      await createEquipmentExpense.mutate({
        json: {
          userId,
          name: data.name,
          amount: data.amount,
          category: data.category.value,
          rank: rankIndex,
          purchaseDate: data.purchaseDate,
          usage: data.usage,
          lifeSpan: data.lifeSpan,
        },
      });

      // Only reset and close after successful creation
      reset(defaultValues);
      setIsActive(false);
    } catch (error) {
      const errorMessage = handleApiError(error, errorPatterns.default);
      toast({
        title: errorMessage,
        variant: "destructive",
      });
    }
  }
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
                placeholder={t("common.placeholders.selectCategory", "Select category")}
                searchPlaceholder={t("common.placeholders.search", "Search")}
                aria-label={t("common.accessibility.selectCategory")}
                options={categoriesList}
                value={field.value || undefined}
                onChange={(option: SelectOption | SelectOption[]) => {
                  if (!Array.isArray(option)) {
                    field.onChange(option);
                  }
                }}
                emptyMessage={t("common.not-found", "No items found")}
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
          type="button"
          className={closeButton()}
          onClick={() => {
            setIsActive(false);
          }}
        >
          <Icon name="close" className='h-4 w-4' label={t("common.actions.close", "close")} color="body" />
        </button>
      </div>
      <div className='flex h-full flex-col justify-between p-3'>
        <div className="flex flex-col gap-2">
          <Controller
            control={control}
            name="name"
            render={({ field }) => (
              <div className="space-y-2">
                <Label>{t("forms.equipment.name", "Equipment name")}</Label>
                <Input
                  variant="secondary"
                  placeholder={t("common.placeholders.enterName", "Enter name")}
                  className="w-full"
                  id="name"
                  {...field}
                  errors={
                    errors?.name?.message
                      ? { message: errors.name.message }
                      : undefined
                  }
                />
              </div>
            )}
          />

          <Controller
            control={control}
            name="amount"
            render={({ field }) => (
              <div className="space-y-2">
                <Label>{t("forms.equipment.cost", "Equipment cost")}</Label>
                <SliderCard
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
              </div>
            )}
          />

          <div className='flex w-full justify-between gap-2'>
            <Controller
              control={control}
              name="purchaseDate"
              render={({ field }) => (
                <div className='w-full space-y-2'>
                  <Label>{t("forms.equipment.purchaseDate", "Purchase date")}</Label>
                  <DatePicker
                    {...field}
                    format={
                      userLocale === "pt-BR"
                        ? [["days", "months", "years"], []]
                        : [["months", "days", "years"], []]
                    }
                    errors={
                      errors?.purchaseDate?.message
                        ? { message: errors.purchaseDate.message }
                        : undefined
                    }
                  />
                </div>
              )}
            />
            <Controller
              control={control}
              name="lifeSpan"
              render={({ field }) => (
                <div className='h-full w-full space-y-2'>
                  <Label>{t("forms.equipment.lifespan", "Lifespan")}</Label>
                  <NumberInput
                    variant="secondary"
                    className='h-full bg-ring/60'
                    suffix={t("common.period.years", "years")}
                    {...field}
                    errors={
                      errors?.lifeSpan?.message
                        ? { message: errors.lifeSpan.message }
                        : undefined
                    }
                  />
                </div>
              )}
            />
          </div>

          <div className="mt-4">
            <Button type="submit" className="whitespace-nowrap">
              <i>
                <Icon name="plus" label={t("common.actions.add", "add")} color="on-dark" />
              </i>
              {t("expenses.actions.add-expense", "Add Expense")}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
};
