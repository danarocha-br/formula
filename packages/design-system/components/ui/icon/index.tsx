import { cva, VariantProps } from "class-variance-authority";

import { iconPath } from "./icon-path";

const svg = cva([], {
  variants: {
    color: {
      primary: ["fill-primary"],
      body: ["fill-card-foreground"],
      caption: ["fill-muted"],
      success: ["fill-success"],
      danger: ["fill-destructive"],
      warning: ["fill-warning"],
      "on-dark": ["fill-foreground"],
      "on-light": ["fill-background"],
      current: ["fill-current"],
    },

    size: {
      xs: ["w-[14px]"],
      sm: ["w-4"],
      md: ["w-[20px]"],
      lg: ["w-[22px]"],
    },
  },

  defaultVariants: {
    color: "body",
    size: "md",
  },
});


export type IconProps = {
  name: keyof typeof iconPath;
  /** Accessibility naming. */
  label: string;
  className?: string;
} & VariantProps<typeof svg>;

export * from "./icon-path";

/**
 * Renders an SVG icon.
 *
 * @param {string} [props.color='body-lighter'] - The color of the icon.
 * @param {string} [props.size='md'] - The size of the icon.
 * @param {string} [props.name='plus'] - The name of the icon.
 * @param {string} [props.label] - The accessibility label for the icon.
 * @param {string} [props.className] - The class name for the icon.
 * @returns {JSX.Element} The rendered SVG icon.
 */
export const Icon = ({
  color = "body",
  size = "md",
  name,
  label,
  className = "",
  ...props
}: IconProps): JSX.Element => (
  <svg
    className={svg({ color, size, className })}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    preserveAspectRatio="xMidYMid meet"
    aria-label={label}
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <path d={iconPath[name]} fillRule="evenodd" clipRule="evenodd" />
  </svg>
);

Icon.displayName = "Icon";
