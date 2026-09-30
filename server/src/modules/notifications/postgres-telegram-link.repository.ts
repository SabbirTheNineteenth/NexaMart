import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "../../db/client.js";
import { customerTelegramContacts, customerTelegramLinkChallenges, customerTelegramLinks, orders } from "../../db/schema/index.js";

const hashCode = (code: string) => createHash("sha256").update(code).digest("hex");
const isUniqueViolation = (error: unknown): boolean => {
  let current = error;
  for (let depth = 0; depth < 3 && current && typeof current === "object"; depth++) {
    if ("code" in current && current.code === "23505") return true;
    current = "cause" in current ? current.cause : null;
  }
  return false;
};

export type TelegramLinkState = { status: "not_linked" | "link_pending" | "linked" | "error"; phone: string | null; reason?: "expired" | "chat_in_use" };

export function describeTelegramLinkState(linked: boolean, challenge: { expiresAt: Date; lastError: string | null } | null, phone: string | null, now = new Date()): TelegramLinkState {
  if (linked) return { status: "linked", phone };
  if (!challenge) return { status: "not_linked", phone };
  if (challenge.expiresAt <= now) return { status: "error", reason: "expired", phone };
  if (challenge.lastError === "chat_in_use") return { status: "error", reason: "chat_in_use", phone };
  return { status: "link_pending", phone };
}

export class PostgresTelegramLinkRepository {
  constructor(private readonly database = db) {}

  async status(accountId: string): Promise<TelegramLinkState> {
    const [link] = await this.database.select({ accountId: customerTelegramLinks.accountId }).from(customerTelegramLinks).where(eq(customerTelegramLinks.accountId, accountId)).limit(1);
    const [challenge] = await this.database.select({ expiresAt: customerTelegramLinkChallenges.expiresAt, lastError: customerTelegramLinkChallenges.lastError }).from(customerTelegramLinkChallenges).where(eq(customerTelegramLinkChallenges.accountId, accountId)).limit(1);
    const [contact] = await this.database.select({ phone: customerTelegramContacts.phone }).from(customerTelegramContacts).where(eq(customerTelegramContacts.accountId, accountId)).limit(1);
    return describeTelegramLinkState(!!link, challenge ?? null, contact?.phone ?? null);
  }

  async request(accountId: string, botUsername: string) {
    if (!/^[A-Za-z][A-Za-z0-9_]{1,27}bot$/i.test(botUsername)) throw new Error("Invalid Telegram bot username");
    const code = randomBytes(32).toString("base64url");
    const codeHash = hashCode(code);
    const expiresAt = new Date(Date.now() + 10 * 60_000);
    await this.database.transaction(async (tx) => {
      // Relinking immediately revokes the previous chat. Until the new /start
      // completes, status updates are skipped as unlinked.
      await tx.delete(customerTelegramLinks).where(eq(customerTelegramLinks.accountId, accountId));
      await tx.insert(customerTelegramLinkChallenges).values({ accountId, codeHash, expiresAt })
        .onConflictDoUpdate({ target: customerTelegramLinkChallenges.accountId, set: { codeHash, expiresAt, lastError: null } });
    });
    return { url: `https://t.me/${botUsername}?start=${code}` };
  }

  async complete(input: { code: string; chatId: string; telegramUserId: string }): Promise<"linked" | "invalid" | "conflict"> {
    const codeHash = hashCode(input.code);
    try {
      return await this.database.transaction(async (tx) => {
        const [challenge] = await tx.delete(customerTelegramLinkChallenges)
          .where(and(eq(customerTelegramLinkChallenges.codeHash, codeHash), gt(customerTelegramLinkChallenges.expiresAt, new Date())))
          .returning({ accountId: customerTelegramLinkChallenges.accountId });
        if (!challenge) return "invalid" as const;
        await tx.insert(customerTelegramLinks).values({ accountId: challenge.accountId, chatId: input.chatId, codeHash })
          .onConflictDoUpdate({ target: customerTelegramLinks.accountId, set: { chatId: input.chatId, codeHash } });
        return "linked" as const;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        await this.database.update(customerTelegramLinkChallenges).set({ lastError: "chat_in_use" }).where(eq(customerTelegramLinkChallenges.codeHash, codeHash));
        return "conflict";
      }
      throw error;
    }
  }

  async unlink(accountId: string): Promise<void> {
    await this.database.transaction(async (tx) => {
      await tx.delete(customerTelegramLinkChallenges).where(eq(customerTelegramLinkChallenges.accountId, accountId));
      await tx.delete(customerTelegramLinks).where(eq(customerTelegramLinks.accountId, accountId));
    });
  }

  async saveContact(accountId: string, phone: string): Promise<string> {
    await this.database.insert(customerTelegramContacts).values({ accountId, phone })
      .onConflictDoUpdate({ target: customerTelegramContacts.accountId, set: { phone, updatedAt: new Date() } });
    return phone;
  }

  async removeContact(accountId: string): Promise<void> {
    await this.database.delete(customerTelegramContacts).where(eq(customerTelegramContacts.accountId, accountId));
  }

  async recipient(orderId: string): Promise<{ linked: false } | { linked: true; chatId: string } | null> {
    const [order] = await this.database.select({ customerId: orders.customerId }).from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) return null;
    const [link] = await this.database.select({ chatId: customerTelegramLinks.chatId }).from(customerTelegramLinks).where(eq(customerTelegramLinks.accountId, order.customerId)).limit(1);
    return link ? { linked: true, chatId: link.chatId } : { linked: false };
  }
}
