import { createHash, randomBytes } from "node:crypto";
import type { PublicAccount } from "../auth.types.js";

export type SessionRepository = {
  store(input: { accountId: string; tokenHash: string; expiresAt: Date }): Promise<void>;
  findAccountByTokenHash(tokenHash: string): Promise<PublicAccount | null>;
  revokeByTokenHash(tokenHash: string): Promise<void>;
  revokeByAccountId(accountId: string): Promise<void>;
};

const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

export class SessionService {
  constructor(private readonly repository: SessionRepository, private readonly now = () => new Date()) {}

  async create(accountId: string) {
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(this.now().getTime() + 7 * 24 * 60 * 60 * 1000);
    await this.repository.store({ accountId, tokenHash: tokenHash(token), expiresAt });
    return { token, expiresAt };
  }

  async resolve(token: string): Promise<PublicAccount | null> {
    return this.repository.findAccountByTokenHash(tokenHash(token));
  }

  async revoke(token: string): Promise<void> {
    await this.repository.revokeByTokenHash(tokenHash(token));
  }

  async revokeAccount(accountId: string): Promise<void> {
    await this.repository.revokeByAccountId(accountId);
  }
}
