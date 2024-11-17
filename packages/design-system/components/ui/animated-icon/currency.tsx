"use client";

import { cn } from '@repo/design-system/lib/utils';
import type { Variants } from "framer-motion";
import { motion, useAnimation } from "framer-motion";

interface CurrencyIconProps {
  width?: number;
  className?: string;
}

const dollarMainVariants: Variants = {
  normal: {
    opacity: 1,
    pathLength: 1,
    d: "M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8",
    transition: {
      duration: 0.4,
      opacity: { duration: 0.1 },
    },
  },
  animate: {
    opacity: [0, 1],
    pathLength: [0, 1],
    d: "M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8",
    transition: {
      duration: 0.6,
      opacity: { duration: 0.1 },
    },
  },
};

const dollarSecondaryVariants: Variants = {
  normal: {
    opacity: 1,
    pathLength: 1,
    pathOffset: 0,
    d: "M12 18V6",
    transition: {
      delay: 0.3,
      duration: 0.3,
      opacity: { duration: 0.1, delay: 0.3 },
    },
  },
  animate: {
    opacity: [0, 1],
    pathLength: [0, 1],
    pathOffset: [1, 0],
    d: "M12 18V6",
    transition: {
      delay: 0.5,
      duration: 0.4,
      opacity: { duration: 0.1, delay: 0.5 },
    },
  },
};

const CurrencyIcon: React.FC<CurrencyIconProps> = ({ width = 28, className }) => {
  const controls = useAnimation();

  return (
    <div
      className={cn("select-none transition-colors duration-200 flex items-center justify-center", className)}
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
        <motion.path
          initial="normal"
          animate={controls}
          variants={dollarMainVariants}
        />
        <motion.path
          initial="normal"
          animate={controls}
          variants={dollarSecondaryVariants}
        />
      </svg>
    </div>
  );
};

export { CurrencyIcon };
