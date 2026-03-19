"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full font-medium",
  {
    variants: {
      variant: {
        default: "bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/20",
        success: "bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/20",
        danger: "bg-[#F87171]/15 text-[#F87171] border border-[#F87171]/20",
        warning: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
        muted: "bg-white/10 text-white/50 border border-white/5",
      },
      size: {
        sm: "px-2 py-0.5 text-[0.75rem]",
        md: "px-2.5 py-0.5 text-[var(--text-xs)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  )
);

Badge.displayName = "Badge";

export { Badge, badgeVariants };
