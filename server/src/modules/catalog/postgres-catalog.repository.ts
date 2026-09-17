import { and, asc, desc, eq, exists, gt, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { brands, categories, productGalleryImages, products, productVariants, promotions, sellerProfiles, subcategories } from "../../db/schema/index.js";
import type { CatalogListFilters, CatalogRepository } from "./catalog.repository.js";
import { applyPublicPromotionPricing, toPublicProductDetail, type Product } from "./catalog.types.js";

const toProduct = (row: {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  category: string | null;
  price: string;
  originalPrice: string | null;
  rating: string;
  reviewCount: number;
  primaryImageUrl: string;
  description: string;
  colors: string[];
  stock: number;
  storeName: string;
  storeSlug: string;
}): Product => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  ...(row.brand ? { brand: row.brand } : {}),
  category: row.category ?? "Uncategorized",
  price: Number(row.price),
  ...(row.originalPrice ? { originalPrice: Number(row.originalPrice) } : {}),
  rating: Number(row.rating),
  reviews: row.reviewCount,
  image: row.primaryImageUrl,
  description: row.description,
  colors: row.colors,
  inStock: row.stock > 0,
  storeName: row.storeName,
  storeSlug: row.storeSlug,
});

export class PostgresCatalogRepository implements CatalogRepository {
  constructor(private readonly database: typeof db = db) {}

  private async publicProductPromotions(productIds: string[]) {
    if (productIds.length === 0) return [];
    return this.database.select({
      id: promotions.id,
      productId: promotions.productId,
      name: promotions.name,
      scope: promotions.scope,
      discountPercent: promotions.discountPercent,
      startsAt: promotions.startsAt,
      endsAt: promotions.endsAt,
      createdAt: promotions.createdAt,
    }).from(promotions)
      .innerJoin(products, and(eq(promotions.productId, products.id), eq(promotions.sellerId, products.sellerId)))
      .where(and(eq(promotions.scope, "product"), inArray(promotions.productId, productIds)));
  }

