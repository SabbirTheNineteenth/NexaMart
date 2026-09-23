type ProductPresentationInput = {
  category: string;
  description?: string;
  colors?: string[];
  brand?: string;
};

export type ProductPresentation = {
  brand?: string;
  category: string;
  description?: string;
  specification?: string;
};

export function buildProductPresentation(product: ProductPresentationInput): ProductPresentation {
  const description = product.description?.trim() || undefined;
  const colors = product.colors?.map((color) => color.trim()).filter(Boolean) ?? [];

  return {
    brand: product.brand?.trim() || undefined,
    category: product.category,
    description,
    specification: colors.length ? colors.join(" + ") : undefined,
  };
}

export function imageSourceFor(image: string | undefined): string | undefined {
  const source = image?.trim();
  if (!source) return undefined;

  try {
    const url = new URL(source);
    return url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function normalizedProductImageUrl(image: string | undefined): string | undefined {
  const source = image?.trim();
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

type GalleryImageLike = { imageUrl: string; altText?: string | null; sortOrder: number };

export function uniqueProductGalleryImages<T extends GalleryImageLike>(primaryImage: string | undefined, galleryImages: readonly T[], fallbackAltText: string): Array<GalleryImageLike> {
  const entries: GalleryImageLike[] = [{ imageUrl: primaryImage ?? "", altText: fallbackAltText, sortOrder: -1 }, ...galleryImages];
  const seen = new Set<string>();
  return entries.filter((image) => {
    const normalized = normalizedProductImageUrl(image.imageUrl);
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

export function productImageSource(image: string | undefined, _productId: string): string | undefined {
  return imageSourceFor(image);
}
