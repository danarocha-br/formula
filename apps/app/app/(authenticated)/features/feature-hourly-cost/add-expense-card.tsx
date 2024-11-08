import { useEffect, useId, useRef, useState } from "react";
import { cva } from "class-variance-authority";

import { AnimatePresence, motion } from "framer-motion";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import * as z from "zod";
import { Icon, iconPath } from "@repo/design-system/components/ui/icon";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Combobox } from "@repo/design-system/components/ui/combobox";
import { SliderCard } from "@repo/design-system/components/ui/slider-card";
import { cn } from "@repo/design-system/lib/utils";
import { useOutsideClick } from "@repo/design-system/hooks/use-outside-click";
import { CostStatus, Locale } from '../../../types';
import { FIXED_COST_CATEGORIES } from '../../../constants';
import { getTranslations } from '@/utils/translations';


const card = cva(["relative", "rounded-lg", "transition-all"], {
  variants: {
    isActive: {
      true: ["bg-card", "hover:bg-card", "h-[394px]", "shadow-lg"],
      false: [
        "h-48",
        "hover:border-2",
        "border-purple-200/80",
        "border-dashed",
        "border-neutral-300",
      ],
    },
    highlight: {
      true: [],
      false: [
        "bg-purple-200/30",
        "hover:border-primary-500",
        "hover:bg-white/20",
      ],
    },
  },
  compoundVariants: [
    {
      isActive: true,
      highlight: true,
      className: ["border-none", "hover:bg-card"],
    },
    {
      isActive: true,
      highlight: false,
      className: ["border-none", "!bg-card", "hover:bg-card"],
    },
    {
      isActive: false,
      highlight: true,
      className: ["border-2", "hover:bg-purple-200/30"],
    },
  ],
  defaultVariants: {
    isActive: false,
  },
});

const closeButton = cva([
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

const cardButton = cva([
  "rounded-lg",
  "w-full",
  "h-full",
  "cursor-pointer",
  "group",
  "focus-visible:outline-none",
  "focus-visible:ring-2",
  "focus-visible:ring-neutral-800/10",
  "focus-visible:ring-offset-2",
  "focus-visible:ring-offset-purple-300",

  "[&>div]:focus-visible:opacity-100",
  "[&>div]:focus-visible:opacity-100",
  "[&>div]:focus-visible:translate-y-0",
]);

interface AddCardProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onClose?: () => void;
  highlight?: boolean;
  locale: Locale;
}

interface NewExpenseForm {
  category: ComboboxOption | null;
  value: number;
  currency: string;
  title: string | undefined;
  period: string;
  status?: CostStatus;
  billing_period?: Date;
}

const expenseSchema = z.object({
  category: z.object({
    label: z.string(),
    value: z.string(),
    slot: z.any().optional(),
  }),
  value: z.number({
    invalid_type_error: "Value must be a number",
    required_error: "Value is required",
  }),
  currency: z.string({
    invalid_type_error: "Currency must be a string",
    required_error: "Currency is required",
  }),
  title: z
    .string({
      invalid_type_error: "Title must be a string",
      required_error: "Title is required",
    })
    .min(1),
  period: z.string({
    invalid_type_error: "Period must be a string",
    required_error: "Period is required",
  }),
});

interface ComboboxOption {
  label: string;
  value: string;
  slot?: React.ReactNode;
}

export const AddCard: React.FC<AddCardProps> = ({
  onClose,
  highlight = false,
  locale,
}) => {
  const t = getTranslations(locale);
  const [isActive, setIsActive] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  const defaultValues: NewExpenseForm = {
    category: null,
    value: 0,
    currency: "$",
    title: "",
    period: "month",
  };
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

  const onSubmit: SubmitHandler<NewExpenseForm> = (data) => console.log(data);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsActive(false);
        onClose?.();
      }
    };

    if (isActive) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isActive, onClose]);

  useOutsideClick(ref, (event: MouseEvent) => {
    reset(defaultValues);
    const target = event.target as HTMLElement;
    const isComboboxElement =
      target.closest('[role="listbox"]') ||
      target.closest('[role="combobox"]') ||
      target.closest('[role="option"]');

    if (!isComboboxElement) {
      setIsActive(false);
      onClose?.();
    }
  });

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

  return (
    <AnimatePresence>
      <motion.div
        layoutId={`card-add-${id}`}
        ref={ref}
        className={card({ isActive, highlight })}
      >
        {isActive ? (
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
                      onChange={(option: ComboboxOption | null) => {
                        field.onChange(
                          option
                            ? {
                                label: (option as ComboboxOption).label,
                                value: (option as ComboboxOption).value,
                              }
                            : null
                        );
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
                  onClose?.();
                }}
              >
                <Icon
                  name="close"
                  className="w-4 h-4"
                  label="close"
                  color="body"
                />
              </button>
            </div>
            <div>
              <div className="flex flex-col gap-2">
                <Controller
                  control={control}
                  name="title"
                  render={({ field }) => (
                    <Input
                      variant="secondary"
                      placeholder={t.expenses.form.name}
                      className="w-full"
                      id={id}
                      {...field}
                      errors={
                        errors?.title?.message
                          ? { message: errors.title.message }
                          : undefined
                      }
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="value"
                  render={({ field: { onChange, ...fieldProps } }) => (
                    <SliderCard
                      suffix={t.expenses.form.period}
                      currency={t.common["currency-symbol"]}
                      min={1}
                      max={5000}
                      {...fieldProps}
                      removePaddings
                      errors={
                        errors?.value?.message
                          ? { message: errors.value.message }
                          : undefined
                      }
                    />
                  )}
                />

                <div className="mt-8">
                  <Button>
                    <Icon name="plus" label="add" color="on-dark" />
                    {t.expenses.actions["add-expense"]}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        ) : (
          <button
            className={cardButton()}
            onClick={() => {
              setIsActive(true);
            }}
          >
            <div
              className={cn(
                "group-hover:opacity-100 text-white transition-all transform duration-300",
                highlight
                  ? "opacity-100"
                  : "-translate-y-3 opacity-0 group-hover:translate-y-0"
              )}
            >
              <div className="flex flex-col gap-2 items-center justify-center h-32 text-card-foreground">
                <Icon name="plus" size="lg" label="add" color="current" />
                <p className="text-sm">{t.expenses.actions["add-expense"]}</p>
              </div>
            </div>
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
