import { Hono } from "hono";
import { createAuthGuard } from "../auth/auth.guard.js";
import type { PublicAccount } from "../auth/auth.types.js";
import type { AdminAnalyticsOverview } from "./admin-analytics.repository.js";

type SessionResolver = { resolve(token: string): Promise<PublicAccount | null> };
type AdminAnalytics = { overview(): Promise<AdminAnalyticsOverview> };

export const createAdminAnalyticsRoutes = ({ sessions, analytics }: { sessions: SessionResolver; analytics: AdminAnalytics }) => {
  const routes = new Hono();
  const guard = createAuthGuard(sessions);
  routes.use("*", guard.requireAccount, guard.requireRole("admin"));
  routes.get("/", async (c) => {
    try {
      return c.json({ analytics: await analytics.overview() });
    } catch {
      return c.json({ error: "Unable to load admin analytics" }, 500);
    }
  });
  return routes;
};
