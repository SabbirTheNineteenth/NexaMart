import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db/client.js";
import { brands, categories, products, sellerProfiles } from "../db/schema/index.js";
import type { DemoSeedProduct, DemoSeedRepository } from "./demo-seed.helpers.js";

const createRepository = (database: typeof db): DemoSeedRepository => ({
  async findActiveSellersByStoreSlug(storeSlug) {
    return database.select({ accountId: sellerProfiles.accountId }).from(sellerProfiles)
      .where(and(eq(sellerProfiles.storeSlug, storeSlug), eq(sellerProfiles.status, "active")));
  },
  async findProductsBySlugs(slugs) {
    return database.select({ slug: products.slug, sellerId: products.sellerId }).from(products).where(inArray(products.slug, slugs));
  },
  async upsertCategories(catalogCategories) {
    for (const category of catalogCategories) {
      await database.insert(categories).values({ ...category, isActive: true }).onConflictDoUpdate({
        target: categories.slug,
        set: { name: category.name, isActive: true, updatedAt: new Date() },
      });
    }
    const rows = await database.select({ id: categories.id, slug: categories.slug }).from(categories)
      .where(inArray(categories.slug, catalogCategories.map((category) => category.slug)));
    return new Map(rows.map((category) => [category.slug, category.id]));
  },
  async upsertActiveBrands(catalogBrands) {
    for (const brand of catalogBrands) {
      await database.insert(brands).values({ ...brand, isActive: true }).onConflictDoUpdate({
        target: brands.slug,
        set: { name: brand.name, isActive: true, updatedAt: new Date() },
      });
    }
    const rows = await database.select({ id: brands.id, slug: brands.slug }).from(brands)
      .where(inArray(brands.slug, catalogBrands.map((brand) => brand.slug)));
    return new Map(rows.map((brand) => [brand.slug, brand.id]));
  },
  async upsertProduct(product: DemoSeedProduct) {
    const [persisted] = await database.insert(products).values(product).onConflictDoUpdate({
      target: products.slug,
      set: {
        brand: product.brand,
        brandId: product.brandId,
        categoryId: product.categoryId,
        colors: product.colors,
        description: product.description,
        isPublished: true,
        name: product.name,
        originalPrice: product.originalPrice,
        primaryImageUrl: product.primaryImageUrl,
        price: product.price,
        rating: product.rating,
        reviewCount: product.reviewCount,
        stock: product.stock,
        updatedAt: new Date(),
      },
      where: eq(products.sellerId, product.sellerId),
    }).returning({ id: products.id });
    if (!persisted) throw new Error(`Refusing demo seed: product slug "${product.slug}" belongs to another seller.`);
  },
});

export const demoSeedRepository = createRepository(db);
