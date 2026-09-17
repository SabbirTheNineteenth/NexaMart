import type { DemoCatalogProduct } from "./demo-catalog.js";

export type DemoSeedEnvironment = {
  ALLOW_DEMO_SEED?: string;
  DEMO_SELLER_STORE_SLUG?: string;
  NODE_ENV?: string;
};
type CanonicalTaxonomy = { name: string; slug: string };
type TargetSeller = { accountId: string };
type ExistingProduct = { slug: string; sellerId: string | null };

export type DemoSeedProduct = Omit<DemoCatalogProduct, "brand" | "category"> & {
  sellerId: string;
  categoryId: string;
  brandId: string;
  brand: string;
  isPublished: true;
};

export type DemoSeedRepository = {
  findActiveSellersByStoreSlug(storeSlug: string): Promise<TargetSeller[]>;
  findProductsBySlugs(slugs: string[]): Promise<ExistingProduct[]>;
  upsertCategories(categories: CanonicalTaxonomy[]): Promise<Map<string, string>>;
  upsertActiveBrands(brands: CanonicalTaxonomy[]): Promise<Map<string, string>>;
  upsertProduct(product: DemoSeedProduct): Promise<void>;
};

export function validateDemoSeedEnvironment(environment: DemoSeedEnvironment) {
  if (environment.ALLOW_DEMO_SEED !== "true") throw new Error("Refusing demo seed: set ALLOW_DEMO_SEED=true to acknowledge this write.");
  if (environment.NODE_ENV === "production") throw new Error("Refusing demo seed when NODE_ENV=production.");
  const storeSlug = environment.DEMO_SELLER_STORE_SLUG?.trim();
  if (!storeSlug) throw new Error("Refusing demo seed: set DEMO_SELLER_STORE_SLUG to an existing active seller store slug.");
  return storeSlug;
}

const uniqueBySlug = (values: CanonicalTaxonomy[]) => [...new Map(values.map((value) => [value.slug, value])).values()];
const brandSlug = (brand: string) => brand.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function seedDemoCatalog(repository: DemoSeedRepository, storeSlug: string, catalog: DemoCatalogProduct[]) {
  const sellers = await repository.findActiveSellersByStoreSlug(storeSlug);
  if (sellers.length !== 1) throw new Error(`Refusing demo seed: expected exactly one active seller with store slug "${storeSlug}", found ${sellers.length}.`);
  const sellerId = sellers[0].accountId;
  const sellerProducts = catalog.map((product) => ({ ...product, slug: `${storeSlug}-${product.slug}` }));
  const existingProducts = await repository.findProductsBySlugs(sellerProducts.map((product) => product.slug));
  const foreignProduct = existingProducts.find((product) => product.sellerId !== sellerId);
  if (foreignProduct) throw new Error(`Refusing demo seed: product slug "${foreignProduct.slug}" belongs to another seller.`);

  const categories = uniqueBySlug(catalog.map((product) => product.category));
  const brands = uniqueBySlug(catalog.map((product) => ({ name: product.brand, slug: brandSlug(product.brand) })));
  const categoryIds = await repository.upsertCategories(categories);
  const brandIds = await repository.upsertActiveBrands(brands);

  for (const product of sellerProducts) {
    const categoryId = categoryIds.get(product.category.slug);
    const brandId = brandIds.get(brandSlug(product.brand));
    if (!categoryId || !brandId) throw new Error(`Refusing demo seed: canonical taxonomy could not be resolved for "${product.slug}".`);
    await repository.upsertProduct({ ...product, sellerId, categoryId, brandId, isPublished: true });
  }
  return { sellerId, categoryCount: categories.length, productCount: catalog.length };
}
