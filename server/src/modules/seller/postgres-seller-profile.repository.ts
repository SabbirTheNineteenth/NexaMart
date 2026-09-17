import { eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { sellerProfiles } from "../../db/schema/index.js";
import type { SellerProfile, SellerProfileRepository } from "./seller-profile.repository.js";

const toSellerProfile = (row: typeof sellerProfiles.$inferSelect): SellerProfile => ({
  id: row.id,
  accountId: row.accountId,
  storeName: row.storeName,
  storeSlug: row.storeSlug,
  ...(row.description ? { description: row.description } : {}),
  status: row.status,
  createdAt: row.createdAt.toISOString(),
});

export class PostgresSellerProfileRepository implements SellerProfileRepository {
  async findByAccountId(accountId: string) {
    const [profile] = await db.select().from(sellerProfiles).where(eq(sellerProfiles.accountId, accountId));
    return profile ? toSellerProfile(profile) : null;
  }

  async findByStoreName(storeName: string) {
    const [profile] = await db.select().from(sellerProfiles).where(sql`lower(${sellerProfiles.storeName}) = lower(${storeName})`);
    return profile ? toSellerProfile(profile) : null;
  }

  async createApplication(input: { accountId: string; storeName: string; storeSlug: string; description?: string }) {
    const [profile] = await db.insert(sellerProfiles).values(input).returning();
    return toSellerProfile(profile);
  }

  async updateStoreProfile(input: { accountId: string; storeName?: string; description?: string }) {
    const [profile] = await db.update(sellerProfiles)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(sellerProfiles.accountId, input.accountId))
      .returning();
    return profile ? toSellerProfile(profile) : null;
  }
}
