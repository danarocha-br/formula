
import { cva } from "class-variance-authority";
import { useState } from "react";

import { Icon } from "./icon";
import { cn } from "../../lib/utils";

export type ChipProps = {
  label: string;
  children?: React.ReactNode;
  className?: string;
  removable?: boolean;
  color?: "neutral" | "highlight";
  customBgColor?: string;
  hasMaxWidth?: boolean;
  onRemove?: () => void;
};

const container = cva(
  [
    "flex",
    "items-center",
    "gap-2",
    "text-sm",
    "text-text-color-body-lighter",
    "border",
    "rounded-sm",

    "white-space-nowrap",
    "transition-[width_5s_2s_ease,_opacity_3s_0s_ease,_background-color_3s_0s_ease]",
    "[&_span]:pb-[1px]",
  ],
  {
    variants: {
      color: {
        neutral: [
          "bg-action-color-background-transparent-disabled",
          "border-transparent",
        ],
        highlight: [
          "bg-surface-color-background-default",
          "border-form-color-border-default/50",
        ],
      },
      removable: {
        true: [
          "pr-[2px]",
          "[&_svg]:fill-text-color-caption",
          "[&_button]:-ml-1",

          "hover:bg-surface-color-background-default",
        ],
      },
      isRemoved: {
        true: [
          "opacity-0",
          "w-0",
          "px-0",
          "[&_span]:opacity-0",
          "[&_button]:opacity-0",
        ],
        false: ["opacity-100", "w-auto", "px-2"],
      },
      hasSlot: {
        true: [
          "[&_svg]:w-3",
          "[&_svg]:h-3",

          "[&_.avatar_span]:w-3",
          "[&_.avatar_span]:h-3",
          "[&_.avatar-initials]:text-xxs",
        ],
      },
      hasMaxWidth: {
        true: ["max-w-[120px]", "[&_span]:truncate"],
      },
    },
    defaultVariants: {
      color: "neutral",
      hasSlot: false,
      removable: false,
      isRemoved: false,
      hasMaxWidth: false,
    },
  }
);

const button = cva([
  "rounded-sm",
  "flex",
  "items-center",
  "justify-center",
  "outline-none",
  "cursor-pointer",
  "transition-colors",

  "hover:[&_svg]:fill-action-color-background-danger-enabled",
  "hover:bg-action-color-background-danger-disabled",
  "dark:hover:bg-action-color-background-danger-disabled/20",
]);

/**
 * Renders a Chip component.
 *
 * @param className - The class name for the chip.
 * @param label - The label for the chip.
 * @param color - The background color for the chip.
 * @param customBgColor - A custom background color for the chip.
 * @param hasMaxWidth - Applies a max-width to the chip.
 * @param children - The children components for the chip.
 * @param removable - Whether the chip is removable.
 * @param onRemove - The callback function when the chip is removed.
 * @returns The rendered chip component.
 */
export const Chip = ({
  className = "",
  label,
  customBgColor,
  color = "neutral",
  children,
  removable = false,
  onRemove,
  hasMaxWidth = false,
  ...props
}: ChipProps): JSX.Element => {
  const [isRemoved, setIsRemoved] = useState(false);

  const handleRemove = () => {
    setIsRemoved(true);
    onRemove && onRemove();
  };

  return (
    <div
      className={cn(
        container({
          removable,
          hasSlot: !!children,
          isRemoved,
          color,
          hasMaxWidth,
          className,
        }),
        "chip",
        customBgColor
      )}
      {...props}
    >
      {children && <div className="chip-slot">{children}</div>}

      <span>{label}</span>

      {removable && (
        <button className={button()} onClick={handleRemove}>
          <Icon name="close" label="remove item" size="xs" />
        </button>
      )}
    </div>
  );
};

Chip.displayName = "Chip";
