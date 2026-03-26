"use client";

import React from "react";
import { Modal, ModalContent, ModalTitle, ModalDescription } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

export interface StatusModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  type?: "success" | "error";
  onClose: () => void;
}

export default function StatusModal({
  isOpen,
  title,
  message,
  type = "success",
  onClose,
}: StatusModalProps) {
  const isSuccess = type === "success";

  return (
    <Modal open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <ModalContent size="sm" className="text-center">
        {/* Icon */}
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center text-[32px] mx-auto mb-6 ${
            isSuccess
              ? "bg-emerald-500/10"
              : "bg-red-500/10"
          }`}
        >
          {isSuccess ? "✅" : "❌"}
        </div>

        <ModalTitle className="text-gradient mb-3">{title}</ModalTitle>
        <ModalDescription className="mb-8 leading-relaxed">
          {message}
        </ModalDescription>

        <Button
          variant={isSuccess ? "primary" : "danger"}
          className="w-full"
          size="lg"
          type="button"
          onClick={onClose}
        >
          Great!
        </Button>
      </ModalContent>
    </Modal>
  );
}
