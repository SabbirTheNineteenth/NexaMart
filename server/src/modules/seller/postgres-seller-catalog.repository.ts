import { and, asc, eq, exists, inArray } from "drizzle-orm";
import { db } from "../../db/client.js";
import { productGalleryImages, products, productVariants } from "../../db/schema/index.js";
import type { SellerCatalogRepository, SellerProductInput, SellerProductUpdateInput } from "./seller-catalog.repository.js";

class ContentRevisionNotFound extends Error {}

export class PostgresSellerCatalogRepository implements SellerCatalogRepository {
  constructor(private readonly database = db) {}

  async listProducts(sellerId: string) {
    return this.database.select({ id: products.id, sellerId: products.sellerId, name: products.name, brand: products.brand, stock: products.stock, isPublished: products.isPublished, moderationStatus: products.moderationStatus, moderationReason: products.moderationReason }).from(products).where(eq(products.sellerId, sellerId)).then((rows) => rows.map((row) => ({ id: row.id, sellerId: row.sellerId!, name: row.name, ...(row.brand ? { brand: row.brand } : {}), stock: row.stock, isPublished: row.isPublished, moderationStatus: row.moderationStatus, moderationReason: row.moderationReason })));
  }

  async listPublishedPrimaryImageReferences() {
    return this.database.select({ id: products.id, primaryImageUrl: products.primaryImageUrl }).from(products).where(eq(products.isPublished, true));
  }

  async ownedPrimaryImage(input: { sellerId: string; productId: string }) {
    const [product] = await this.database.select({ primaryImageUrl: products.primaryImageUrl }).from(products).where(and(eq(products.id, input.productId), eq(products.sellerId, input.sellerId))).limit(1);
    return product?.primaryImageUrl ?? null;
  }

