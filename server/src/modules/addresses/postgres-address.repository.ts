import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { addresses } from "../../db/schema/index.js";
import type { AddressRepository, AddressInput, AddressUpdateInput } from "./address.repository.js";

const toAddress = (address: typeof addresses.$inferSelect) => ({ id: address.id, recipientName: address.recipientName, phone: address.phone, line1: address.line1, ...(address.line2 ? { line2: address.line2 } : {}), city: address.city, ...(address.region ? { region: address.region } : {}), ...(address.postalCode ? { postalCode: address.postalCode } : {}), country: address.country, isDefault: address.isDefault });

export class PostgresAddressRepository implements AddressRepository {
  constructor(private readonly database = db) {}

  async create(input: AddressInput & { accountId: string }) {
    return this.database.transaction(async (tx) => {
      const existing = await tx.select({ id: addresses.id }).from(addresses).where(eq(addresses.accountId, input.accountId)).limit(1);
      const isDefault = existing.length === 0;
      const [created] = await tx.insert(addresses).values({ ...input, isDefault }).returning();
      return toAddress(created);
    });
  }

  async list(accountId: string) {
    return (await this.database.select().from(addresses).where(eq(addresses.accountId, accountId)).orderBy(desc(addresses.isDefault), desc(addresses.createdAt))).map(toAddress);
  }

  async selectDefault(input: { accountId: string; addressId: string }) {
    return this.database.transaction(async (tx) => {
      const target = await tx.select({ id: addresses.id }).from(addresses).where(and(eq(addresses.id, input.addressId), eq(addresses.accountId, input.accountId))).limit(1);
      if (!target.length) return null;
      await tx.update(addresses).set({ isDefault: false, updatedAt: new Date() }).where(eq(addresses.accountId, input.accountId));
      const [updated] = await tx.update(addresses).set({ isDefault: true, updatedAt: new Date() }).where(and(eq(addresses.id, input.addressId), eq(addresses.accountId, input.accountId))).returning();
      return toAddress(updated);
    });
  }

  async update(input: AddressUpdateInput & { accountId: string; addressId: string }) {
    return this.database.transaction(async (tx) => {
      const target = await tx.select({ id: addresses.id }).from(addresses).where(and(eq(addresses.id, input.addressId), eq(addresses.accountId, input.accountId))).limit(1);
      if (!target.length) return null;
      const { accountId, addressId, ...changes } = input;
      const [updated] = await tx.update(addresses).set({ ...changes, updatedAt: new Date() }).where(and(eq(addresses.id, addressId), eq(addresses.accountId, accountId))).returning();
      return toAddress(updated);
    });
  }

  async remove(input: { accountId: string; addressId: string }) {
    await this.database.transaction(async (tx) => {
      const [deleted] = await tx.delete(addresses).where(and(eq(addresses.id, input.addressId), eq(addresses.accountId, input.accountId))).returning({ isDefault: addresses.isDefault });
      if (!deleted?.isDefault) return;
      const [replacement] = await tx.select({ id: addresses.id }).from(addresses).where(eq(addresses.accountId, input.accountId)).orderBy(desc(addresses.createdAt), desc(addresses.id)).limit(1);
      if (replacement) await tx.update(addresses).set({ isDefault: true, updatedAt: new Date() }).where(and(eq(addresses.id, replacement.id), eq(addresses.accountId, input.accountId)));
    });
  }
}
