"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { getJSON, postJSON } from "@/lib/api";
import type { SellerProduct, SellerTaxonomyOptions } from "@/types/seller";
import { toProductSlug } from "./seller-product.utils";
import styles from "./SellerEditorForms.module.css";

type DraftProduct = Omit<SellerProduct, "isPublished">;
type TaxonomyState = "loading" | "ready" | "error";

export function SellerProductForm() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [taxonomyState, setTaxonomyState] = useState<TaxonomyState>("loading");
  const [taxonomyError, setTaxonomyError] = useState("");
  const [taxonomy, setTaxonomy] = useState<SellerTaxonomyOptions>({ categories: [], subcategories: [], brands: [] });
  const [categoryId, setCategoryId] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const loadTaxonomy = () => {
    setTaxonomyState("loading");
    setTaxonomyError("");
    getJSON<SellerTaxonomyOptions>("/seller/taxonomy/options")
      .then((options) => { setTaxonomy(options); setTaxonomyState("ready"); })
      .catch((reason) => { setTaxonomyState("error"); setTaxonomyError(reason instanceof Error ? reason.message : "Unable to load approved taxonomy."); });
  };

  useEffect(() => {
    inputRef.current?.focus();
    void Promise.resolve().then(loadTaxonomy);
  }, []);

  const subcategories = useMemo(
    () => taxonomy.subcategories.filter((subcategory) => subcategory.categoryId === categoryId),
    [taxonomy.subcategories, categoryId],
  );

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const selectedCategoryId = String(form.get("categoryId") ?? "");
    const subcategoryId = String(form.get("subcategoryId") ?? "");
    const brandId = String(form.get("brandId") ?? "");
    setSaving(true);
    try {
      await postJSON<{ product: DraftProduct }>("/seller/products", {
        name,
        slug: toProductSlug(name),
        description: String(form.get("description") ?? "").trim(),
        primaryImageUrl: String(form.get("image") ?? "").trim(),
        price: Number(form.get("price")),
        stock: Number(form.get("stock")),
        colors: String(form.get("colors") ?? "").split(",").map((color) => color.trim()).filter(Boolean),
        ...(selectedCategoryId ? { categoryId: selectedCategoryId } : {}),
        ...(subcategoryId ? { subcategoryId } : {}),
        ...(brandId ? { brandId } : {}),
      });
      event.currentTarget.reset();
      setCategoryId("");
      setSuccess("Product draft created.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to create product");
    } finally {
      setSaving(false);
    }
  };

  const taxonomyReady = taxonomyState === "ready";

  return <section className={`seller-create ${styles.surface} ${styles.productCreation}`} aria-labelledby="seller-add-product-form-heading">
    <div className={styles.productCreationHeader}>
      <div><p className="eyebrow">Seller catalog</p><h2 id="seller-add-product-form-heading">Create a product draft</h2><p className="seller-form-note">Use Admin-approved vocabulary to classify this seller-owned draft before it can be reviewed for publication.</p></div>
      <Link className={styles.secondaryAction} href="/seller/catalog">Back to catalog</Link>
    </div>
    <form onSubmit={submit} aria-busy={saving}>
      <fieldset disabled={saving || !taxonomyReady}>
        <fieldset className="seller-form-group">
          <legend>Product identity</legend>
          <div className="seller-form-grid">
            <label><span>Product name</span><input ref={inputRef} required name="name" minLength={2} maxLength={180} placeholder="Studio lamp" /></label>
            <label><span>Primary image URL or symbol</span><input required name="image" minLength={1} aria-describedby="product-image-help" placeholder="https://… or symbol" /></label>
            <p id="product-image-help" className="seller-form-group-help">Use an image URL or a single symbol used by your catalog.</p>
            <label className="wide"><span>Description</span><textarea required name="description" minLength={10} placeholder="What makes this product valuable?" /></label>
            <label className="wide"><span>Colors (comma-separated)</span><input required name="colors" aria-describedby="product-colors-help" placeholder="#f5f2e8, #242824" /></label>
            <p id="product-colors-help" className="seller-form-group-help">List colors separated by commas.</p>
          </div>
        </fieldset>
        <fieldset className="seller-form-group">
          <legend>Catalog classification</legend>
          <p className="seller-form-group-help">Only active, Admin-approved catalog vocabulary is available here. Sellers cannot create or edit canonical taxonomy.</p>
          <div className="seller-form-grid">
            <label><span>Category</span><select required name="categoryId" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">Select an approved category</option>{taxonomy.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label><span>Subcategory</span><select name="subcategoryId" disabled={!categoryId || saving || !taxonomyReady} aria-describedby="subcategory-help"><option value="">{!categoryId ? "Choose a category first" : subcategories.length ? "Select an approved subcategory" : "No approved subcategories"}</option>{subcategories.map((subcategory) => <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>)}</select></label>
            <p id="subcategory-help" className="seller-form-group-help">{!categoryId ? "Select a category before choosing a subcategory." : subcategories.length ? "Subcategories are limited to the selected category." : "This category has no approved subcategories."}</p>
            <label><span>Brand</span><select name="brandId"><option value="">No brand selected</option>{taxonomy.brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></label>
          </div>
        </fieldset>
        <fieldset className="seller-form-group">
          <legend>Price and inventory</legend>
          <div className="seller-form-grid">
            <label><span>Price</span><input required name="price" type="number" min="0.01" step="0.01" placeholder="89.00" /></label>
            <label><span>Stock on hand</span><input required name="stock" type="number" min="0" step="1" placeholder="12" /></label>
          </div>
        </fieldset>
      </fieldset>
      {taxonomyState === "loading" && <p className="seller-form-note" role="status" aria-live="polite">Loading approved taxonomy…</p>}
      {taxonomyState === "error" && <div className={styles.taxonomyRecovery} role="alert"><p>{taxonomyError || "Unable to load approved taxonomy."}</p><button type="button" onClick={loadTaxonomy}>Retry taxonomy</button></div>}
      {error && <p className="seller-error" role="alert">{error}</p>}
      {success && <p className="seller-profile-success" role="status">{success}</p>}
      <div className="seller-form-actions"><div><strong>Draft status</strong><p className="seller-form-note">New products are created as drafts and may require review before publication.</p></div><button className="primary-button" disabled={saving || !taxonomyReady}>{saving ? "Creating draft…" : "Create product draft"}</button></div>
    </form>
  </section>;
}
