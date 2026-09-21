"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { ApiError, patchJSON } from "@/lib/api";
import {
  buildSellerProductUpdate,
  validateSellerProductUpdate,
  type SellerProductEditFields,
} from "./seller-product-editing";
import styles from "./SellerEditorForms.module.css";
import type { SellerProduct, SellerProductDetail } from "@/types/seller";

export function SellerProductEditor({
  product,
  onSaved,
}: {
  product: SellerProduct;
  onSaved(product: SellerProductDetail): void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fields: SellerProductEditFields = {
      name: String(form.get("name") ?? ""),
      brand: String(form.get("brand") ?? ""),
      slug: String(form.get("slug") ?? ""),
      description: String(form.get("description") ?? ""),
      price: String(form.get("price") ?? ""),
      primaryImageUrl: String(form.get("primaryImageUrl") ?? ""),
      colors: String(form.get("colors") ?? ""),
    };
    const validationError = validateSellerProductUpdate(fields);
    if (validationError) {
      setError(validationError);
      setSuccess("");
      return;
    }

    const update = buildSellerProductUpdate(fields);
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await patchJSON<{ product: SellerProductDetail }>(
        `/seller/products/${product.id}`,
        update,
      );
      onSaved(response.product);
      setSuccess("Product details saved.");
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 404) {
        setError("Product was not found or is no longer available.");
      } else if (reason instanceof ApiError && reason.status === 409) {
        setError(
          "Product slug already exists. Choose a different slug and try again.",
        );
      } else {
        setError(
          reason instanceof Error
            ? reason.message
            : "Unable to save product details.",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <details className={`seller-product-editor ${styles.surface}`}>
      <summary>Edit product details</summary>
      <form
        onSubmit={submit}
        aria-label={`Edit details for ${product.name}`}
        aria-busy={saving}
      >
        <p className="seller-form-note">
          Update only the details you need. Stock and publication status are
          managed separately.
        </p>
        <fieldset disabled={saving}>
          <fieldset className="seller-form-group">
            <legend>Product identity</legend>
            <div className="seller-form-grid">
              <label>
                Product name
                <input
                  name="name"
                  minLength={2}
                  maxLength={180}
                  defaultValue={product.name}
                />
              </label>
              <label>
                Brand
                <input
                  name="brand"
                  maxLength={120}
                  defaultValue={product.brand ?? ""}
                />
              </label>
              <label>
                URL slug
                <input
                  name="slug"
                  minLength={2}
                  maxLength={220}
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  aria-describedby="product-slug-help"
                  defaultValue={product.slug ?? ""}
                />
              </label>
              <p id="product-slug-help" className="seller-form-group-help">
                Use lowercase letters, numbers, and hyphens only.
              </p>
              <label>
                Price
                <input
                  name="price"
                  type="number"
                  min="0.01"
                  max="9999999999.99"
                  step="0.01"
                  defaultValue={product.price ?? ""}
                />
              </label>
            </div>
          </fieldset>
          <fieldset className="seller-form-group">
            <legend>Customer-facing details</legend>
            <div className="seller-form-grid">
              <label>
                Primary image URL
                <input
                  name="primaryImageUrl"
                  type="url"
                  maxLength={2000}
                  defaultValue={product.primaryImageUrl ?? ""}
                />
              </label>
              <label className="wide">
                Description
                <textarea
                  name="description"
                  minLength={10}
                  maxLength={10_000}
                  defaultValue={product.description ?? ""}
                />
              </label>
              <label className="wide">
                Colors (comma-separated)
                <input
                  name="colors"
                  defaultValue={product.colors?.join(", ") ?? ""}
                />
              </label>
            </div>
          </fieldset>
        </fieldset>
        <div className="seller-form-actions">
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? "Saving details…" : "Save details"}
          </button>
        </div>
        {success && (
          <p className="seller-profile-success" role="status">
            {success}
          </p>
        )}
        {error && (
          <p className="seller-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </details>
  );
}
