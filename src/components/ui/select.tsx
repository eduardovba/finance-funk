"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { cn } from "@/lib/cn";

/* ─── Root ─── */
const SelectRoot = SelectPrimitive.Root;

/* ─── Group ─── */
const SelectGroup = SelectPrimitive.Group;

/* ─── Value ─── */
const SelectValue = SelectPrimitive.Value;

/* ─── Trigger ─── */
export interface SelectTriggerProps
  extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> {
  /** Label rendered above the trigger */
  label?: string;
  /** Error message rendered below */
  error?: string;
}

const SelectTrigger = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Trigger>,
  SelectTriggerProps
>(({ className, label, error, children, ...props }, ref) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && (
      <span className="text-sm font-medium text-[#F5F5DC]/70 font-[var(--font-space),monospace]">
        {label}
      </span>
    )}
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex items-center justify-between gap-2 w-full",
        "bg-white/5 border border-white/10 rounded-xl px-4 py-2.5",
        "text-[#F5F5DC] text-sm font-[var(--font-space),monospace]",
        "focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/30 focus:outline-none",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "transition-all duration-200",
        "data-[placeholder]:text-white/30",
        error && "border-red-500/50",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <svg
          className="h-4 w-4 text-white/40 shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
    {error && <p className="text-xs text-red-400 mt-0.5">{error}</p>}
  </div>
));
SelectTrigger.displayName = "SelectTrigger";

/* ─── Content ─── */
const SelectContent = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      className={cn(
        "z-[10000] overflow-hidden",
        // Glass-card dropdown
        "bg-[rgba(18,20,24,0.92)] backdrop-blur-2xl",
        "border border-white/10 rounded-xl",
        "shadow-[0_8px_32px_rgba(0,0,0,0.5)]",
        // Animations
        "data-[state=open]:animate-[fadeIn_150ms_ease-out]",
        "data-[state=closed]:animate-[fadeOut_100ms_ease-in]",
        position === "popper" && "w-[var(--radix-select-trigger-width)]",
        className
      )}
      {...props}
    >
      <SelectPrimitive.Viewport
        className={cn(
          "p-1",
          position === "popper" && "max-h-[280px]"
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = "SelectContent";

/* ─── Item ─── */
const SelectItem = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex items-center px-3 py-2 rounded-lg text-sm",
      "text-[#F5F5DC] cursor-pointer select-none",
      "outline-none",
      "data-[highlighted]:bg-white/10",
      "data-[disabled]:opacity-50 data-[disabled]:pointer-events-none",
      "transition-colors duration-100",
      className
    )}
    {...props}
  >
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    <SelectPrimitive.ItemIndicator className="ml-auto">
      <svg
        className="h-4 w-4 text-[#D4AF37]"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </SelectPrimitive.ItemIndicator>
  </SelectPrimitive.Item>
));
SelectItem.displayName = "SelectItem";

/* ─── Label (for groups) ─── */
const SelectLabel = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("px-3 py-1.5 text-xs font-semibold text-white/40", className)}
    {...props}
  />
));
SelectLabel.displayName = "SelectLabel";

/* ─── Separator ─── */
const SelectSeparator = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("h-px my-1 bg-white/10", className)}
    {...props}
  />
));
SelectSeparator.displayName = "SelectSeparator";

/* ─── Compound export ─── */
const Select = Object.assign(SelectRoot, {
  Trigger: SelectTrigger,
  Value: SelectValue,
  Content: SelectContent,
  Item: SelectItem,
  Group: SelectGroup,
  Label: SelectLabel,
  Separator: SelectSeparator,
});

export {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
};
