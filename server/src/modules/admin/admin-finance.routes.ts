import { Hono } from "hono";
import { z } from "zod";
import { createAuthGuard, getAuthenticatedAccount } from "../auth/auth.guard.js";
import type { PublicAccount } from "../auth/auth.types.js";

export type AdminFinanceOverview = {
  summary: {
    grossAmount: string;
    commissionAmount: string;
    netAmount: string;
    accruedNetAmount: string;
    eligibleNetAmount: string;
    paidNetAmount: string;
    pendingPayoutAmount: string;
  };
  commissions: Array<{
    id: string;
    sellerId: string;
    orderReference: string;
    orderItemId: string;
    grossAmount: string;
    ratePercent: string;
    commissionAmount: string;
    netAmount: string;
    status: "accrued" | "eligible" | "paid" | "void";
    createdAt: string;
  }>;
  payouts: Array<{
    id: string;
    sellerId: string;
    reference: string;
    amount: string;
    status: "pending" | "approved" | "paid" | "rejected";
    createdAt: string;
  }>;
};

type SessionResolver = { resolve(token: string): Promise<PublicAccount | null> };
const payoutIdSchema = z.string().uuid();
const reviewSchema = z.object({ decision: z.enum(["approve", "reject"]), expectedStatus: z.literal("pending") }).strict();
type AdminFinance = { overview(): Promise<AdminFinanceOverview>; reviewPayout(input: { payoutId: string; decision: "approve" | "reject"; expectedStatus: "pending"; adminId: string }): Promise<unknown> };

export const createAdminFinanceRoutes = ({ sessions, finance }: { sessions: SessionResolver; finance: AdminFinance }) => {
  const routes = new Hono();
  const guard = createAuthGuard(sessions);
  routes.use("*", guard.requireAccount, guard.requireRole("admin"));
  routes.get("/", async (c) => {
    try {
      return c.json(await finance.overview());
    } catch {
      return c.json({ error: "Unable to load admin finance overview" }, 500);
    }
  });
  routes.patch("/payouts/:payoutId/review", async (c) => {
    const payoutId = payoutIdSchema.safeParse(c.req.param("payoutId"));
    const parsed = reviewSchema.safeParse(await c.req.json().catch(() => null));
    if (!payoutId.success || !parsed.success) return c.json({ error: "Invalid payout review" }, 400);
    try { return c.json(await finance.reviewPayout({ payoutId: payoutId.data, ...parsed.data, adminId: getAuthenticatedAccount(c)!.id })); }
    catch (error) {
      if (error instanceof Error && (error.message === "Payout request not found" || error.message === "Payout review is no longer available")) return c.json({ error: error.message }, 409);
      return c.json({ error: "Unable to review payout request" }, 500);
    }
  });
  return routes;
};
