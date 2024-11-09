"use client";

import { cn } from "@repo/design-system/lib/utils";
import type { Transition } from "framer-motion";
import { motion, useAnimation } from "framer-motion";
import { useEffect } from "react";

const defaultTransition: Transition = {
  type: "spring",
  stiffness: 100,
  damping: 14,
  mass: 1,
};

const LayersIcon = ({
  width = 28,
  className,
}: {
  width?: number;
  className?: string;
}) => {
  const controls = useAnimation();

  const handleMouseEnter = async () => {
    await controls.start("firstState");
    await controls.start("secondState");
  };

  const handleMouseLeave = () => {
    controls.start("normal");
  };

  useEffect(() => {
    controls.start("normal");
  }, [controls]);

  return (
    <div
      className={cn(
        "select-none transition-colors duration-200 flex items-center justify-center",
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
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
        <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
        <motion.path
          d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"
          variants={{
            normal: { y: 0 },
            firstState: { y: -9 },
            secondState: { y: 0 },
          }}
          animate={controls}
          transition={defaultTransition}
        />
        <motion.path
          d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"
          variants={{
            normal: { y: 0 },
            firstState: { y: -5 },
            secondState: { y: 0 },
          }}
          animate={controls}
          transition={defaultTransition}
        />
      </svg>
    </div>
  );
};

export { LayersIcon };
