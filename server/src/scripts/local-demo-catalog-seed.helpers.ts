import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { accounts, brands, categories, products, promotions, sellerProfiles, subcategories } from "../db/schema/index.js";
import type { LocalDemoCatalogSeedRepository } from "../db/seeds/runLocalDemoSeed.js";

const sellerEmail = "local-demo-catalog@nexamart.local";
const sellerStoreSlug = "local-demo-catalog";
const passwordHash = "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

export const localDemoCatalogSeedRepository: LocalDemoCatalogSeedRepository = {
  async upsertSeller() {
    const [account] = await db.insert(accounts).values({ name: "Local Demo Catalog", email: sellerEmail, passwordHash, role: "seller" }).onConflictDoUpdate({ target: accounts.email, set: { name: "Local Demo Catalog", role: "seller", updatedAt: new Date() } }).returning({ id: accounts.id });
    if (!account) throw new Error("Unable to prepare local demo seller.");
    await db.insert(sellerProfiles).values({ accountId: account.id, storeName: "Local Demo Catalog", storeSlug: sellerStoreSlug, description: "Development-only catalog for local UI demos.", status: "active" }).onConflictDoUpdate({ target: sellerProfiles.accountId, set: { storeName: "Local Demo Catalog", storeSlug: sellerStoreSlug, description: "Development-only catalog for local UI demos.", status: "active", updatedAt: new Date() } });
    return account.id;
  },
  async upsertCategories(values) {
    for (const value of values) await db.insert(categories).values({ ...value, isActive: true }).onConflictDoUpdate({ target: categories.slug, set: { name: value.name, isActive: true, updatedAt: new Date() } });
    const rows = await db.select({ id: categories.id, slug: categories.slug }).from(categories).where(inArray(categories.slug, values.map((value) => value.slug)));
    return new Map(rows.map((row) => [row.slug, row.id]));
  },
  async upsertSubcategories(values) {
    for (const value of values) {
      const [category] = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, value.categorySlug));
      if (!category) throw new Error("Unable to resolve local demo category.");
      await db.insert(subcategories).values({ categoryId: category.id, name: value.name, slug: value.slug, isActive: true }).onConflictDoUpdate({ target: [subcategories.categoryId, subcategories.slug], set: { name: value.name, isActive: true, updatedAt: new Date() } });
    }
    const rows = await db.select({ id: subcategories.id, slug: subcategories.slug, categorySlug: categories.slug }).from(subcategories).innerJoin(categories, eq(subcategories.categoryId, categories.id));
    const wanted = new Set(values.map((value) => `${value.categorySlug}/${value.slug}`));
    return new Map(rows.filter((row) => wanted.has(`${row.categorySlug}/${row.slug}`)).map((row) => [`${row.categorySlug}/${row.slug}`, row.id]));
  },
  async upsertBrands(values) {
    for (const value of values) await db.insert(brands).values({ ...value, isActive: true }).onConflictDoUpdate({ target: brands.slug, set: { name: value.name, isActive: true, updatedAt: new Date() } });
    const rows = await db.select({ id: brands.id, slug: brands.slug }).from(brands).where(inArray(brands.slug, values.map((value) => value.slug)));
    return new Map(rows.map((row) => [row.slug, row.id]));
  },
  async upsertProduct(value) {
    const [product] = await db.insert(products).values(value).onConflictDoUpdate({ target: products.slug, set: { sellerId: value.sellerId, categoryId: value.categoryId, subcategoryId: value.subcategoryId, brandId: value.brandId, brand: value.brand, name: value.name, description: value.description, primaryImageUrl: value.primaryImageUrl, price: value.price, originalPrice: value.originalPrice, stock: value.stock, rating: value.rating, reviewCount: value.reviewCount, colors: value.colors, isPublished: true, createdAt: value.createdAt, updatedAt: new Date() } }).returning({ id: products.id });
    if (!product) throw new Error("Unable to upsert local demo product.");
    return product.id;
  },
  async upsertPromotion(value) {
    const [existing] = await db.select({ id: promotions.id }).from(promotions).where(and(
      eq(promotions.sellerId, value.sellerId),
      eq(promotions.productId, value.productId),
      eq(promotions.scope, "product"),
      sql`${promotions.startsAt} < ${value.endsAt}`,
      sql`${promotions.endsAt} > ${value.startsAt}`,
    )).limit(1);
    const promotion = { sellerId: value.sellerId, productId: value.productId, name: value.name, scope: "product" as const, discountPercent: value.discountPercent, startsAt: value.startsAt, endsAt: value.endsAt };

    if (existing) {
      await db.update(promotions).set({ ...promotion, updatedAt: new Date() }).where(eq(promotions.id, existing.id));
      return;
    }

    await db.insert(promotions).values(promotion);
  },
};