  async updateStock(input: { sellerId: string; productId: string; stock: number }) { const updated = await this.database.update(products).set({ stock: input.stock, updatedAt: new Date() }).where(and(eq(products.id, input.productId), eq(products.sellerId, input.sellerId))).returning({ id: products.id }); return updated.length === 1; }
  async updateProduct(input: SellerProductUpdateInput) {
    const { sellerId, productId, price, ...editable } = input;
    const [product] = await this.database.update(products).set({ ...editable, ...(price === undefined ? {} : { price: price.toFixed(2) }), ...this.contentRevision() }).where(and(eq(products.id, productId), eq(products.sellerId, sellerId))).returning({ id: products.id, name: products.name, brand: products.brand, slug: products.slug, description: products.description, price: products.price, categoryId: products.categoryId, primaryImageUrl: products.primaryImageUrl, colors: products.colors });
    if (!product) return null;
    return { id: product.id, name: product.name, ...(product.brand ? { brand: product.brand } : {}), slug: product.slug, description: product.description, price: Number(product.price), categoryId: product.categoryId, primaryImageUrl: product.primaryImageUrl, colors: product.colors };
  }
  async archiveProduct(input: { sellerId: string; productId: string }) {
    const [product] = await this.database.update(products).set(this.contentRevision()).where(and(eq(products.id, input.productId), eq(products.sellerId, input.sellerId))).returning({ id: products.id });
    return Boolean(product);
  }
  async submitForReview(input: { sellerId: string; productId: string }) {
    const [product] = await this.database.update(products).set({ moderationStatus: "pending_review", moderationReason: null, isPublished: false, updatedAt: new Date() }).where(and(eq(products.id, input.productId), eq(products.sellerId, input.sellerId), inArray(products.moderationStatus, ["draft", "changes_requested"]))).returning({ id: products.id, isPublished: products.isPublished, moderationStatus: products.moderationStatus, moderationReason: products.moderationReason });
    if (product) return { kind: "submitted" as const, product: { id: product.id, isPublished: product.isPublished, moderationStatus: "pending_review" as const, moderationReason: null } };
    return await this.ownsProduct(input) ? { kind: "invalid_state" as const } : { kind: "not_found" as const };
  }
  async createProduct(input: SellerProductInput) { const [product] = await this.database.insert(products).values({ ...input, price: input.price.toFixed(2), colors: input.colors, isPublished: false }).returning(); return { id: product.id, ...input }; }
  private async ownsProduct(input: { sellerId: string; productId: string }) { const [product] = await this.database.select({ id: products.id }).from(products).where(and(eq(products.id, input.productId), eq(products.sellerId, input.sellerId))).limit(1); return Boolean(product); }
  private ownedProductQuery(input: { sellerId: string; productId: string }) { return this.database.select({ id: products.id }).from(products).where(and(eq(products.id, input.productId), eq(products.sellerId, input.sellerId))); }
  async createVariant(input: { sellerId: string; productId: string; sku: string; options: Record<string, string>; price: number; stock: number }) {
    return this.database.transaction(async (transaction) => {
        const [product] = await transaction.update(products).set(this.contentRevision()).where(and(eq(products.id, input.productId), eq(products.sellerId, input.sellerId))).returning({ id: products.id });
      if (!product) return null;
      const [variant] = await transaction.insert(productVariants).values({ productId: input.productId, sku: input.sku, options: input.options, price: input.price.toFixed(2), stock: input.stock }).returning();
      return { id: variant.id, sku: variant.sku, options: variant.options, price: variant.price, stock: variant.stock };
    });
  }
  async listVariants(input: { sellerId: string; productId: string }) { if (!await this.ownsProduct(input)) return null; return this.database.select({ id: productVariants.id, sku: productVariants.sku, options: productVariants.options, price: productVariants.price, stock: productVariants.stock }).from(productVariants).where(eq(productVariants.productId, input.productId)).orderBy(asc(productVariants.sku)); }
  async updateVariant(input: { sellerId: string; productId: string; variantId: string; sku?: string; options?: Record<string, string>; price?: number; stock?: number }) {
    const { sellerId, productId, variantId, price, ...editable } = input;
    if (input.sku === undefined && input.options === undefined && price === undefined) {
      const [variant] = await this.database.update(productVariants).set({ ...editable, updatedAt: new Date() }).where(and(eq(productVariants.id, variantId), eq(productVariants.productId, productId), exists(this.ownedProductQuery({ sellerId, productId })))).returning();
      if (!variant) return null;
      return { id: variant.id, sku: variant.sku, options: variant.options, price: variant.price, stock: variant.stock };
    }
    try {
      return await this.database.transaction(async (transaction) => {
        const [variant] = await transaction.update(productVariants).set({ ...editable, ...(price === undefined ? {} : { price: price.toFixed(2) }), updatedAt: new Date() }).where(and(eq(productVariants.id, variantId), eq(productVariants.productId, productId), exists(this.ownedProductQuery({ sellerId, productId })))).returning();
        if (!variant) throw new ContentRevisionNotFound();
        const [product] = await transaction.update(products).set(this.contentRevision()).where(and(eq(products.id, productId), eq(products.sellerId, sellerId))).returning({ id: products.id });
        if (!product) throw new ContentRevisionNotFound();
        return { id: variant.id, sku: variant.sku, options: variant.options, price: variant.price, stock: variant.stock };
      });
    } catch (error) {
      if (error instanceof ContentRevisionNotFound) return null;
      throw error;
    }
  }
  async deleteVariant(input: { sellerId: string; productId: string; variantId: string }) {
    try {
      return await this.database.transaction(async (transaction) => {
        const [deleted] = await transaction.delete(productVariants).where(and(eq(productVariants.id, input.variantId), eq(productVariants.productId, input.productId), exists(this.ownedProductQuery(input)))).returning({ id: productVariants.id });
        if (!deleted) throw new ContentRevisionNotFound();
        const [product] = await transaction.update(products).set(this.contentRevision()).where(and(eq(products.id, input.productId), eq(products.sellerId, input.sellerId))).returning({ id: products.id });
        if (!product) throw new ContentRevisionNotFound();
        return true;
      });
    } catch (error) {
      if (error instanceof ContentRevisionNotFound) return false;
      throw error;
    }
  }
  async createGalleryImage(input: { sellerId: string; productId: string; imageUrl: string; altText?: string; sortOrder: number }) {
    return this.database.transaction(async (transaction) => {
      const [product] = await transaction.update(products).set(this.contentRevision()).where(and(eq(products.id, input.productId), eq(products.sellerId, input.sellerId))).returning({ id: products.id });
      if (!product) return null;
      const [image] = await transaction.insert(productGalleryImages).values({ productId: input.productId, imageUrl: input.imageUrl, altText: input.altText, sortOrder: input.sortOrder }).returning();
      return { id: image.id, imageUrl: image.imageUrl, ...(image.altText ? { altText: image.altText } : {}), sortOrder: image.sortOrder };
    });
  }
  async listGalleryImages(input: { sellerId: string; productId: string }) { if (!await this.ownsProduct(input)) return null; const images = await this.database.select({ id: productGalleryImages.id, imageUrl: productGalleryImages.imageUrl, altText: productGalleryImages.altText, sortOrder: productGalleryImages.sortOrder }).from(productGalleryImages).where(eq(productGalleryImages.productId, input.productId)).orderBy(asc(productGalleryImages.sortOrder)); return images.map((image) => ({ id: image.id, imageUrl: image.imageUrl, ...(image.altText ? { altText: image.altText } : {}), sortOrder: image.sortOrder })); }
  async updateGalleryImage(input: { sellerId: string; productId: string; imageId: string; imageUrl?: string; altText?: string; sortOrder?: number }) {
    const { sellerId, productId, imageId, ...editable } = input;
    try {
      return await this.database.transaction(async (transaction) => {
        const [image] = await transaction.update(productGalleryImages).set(editable).where(and(eq(productGalleryImages.id, imageId), eq(productGalleryImages.productId, productId), exists(this.ownedProductQuery({ sellerId, productId })))).returning();
        if (!image) throw new ContentRevisionNotFound();
        const [product] = await transaction.update(products).set(this.contentRevision()).where(and(eq(products.id, productId), eq(products.sellerId, sellerId))).returning({ id: products.id });
        if (!product) throw new ContentRevisionNotFound();
        return { id: image.id, imageUrl: image.imageUrl, ...(image.altText ? { altText: image.altText } : {}), sortOrder: image.sortOrder };
      });
    } catch (error) {
      if (error instanceof ContentRevisionNotFound) return null;
      throw error;
    }
  }
  async deleteGalleryImage(input: { sellerId: string; productId: string; imageId: string }) {
    try {
      return await this.database.transaction(async (transaction) => {
        const [deleted] = await transaction.delete(productGalleryImages).where(and(eq(productGalleryImages.id, input.imageId), eq(productGalleryImages.productId, input.productId), exists(this.ownedProductQuery(input)))).returning({ id: productGalleryImages.id });
        if (!deleted) throw new ContentRevisionNotFound();
        const [product] = await transaction.update(products).set(this.contentRevision()).where(and(eq(products.id, input.productId), eq(products.sellerId, input.sellerId))).returning({ id: products.id });
        if (!product) throw new ContentRevisionNotFound();
        return true;
      });
    } catch (error) {
      if (error instanceof ContentRevisionNotFound) return false;
      throw error;
    }
  }
  private contentRevision() { return { isPublished: false, moderationStatus: "draft" as const, moderationReason: null, updatedAt: new Date() }; }
}
