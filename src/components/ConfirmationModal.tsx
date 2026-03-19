"use client";

import React from "react";
import { Modal, ModalContent, ModalTitle, ModalDescription } from "@/components/ui/modal";
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
  return (
    <Modal open={isOpen} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <ModalContent size="sm">
        <ModalTitle className="text-gradient">{title}</ModalTitle>
        <ModalDescription className="mt-4 leading-relaxed">
          {message}
        </ModalDescription>
        <div className="flex gap-3 justify-end mt-6">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}
