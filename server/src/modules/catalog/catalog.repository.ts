import type { Category, Product, ProductDetail, PublicStore, PublicStoreDetail } from "./catalog.types.js";

export type CatalogListFilters = { query?: string; category?: string; subcategory?: string; brand?: string; sort?: "newest"; deals?: "active" };

export type CatalogRepository = {
  list(filters: CatalogListFilters): Promise<{ products: Product[]; categories: Category[] }>;
  bySlug(slug: string): Promise<ProductDetail | null>;
  listStores(): Promise<PublicStore[]>;
  storeBySlug(slug: string): Promise<PublicStoreDetail | null>;
};
