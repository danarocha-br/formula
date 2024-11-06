import { cn } from "@repo/design-system/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const heading = cva(
  ["font-medium", "mb-4", "tracking-[0.4px]", "text-text-color-default"],
  {
    variants: {
      variant: {
        h1: ["text-2xl"],
      },
    },

    defaultVariants: {
      variant: "h1",
    },
  }
);

export type HeadingProps = {
  className?: string;
} & React.HTMLAttributes<HTMLHeadingElement> &
  VariantProps<typeof heading>;

const Heading = ({ className, variant = "h1", ...props }: HeadingProps) => {
  return (
    <h1 className={cn(heading({ variant }), className)} {...props}>
      {props.children}
    </h1>
  );
};

Heading.displayName = "Heading";

export { Heading };
