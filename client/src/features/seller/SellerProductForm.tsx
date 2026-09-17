"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { postJSON } from "@/lib/api";
import { toProductSlug } from "./seller-product.utils";
import type { SellerProduct } from "@/types/seller";

type DraftProduct = Omit<SellerProduct, "isPublished">;

export function SellerProductForm({ onCreated, open, onOpenChange }: { onCreated(product: SellerProduct): void; open?: boolean; onOpenChange?(open: boolean): void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [classificationHint, setClassificationHint] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(""); setSuccess(""); setSaving(true); setClassificationHint("");
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    try {
      const { product } = await postJSON<{ product: DraftProduct }>("/seller/products", {
        name, slug: toProductSlug(name), description: String(form.get("description") ?? "").trim(),
        primaryImageUrl: String(form.get("image") ?? "").trim(), price: Number(form.get("price")),
        stock: Number(form.get("stock")), colors: String(form.get("colors") ?? "").split(",").map((color) => color.trim()).filter(Boolean),
      });
      onCreated({ ...product, isPublished: false });
      event.currentTarget.reset();
      setSuccess("Product draft created.");
      setClassificationHint("Classify it in the approved taxonomy section before it can be moderated.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to create product"); }
    finally { setSaving(false); }
  };

  return <details className="seller-create" id="new-product" open={open} onToggle={(event) => onOpenChange?.(event.currentTarget.open)}><summary>Add a product</summary><form onSubmit={submit}><div className="seller-form-grid"><label>Product name<input ref={inputRef} required name="name" minLength={2} maxLength={180} placeholder="Studio lamp" /></label><label>Price<input required name="price" type="number" min="0.01" step="0.01" placeholder="89.00" /></label><label>Stock<input required name="stock" type="number" min="0" step="1" placeholder="12" /></label><label>Image URL or symbol<input required name="image" minLength={1} placeholder="https://… or 💡" /></label><label className="wide">Description<textarea required name="description" minLength={10} placeholder="What makes this product valuable?" /></label><label className="wide">Colors <input required name="colors" placeholder="#f5f2e8, #242824" /></label></div>{error && <p className="seller-error" role="alert">{error}</p>}{success && <p className="seller-profile-success" role="status">{success}</p>}{classificationHint && <p className="seller-form-note" role="status">{classificationHint}</p>}<button className="primary-button" disabled={saving}>{saving ? "Creating draft…" : "Create draft"}</button></form></details>;
}
