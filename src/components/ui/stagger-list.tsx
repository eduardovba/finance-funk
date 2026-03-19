"use client";

import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";

interface StaggerListProps {
  children: React.ReactNode;
  /** Stagger delay between items in ms (default 60) */
  staggerMs?: number;
  /** Additional className on the container */
  className?: string;
}

const containerVariants = {
  hidden: {},
  visible: (staggerMs: number) => ({
    transition: {
      staggerChildren: staggerMs / 1000,
    },
  }),
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
    },
  },
};

/**
 * StaggerList — wraps children with staggered fade-in + slide-up entrance.
 * Animations only play once (on first render / first scroll into view).
 * Each direct child gets wrapped in a motion.div with staggered delay.
 */
export function StaggerList({
  children,
  staggerMs = 60,
  className,
}: StaggerListProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      custom={staggerMs}
    >
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        return (
          <motion.div variants={itemVariants}>
            {child}
          </motion.div>
        );
      })}
    </motion.div>
  );
}

/**
 * StaggerItem — individual item that can be used inside a manually-controlled
 * stagger container. Use when you need more fine-grained control.
 */
export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
}
