import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "../../db/client.js";
import { accounts, sellerProfiles } from "../../db/schema/index.js";
import type { TransactionalDatabase } from "../audit/audit.repository.js";
import type { SellerProfile } from "../seller/seller-profile.repository.js";
import type { AdminSellerRepository } from "./admin-seller.repository.js";

const toSellerProfile = (row: typeof sellerProfiles.$inferSelect): SellerProfile => ({
  id: row.id,
  accountId: row.accountId,
  storeName: row.storeName,
  storeSlug: row.storeSlug,
  ...(row.description ? { description: row.description } : {}),
  status: row.status,
  createdAt: row.createdAt.toISOString(),
});

export class PostgresAdminSellerRepository implements AdminSellerRepository {
  constructor(private readonly database: TransactionalDatabase = db) {}

  async withTransaction<T>(work: (repository: AdminSellerRepository, database: import("../audit/audit.repository.js").AuditDatabase) => Promise<T>): Promise<T> {
    if (!this.database.transaction) throw new Error("Transaction support is required for audited mutations");
    return this.database.transaction(async (transaction) => work(new PostgresAdminSellerRepository(transaction), transaction));
  }

  async list() {
    const rows = await this.database.select().from(sellerProfiles).orderBy(asc(sellerProfiles.createdAt));
    return rows.map(toSellerProfile);
  }

  async transition(input: { sellerProfileId: string; expectedStatuses: SellerProfile["status"][]; nextStatus: "active" | "rejected" | "suspended"; sellerRole: "customer" | "seller" }) {
    const [profile] = await this.database.update(sellerProfiles)
      .set({ status: input.nextStatus, updatedAt: new Date() })
      .where(and(eq(sellerProfiles.id, input.sellerProfileId), inArray(sellerProfiles.status, input.expectedStatuses)))
      .returning();
    if (!profile) {
      const [existing] = await this.database.select({ id: sellerProfiles.id }).from(sellerProfiles).where(eq(sellerProfiles.id, input.sellerProfileId)).limit(1);
      return existing ? { kind: "invalid_state" as const } : { kind: "not_found" as const };
    }
    await this.database.update(accounts).set({ role: input.sellerRole, updatedAt: new Date() }).where(eq(accounts.id, profile.accountId));
    return { kind: "updated" as const, seller: toSellerProfile(profile) };
  }
}
