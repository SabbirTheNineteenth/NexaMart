"use client";

import type { FormEvent, KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { ApiError, deleteJSON, patchJSON } from "@/lib/api";
import { buildSellerPromotionUpdate, validateSellerPromotionUpdate, type SellerPromotionEditFields } from "./seller-promotion-editing";
import type { SellerPromotion } from "@/types/seller";

function datetimeLocalValue(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "";
  const offsetDate = new Date(date.valueOf() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 16);
}

export function SellerPromotionEditor({ promotion, onSaved, onRemoved }: { promotion: SellerPromotion; onSaved(promotion: SellerPromotion): void; onRemoved(promotionId: string): void }) {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const confirmDeleteButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (deleteConfirmationOpen) confirmDeleteButtonRef.current?.focus();
  }, [deleteConfirmationOpen]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fields: SellerPromotionEditFields = {
      name: String(form.get("name") ?? ""),
      discountPercent: String(form.get("discountPercent") ?? ""),
      startsAt: String(form.get("startsAt") ?? ""),
      endsAt: String(form.get("endsAt") ?? ""),
    };
    const validationError = validateSellerPromotionUpdate(fields);
    if (validationError) { setError(validationError); setSuccess(""); return; }

    const update = buildSellerPromotionUpdate(fields);
    setSaving(true); setError(""); setSuccess("");
    try {
      const response = await patchJSON<{ promotion: SellerPromotion }>(`/seller/promotions/${promotion.id}`, update);
      onSaved(response.promotion);
      setSuccess("Promotion configuration saved.");
    } catch (reason) {
      setError(reason instanceof ApiError && reason.status === 409 ? "This schedule overlaps an existing product flash offer. Adjust the dates and try again." : reason instanceof ApiError && reason.status === 404 ? "Promotion was not found or is no longer available." : reason instanceof Error ? reason.message : "Unable to save promotion configuration.");
    } finally { setSaving(false); }
  };

  const remove = async () => {
    setDeleting(true); setError(""); setSuccess("");
    try {
      await deleteJSON<void>(`/seller/promotions/${promotion.id}`);
      setDeleteConfirmationOpen(false);
      onRemoved(promotion.id);
    } catch (reason) {
      setError(reason instanceof ApiError && reason.status === 404 ? "Promotion was not found or is no longer available." : reason instanceof Error ? reason.message : "Unable to delete promotion configuration.");
    } finally { setDeleting(false); }
  };

  const handleDeleteConfirmationKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && !deleting) setDeleteConfirmationOpen(false);
  };

  return <details className="seller-promotion-editor">
    <summary>Edit promotion configuration</summary>
    <form onSubmit={submit} aria-label={`Edit configuration for ${promotion.name}`}>
      <p className="seller-form-note">Configuration only — this does not apply discounts to pricing, carts, or checkout.</p>
      <div className="seller-form-grid">
        <label>Promotion name<input name="name" required minLength={2} maxLength={120} defaultValue={promotion.name} disabled={saving || deleting} /></label>
        <label>Discount percentage<input name="discountPercent" required type="number" min="0.01" max="100" step="0.01" defaultValue={promotion.discountPercent} disabled={saving || deleting} /></label>
        <label>Starts at<input name="startsAt" required type="datetime-local" defaultValue={datetimeLocalValue(promotion.startsAt)} disabled={saving || deleting} /></label>
        <label>Ends at<input name="endsAt" required type="datetime-local" defaultValue={datetimeLocalValue(promotion.endsAt)} disabled={saving || deleting} /></label>
      </div>
      <button className="primary-button" type="submit" disabled={saving || deleting}>{saving ? "Saving configuration…" : "Save configuration"}</button>
      <button className="seller-promotion-delete" type="button" aria-label={`Delete ${promotion.name} promotion`} disabled={saving || deleting} onClick={() => setDeleteConfirmationOpen(true)}>{deleting ? "Deleting promotion…" : "Delete promotion"}</button>
      {success && <p className="seller-profile-success" role="status">{success}</p>}
      {error && <p className="seller-error" role="alert">{error}</p>}
    </form>
    {deleteConfirmationOpen && <div className="seller-delete-confirmation-backdrop" onKeyDown={handleDeleteConfirmationKeyDown}>
      <div className="seller-delete-confirmation" role="alertdialog" aria-modal="true" aria-labelledby="promotion-delete-confirmation-title" aria-describedby="promotion-delete-confirmation-description">
        <h2 id="promotion-delete-confirmation-title">Delete promotion?</h2>
        <p id="promotion-delete-confirmation-description">This permanently removes “{promotion.name}”. This action cannot be undone.</p>
        <div className="seller-delete-confirmation-actions">
          <button type="button" onClick={() => setDeleteConfirmationOpen(false)} disabled={saving || deleting}>Cancel deletion</button>
          <button ref={confirmDeleteButtonRef} className="seller-promotion-delete" type="button" onClick={() => void remove()} disabled={saving || deleting}>Confirm deletion</button>
        </div>
      </div>
    </div>}
  </details>;
}
