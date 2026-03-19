"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/cn";

/* ─── Size map ─── */
const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
} as const;

export type ModalSize = keyof typeof sizeClasses;

/* ─── Root ─── */
const ModalRoot = DialogPrimitive.Root;

/* ─── Trigger ─── */
const ModalTrigger = DialogPrimitive.Trigger;

/* ─── Close ─── */
const ModalClose = DialogPrimitive.Close;

/* ─── Overlay ─── */
const ModalOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-[9999] bg-black/70 backdrop-blur-[8px]",
      "data-[state=open]:animate-[fadeIn_200ms_ease-out]",
      "data-[state=closed]:animate-[fadeOut_150ms_ease-in]",
      className
    )}
    {...props}
  />
));
ModalOverlay.displayName = "ModalOverlay";

/* ─── Content ─── */
export interface ModalContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  /** Width constraint */
  size?: ModalSize;
}

const ModalContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  ModalContentProps
>(({ className, size = "md", children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <ModalOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-[10000] -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)]",
        sizeClasses[size],
        // Glass-card styling
        "bg-[rgba(18,20,24,0.85)] backdrop-blur-2xl",
        "border border-white/10 rounded-2xl",
        "p-6 shadow-[0_8px_32px_rgba(0,0,0,0.5)]",
        // Animations
        "data-[state=open]:animate-[slideUp_250ms_cubic-bezier(0.16,1,0.3,1)]",
        "data-[state=closed]:animate-[slideDown_200ms_ease-in]",
        "focus:outline-none",
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
ModalContent.displayName = "ModalContent";

/* ─── Title ─── */
const ModalTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold text-[#F5F5DC] tracking-tight",
      className
    )}
    {...props}
  />
));
ModalTitle.displayName = "ModalTitle";

/* ─── Description ─── */
const ModalDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-white/50 mt-1.5", className)}
    {...props}
  />
));
ModalDescription.displayName = "ModalDescription";

/* ─── Compound export ─── */
const Modal = Object.assign(ModalRoot, {
  Trigger: ModalTrigger,
  Content: ModalContent,
  Title: ModalTitle,
  Description: ModalDescription,
  Close: ModalClose,
});

export { Modal, ModalTrigger, ModalContent, ModalTitle, ModalDescription, ModalClose };
