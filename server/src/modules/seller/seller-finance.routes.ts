import { Hono } from "hono";
import { z } from "zod";
import { createAuthGuard, getAuthenticatedAccount } from "../auth/auth.guard.js";
import type { PublicAccount } from "../auth/auth.types.js";

type SessionResolver = { resolve(token: string): Promise<PublicAccount | null> };
const requestSchema = z.object({ amount: z.string().regex(/^\d+(?:\.\d{1,2})?$/).refine((amount) => Number(amount) > 0) }).strict();
type SellerFinance = { summary(sellerId: string): Promise<unknown>; requestPayout(input: { sellerId: string; amount: string }): Promise<unknown> };

export const createSellerFinanceRoutes = ({ sessions, finance }: { sessions: SessionResolver; finance: SellerFinance }) => {
  const routes = new Hono();
  const guard = createAuthGuard(sessions);
  routes.get("/", guard.requireAccount, guard.requireRole("seller"), async (c) => {
    try {
      return c.json(await finance.summary(getAuthenticatedAccount(c)!.id));
    } catch {
      return c.json({ error: "Unable to load seller finance summary" }, 500);
    }
  });
  routes.post("/payout-requests", guard.requireAccount, guard.requireRole("seller"), async (c) => {
    const parsed = requestSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "A positive payout request amount is required" }, 400);
    try { return c.json(await finance.requestPayout({ sellerId: getAuthenticatedAccount(c)!.id, amount: parsed.data.amount }), 201); }
    catch (error) { return error instanceof Error && error.message === "Requested amount exceeds currently payable amount" ? c.json({ error: error.message }, 409) : c.json({ error: "Unable to request payout review" }, 500); }
  });
  return routes;
};
