"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { ApiError, getJSON, patchJSON, postJSON } from "@/lib/api";
import type { SellerGalleryImage, SellerProduct, SellerProductVariant } from "@/types/seller";

export function parseVariantOptions(input: string): Record<string, string> {
  return input.split(",").reduce<Record<string, string>>((options, entry) => {
    const [key, ...value] = entry.split(":");
    const name = key?.trim();
    const selectedValue = value.join(":").trim();
    if (name && selectedValue) options[name] = selectedValue;
    return options;
  }, {});
}

export function nextGalleryImageSortOrder(images: SellerGalleryImage[]) {
  return images.reduce((highestSortOrder, image) => Math.max(highestSortOrder, image.sortOrder), -1) + 1;
}

function variantOptionsInput(options: Record<string, string>) {
  return Object.entries(options).map(([name, value]) => `${name}: ${value}`).join(", ");
}

export function SellerProductAssets({ product }: { product: SellerProduct }) {
  const [variants, setVariants] = useState<SellerProductVariant[]>([]);
  const [images, setImages] = useState<SellerGalleryImage[]>([]);
  const [nextImageSortOrder, setNextImageSortOrder] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingVariant, setSavingVariant] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [savingVariantId, setSavingVariantId] = useState<string | null>(null);
  const [savingImageId, setSavingImageId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [variantSuccess, setVariantSuccess] = useState("");
  const [imageSuccess, setImageSuccess] = useState("");

  const loadAssets = async () => {
    if (loaded || loading) return;
    setLoading(true);
    setError("");
    try {
      const [variantResponse, imageResponse] = await Promise.all([
        getJSON<{ variants: SellerProductVariant[] }>(`/seller/products/${product.id}/variants`),
        getJSON<{ images: SellerGalleryImage[] }>(`/seller/products/${product.id}/gallery-images`),
      ]);
      setVariants(variantResponse.variants);
      setImages(imageResponse.images);
      setNextImageSortOrder(nextGalleryImageSortOrder(imageResponse.images));
      setLoaded(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load product assets");
    } finally {
      setLoading(false);
    }
  };

  const addVariant = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSavingVariant(true);
    setError("");
    setVariantSuccess("");
    try {
      const response = await postJSON<{ variant: SellerProductVariant }>(`/seller/products/${product.id}/variants`, {
        sku: String(form.get("sku") ?? "").trim(),
        options: parseVariantOptions(String(form.get("options") ?? "")),
        price: Number(form.get("price")),
        stock: Number(form.get("stock")),
      });
      setVariants((items) => [...items, response.variant]);
      event.currentTarget.reset();
      setVariantSuccess("Variant added.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to add variant");
    } finally {
      setSavingVariant(false);
    }
  };

  const saveVariant = async (event: FormEvent<HTMLFormElement>, variant: SellerProductVariant) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSavingVariantId(variant.id);
    setError("");
    try {
      const response = await patchJSON<{ variant: SellerProductVariant }>(`/seller/products/${product.id}/variants/${variant.id}`, {
        sku: String(form.get("sku") ?? "").trim(),
        options: parseVariantOptions(String(form.get("options") ?? "")),
        price: Number(form.get("price")),
        stock: Number(form.get("stock")),
      });
      setVariants((items) => items.map((item) => item.id === response.variant.id ? response.variant : item));
    } catch (reason) {
      setError(reason instanceof ApiError && reason.status === 409 ? "This SKU is already used by another variant." : reason instanceof Error ? reason.message : "Unable to save variant.");
    } finally {
      setSavingVariantId(null);
    }
  };

  const addImage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSavingImage(true);
    setError("");
    setImageSuccess("");
    try {
      const response = await postJSON<{ image: SellerGalleryImage }>(`/seller/products/${product.id}/gallery-images`, {
        imageUrl: String(form.get("imageUrl") ?? "").trim(),
        altText: String(form.get("altText") ?? "").trim() || undefined,
        sortOrder: Number(form.get("sortOrder")),
      });
      setImages((items) => [...items, response.image].sort((left, right) => left.sortOrder - right.sortOrder));
      event.currentTarget.reset();
      setImageSuccess("Gallery image added.");
      setNextImageSortOrder(nextGalleryImageSortOrder([...images, response.image]));
    } catch (reason) {
      setError(reason instanceof ApiError && reason.status === 409 ? "Choose a different gallery image position." : reason instanceof Error ? reason.message : "Unable to add gallery image");
    } finally {
      setSavingImage(false);
    }
  };

  const saveImage = async (event: FormEvent<HTMLFormElement>, image: SellerGalleryImage) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSavingImageId(image.id);
    setError("");
    try {
      const response = await patchJSON<{ image: SellerGalleryImage }>(`/seller/products/${product.id}/gallery-images/${image.id}`, {
        imageUrl: String(form.get("imageUrl") ?? "").trim(),
        altText: String(form.get("altText") ?? "").trim() || undefined,
        sortOrder: Number(form.get("sortOrder")),
      });
      setImages((items) => items.map((item) => item.id === response.image.id ? response.image : item).sort((left, right) => left.sortOrder - right.sortOrder));
    } catch (reason) {
      setError(reason instanceof ApiError && reason.status === 409 ? "Choose a different gallery image position." : reason instanceof Error ? reason.message : "Unable to save gallery image.");
    } finally {
      setSavingImageId(null);
    }
  };

  return <details className="seller-product-assets" onToggle={(event) => { if (event.currentTarget.open) void loadAssets(); }}>
    <summary>Manage variants and gallery</summary>
    <div className="seller-asset-panel" aria-label={`Variants for ${product.name}`}>
      <h3>SKU variants</h3>
      {loading ? <p className="seller-state">Loading product assets…</p> : variants.length ? <ul className="seller-asset-list">{variants.map((variant) => <li key={variant.id}>
        <strong>{variant.sku}</strong><span>{variantOptionsInput(variant.options) || "No options"}</span><span>{variant.price} · {variant.stock} in stock</span>
        <details className="seller-asset-edit"><summary>Edit {variant.sku}</summary><form className="seller-asset-form" aria-label={`Edit variant ${variant.sku}`} onSubmit={(event) => void saveVariant(event, variant)}>
          <label>SKU<input required name="sku" maxLength={120} defaultValue={variant.sku} disabled={savingVariantId === variant.id} /></label>
          <label>Options<input name="options" defaultValue={variantOptionsInput(variant.options)} disabled={savingVariantId === variant.id} /></label>
          <label>Price<input required name="price" type="number" min="0.01" step="0.01" defaultValue={variant.price} disabled={savingVariantId === variant.id} /></label>
          <label>Stock<input required name="stock" type="number" min="0" step="1" defaultValue={variant.stock} disabled={savingVariantId === variant.id} /></label>
          <button className="primary-button" disabled={savingVariantId === variant.id}>{savingVariantId === variant.id ? "Saving variant…" : "Save variant"}</button>
        </form></details>
      </li>)}</ul> : <p className="seller-state">No variants yet.</p>}
      <form className="seller-asset-form" onSubmit={addVariant}>
        <label>SKU<input required name="sku" maxLength={120} placeholder="LAMP-WHT" /></label>
        <label>Options <input name="options" placeholder="Color: White, Size: Large" /></label>
        <label>Price<input required name="price" type="number" min="0.01" step="0.01" /></label>
        <label>Stock<input required name="stock" type="number" min="0" step="1" /></label>
        {variantSuccess && <p className="seller-profile-success" role="status">{variantSuccess}</p>}
        <button className="primary-button" disabled={savingVariant}>{savingVariant ? "Adding variant…" : "Add variant"}</button>
      </form>
    </div>
    <div className="seller-asset-panel" aria-label={`Gallery images for ${product.name}`}>
      <h3>Gallery images</h3>
      {loading ? null : images.length ? <ul className="seller-asset-list">{images.map((image) => <li key={image.id}>
        <a href={image.imageUrl} target="_blank" rel="noreferrer">Image {image.sortOrder + 1}</a><span>{image.altText ?? "No alt text"}</span>
        <details className="seller-asset-edit"><summary>Edit image {image.sortOrder + 1}</summary><form className="seller-asset-form" aria-label={`Edit image ${image.sortOrder + 1}`} onSubmit={(event) => void saveImage(event, image)}>
          <label>Image URL<input required name="imageUrl" type="url" defaultValue={image.imageUrl} disabled={savingImageId === image.id} /></label>
          <label>Alt text<input name="altText" maxLength={240} defaultValue={image.altText ?? ""} disabled={savingImageId === image.id} /></label>
          <label>Position<input required name="sortOrder" type="number" min="0" step="1" defaultValue={image.sortOrder} disabled={savingImageId === image.id} /></label>
          <button className="primary-button" disabled={savingImageId === image.id}>{savingImageId === image.id ? "Saving image…" : "Save image"}</button>
        </form></details>
      </li>)}</ul> : <p className="seller-state">No gallery images yet.</p>}
      <form className="seller-asset-form" onSubmit={addImage}>
        <label>Image URL<input required name="imageUrl" type="url" placeholder="https://…" /></label>
        <label>Alt text <input name="altText" maxLength={240} placeholder="Side view of the lamp" /></label>
        <label>Position<input required name="sortOrder" type="number" min="0" step="1" value={nextImageSortOrder} onChange={(event) => setNextImageSortOrder(Number(event.target.value))} /></label>
        {imageSuccess && <p className="seller-profile-success" role="status">{imageSuccess}</p>}
        <button className="primary-button" disabled={savingImage}>{savingImage ? "Adding image…" : "Add image"}</button>
      </form>
    </div>
    {error && <p className="seller-error" role="alert">{error}</p>}
  </details>;
}
