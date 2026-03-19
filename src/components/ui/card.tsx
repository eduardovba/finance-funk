"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const cardVariants = cva(
  [
    // Base glass-card styles matching globals.css
    "bg-[rgba(18,20,24,0.60)]",
    "backdrop-blur-[24px] backdrop-saturate-150",
    "border border-[rgba(255,255,255,0.08)]",
    "border-t-[rgba(255,255,255,0.18)] border-l-[rgba(255,255,255,0.12)]",
    "rounded-2xl p-6",
    "shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]",
    "transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
  ],
  {
    variants: {
      variant: {
        default: [
          "hover:border-[rgba(255,255,255,0.2)]",
          "hover:-translate-y-0.5",
          "hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)]",
          "hover:bg-[rgba(18,20,24,0.78)]",
        ],
        flat: [
          // No hover lift or shadow — for nested cards
          "shadow-none hover:shadow-none",
          "hover:translate-y-0",
        ],
        interactive: [
          "cursor-pointer",
          "hover:border-[rgba(255,255,255,0.25)]",
          "hover:-translate-y-1",
          "hover:shadow-[0_16px_48px_rgba(0,0,0,0.6)]",
          "hover:bg-[rgba(18,20,24,0.85)]",
        ],
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

/* ─── Card Root ─── */
export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const CardRoot = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  )
);
CardRoot.displayName = "Card";

/* ─── Card.Header ─── */
export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col gap-1.5 mb-4", className)}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

/* ─── Card.Title ─── */
export interface CardTitleProps
  extends React.HTMLAttributes<HTMLHeadingElement> {}

const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        "text-base font-semibold text-[#F5F5DC] tracking-tight",
        className
      )}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

/* ─── Card.Description ─── */
export interface CardDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {}

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  CardDescriptionProps
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-white/50", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

/* ─── Card.Content ─── */
export interface CardContentProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

/* ─── Card.Footer ─── */
export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center gap-2 mt-4 pt-4 border-t border-white/5", className)}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";

/* ─── Compound export ─── */
const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Title: CardTitle,
  Description: CardDescription,
  Content: CardContent,
  Footer: CardFooter,
});

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  cardVariants,
};
