import { and, eq, gt } from "drizzle-orm";
import { db } from "../../db/client.js";
import { accounts, sessions } from "../../db/schema/index.js";
import type { SessionRepository } from "./services/session-service.js";

export class PostgresSessionRepository implements SessionRepository {
  async store(input: { accountId: string; tokenHash: string; expiresAt: Date }) {
    await db.insert(sessions).values(input);
  }

  async findAccountByTokenHash(tokenHash: string) {
    const [account] = await db.select({
      id: accounts.id,
      name: accounts.name,
      email: accounts.email,
      role: accounts.role,
      createdAt: accounts.createdAt,
    }).from(sessions).innerJoin(accounts, eq(sessions.accountId, accounts.id)).where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())));
    return account ? { ...account, createdAt: account.createdAt.toISOString() } : null;
  }

  async revokeByTokenHash(tokenHash: string) {
    await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
  }

  async revokeByAccountId(accountId: string) {
    await db.delete(sessions).where(eq(sessions.accountId, accountId));
  }
}
