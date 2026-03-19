"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2",
    "font-semibold rounded-xl",
    "transition-all duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/50 focus-visible:ring-offset-0",
    "disabled:opacity-50 disabled:pointer-events-none",
  ],
  {
    variants: {
      variant: {
        primary: [
          "bg-gradient-to-br from-[#CC5500] to-[#D4AF37]",
          "text-[#1A0F2E]",
          "border border-[rgba(212,175,55,0.3)]",
          "shadow-[0_4px_12px_rgba(204,85,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.1)]",
          "hover:shadow-[0_6px_20px_rgba(212,175,55,0.4)]",
          "hover:brightness-110 hover:-translate-y-px",
        ],
        secondary: [
          "bg-transparent",
          "border border-white/10",
          "text-[#F5F5DC]",
          "hover:bg-white/5 hover:border-white/20",
        ],
        danger: [
          "bg-[#ef4444]",
          "border border-[#ef4444]",
          "text-white",
          "hover:bg-[#dc2626] hover:border-[#dc2626]",
          "hover:shadow-[0_4px_12px_rgba(239,68,68,0.4)]",
        ],
        ghost: [
          "bg-transparent",
          "text-white/50",
          "hover:bg-white/10 hover:text-white/80",
        ],
        outline: [
          "bg-transparent",
          "border border-[#D4AF37]",
          "text-[#D4AF37]",
          "hover:bg-[#D4AF37]/10",
        ],
      },
      size: {
        sm: "px-3 py-1.5 text-xs",
        md: "px-5 py-2.5 text-sm",
        lg: "px-8 py-3.5 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin h-4 w-4", className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render as child element (Radix Slot) */
  asChild?: boolean;
  /** Show loading spinner and disable interactions */
  isLoading?: boolean;
  /** Icon rendered before children */
  leftIcon?: React.ReactNode;
  /** Icon rendered after children */
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Spinner />}
        {!isLoading && leftIcon}
        {children}
        {!isLoading && rightIcon}
      </Comp>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
