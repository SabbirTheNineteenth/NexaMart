import { asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { accounts, categories, orderItems, orders, productGalleryImages, productVariants, products, sellerProfiles } from "../../db/schema/index.js";
import type { AdminAccount, AdminOrder, AdminProduct, AdminRepository } from "./admin.types.js";

export class PostgresAdminRepository implements AdminRepository {
  async listAccounts(limit: number): Promise<AdminAccount[]> {
    const rows = await db.select({
      id: accounts.id,
      name: accounts.name,
      email: accounts.email,
      role: accounts.role,
      createdAt: accounts.createdAt,
      sellerStoreName: sellerProfiles.storeName,
      sellerStatus: sellerProfiles.status,
    }).from(accounts)
      .leftJoin(sellerProfiles, eq(accounts.id, sellerProfiles.accountId))
      .orderBy(desc(accounts.createdAt)).limit(limit);
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      createdAt: row.createdAt.toISOString(),
      sellerProfile: row.sellerStoreName && row.sellerStatus ? { storeName: row.sellerStoreName, status: row.sellerStatus } : null,
    }));
  }

  async listProducts(): Promise<AdminProduct[]> {
    const rows = await db.select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      brand: products.brand,
      description: products.description,
      colors: products.colors,
      primaryImageUrl: products.primaryImageUrl,
      price: products.price,
      stock: products.stock,
      isPublished: products.isPublished,
      moderationStatus: products.moderationStatus,
      moderationReason: products.moderationReason,
      moderationRevision: products.moderationRevision,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
      expectedRevision: sql<string>`to_char(${products.updatedAt}, 'YYYY-MM-DD"T"HH24:MI:SS.USOF')`,
      categoryId: categories.id,
      categoryName: categories.name,
      categorySlug: categories.slug,
      sellerId: accounts.id,
      sellerName: accounts.name,
      sellerStoreName: sellerProfiles.storeName,
      sellerStoreSlug: sellerProfiles.storeSlug,
      sellerStatus: sellerProfiles.status,
    }).from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(accounts, eq(products.sellerId, accounts.id))
      .leftJoin(sellerProfiles, eq(accounts.id, sellerProfiles.accountId))
      .orderBy(desc(products.createdAt));

    return Promise.all(rows.map(async (row) => {
      const [galleryImages, variants] = await Promise.all([
        db.select({ imageUrl: productGalleryImages.imageUrl, altText: productGalleryImages.altText, sortOrder: productGalleryImages.sortOrder })
          .from(productGalleryImages).where(eq(productGalleryImages.productId, row.id)).orderBy(asc(productGalleryImages.sortOrder)),
        db.select({ sku: productVariants.sku, options: productVariants.options, price: productVariants.price, stock: productVariants.stock })
          .from(productVariants).where(eq(productVariants.productId, row.id)).orderBy(asc(productVariants.sku)),
      ]);
      return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        ...(row.brand ? { brand: row.brand } : {}),
        primaryImageUrl: row.primaryImageUrl,
        price: Number(row.price),
        stock: row.stock,
        isPublished: row.isPublished,
        moderationStatus: row.moderationStatus,
        moderationReason: row.moderationReason,
        moderationRevision: row.moderationRevision,
        description: row.description,
        colors: row.colors,
        galleryImages,
        variants: variants.map((variant) => ({ ...variant, price: Number(variant.price) })),
        category: row.categoryId && row.categoryName && row.categorySlug
          ? { id: row.categoryId, name: row.categoryName, slug: row.categorySlug }
          : null,
        seller: row.sellerId && row.sellerName
          ? {
              id: row.sellerId,
              name: row.sellerName,
              ...(row.sellerStoreName ? { storeName: row.sellerStoreName } : {}),
              ...(row.sellerStoreSlug ? { storeSlug: row.sellerStoreSlug } : {}),
              ...(row.sellerStatus ? { status: row.sellerStatus } : {}),
            }
          : null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        expectedRevision: row.expectedRevision,
      };
    }));
  }

  async listOrders(): Promise<AdminOrder[]> {
    const rows = await db.select({
      id: orders.id, reference: orders.reference, total: orders.total, status: orders.status, paymentStatus: orders.paymentStatus, createdAt: orders.createdAt,
      customerId: accounts.id, customerName: accounts.name, itemCount: sql<number>`count(${orderItems.id})`,
    }).from(orders)
      .innerJoin(accounts, eq(orders.customerId, accounts.id))
      .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
      .groupBy(orders.id, accounts.id)
      .orderBy(desc(orders.createdAt));
    return rows.map((row) => ({ id: row.id, reference: row.reference, customer: { id: row.customerId, name: row.customerName }, total: Number(row.total), status: row.status, paymentStatus: row.paymentStatus, itemCount: Number(row.itemCount), createdAt: row.createdAt.toISOString() }));
  }

  async search({ query, limit }: { query: string; limit: number }) {
    const pattern = `%${query}%`;
    const [sellers, matchedProducts, matchedOrders] = await Promise.all([
      db.select({ id: accounts.id, name: accounts.name, storeName: sellerProfiles.storeName, status: sellerProfiles.status })
        .from(sellerProfiles).innerJoin(accounts, eq(sellerProfiles.accountId, accounts.id))
        .where(or(ilike(accounts.name, pattern), ilike(sellerProfiles.storeName, pattern))).orderBy(desc(sellerProfiles.createdAt)).limit(limit),
      db.select({ id: products.id, name: products.name, slug: products.slug, isPublished: products.isPublished })
        .from(products).where(or(ilike(products.name, pattern), ilike(products.slug, pattern), ilike(products.brand, pattern))).orderBy(desc(products.createdAt)).limit(limit),
      db.select({ id: orders.id, reference: orders.reference, status: orders.status, customerName: accounts.name })
        .from(orders).innerJoin(accounts, eq(orders.customerId, accounts.id))
        .where(or(ilike(orders.reference, pattern), ilike(accounts.name, pattern))).orderBy(desc(orders.createdAt)).limit(limit),
    ]);
    return [
      ...sellers.map((seller) => ({ type: "seller" as const, ...seller })),
      ...matchedProducts.map((product) => ({ type: "product" as const, ...product })),
      ...matchedOrders.map((order) => ({ type: "order" as const, ...order })),
    ].slice(0, limit);
  }
}
