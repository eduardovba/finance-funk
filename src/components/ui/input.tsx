"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Label rendered above the input */
  label?: string;
  /** Error message rendered below the input; also applies error border styling */
  error?: string;
  /** Icon rendered inside the input on the left */
  leftIcon?: React.ReactNode;
  /** Icon rendered inside the input on the right */
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id || React.useId();

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[rgba(245,245,220,0.55)] font-[var(--font-space),monospace]"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              /* glass-inset pattern */
              "w-full bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.03)] rounded-xl px-4 py-2.5",
              "backdrop-blur-[12px]",
              "shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]",
              "text-[rgba(245,245,220,0.92)] placeholder:text-white/30",
              "font-[inherit] text-sm",
              "focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/30 focus:outline-none",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-all duration-200",
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              error && "border-[#F87171]/50 focus:border-[#F87171]/50 focus:ring-[#F87171]/30",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
              {rightIcon}
            </span>
          )}
        </div>
        {error && (
          <p className="text-xs text-[#F87171] mt-0.5">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
