"use client";

import React, { PropsWithChildren, useRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, useMotionValue, useSpring, useTransform, HTMLMotionProps } from "framer-motion";

import { cn } from "@repo/design-system/lib/utils";

export interface DockProps extends VariantProps<typeof dockVariants> {
  className?: string;
  magnification?: number;
  distance?: number;
  direction?: "top" | "middle" | "bottom";
  children: React.ReactNode;
}

const DEFAULT_MAGNIFICATION = 36;
const DEFAULT_DISTANCE = 120;

const dockVariants = cva([
  "supports-backdrop-blur:bg-white/10",
  "flex",
  "w-max",
  "gap-px",
  "rounded-full",
  "border",
  "py-1",
  "px-1",
  "border-border/15",
  "backdrop-blur-md",
]);

const DockRoot = React.forwardRef<HTMLDivElement, DockProps>(
  (
    {
      className,
      children,
      magnification = DEFAULT_MAGNIFICATION,
      distance = DEFAULT_DISTANCE,
      direction = "bottom",
      ...props
    },
    ref
  ) => {
    const mouseX = useMotionValue(Infinity);

    const renderChildren = () => {
      return React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type === DockIcon) {
          return React.cloneElement(child, {
            ...child.props,
            mouseX: mouseX,
            magnification: magnification,
            distance: distance,
          });
        }
        return child;
      });
    };

    return (
      <motion.div
        ref={ref}
        onMouseMove={(e) => mouseX.set(e.pageX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        {...props}
        className={cn(dockVariants({ className }), {
          "items-start": direction === "top",
          "items-center": direction === "middle",
          "items-end": direction === "bottom",
        })}
      >
        {renderChildren()}
      </motion.div>
    );
  }
);

DockRoot.displayName = "DockRoot";

export interface DockIconProps extends HTMLMotionProps<"button"> {
  size?: number;
  magnification?: number;
  distance?: number;
  mouseX?: any;
  className?: string;
  children?: React.ReactNode;
  isActive?: boolean;
  props?: PropsWithChildren;
}

const DockIcon = ({
  size,
  magnification = DEFAULT_MAGNIFICATION,
  distance = DEFAULT_DISTANCE,
  mouseX,
  className,
  children,
  isActive,
  ...props
}: DockIconProps) => {
  const ref = useRef<HTMLButtonElement>(null);

  const distanceCalc = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };

    return val - bounds.x - bounds.width / 2;
  });

  const widthSync = useTransform(
    distanceCalc,
    [-distance, 0, distance],
    [27, magnification, 27]
  );

  const width = useSpring(widthSync, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  return (
    <motion.button
      ref={ref}
      style={{ width }}
      className={cn(
        "hover:bg-foreground/15 flex aspect-square cursor-pointer items-center justify-center rounded-full",
        isActive && "bg-foreground/5",
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
};

DockIcon.displayName = "DockIcon";

export const Dock = { Root: DockRoot, Icon: DockIcon, Variants: dockVariants };
