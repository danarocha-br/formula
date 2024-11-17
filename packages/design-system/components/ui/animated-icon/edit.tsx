"use client";

import { cn } from "@repo/design-system/lib/utils";
import type { Variants } from "framer-motion";
import { motion, useAnimation } from "framer-motion";
import { useEffect } from "react";

interface EditIconProps {
  size?: number;
  className?: string;
  animated?: boolean;
}

const penVariants: Variants = {
  normal: {
    rotate: 0,
    x: 0,
    y: 0,
    d: "M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"
  },
  animate: {
    rotate: [-0.5, 0.5, -0.5],
    x: [0, -1, 1.5, 0],
    y: [0, 1.5, -1, 0],
    d: "M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"
  },
};

const penTransition = {
  duration: 0.5,
  repeat: 1,
  ease: "easeInOut",
} as const;

const EditIcon: React.FC<EditIconProps> = ({ size = 18, className, animated }) => {
  const controls = useAnimation();

  useEffect(() => {
    if (animated) {
      controls.start("animate");
    } else {
      controls.start("normal");
    }
  }, [animated, controls]);

  return (
    <div
      className={cn(
        "select-none transition-colors duration-200 flex items-center justify-center",
        className
      )}
    >
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
        <motion.path
          variants={penVariants}
          initial="normal"
          animate={controls}
          transition={penTransition}
        />
      </svg>
    </div>
  );
};

export { EditIcon };
