"use client";

import { cn } from "@repo/design-system/lib/utils";
import type { Variants } from "framer-motion";
import { motion, useAnimation } from "framer-motion";

const penVariants: Variants = {
  normal: {
    rotate: 0,
    x: 0,
    y: 0,
  },
  animate: {
    rotate: [-0.5, 0.5, -0.5],
    x: [0, -1, 1.5, 0],
    y: [0, 1.5, -1, 0],
  },
};

const EditIcon = ({
  width = 18,
  className,
}: {
  width?: number;
  className?: string;
}) => {
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
        <motion.path
          d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"
          variants={penVariants}
          animate={controls}
          transition={{
            duration: 0.5,
            repeat: 1,
            ease: "easeInOut",
          }}
        />
      </svg>
    </div>
  );
};

export { EditIcon };