  async list(filters: CatalogListFilters) {
    const query = filters.query?.trim();
    const category = filters.category?.trim();
    const subcategory = filters.subcategory?.trim();
    const brand = filters.brand?.trim();
    const conditions = [eq(products.isPublished, true)];
    if (query) conditions.push(or(ilike(products.name, `%${query}%`), ilike(brands.name, `%${query}%`), ilike(categories.name, `%${query}%`))!);
    if (category) conditions.push(eq(categories.name, category));
    if (subcategory) conditions.push(eq(subcategories.slug, subcategory));
    if (brand) conditions.push(eq(brands.slug, brand));
    if (filters.deals === "active") conditions.push(exists(this.database.select({ id: promotions.id }).from(promotions).where(and(eq(promotions.productId, products.id), eq(promotions.sellerId, products.sellerId), eq(promotions.scope, "product"), lte(promotions.startsAt, sql`now()`), gt(promotions.endsAt, sql`now()`)))));
    const rows = await this.database.select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      brand: brands.name,
      category: categories.name,
      price: products.price,
      originalPrice: products.originalPrice,
      rating: products.rating,
      reviewCount: products.reviewCount,
      primaryImageUrl: products.primaryImageUrl,
      description: products.description,
      colors: products.colors,
      stock: products.stock,
      storeName: sellerProfiles.storeName,
      storeSlug: sellerProfiles.storeSlug,
    }).from(products).innerJoin(categories, and(eq(products.categoryId, categories.id), eq(categories.isActive, true))).leftJoin(subcategories, and(eq(products.subcategoryId, subcategories.id), eq(subcategories.isActive, true))).leftJoin(brands, and(eq(products.brandId, brands.id), eq(brands.isActive, true))).innerJoin(sellerProfiles, and(eq(sellerProfiles.accountId, products.sellerId), eq(sellerProfiles.status, "active"))).where(and(...conditions)).orderBy(...(filters.sort === "newest" ? [desc(products.createdAt), asc(products.id)] : [asc(products.name)]));
    const catalogProducts = rows.map(toProduct);
    const pricedProducts = applyPublicPromotionPricing(catalogProducts, await this.publicProductPromotions(catalogProducts.map((product) => product.id)), new Date());
    const categoryCounts = new Map<string, number>();
    for (const product of pricedProducts) categoryCounts.set(product.category, (categoryCounts.get(product.category) ?? 0) + 1);
    return { products: pricedProducts, categories: [...categoryCounts].map(([name, count]) => ({ name, count })) };
  }

  async bySlug(slug: string) {
    const [row] = await this.database.select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      brand: brands.name,
      category: categories.name,
      price: products.price,
      originalPrice: products.originalPrice,
      rating: products.rating,
      reviewCount: products.reviewCount,
      primaryImageUrl: products.primaryImageUrl,
      description: products.description,
      colors: products.colors,
      stock: products.stock,
      storeName: sellerProfiles.storeName,
      storeSlug: sellerProfiles.storeSlug,
    }).from(products).innerJoin(categories, and(eq(products.categoryId, categories.id), eq(categories.isActive, true))).leftJoin(brands, and(eq(products.brandId, brands.id), eq(brands.isActive, true))).innerJoin(sellerProfiles, and(eq(sellerProfiles.accountId, products.sellerId), eq(sellerProfiles.status, "active"))).where(and(eq(products.slug, slug), eq(products.isPublished, true)));
    if (!row) return null;

    const [galleryImages, variants, promotionRows] = await Promise.all([
      this.database.select({ imageUrl: productGalleryImages.imageUrl, altText: productGalleryImages.altText, sortOrder: productGalleryImages.sortOrder })
        .from(productGalleryImages).where(eq(productGalleryImages.productId, row.id)).orderBy(asc(productGalleryImages.sortOrder)),
      this.database.select({ id: productVariants.id, sku: productVariants.sku, options: productVariants.options, price: productVariants.price, stock: productVariants.stock })
        .from(productVariants).where(eq(productVariants.productId, row.id)).orderBy(asc(productVariants.sku)),
      this.publicProductPromotions([row.id]),
    ]);
    const [pricedProduct] = applyPublicPromotionPricing([toProduct(row)], promotionRows, new Date());
    return toPublicProductDetail({ ...pricedProduct!, galleryImages, variants });
  }

  async listStores() {
    const rows = await this.database.select({
      storeName: sellerProfiles.storeName,
      storeSlug: sellerProfiles.storeSlug,
      description: sellerProfiles.description,
      productCount: sql<number>`count(${products.id})::int`,
    }).from(sellerProfiles)
      .innerJoin(products, and(eq(products.sellerId, sellerProfiles.accountId), eq(products.isPublished, true)))
      .innerJoin(categories, and(eq(products.categoryId, categories.id), eq(categories.isActive, true)))
      .where(eq(sellerProfiles.status, "active"))
      .groupBy(sellerProfiles.storeName, sellerProfiles.storeSlug, sellerProfiles.description)
      .orderBy(asc(sql`lower(${sellerProfiles.storeName})`));
    return rows.map((row) => ({ storeName: row.storeName, storeSlug: row.storeSlug, ...(row.description ? { description: row.description } : {}), productCount: Number(row.productCount) }));
  }

  async storeBySlug(slug: string) {
    const rows = await this.database.select({
      storeName: sellerProfiles.storeName,
      storeSlug: sellerProfiles.storeSlug,
      description: sellerProfiles.description,
      productCount: sql<number>`count(${products.id}) over ()::int`,
      id: products.id,
      slug: products.slug,
      name: products.name,
      brand: brands.name,
      category: categories.name,
      price: products.price,
      originalPrice: products.originalPrice,
      rating: products.rating,
      reviewCount: products.reviewCount,
      primaryImageUrl: products.primaryImageUrl,
      productDescription: products.description,
      colors: products.colors,
      stock: products.stock,
    }).from(sellerProfiles)
      .innerJoin(products, and(eq(products.sellerId, sellerProfiles.accountId), eq(products.isPublished, true)))
      .innerJoin(categories, and(eq(products.categoryId, categories.id), eq(categories.isActive, true)))
      .leftJoin(brands, and(eq(products.brandId, brands.id), eq(brands.isActive, true)))
      .where(and(eq(sellerProfiles.storeSlug, slug), eq(sellerProfiles.status, "active")))
      .orderBy(asc(products.name));
    const [first] = rows;
    if (!first) return null;
    const productsForStore = rows.map((row) => toProduct({ ...row, description: row.productDescription }));
    const pricedProducts = applyPublicPromotionPricing(productsForStore, await this.publicProductPromotions(productsForStore.map((product) => product.id)), new Date());
    return {
      store: { storeName: first.storeName, storeSlug: first.storeSlug, ...(first.description ? { description: first.description } : {}), productCount: Number(first.productCount) },
      products: pricedProducts,
    };
  }
}
