import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { products, sellerProfiles, wishlistItems } from "../../db/schema/index.js";
import type { WishlistRepository } from "./wishlist.repository.js";

export class PostgresWishlistRepository implements WishlistRepository {
  async isProductEligible(productId: string) {
    const [product] = await db.select({ id: products.id }).from(products)
      .innerJoin(sellerProfiles, and(eq(sellerProfiles.accountId, products.sellerId), eq(sellerProfiles.status, "active")))
      .where(and(eq(products.id, productId), eq(products.isPublished, true)));
    return product !== undefined;
  }

  async add(input: { accountId: string; productId: string }) {
    await db.insert(wishlistItems).values(input).onConflictDoNothing({ target: [wishlistItems.accountId, wishlistItems.productId] });
  }

  async remove(input: { accountId: string; productId: string }) {
    await db.delete(wishlistItems).where(and(eq(wishlistItems.accountId, input.accountId), eq(wishlistItems.productId, input.productId)));
  }

  async list(accountId: string) {
    return db.select({ id: products.id, name: products.name, price: products.price, image: products.primaryImageUrl })
      .from(wishlistItems)
      .innerJoin(products, and(eq(wishlistItems.productId, products.id), eq(products.isPublished, true)))
      .innerJoin(sellerProfiles, and(eq(sellerProfiles.accountId, products.sellerId), eq(sellerProfiles.status, "active")))
      .where(eq(wishlistItems.accountId, accountId))
      .orderBy(desc(wishlistItems.createdAt))
      .then((items) => items.map((item) => ({ ...item, price: Number(item.price) })));
  }
}
