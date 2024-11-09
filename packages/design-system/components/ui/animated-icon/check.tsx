"use client";

import { cn } from '@repo/design-system/lib/utils';
import type { Variants } from "framer-motion";
import { motion, useAnimation } from "framer-motion";
import { useEffect } from "react";

const pathVariants: Variants = {
  normal: {
    opacity: 1,
    pathLength: 1,
    transition: {
      duration: 0.3,
      opacity: { duration: 0.1 },
    },
  },
  animate: {
    opacity: [0, 1],
    pathLength: [0, 1],
    transition: {
      duration: 0.4,
      opacity: { duration: 0.1 },
    },
  },
};

const CheckIcon = ({
  size = 18,
  className,
  animated,
}: {
  size?: number;
  className?: string;
  animated?: boolean;
}) => {
  const controls = useAnimation();

  useEffect(() => {
    if (animated) {
      controls.start("animate");
    } else {
      controls.start("normal");
    }
  }, [animated, controls]);

  return (
    <div className={cn("select-none transition-colors duration-200 flex items-center justify-center", className)}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <motion.path
          variants={pathVariants}
          initial="normal"
          animate={controls}
          d="m9 12 2 2 4-4"
        />
      </svg>
    </div>
  );
};

export { CheckIcon };
