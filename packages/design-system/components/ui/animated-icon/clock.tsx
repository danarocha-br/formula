"use client";

import { cn } from "@repo/design-system/lib/utils";
import type { Transition, Variants } from "framer-motion";
import { motion, useAnimation } from "framer-motion";

const handTransition: Transition = {
  duration: 0.6,
  ease: [0.4, 0, 0.2, 1],
};

interface ClockIconProps {
  width?: number;
  className?: string;
}

const handVariants: Variants = {
  normal: {
    rotate: 0,
    originX: "50%",
    originY: "50%",
    x1: 12,
    y1: 12,
    x2: 12,
    y2: 6,
  },
  animate: {
    rotate: 360,
    x1: 12,
    y1: 12,
    x2: 12,
    y2: 6,
  },
};

const minuteHandTransition: Transition = {
  duration: 0.5,
  ease: "easeInOut",
};

const minuteHandVariants: Variants = {
  normal: {
    rotate: 0,
    originX: "50%",
    originY: "50%",
    x1: 12,
    y1: 12,
    x2: 16,
    y2: 12,
  },
  animate: {
    rotate: 45,
    x1: 12,
    y1: 12,
    x2: 16,
    y2: 12,
  },
};

const ClockIcon: React.FC<ClockIconProps> = ({ width = 28, className }) => {
  const controls = useAnimation();

  return (
    <div
      className={cn(
        "select-none transition-colors duration-200 flex items-center justify-center",
        className
      )}
      onMouseEnter={() => controls.start("animate")}
      onMouseLeave={() => controls.start("normal")}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={width}
        height={width}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx={12} cy={12} r={10} />
        <motion.line
          variants={handVariants}
          animate={controls}
          initial="normal"
          transition={handTransition}
        />
        <motion.line
          variants={minuteHandVariants}
          animate={controls}
          initial="normal"
          transition={minuteHandTransition}
        />
      </svg>
    </div>
  );
};

export { ClockIcon };
