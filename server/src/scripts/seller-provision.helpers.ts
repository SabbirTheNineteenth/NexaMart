import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import type { db as database } from "../db/client.js";
import { accounts, sellerProfiles, sessions } from "../db/schema/index.js";

export type SellerProvisioningInput = {
  name: string;
  email: string;
  storeName: string;
  storeSlug: string;
  description: string;
  password: string;
};

export type SellerUpsertInput = {
  name: string;
  email: string;
  passwordHash: string;
  role: "seller";
  storeName: string;
  storeSlug: string;
  description?: string;
  status: "active";
};

export type SellerProvisioningRepository = {
  upsertSeller(input: SellerUpsertInput): Promise<{ id: string; created: boolean }>;
};

type SellerDatabase = typeof database;

export function normalizeSellerInput(input: Pick<SellerProvisioningInput, "name" | "email" | "storeName" | "storeSlug" | "description">) {
  const description = input.description.trim();
  return {
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    storeName: input.storeName.trim(),
    storeSlug: input.storeSlug.trim().toLowerCase(),
    ...(description ? { description } : {}),
  };
}

export function passwordWithinBcryptLimit(password: string) {
  return Buffer.byteLength(password, "utf8") <= 72;
}

export async function provisionSeller(input: SellerProvisioningInput, repository: SellerProvisioningRepository) {
  const normalized = normalizeSellerInput(input);
  const valid = normalized.name.length > 0 && normalized.name.length <= 120
    && normalized.email.length <= 320 && normalized.email.includes("@")
    && normalized.storeName.length >= 2 && normalized.storeName.length <= 120
    && normalized.storeSlug.length >= 2 && normalized.storeSlug.length <= 100
    && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized.storeSlug)
    && (normalized.description === undefined || normalized.description.length >= 10 && normalized.description.length <= 2_000)
    && input.password.length >= 8;
  if (!valid) throw new Error("Invalid seller details");
  if (!passwordWithinBcryptLimit(input.password)) throw new Error("Password exceeds bcrypt's 72-byte UTF-8 limit");
  return repository.upsertSeller({ ...normalized, passwordHash: await hash(input.password, 12), role: "seller", status: "active" });
}

export async function upsertSellerAndRevokeSessions(database: SellerDatabase, input: SellerUpsertInput) {
  return database.transaction(async (transaction) => {
    const existing = await transaction.query.accounts.findFirst({ where: eq(accounts.email, input.email) });
    let accountId: string;
    let created: boolean;
    if (existing) {
      const [updated] = await transaction.update(accounts)
        .set({ name: input.name, passwordHash: input.passwordHash, role: "seller", updatedAt: new Date() })
        .where(eq(accounts.id, existing.id))
        .returning({ id: accounts.id });
      await transaction.delete(sessions).where(eq(sessions.accountId, existing.id));
      accountId = updated.id;
      created = false;
    } else {
      const [account] = await transaction.insert(accounts).values({
        name: input.name,
        email: input.email,
        passwordHash: input.passwordHash,
        role: "seller",
      }).returning({ id: accounts.id });
      accountId = account.id;
      created = true;
    }
    await transaction.insert(sellerProfiles).values({
      accountId,
      storeName: input.storeName,
      storeSlug: input.storeSlug,
      ...(input.description ? { description: input.description } : {}),
      status: "active",
    }).onConflictDoUpdate({
      target: sellerProfiles.accountId,
      set: {
        storeName: input.storeName,
        storeSlug: input.storeSlug,
        description: input.description ?? null,
        status: "active",
        updatedAt: new Date(),
      },
    });
    return { id: accountId, created };
  });
}
