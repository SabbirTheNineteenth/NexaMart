export type GalleryImageReference = { id: string; imageUrl: string };
export type ProductImageReference = { id: string; primaryImageUrl: string };

export function normalizeProductImageUrl(value: string | undefined): string | undefined {
  const source = value?.trim();
  if (!source) return undefined;
  try {
    const url = new URL(source);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase();
    url.hash = "";
    return url.href;
  } catch {
    return undefined;
  }
}

/**
 * Preserve arbitrary image URLs exactly after safe URL normalization. Unsplash serves
 * transformations from one source path, so its stable `/photo-…` path is the only
 * provider-specific identity we collapse across query-string variants.
 */
export function productImageIdentity(value: string | undefined): string | undefined {
  const normalized = normalizeProductImageUrl(value);
  if (!normalized) return undefined;
  const url = new URL(normalized);
  if ((url.hostname === "images.unsplash.com" || url.hostname === "plus.unsplash.com") && /^\/(?:photo|premium_photo)-[^/]+$/.test(url.pathname)) return `unsplash:${url.pathname}`;
  return `url:${normalized}`;
}

export function isDuplicateGalleryImage(images: readonly GalleryImageReference[], imageUrl: string, excludedImageId?: string): boolean {
  const candidate = productImageIdentity(imageUrl);
  if (!candidate) return false;
  return images.some((image) => image.id !== excludedImageId && productImageIdentity(image.imageUrl) === candidate);
}

export function isDuplicatePrimaryProductImage(products: readonly ProductImageReference[], imageUrl: string, excludedProductId?: string): boolean {
  const candidate = productImageIdentity(imageUrl);
  if (!candidate) return false;
  return products.some((product) => product.id !== excludedProductId && productImageIdentity(product.primaryImageUrl) === candidate);
}
