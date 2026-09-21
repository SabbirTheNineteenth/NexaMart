"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ApiError, postJSON } from "@/lib/api";
import styles from "./SellerEditorForms.module.css";
import type { SellerProduct, SellerPromotion } from "@/types/seller";

export function SellerPromotionForm({
  products,
  onCreated,
  open,
  onOpenChange,
}: {
  products: SellerProduct[];
  onCreated(promotion: SellerPromotion): void;
  open?: boolean;
  onOpenChange?(open: boolean): void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    const form = new FormData(event.currentTarget);
    const startsAt = new Date(String(form.get("startsAt") ?? ""));
    const endsAt = new Date(String(form.get("endsAt") ?? ""));
    const productId = String(form.get("productId") ?? "");
    if (!productId) {
      setError("Select a product for this flash offer.");
      return;
    }
    if (
      Number.isNaN(startsAt.valueOf()) ||
      Number.isNaN(endsAt.valueOf()) ||
      endsAt <= startsAt
    ) {
      setError("Promotion must end after it starts.");
      return;
    }

    setSaving(true);
    try {
      const { promotion } = await postJSON<{ promotion: SellerPromotion }>(
        "/seller/promotions",
        {
          name: String(form.get("name") ?? "").trim(),
          scope: "product",
          productId,
          discountPercent: Number(form.get("discountPercent")),
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
        },
      );
      onCreated(promotion);
      event.currentTarget.reset();
      setSuccess("Product flash offer created.");
    } catch (reason) {
      setError(
        reason instanceof ApiError && reason.status === 409
          ? "This schedule overlaps an existing product flash offer. Adjust the product or dates and try again."
          : reason instanceof Error
            ? reason.message
            : "Unable to create product flash offer.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <details
      className={`seller-create ${styles.surface}`}
      id="new-promotion"
      open={open}
      onToggle={(event) => onOpenChange?.(event.currentTarget.open)}
    >
      <summary>Configure a product flash offer</summary>
      <p className="seller-form-note">
        Product flash offers are server-priced. Checkout decides eligibility and
        final prices.
      </p>
      <form onSubmit={submit} aria-busy={saving}>
        <fieldset disabled={saving}>
          <fieldset className="seller-form-group">
            <legend>Offer details</legend>
            <div className="seller-form-grid">
              <label>
                Promotion name
                <input
                  ref={inputRef}
                  required
                  name="name"
                  minLength={2}
                  maxLength={120}
                  placeholder="Autumn launch"
                />
              </label>
              <label>
                Discount percentage
                <input
                  required
                  name="discountPercent"
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  aria-describedby="promotion-discount-help"
                  placeholder="15"
                />
              </label>
              <p
                id="promotion-discount-help"
                className="seller-form-group-help"
              >
                Enter the percentage for this product offer.
              </p>
              <label>
                Product
                <select required name="productId" defaultValue="">
                  <option value="" disabled>
                    Select a product
                  </option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Starts at
                <input required name="startsAt" type="datetime-local" />
              </label>
              <label>
                Ends at
                <input required name="endsAt" type="datetime-local" />
              </label>
            </div>
          </fieldset>
        </fieldset>
        {error && (
          <p className="seller-error" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="seller-profile-success" role="status">
            {success}
          </p>
        )}
        <div className="seller-form-actions">
          <button className="primary-button" disabled={saving}>
            {saving ? "Saving configuration…" : "Save promotion configuration"}
          </button>
        </div>
      </form>
    </details>
  );
}
