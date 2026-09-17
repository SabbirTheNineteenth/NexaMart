import type { Product } from "@/types/catalog";

export type RecentlyViewedProduct = Pick<Product, "id" | "slug" | "name" | "image" | "price" | "effectivePrice">;

export const recentlyViewedStorageKey = "nexamart.recently-viewed";

export function addRecentlyViewedProduct(items: RecentlyViewedProduct[], product: RecentlyViewedProduct, limit = 8): RecentlyViewedProduct[] {
  return [product, ...items.filter((item) => item.id !== product.id)].slice(0, limit);
}

export function removeRecentlyViewedProduct(items: RecentlyViewedProduct[], productId: string): RecentlyViewedProduct[] {
  return items.filter((item) => item.id !== productId);
}

export function readRecentlyViewedProducts(storage: Pick<Storage, "getItem"> = window.localStorage): RecentlyViewedProduct[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(recentlyViewedStorageKey) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is RecentlyViewedProduct => Boolean(item) && typeof item === "object" && typeof item.id === "string" && typeof item.slug === "string" && typeof item.name === "string" && typeof item.image === "string" && typeof item.price === "number") : [];
  } catch { return []; }
}

export function writeRecentlyViewedProducts(items: RecentlyViewedProduct[], storage: Pick<Storage, "setItem"> = window.localStorage): void {
  try { storage.setItem(recentlyViewedStorageKey, JSON.stringify(items)); } catch { /* Browser storage can be unavailable. */ }
}

export function recordRecentlyViewedProduct(product: RecentlyViewedProduct): void {
  if (typeof window === "undefined") return;
  writeRecentlyViewedProducts(addRecentlyViewedProduct(readRecentlyViewedProducts(), product));
}
