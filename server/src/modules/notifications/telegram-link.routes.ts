import { timingSafeEqual } from "node:crypto";
import { Hono } from "hono";
import { z } from "zod";
import { createAuthGuard, getAuthenticatedAccount } from "../auth/auth.guard.js";
import type { PublicAccount } from "../auth/auth.types.js";

type SessionResolver = { resolve(token: string): Promise<PublicAccount | null> };
type Links = {
  status(accountId: string): Promise<"linked" | "not_linked">;
  request(accountId: string, botUsername: string): Promise<{ url: string }>;
  complete(input: { code: string; chatId: string; telegramUserId: string }): Promise<"linked" | "invalid" | "conflict">;
  recipient(orderId: string): Promise<{ linked: false } | { linked: true; chatId: string } | null>;
};
const uuid = z.string().uuid();
const code = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const chatId = z.string().regex(/^[1-9][0-9]{0,19}$/);
const completion = z.object({ code, chatId, telegramUserId: chatId, chatType: z.literal("private") }).strict();

function bearerMatches(value: string | undefined, expected: string): boolean {
  const actual = /^Bearer ([^\s]+)$/.exec(value ?? "")?.[1];
  return !!actual && actual.length === expected.length && timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

export function createTelegramRoutes(input: { sessions: SessionResolver; links: Links; botUsername?: string; serviceToken?: string }) {
  const routes = new Hono();
  const guard = createAuthGuard(input.sessions);
  const available = !!input.botUsername && !!input.serviceToken;
  routes.get("/link", guard.requireAccount, guard.requireRole("customer"), async (c) => {
    if (!available) return c.json({ status: "unavailable" });
    try { return c.json({ status: await input.links.status(getAuthenticatedAccount(c)!.id) }); }
    catch { return c.json({ error: "Unable to load Telegram link status" }, 500); }
  });
  routes.post("/link/request", guard.requireAccount, guard.requireRole("customer"), async (c) => {
    if (!available) return c.json({ error: "Telegram linking is unavailable" }, 503);
    try { return c.json(await input.links.request(getAuthenticatedAccount(c)!.id, input.botUsername!)); }
    catch { return c.json({ error: "Unable to create Telegram link" }, 500); }
  });
  routes.use("/local/*", async (c, next) => {
    if (!input.serviceToken || !bearerMatches(c.req.header("authorization"), input.serviceToken)) return c.json({ error: "Service authentication required" }, 401);
    await next();
  });
  routes.post("/local/link", async (c) => {
    const parsed = completion.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success || parsed.data.chatId !== parsed.data.telegramUserId) return c.json({ error: "Invalid private bot start" }, 400);
    try {
      const result = await input.links.complete(parsed.data);
      // An expired start code is a handled bot update. A 409 would make the
      // poller retry that same Telegram update forever and block later links.
      return c.json({ status: result });
    } catch { return c.json({ error: "Unable to link Telegram" }, 500); }
  });
  routes.get("/local/recipient/:orderId", async (c) => {
    const orderId = uuid.safeParse(c.req.param("orderId"));
    if (!orderId.success) return c.json({ error: "Invalid order" }, 400);
    try {
      const recipient = await input.links.recipient(orderId.data);
      return recipient ? c.json(recipient) : c.json({ error: "Order not found" }, 404);
    } catch { return c.json({ error: "Unable to resolve Telegram recipient" }, 500); }
  });
  return routes;
}
