import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { cartItems, products, productVariants, promotions, sellerProfiles } from "../../db/schema/index.js";
import { calculatePromotionPrice, selectActiveProductPromotion } from "../promotions/promotion-pricing.js";
import type { CartItemIdentity, CartRepository } from "./cart.repository.js";

export class PostgresCartRepository implements CartRepository {
  async availableStock(input: CartItemIdentity) {
    if (input.variantId) {
      const [variant] = await db.select({ stock: productVariants.stock }).from(productVariants)
        .innerJoin(products, eq(productVariants.productId, products.id))
        .innerJoin(sellerProfiles, and(eq(sellerProfiles.accountId, products.sellerId), eq(sellerProfiles.status, "active")))
        .where(and(eq(productVariants.id, input.variantId), eq(productVariants.productId, input.productId), eq(products.isPublished, true)));
      return variant?.stock ?? null;
    }
    const [product] = await db.select({ stock: products.stock }).from(products)
      .innerJoin(sellerProfiles, and(eq(sellerProfiles.accountId, products.sellerId), eq(sellerProfiles.status, "active")))
      .where(and(eq(products.id, input.productId), eq(products.isPublished, true)));
    return product?.stock ?? null;
  }

  async existingQuantity(input: { accountId: string } & CartItemIdentity) {
    const [item] = await db.select({ quantity: cartItems.quantity }).from(cartItems).where(and(
      eq(cartItems.accountId, input.accountId), eq(cartItems.productId, input.productId), input.variantId ? eq(cartItems.variantId, input.variantId) : isNull(cartItems.variantId),
    ));
    return item?.quantity ?? 0;
  }

  async listItems(accountId: string) {
    const items = await db.select({ accountId: cartItems.accountId, productId: cartItems.productId, variantId: cartItems.variantId, quantity: cartItems.quantity, name: products.name, price: sql<string>`coalesce(${productVariants.price}, ${products.price})`, image: products.primaryImageUrl, variantSku: productVariants.sku, variantOptions: productVariants.options })
      .from(cartItems).innerJoin(products, eq(cartItems.productId, products.id)).innerJoin(sellerProfiles, and(eq(sellerProfiles.accountId, products.sellerId), eq(sellerProfiles.status, "active"))).leftJoin(productVariants, eq(cartItems.variantId, productVariants.id))
      .where(and(eq(cartItems.accountId, accountId), eq(products.isPublished, true)));
    const activePromotions = await db.select({ id: promotions.id, productId: promotions.productId, name: promotions.name, scope: promotions.scope, discountPercent: promotions.discountPercent, startsAt: promotions.startsAt, endsAt: promotions.endsAt, createdAt: promotions.createdAt }).from(promotions).where(eq(promotions.scope, "product"));
    const now = new Date();
    return items.map((item) => {
      const promotion = selectActiveProductPromotion(activePromotions.filter((candidate) => candidate.productId === item.productId), now);
      const basePrice = Number(item.price);
      const effectivePrice = promotion ? calculatePromotionPrice(item.price, promotion.discountPercent).effectiveUnitPrice : basePrice;
      return { accountId: item.accountId, productId: item.productId, ...(item.variantId ? { variantId: item.variantId, variantSku: item.variantSku!, variantOptions: item.variantOptions! } : {}), quantity: item.quantity, name: item.name, price: effectivePrice, basePrice, effectivePrice, ...(promotion ? { promotion: { id: promotion.id, name: promotion.name, discountPercent: Number(promotion.discountPercent) } } : {}), image: item.image };
    });
  }

  async clear(accountId: string) { await db.delete(cartItems).where(eq(cartItems.accountId, accountId)); }

  async removeItem(input: { accountId: string } & CartItemIdentity) {
    await db.delete(cartItems).where(and(
      eq(cartItems.accountId, input.accountId),
      eq(cartItems.productId, input.productId),
      input.variantId ? eq(cartItems.variantId, input.variantId) : isNull(cartItems.variantId),
    ));
  }

  async setQuantity(input: { accountId: string; productId: string; variantId?: string; quantity: number }) {
    const where = and(eq(cartItems.accountId, input.accountId), eq(cartItems.productId, input.productId), input.variantId ? eq(cartItems.variantId, input.variantId) : isNull(cartItems.variantId));
    if (input.quantity === 0) { await db.delete(cartItems).where(where); return; }
    await db.insert(cartItems).values(input).onConflictDoUpdate({ target: [cartItems.accountId, cartItems.productId, cartItems.variantId], set: { quantity: input.quantity, updatedAt: new Date() } });
  }
}
