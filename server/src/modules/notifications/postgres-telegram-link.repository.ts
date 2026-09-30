import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "../../db/client.js";
import { customerTelegramLinkChallenges, customerTelegramLinks, orders } from "../../db/schema/index.js";

const hashCode = (code: string) => createHash("sha256").update(code).digest("hex");

export class PostgresTelegramLinkRepository {
  constructor(private readonly database = db) {}

  async status(accountId: string): Promise<"linked" | "not_linked"> {
    const [link] = await this.database.select({ accountId: customerTelegramLinks.accountId }).from(customerTelegramLinks).where(eq(customerTelegramLinks.accountId, accountId)).limit(1);
    return link ? "linked" : "not_linked";
  }

  async request(accountId: string, botUsername: string) {
    if (!/^[A-Za-z][A-Za-z0-9_]{1,27}bot$/i.test(botUsername)) throw new Error("Invalid Telegram bot username");
    const code = randomBytes(32).toString("base64url");
    const codeHash = hashCode(code);
    const expiresAt = new Date(Date.now() + 10 * 60_000);
    await this.database.insert(customerTelegramLinkChallenges).values({ accountId, codeHash, expiresAt })
      .onConflictDoUpdate({ target: customerTelegramLinkChallenges.accountId, set: { codeHash, expiresAt } });
    return { url: `https://t.me/${botUsername}?start=${code}` };
  }

  async complete(input: { code: string; chatId: string; telegramUserId: string }): Promise<"linked" | "invalid" | "conflict"> {
    const codeHash = hashCode(input.code);
    try {
      return await this.database.transaction(async (tx) => {
        const [challenge] = await tx.delete(customerTelegramLinkChallenges)
          .where(and(eq(customerTelegramLinkChallenges.codeHash, codeHash), gt(customerTelegramLinkChallenges.expiresAt, new Date())))
          .returning({ accountId: customerTelegramLinkChallenges.accountId });
        if (!challenge) {
          const [prior] = await tx.select({ chatId: customerTelegramLinks.chatId }).from(customerTelegramLinks).where(eq(customerTelegramLinks.codeHash, codeHash)).limit(1);
          return prior?.chatId === input.chatId ? "linked" as const : "invalid" as const;
        }
        await tx.insert(customerTelegramLinks).values({ accountId: challenge.accountId, chatId: input.chatId, codeHash })
          .onConflictDoUpdate({ target: customerTelegramLinks.accountId, set: { chatId: input.chatId, codeHash } });
        return "linked" as const;
      });
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "23505") return "conflict";
      throw error;
    }
  }

  async recipient(orderId: string): Promise<{ linked: false } | { linked: true; chatId: string } | null> {
    const [order] = await this.database.select({ customerId: orders.customerId }).from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) return null;
    const [link] = await this.database.select({ chatId: customerTelegramLinks.chatId }).from(customerTelegramLinks).where(eq(customerTelegramLinks.accountId, order.customerId)).limit(1);
    return link ? { linked: true, chatId: link.chatId } : { linked: false };
  }
}
