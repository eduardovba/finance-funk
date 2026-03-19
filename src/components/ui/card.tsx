"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const cardVariants = cva(
  [
    "transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
    "p-6",
  ],
  {
    variants: {
      variant: {
        default: [
          // glass-surface
          "bg-[rgba(18,20,24,0.55)]",
          "backdrop-blur-[24px] backdrop-saturate-150",
          "border border-[rgba(255,255,255,0.06)]",
          "border-t-[rgba(255,255,255,0.1)]",
          "rounded-2xl",
          "shadow-[0_8px_32px_rgba(0,0,0,0.3)]",
          "hover:border-[rgba(255,255,255,0.15)]",
          "hover:-translate-y-0.5",
          "hover:shadow-[0_12px_40px_rgba(0,0,0,0.45)]",
          "hover:bg-[rgba(18,20,24,0.70)]",
        ],
        elevated: [
          // glass-elevated
          "bg-[rgba(18,20,24,0.80)]",
          "backdrop-blur-[40px] backdrop-saturate-[180%]",
          "border border-[rgba(255,255,255,0.12)]",
          "border-t-[rgba(255,255,255,0.2)]",
          "rounded-[20px]",
          "shadow-[0_24px_80px_rgba(0,0,0,0.5),0_0_1px_rgba(255,255,255,0.1)]",
        ],
        inset: [
          // glass-inset
          "bg-[rgba(0,0,0,0.2)]",
          "backdrop-blur-[12px]",
          "border border-[rgba(255,255,255,0.03)]",
          "rounded-xl",
          "shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]",
        ],
        flat: [
          // No hover lift or shadow — for nested cards
          "bg-[rgba(18,20,24,0.55)]",
          "backdrop-blur-[24px] backdrop-saturate-150",
          "border border-[rgba(255,255,255,0.06)]",
          "border-t-[rgba(255,255,255,0.1)]",
          "rounded-2xl",
          "shadow-none hover:shadow-none",
          "hover:translate-y-0",
        ],
        interactive: [
          "bg-[rgba(18,20,24,0.55)]",
          "backdrop-blur-[24px] backdrop-saturate-150",
          "border border-[rgba(255,255,255,0.06)]",
          "border-t-[rgba(255,255,255,0.1)]",
          "rounded-2xl",
          "shadow-[0_8px_32px_rgba(0,0,0,0.3)]",
          "cursor-pointer",
          "hover:border-[rgba(255,255,255,0.2)]",
          "hover:-translate-y-1",
          "hover:shadow-[0_16px_48px_rgba(0,0,0,0.5)]",
          "hover:bg-[rgba(18,20,24,0.80)]",
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
        "text-base font-semibold text-[rgba(245,245,220,0.92)] tracking-tight",
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
    className={cn("text-sm text-[rgba(245,245,220,0.55)]", className)}
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
