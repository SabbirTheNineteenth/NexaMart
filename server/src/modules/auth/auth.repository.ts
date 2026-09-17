import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { accounts } from "../../db/schema/index.js";
import type { Account, Role } from "./auth.types.js";

export type CreateAccountInput = { name: string; email: string; role: Role; passwordHash: string };
export type AuthRepository = { findByEmail(email: string): Promise<Account | undefined>; create(input: CreateAccountInput): Promise<Account> };

const toAccount = (row: typeof accounts.$inferSelect): Account => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
  passwordHash: row.passwordHash,
  createdAt: row.createdAt.toISOString(),
});

export class PostgresAuthRepository implements AuthRepository {
  async findByEmail(email: string) {
    const row = await db.query.accounts.findFirst({ where: eq(accounts.email, email) });
    return row ? toAccount(row) : undefined;
  }

  async create(input: CreateAccountInput) {
    const [row] = await db.insert(accounts).values(input).returning();
    return toAccount(row);
  }
}
