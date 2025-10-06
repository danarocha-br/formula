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
import type { EquipmentExpenseItem } from "@/app/types";
import { useTranslations } from "@/hooks/use-translation";
import { createApiErrorHandler, ErrorPatterns } from "@/utils/api-error-handler";
import { createValidationMessages } from "@/utils/validation-messages";
import { Label } from "@repo/design-system/components/ui/label";
import { NumberInput } from "@repo/design-system/components/ui/number-input";
import { cn } from "@repo/design-system/lib/utils";
import { parseCookies } from "nookies";
import { useUpdateEquipmentExpense } from "./server/update-equipment-expense";

interface EditExpenseForm {
  name: string;
  category: ComboboxOption;
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

interface EditEquipmentExpenseFormProps {
  equipment: EquipmentExpenseItem;
  onCancel: () => void;
  onSuccess?: () => void;
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

export const EditEquipmentExpenseForm = ({
  equipment,
  onCancel,
  onSuccess,
}: EditEquipmentExpenseFormProps) => {
  const { t } = useTranslations();
  const { toast } = useToast();
  const handleApiError = createApiErrorHandler(t);
  const errorPatterns = ErrorPatterns.UPDATE(t);
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
              'flex h-6 w-6 items-center justify-center rounded-[4px] p-1'
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
    []
  );

  const { selectedCurrency } = useCurrencyStore();
  const validationMessages = createValidationMessages(t);

  // Find the current category option
  const currentCategory = categoriesList.find(cat => cat.value === equipment.category);

  const defaultValues: EditExpenseForm = {
    name: equipment.name,
    category: currentCategory || categoriesList[0],
    amount: equipment.amount,
    purchaseDate: equipment.purchaseDate instanceof Date ? equipment.purchaseDate : new Date(equipment.purchaseDate),
    usage: equipment.usage,
    lifeSpan: equipment.lifeSpan,
  };

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
    formState: { errors, isSubmitting },
  } = useForm<EditExpenseForm>({
    defaultValues,
    resolver: zodResolver(expenseSchema),
    mode: "onBlur",
  });

  const { mutate: updateEquipmentExpense } = useUpdateEquipmentExpense();

  function onSubmit(data: EditExpenseForm) {
    if (!data.category || !data.name) return;

    updateEquipmentExpense({
      json: {
        id: equipment.id,
        userId: equipment.userId,
        name: data.name,
        amount: data.amount,
        category: data.category.value,
        purchaseDate: data.purchaseDate,
        usage: data.usage,
        lifeSpan: data.lifeSpan,
      },
    }, {
      onSuccess: () => {
        toast({
          title: t("validation.success.update-success", "Equipment updated successfully"),
          variant: "default",
        });
        onSuccess?.();
      },
      onError: (error) => {
        const errorMessage = handleApiError(error, errorPatterns.default);
        toast({
          title: errorMessage,
          variant: "destructive",
        });
      },
    });
  }

  return (
    <form
      className='flex flex-col gap-3 p-3 h-full'
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="flex w-full justify-between items-start">
        <div onClick={(e) => e.stopPropagation()} className="flex-1 mr-2">
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
                onChange={(option: ComboboxOption | ComboboxOption[]) => {
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
          onClick={onCancel}
        >
          <Icon name="close" className='h-4 w-4' label={t("common.actions.close", "close")} color="body" />
        </button>
      </div>

      <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
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

          <Controller
            control={control}
            name="usage"
            render={({ field }) => (
              <div className="space-y-2">
                <Label>{t("forms.equipment.usage", "Usage")}</Label>
                <SliderCard
                  suffix="h/month"
                  min={0}
                  max={100}
                  value={field.value}
                  onChange={field.onChange}
                  removePaddings
                  errors={
                    errors?.usage?.message
                      ? { message: errors.usage.message }
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

        </div>

        <div className="mt-auto pt-3 flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1"
          >
            {t("common.actions.cancel", "Cancel")}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1"
          >
            <i>
              <Icon name="check" label={t("common.actions.save", "save")} color="on-dark" />
            </i>
            {t("common.actions.save", "Save")}
          </Button>
        </div>
      </div>
    </form>
  );
};