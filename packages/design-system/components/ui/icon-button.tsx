import { cva, VariantProps } from "class-variance-authority";
import { iconPath } from "./icon/icon-path";
import { cn } from "@repo/design-system/lib/utils";
import { Icon } from "./icon";

const button = cva(
  [
    "bg-action-color-background-transparent-enabled",
    "flex",
    "items-center",
    "justify-center",
    "outline-none",
    "border-none",
    "outline-transparent",
    "cursor-pointer",
    "transition-all",
    "leading-none",

    "hover:bg-action-color-background-transparent-hover",

    "focus:outline-2",
    "focus:outline-offset-2",
    "focus:outline-action-color-background-transparent-hover",

    "aria-disabled:opacity-60",
    "aria-disabled:cursor-not-allowed",

    "active:scale-95",
  ],
  {
    variants: {
      size: {
        xs: ["w-[22px]", "h-[22px]", "p-0", "rounded-sm"],
        sm: ["w-[28px]", "h-[28px]", "p-0", "rounded-sm"],
        md: ["w-[40px]", "h-[40px]", "p-0", "rounded-md"],
      },

      variant: {
        primary: [],
        secondary: [
          "shadow-low",
          "border-2",
          "border-action-color-border-transparent-pressed",
        ],
        tertiary: [
          "bg-action-color-background-transparent-hover",
          "hover:bg-action-color-background-transparent-pressed",
        ],
      },

      color: {
        primary: [
          "text-action-color-text-transparent-enabled",
          "focus:outline-action-color-border-transparent-pressed",
        ],
        secondary: [
          "text-interactive-color-background-enabled",
          "focus:outline-action-color-border-transparent-pressed",
        ],
        danger: [
          "text-action-color-background-danger-enabled",
          "focus:outline-action-color-border-transparent-pressed",
        ],
      },

      loading: {
        true: [
          "relative",
          "bg-action-color-background-transparent-hover",

          'after:content-[""]',
          "after:absolute",
          "after:top-0",
          "after:right-0",
          "after:bottom-0",
          "after:left-0",
          "after:rounded-md",
          "after:bg-loading-gradient",
          "!after:border-[2.4px]",
          "!after:border-neutral-200",
          "after:bg-100",
          "after:clip-path-[var(--button-loading-clip-path)]",
          "after:animate-button-loading",
        ],
      },
    },

    defaultVariants: {
      variant: "primary",
      color: "primary",
      size: "sm",
    },
  }
);

export type IconButtonProps = {
  label: string;
  variant?: "primary" | "secondary";
  color?: "primary" | "secondary" | "danger";
  size?: "md" | "sm" | "xs";
  icon: keyof typeof iconPath;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof button>;

/**
 * Renders an icon button component.
 *
 * @param {string} label - The label for the button.
 * @param {string} icon - The icon name for the button.
 * @param {string} [color='primary'] - The color of the button.
 * @param {string} [size='sm'] - The size of the button.
 * @param {string} [variant='primary'] - The variant of the button.
 * @returns {JSX.Element} The rendered icon button component.
 */
export const IconButton = ({
  label,
  color = "primary",
  size = "sm",
  variant = "primary",
  icon,
  disabled = false,
  loading = false,
  className = "",
  ...props
}: IconButtonProps): JSX.Element => (
  <button
    disabled={disabled || loading}
    aria-label={label}
    className={cn(button({ size, color, variant, loading }), className)}
    {...props}
  >
    <Icon
      name={icon}
      label={label}
      color="current"
      size={size === "md" ? "md" : size === "sm" ? "xs" : "xs"}
    />
  </button>
);

IconButton.displayName = "IconButton";
