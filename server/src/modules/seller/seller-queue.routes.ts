import { Hono } from "hono";
import { createAuthGuard, getAuthenticatedAccount } from "../auth/auth.guard.js";
import type { PublicAccount } from "../auth/auth.types.js";
import type { SellerQueueOverview } from "./seller-queue.types.js";

type SessionResolver = { resolve(token: string): Promise<PublicAccount | null> };
type SellerQueue = { overview(sellerId: string): Promise<SellerQueueOverview> };

export const createSellerQueueRoutes = ({ sessions, queue }: { sessions: SessionResolver; queue: SellerQueue }) => {
  const routes = new Hono();
  const guard = createAuthGuard(sessions);
  routes.get("/queue", guard.requireAccount, guard.requireRole("seller"), async (c) => {
    try {
      return c.json({ queue: await queue.overview(getAuthenticatedAccount(c)!.id) });
    } catch {
      return c.json({ error: "Unable to load seller queue" }, 500);
    }
  });
  return routes;
};
