"use client";

import React, { useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  // Close on Escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onCancel();
  }, [onCancel]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-xl animate-[fadeIn_200ms_ease-out]"
        onClick={onCancel}
      />
      {/* Modal */}
      <div
        className="fixed left-1/2 top-1/2 z-[999] -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-sm bg-[rgba(18,20,24,0.80)] backdrop-blur-[40px] backdrop-saturate-[180%] border border-[rgba(255,255,255,0.12)] border-t-[rgba(255,255,255,0.2)] rounded-[20px] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.5),0_0_1px_rgba(255,255,255,0.1)] animate-[slideUp_250ms_cubic-bezier(0.16,1,0.3,1)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-[rgba(245,245,220,0.92)] tracking-tight text-gradient">
          {title}
        </h2>
        <p className="text-sm text-[rgba(245,245,220,0.55)] mt-4 leading-relaxed">
          {message}
        </p>
        <div className="flex gap-3 justify-end mt-6">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </>
  );
}
