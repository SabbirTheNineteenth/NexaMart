import { DEMO_CATALOG_SEED_PLAN } from "./demo-catalog-plan.js";

export type LocalDemoSeedEnvironment = { DATABASE_URL?: string; NEXAMART_DEMO_SEED?: string };

const LOCAL_DATABASE_HOSTS = new Set(["localhost", "127.0.0.1"]);
const LOCAL_DEMO_SEED_CONFIRMATION = "local-confirmed";

function isLocalPostgresUrl(databaseUrl: string | undefined) {
  if (!databaseUrl) return false;

  try {
    const url = new URL(databaseUrl);
    return (url.protocol === "postgres:" || url.protocol === "postgresql:") && LOCAL_DATABASE_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

/**
 * Performs no database work. Call this before any local-only demo seed action.
 */
export function assertLocalDemoSeedGuard(environment: LocalDemoSeedEnvironment): void {
  if (environment.NEXAMART_DEMO_SEED !== LOCAL_DEMO_SEED_CONFIRMATION) {
    throw new Error("Refusing local demo seed: set NEXAMART_DEMO_SEED=local-confirmed.");
  }

  if (!isLocalPostgresUrl(environment.DATABASE_URL)) {
    throw new Error("Refusing local demo seed: database target must be a valid local PostgreSQL URL.");
  }
}

export type LocalDemoCatalogSeedEnvironment = LocalDemoSeedEnvironment & { NODE_ENV?: string };
type CanonicalRecord = { name: string; slug: string };
type CanonicalSubcategory = CanonicalRecord & { categorySlug: string };
type SeedProduct = {
  sellerId: string;
  categoryId: string;
  subcategoryId: string;
  brandId: string;
  brand: string;
  slug: string;
  name: string;
  description: string;
  primaryImageUrl: string;
  price: string;
  originalPrice: string | null;
  stock: number;
  rating: string;
  reviewCount: number;
  colors: string[];
  createdAt: Date;
  isPublished: true;
};
type SeedPromotion = { sellerId: string; productId: string; productSlug: string; name: string; discountPercent: string; startsAt: Date; endsAt: Date };

export type LocalDemoCatalogSeedRepository = {
  upsertSeller(): Promise<string>;
  upsertCategories(values: CanonicalRecord[]): Promise<Map<string, string>>;
  upsertSubcategories(values: CanonicalSubcategory[]): Promise<Map<string, string>>;
  upsertBrands(values: CanonicalRecord[]): Promise<Map<string, string>>;
  upsertProduct(value: SeedProduct): Promise<string>;
  upsertPromotion(value: SeedPromotion): Promise<void>;
};

/** Performs no database work. Call before loading a local seed repository. */
export function assertLocalDemoCatalogSeedExecutionGuard(environment: LocalDemoCatalogSeedEnvironment): void {
  assertLocalDemoSeedGuard(environment);
  if (environment.NODE_ENV === "production") throw new Error("Refusing local demo seed when NODE_ENV=production.");
}

const LOCAL_DEMO_PRODUCT_PREFIX = "local-demo-catalog";
const unique = <T>(values: T[], key: (value: T) => string) => [...new Map(values.map((value) => [key(value), value])).values()];
const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/**
 * Seeds only the development catalog. The caller must provide the repository so
 * guard behavior remains independently testable and free of database side effects.
 */
export async function runLocalDemoCatalogSeed(repository: LocalDemoCatalogSeedRepository, environment: LocalDemoCatalogSeedEnvironment) {
  assertLocalDemoCatalogSeedExecutionGuard(environment);

  const categories = unique(DEMO_CATALOG_SEED_PLAN.map(({ category }) => ({ name: category, slug: slugify(category) })), (value) => value.slug);
  const subcategories = unique(DEMO_CATALOG_SEED_PLAN.map(({ category, subcategory }) => ({ name: subcategory, slug: slugify(subcategory), categorySlug: slugify(category) })), (value) => `${value.categorySlug}/${value.slug}`);
  const brands = unique(DEMO_CATALOG_SEED_PLAN.map(({ brand }) => ({ name: brand, slug: slugify(brand) })), (value) => value.slug);

  const sellerId = await repository.upsertSeller();
  const categoryIds = await repository.upsertCategories(categories);
  const subcategoryIds = await repository.upsertSubcategories(subcategories);
  const brandIds = await repository.upsertBrands(brands);
  const productIds = new Map<string, string>();

  for (const [index, plan] of DEMO_CATALOG_SEED_PLAN.entries()) {
    const categorySlug = slugify(plan.category);
    const subcategorySlug = slugify(plan.subcategory);
    const brandSlug = slugify(plan.brand);
    const categoryId = categoryIds.get(categorySlug);
    const subcategoryId = subcategoryIds.get(`${categorySlug}/${subcategorySlug}`);
    const brandId = brandIds.get(brandSlug);
    if (!categoryId || !subcategoryId || !brandId) throw new Error("Refusing local demo seed: canonical taxonomy could not be resolved.");
    const slug = `${LOCAL_DEMO_PRODUCT_PREFIX}-${plan.id}`;
    const price = (29 + index * 3).toFixed(2);
    productIds.set(slug, await repository.upsertProduct({
      sellerId, categoryId, subcategoryId, brandId, brand: plan.brand, slug, name: plan.name,
      description: `${plan.name} is a local development catalog item from ${plan.brand}.`, primaryImageUrl: plan.imageUrl,
      price, originalPrice: null, stock: 20 + (index % 30), rating: "0", reviewCount: 0,
      colors: ["Demo"], createdAt: new Date(Date.UTC(2025, 0, 1 + index)), isPublished: true,
    }));
  }

  const promotionPlans = [2, 17, 34, 51, 68, 85, 102, 119].map((index) => DEMO_CATALOG_SEED_PLAN[index]!);
  for (const plan of promotionPlans) {
    const productSlug = `${LOCAL_DEMO_PRODUCT_PREFIX}-${plan.id}`;
    const productId = productIds.get(productSlug);
    if (!productId) throw new Error("Refusing local demo seed: promotion product could not be resolved.");
    await repository.upsertPromotion({ sellerId, productId, productSlug, name: "Local Demo Flash Sale", discountPercent: "15.00", startsAt: new Date("2025-01-01T00:00:00.000Z"), endsAt: new Date("2030-01-01T00:00:00.000Z") });
  }
  return { categoryCount: categories.length, subcategoryCount: subcategories.length, brandCount: brands.length, productCount: DEMO_CATALOG_SEED_PLAN.length, promotionCount: promotionPlans.length };
}
