import { and, eq, exists, isNull, or, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { accounts, brands, categories, products, sellerProfiles, subcategories } from "../../db/schema/index.js";
import type { TransactionalDatabase } from "../audit/audit.repository.js";
import type { AdminProduct } from "./admin.types.js";
import type { AdminProductRepository, PublicationResult } from "./admin-product.repository.js";

const revisionToken = sql<string>`to_char(${products.updatedAt}, 'YYYY-MM-DD"T"HH24:MI:SS.USOF')`;

export class PostgresAdminProductRepository implements AdminProductRepository {
  constructor(private readonly database: TransactionalDatabase = db) {}

  async withTransaction<T>(work: (repository: AdminProductRepository, database: import("../audit/audit.repository.js").AuditDatabase) => Promise<T>): Promise<T> {
    if (!this.database.transaction) throw new Error("Transaction support is required for audited mutations");
    return this.database.transaction(async (transaction) => work(new PostgresAdminProductRepository(transaction), transaction));
  }

  async setPublication(input: { productId: string; isPublished: boolean; expectedRevision: string }): Promise<PublicationResult> {
    const taxonomyEligibility = input.isPublished ? [
      exists(this.database.select({ id: categories.id }).from(categories).where(and(eq(categories.id, products.categoryId), eq(categories.isActive, true)))),
      or(isNull(products.subcategoryId), exists(this.database.select({ id: subcategories.id }).from(subcategories).where(and(eq(subcategories.id, products.subcategoryId), eq(subcategories.categoryId, products.categoryId), eq(subcategories.isActive, true))))),
      or(isNull(products.brandId), exists(this.database.select({ id: brands.id }).from(brands).where(and(eq(brands.id, products.brandId), eq(brands.isActive, true))))),
    ] : [];
    const [updated] = await this.database.update(products)
      .set({ isPublished: input.isPublished, updatedAt: new Date() })
      .where(and(eq(products.id, input.productId), eq(products.updatedAt, sql`${input.expectedRevision}::timestamptz`), ...taxonomyEligibility))
      .returning({
        id: products.id, slug: products.slug, name: products.name, brand: products.brand, primaryImageUrl: products.primaryImageUrl,
        price: products.price, stock: products.stock, isPublished: products.isPublished, moderationStatus: products.moderationStatus, moderationReason: products.moderationReason, moderationRevision: products.moderationRevision, createdAt: products.createdAt, updatedAt: products.updatedAt, expectedRevision: revisionToken,
      });
    if (!updated) {
      const [existing] = await this.database.select({ id: products.id, expectedRevision: revisionToken }).from(products).where(eq(products.id, input.productId));
      if (!existing) return { kind: "not_found" };
      if (existing.expectedRevision !== input.expectedRevision) return { kind: "stale" };
      return input.isPublished ? { kind: "ineligible" } : { kind: "stale" };
    }

    const [context] = await this.database.select({
      categoryId: categories.id, categoryName: categories.name, categorySlug: categories.slug,
      sellerId: accounts.id, sellerName: accounts.name, sellerStoreName: sellerProfiles.storeName, sellerStoreSlug: sellerProfiles.storeSlug, sellerStatus: sellerProfiles.status,
    }).from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(accounts, eq(products.sellerId, accounts.id))
      .leftJoin(sellerProfiles, eq(accounts.id, sellerProfiles.accountId))
      .where(eq(products.id, updated.id));

    return { kind: "updated", product: this.toAdminProduct({ ...updated, ...context }) };
  }

  async moderate(input: { productId: string; status: import("./admin-product.repository.js").ModerationStatus; reason?: string; expectedRevision: string; adminId: string }): Promise<import("./admin-product.repository.js").ModerationResult> {
    const [updated] = await this.database.update(products).set({ moderationStatus: input.status, moderationReason: input.reason ?? null, moderatedById: input.adminId, moderatedAt: new Date(), moderationRevision: sql`${products.moderationRevision} + 1`, isPublished: input.status === "approved", updatedAt: new Date() }).where(and(eq(products.id, input.productId), eq(products.updatedAt, sql`${input.expectedRevision}::timestamptz`))).returning({ id: products.id, slug: products.slug, name: products.name, brand: products.brand, primaryImageUrl: products.primaryImageUrl, price: products.price, stock: products.stock, isPublished: products.isPublished, moderationStatus: products.moderationStatus, moderationReason: products.moderationReason, moderationRevision: products.moderationRevision, createdAt: products.createdAt, updatedAt: products.updatedAt, expectedRevision: revisionToken });
    if (!updated) { const [existing] = await this.database.select({ id: products.id }).from(products).where(eq(products.id, input.productId)); return existing ? { kind: "stale" } : { kind: "not_found" }; }
    const [context] = await this.database.select({ categoryId: categories.id, categoryName: categories.name, categorySlug: categories.slug, sellerId: accounts.id, sellerName: accounts.name, sellerStoreName: sellerProfiles.storeName, sellerStoreSlug: sellerProfiles.storeSlug, sellerStatus: sellerProfiles.status }).from(products).leftJoin(categories, eq(products.categoryId, categories.id)).leftJoin(accounts, eq(products.sellerId, accounts.id)).leftJoin(sellerProfiles, eq(accounts.id, sellerProfiles.accountId)).where(eq(products.id, updated.id));
    return { kind: "updated", product: this.toAdminProduct({ ...updated, ...context }) };
  }

  private toAdminProduct(row: {
    id: string; slug: string; name: string; brand: string | null; primaryImageUrl: string; price: string; stock: number; isPublished: boolean; moderationStatus: "draft" | "pending_review" | "approved" | "rejected" | "changes_requested"; moderationReason: string | null; moderationRevision: number;
    createdAt: Date; updatedAt: Date; expectedRevision: string; categoryId?: string | null; categoryName?: string | null; categorySlug?: string | null;
    sellerId?: string | null; sellerName?: string | null; sellerStoreName?: string | null; sellerStoreSlug?: string | null; sellerStatus?: "pending" | "approved" | "rejected" | "suspended" | "active" | null;
  }): AdminProduct {
    return {
      id: row.id, slug: row.slug, name: row.name, ...(row.brand ? { brand: row.brand } : {}), primaryImageUrl: row.primaryImageUrl,
      price: Number(row.price), stock: row.stock, isPublished: row.isPublished, moderationStatus: row.moderationStatus, moderationReason: row.moderationReason, moderationRevision: row.moderationRevision, expectedRevision: row.expectedRevision,
      category: row.categoryId && row.categoryName && row.categorySlug ? { id: row.categoryId, name: row.categoryName, slug: row.categorySlug } : null,
      seller: row.sellerId && row.sellerName ? { id: row.sellerId, name: row.sellerName, ...(row.sellerStoreName ? { storeName: row.sellerStoreName } : {}), ...(row.sellerStoreSlug ? { storeSlug: row.sellerStoreSlug } : {}), ...(row.sellerStatus ? { status: row.sellerStatus } : {}) } : null,
      createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
    };
  }
}
