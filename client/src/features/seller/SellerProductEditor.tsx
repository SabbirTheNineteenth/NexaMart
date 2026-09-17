"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { ApiError, patchJSON } from "@/lib/api";
import { buildSellerProductUpdate, validateSellerProductUpdate, type SellerProductEditFields } from "./seller-product-editing";
import type { SellerProduct, SellerProductDetail } from "@/types/seller";

export function SellerProductEditor({ product, onSaved }: { product: SellerProduct; onSaved(product: SellerProductDetail): void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fields: SellerProductEditFields = {
      name: String(form.get("name") ?? ""), brand: String(form.get("brand") ?? ""), slug: String(form.get("slug") ?? ""),
      description: String(form.get("description") ?? ""), price: String(form.get("price") ?? ""),
      primaryImageUrl: String(form.get("primaryImageUrl") ?? ""), colors: String(form.get("colors") ?? ""),
    };
    const validationError = validateSellerProductUpdate(fields);
    if (validationError) { setError(validationError); setSuccess(""); return; }
    const update = buildSellerProductUpdate(fields);
    setSaving(true); setError(""); setSuccess("");
    try {
      const response = await patchJSON<{ product: SellerProductDetail }>(`/seller/products/${product.id}`, update);
      onSaved(response.product);
      setSuccess("Product details saved.");
    } catch (reason) {
      setError(reason instanceof ApiError && reason.status === 404 ? "Product was not found or is no longer available." : reason instanceof ApiError && reason.status === 409 ? "Product slug already exists. Choose a different slug and try again." : reason instanceof Error ? reason.message : "Unable to save product details.");
    } finally { setSaving(false); }
  };

  return <details className="seller-product-editor">
    <summary>Edit product details</summary>
    <form onSubmit={submit} aria-label={`Edit details for ${product.name}`}>
      <p className="seller-form-note">Update only the details you need. Stock and publication status are managed separately.</p>
      <div className="seller-form-grid">
        <label>Product name<input name="name" minLength={2} maxLength={180} defaultValue={product.name} disabled={saving} /></label>
        <label>Brand<input name="brand" maxLength={120} defaultValue={product.brand ?? ""} disabled={saving} /></label>
        <label>Slug<input name="slug" minLength={2} maxLength={220} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" defaultValue={product.slug ?? ""} disabled={saving} /></label>
        <label>Price<input name="price" type="number" min="0.01" max="9999999999.99" step="0.01" defaultValue={product.price ?? ""} disabled={saving} /></label>

        <label>Primary image URL<input name="primaryImageUrl" type="url" maxLength={2000} defaultValue={product.primaryImageUrl ?? ""} disabled={saving} /></label>
        <label className="wide">Description<textarea name="description" minLength={10} maxLength={10_000} defaultValue={product.description ?? ""} disabled={saving} /></label>
        <label className="wide">Colors (comma-separated)<input name="colors" defaultValue={product.colors?.join(", ") ?? ""} disabled={saving} /></label>
      </div>
      <button className="primary-button" type="submit" disabled={saving}>{saving ? "Saving details…" : "Save details"}</button>
      {success && <p className="seller-profile-success" role="status">{success}</p>}
      {error && <p className="seller-error" role="alert">{error}</p>}
    </form>
  </details>;
}
