"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { useEffect, useId, useRef } from "react";

type ConfirmationDialogProps = {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  pending?: boolean;
  onConfirm(): void;
  onCancel(): void;
  children?: ReactNode;
};

export function ConfirmationDialog({ title, description, confirmLabel, cancelLabel = "Cancel", pending = false, onConfirm, onCancel, children }: ConfirmationDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previouslyFocusedElement.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    confirmButtonRef.current?.focus();
    return () => previouslyFocusedElement.current?.focus();
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && !pending) onCancel();
    if (event.key !== "Tab") return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex=\"-1\"])");
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  return <div className="confirmation-dialog-backdrop" onKeyDown={handleKeyDown}>
    <div ref={dialogRef} className="confirmation-dialog" role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}>
      <h2 id={titleId}>{title}</h2>
      <p id={descriptionId}>{description}</p>
      {children}
      <div className="confirmation-dialog-actions">
        <button type="button" onClick={onCancel} disabled={pending}>{cancelLabel}</button>
        <button ref={confirmButtonRef} className="confirmation-dialog-confirm" type="button" onClick={onConfirm} disabled={pending}>{pending ? "Saving…" : confirmLabel}</button>
      </div>
    </div>
  </div>;
}
