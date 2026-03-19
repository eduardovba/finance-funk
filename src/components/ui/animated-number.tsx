"use client";

import { useEffect, useRef } from "react";
import { useMotionValue, useSpring, useTransform, motion } from "framer-motion";

interface AnimatedNumberProps {
  /** The target number to animate to */
  value: number;
  /** Currency code for formatting (e.g. 'BRL', 'GBP') */
  currency?: string;
  /** Locale for number formatting */
  locale?: string;
  /** Currency symbol to prepend */
  symbol?: string;
  /** Suffix to append (e.g. 'M', 'k') */
  suffix?: string;
  /** Intl.NumberFormat options */
  formatOptions?: Intl.NumberFormatOptions;
  /** Custom formatter function — overrides default formatting */
  formatter?: (value: number) => string;
  /** Spring duration in ms */
  duration?: number;
  /** Additional className */
  className?: string;
}

/**
 * AnimatedNumber — counts from previous value to target value using framer-motion spring.
 * Handles zero, negative, and currency formatting.
 * Uses tabular-nums for financial alignment.
 */
export function AnimatedNumber({
  value,
  currency,
  locale = "en-GB",
  symbol,
  suffix = "",
  formatOptions = {},
  formatter,
  duration = 1000,
  className,
}: AnimatedNumberProps) {
  const motionValue = useMotionValue(0);
  const isFirstRender = useRef(true);

  const spring = useSpring(motionValue, {
    duration,
    bounce: 0,
  });

  const display = useTransform(spring, (v: number) => {
    if (formatter) return formatter(v);

    // Default formatter: currency-aware with tabular nums
    const opts: Intl.NumberFormatOptions = {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      ...formatOptions,
    };

    if (currency) {
      try {
        return new Intl.NumberFormat(locale, {
          style: "currency",
          currency,
          ...opts,
        }).format(v);
      } catch {
        // Fallback if currency code is invalid
      }
    }

    const formatted = new Intl.NumberFormat(locale, opts).format(Math.abs(v));
    const sign = v < 0 ? "-" : "";
    return `${sign}${symbol || ""}${formatted}${suffix}`;
  });

  useEffect(() => {
    if (isFirstRender.current) {
      // Animate from 0 on first render
      isFirstRender.current = false;
      motionValue.set(0);
      // Small delay to let spring initialize at 0 before animating
      requestAnimationFrame(() => {
        motionValue.set(value);
      });
    } else {
      motionValue.set(value);
    }
  }, [value, motionValue]);

  return (
    <motion.span
      className={className}
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {display}
    </motion.span>
  );
}
