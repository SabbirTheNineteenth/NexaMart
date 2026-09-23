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

/**
 * Only Unsplash has a known stable source identifier in the public URL path. For
 * every other provider we retain the full normalized URL, including query values.
 */
export function productImageIdentity(image: string | undefined): string | undefined {
  const normalized = normalizedProductImageUrl(image);
  if (!normalized) return undefined;
  const url = new URL(normalized);
  if ((url.hostname === "images.unsplash.com" || url.hostname === "plus.unsplash.com") && /^\/(?:photo|premium_photo)-[^/]+$/.test(url.pathname)) return `unsplash:${url.pathname}`;
  return `url:${normalized}`;
}

type ProductImageLike = { id: string; image: string };

export function selectUniqueProductsByImage<T extends ProductImageLike>(products: readonly T[], maximum = Number.POSITIVE_INFINITY): T[] {
  const selected: T[] = [];
  const seen = new Set<string>();
  for (const product of products) {
    const identity = productImageIdentity(product.image);
    if (!identity || seen.has(identity)) continue;
    seen.add(identity);
    selected.push(product);
    if (selected.length === maximum) break;
  }
  return selected;
}

export function selectDepartmentProductsByImage<T extends ProductImageLike & { category: string }, D extends { name: string }>(departments: readonly D[], products: readonly T[], maximum = 8): Array<{ department: D; product?: T }> {
  const usedImages = new Set<string>();
  return departments.slice(0, maximum).map((department) => {
    const product = products.find((candidate) => {
      if (candidate.category !== department.name) return false;
      const identity = productImageIdentity(candidate.image);
      return Boolean(identity && !usedImages.has(identity));
    });
    const identity = product ? productImageIdentity(product.image) : undefined;
    if (identity) usedImages.add(identity);
    return { department, ...(product ? { product } : {}) };
  });
}

type GalleryImageLike = { imageUrl: string; altText?: string | null; sortOrder: number };

export function uniqueProductGalleryImages<T extends GalleryImageLike>(primaryImage: string | undefined, galleryImages: readonly T[], fallbackAltText: string): Array<GalleryImageLike> {
  const entries: GalleryImageLike[] = [{ imageUrl: primaryImage ?? "", altText: fallbackAltText, sortOrder: -1 }, ...galleryImages];
  const seen = new Set<string>();
  return entries.filter((image) => {
    const identity = productImageIdentity(image.imageUrl);
    if (!identity || seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

export function productImageSource(image: string | undefined, _productId: string): string | undefined {
  return imageSourceFor(image);
}
