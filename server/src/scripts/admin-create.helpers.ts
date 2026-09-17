import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import type { db as database } from "../db/client.js";
import { accounts, sessions } from "../db/schema/index.js";

export type AdminProvisioningInput = { name: string; email: string; password: string };
export type AdminUpsertInput = { name: string; email: string; passwordHash: string; role: "admin" };
export type AdminProvisioningRepository = { upsertAdmin(input: AdminUpsertInput): Promise<{ id: string; created: boolean }> };

type AdminDatabase = typeof database;

export function normalizeAdminInput(input: Pick<AdminProvisioningInput, "name" | "email">) {
  return { name: input.name.trim(), email: input.email.trim().toLowerCase() };
}

export function passwordWithinBcryptLimit(password: string) {
  return Buffer.byteLength(password, "utf8") <= 72;
}

export async function provisionAdmin(input: AdminProvisioningInput, repository: AdminProvisioningRepository) {
  const normalized = normalizeAdminInput(input);
  if (!normalized.name || !normalized.email.includes("@") || input.password.length < 8) throw new Error("Invalid admin details");
  if (!passwordWithinBcryptLimit(input.password)) throw new Error("Password exceeds bcrypt's 72-byte UTF-8 limit");
  return repository.upsertAdmin({ ...normalized, passwordHash: await hash(input.password, 12), role: "admin" });
}

export async function upsertAdminAndRevokeSessions(database: AdminDatabase, input: AdminUpsertInput) {
  return database.transaction(async (transaction) => {
    const existing = await transaction.query.accounts.findFirst({ where: eq(accounts.email, input.email) });
    if (existing) {
      const [updated] = await transaction.update(accounts).set({ name: input.name, passwordHash: input.passwordHash, role: "admin", updatedAt: new Date() }).where(eq(accounts.id, existing.id)).returning({ id: accounts.id });
      await transaction.delete(sessions).where(eq(sessions.accountId, existing.id));
      return { id: updated.id, created: false };
    }
    const [created] = await transaction.insert(accounts).values(input).returning({ id: accounts.id });
    return { id: created.id, created: true };
  });
}
