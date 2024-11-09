import { useEffect, useId, useRef, useState } from "react";
import { cva } from "class-variance-authority";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@repo/design-system/components/ui/icon";
import { cn } from "@repo/design-system/lib/utils";
import { useOutsideClick } from "@repo/design-system/hooks/use-outside-click";

import { getTranslations } from "@/utils/translations";
import { CostStatus } from "@/app/types";
import { AddExpenseForm } from "./add-expense-form";

const card = cva(["relative", "rounded-lg", "transition-all"], {
  variants: {
    isActive: {
      true: ["bg-card", "hover:bg-card", "min-h-[380px]", "shadow-lg"],
      false: ["min-h-48", "hover:border-2", "border-dashed", "border-white/30"],
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
  highlight?: boolean;
  className?: string;
  userId: string;
  rankIndex: number;
}

interface NewExpenseForm {
  category: ComboboxOption | undefined;
  amount: number;
  name: string | undefined;
  status?: CostStatus;
  billing_period?: Date;
}

interface ComboboxOption {
  label: string;
  value: string;
  slot?: React.ReactNode;
}

interface SelectOption {
  label: string;
  value: string;
  slot?: React.ReactNode;
}

export const AddCard: React.FC<AddCardProps> = ({
  highlight = false,
  className,
  userId,
  rankIndex,
}) => {
  const t = getTranslations();
  const [isActive, setIsActive] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsActive(false);
      }
    };

    if (isActive) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isActive]);

  useOutsideClick(ref, (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const isComboboxElement =
      target.closest('[role="listbox"]') ||
      target.closest('[role="combobox"]') ||
      target.closest('[role="option"]');

    // Only reset and close if clicking outside the form entirely
    if (!isComboboxElement && !ref.current?.contains(target)) {
      // reset(defaultValues);
      setIsActive(false);
    }
  });

  return (
    <AnimatePresence>
      <motion.div
        layoutId={`card-add-${id}`}
        ref={ref}
        className={cn(card({ isActive, highlight }), className)}
        transition={{
          layout: { duration: 0.2, ease: "easeOut" },
        }}
      >
        {isActive ? (
          <AddExpenseForm
            setIsActive={setIsActive}
            userId={userId}
            rankIndex={rankIndex}
          />
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
