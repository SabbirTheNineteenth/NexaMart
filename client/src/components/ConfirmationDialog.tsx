"use client";

import { CheckCircle2, CircleAlert, CircleX, ShieldCheck, X } from "lucide-react";
import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import { useEffect, useId, useRef } from "react";

type ConfirmationTone = "primary" | "caution" | "danger" | "neutral";

type ConfirmationDialogProps = {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  pending?: boolean;
  tone?: ConfirmationTone;
  onConfirm(): void;
  onCancel(): void;
  children?: ReactNode;
};

const toneIcons = {
  primary: CheckCircle2,
  caution: CircleAlert,
  danger: CircleX,
  neutral: ShieldCheck,
} as const;

export function ConfirmationDialog({ title, description, confirmLabel, cancelLabel = "Cancel", pending = false, tone = "primary", onConfirm, onCancel, children }: ConfirmationDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);
  const Icon = toneIcons[tone];

  useEffect(() => {
    previouslyFocusedElement.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const requiredField = dialogRef.current?.querySelector<HTMLElement>("input[required]:not([disabled]),textarea[required]:not([disabled]),select[required]:not([disabled])");
    (requiredField ?? confirmButtonRef.current)?.focus();
    return () => previouslyFocusedElement.current?.focus();
  }, []);

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && !pending) onCancel();
  };

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

  return <div className="confirmation-dialog-backdrop" onClick={handleBackdropClick} onKeyDown={handleKeyDown}>
    <div ref={dialogRef} className={`confirmation-dialog confirmation-dialog--${tone}`} role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} onClick={(event) => event.stopPropagation()}>
      <header className="confirmation-dialog-header"><span className="confirmation-dialog-icon" aria-hidden="true"><Icon size={20} strokeWidth={1.9} /></span><div><h2 id={titleId}>{title}</h2><p id={descriptionId}>{description}</p></div><button className="confirmation-dialog-close" type="button" aria-label="Close dialog" onClick={onCancel} disabled={pending}><X size={18} strokeWidth={2} /></button></header>
      {children && <div className="confirmation-dialog-body">{children}</div>}
      <footer className="confirmation-dialog-actions"><button type="button" onClick={onCancel} disabled={pending}>{cancelLabel}</button><button ref={confirmButtonRef} className={`confirmation-dialog-confirm confirmation-dialog-confirm--${tone}`} type="button" onClick={onConfirm} disabled={pending}>{pending ? "Saving…" : confirmLabel}</button></footer>
    </div>
  </div>;
}
