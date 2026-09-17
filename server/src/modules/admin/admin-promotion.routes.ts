import { Hono } from "hono";
import { createAuthGuard } from "../auth/auth.guard.js";
import type { PublicAccount } from "../auth/auth.types.js";

export type AdminPromotionOversight = {
  id: string;
  name: string;
  scope: "product" | "order";
  product: { id: string | null; name: string | null; imageUrl: string | null };
  seller: { id: string; name: string };
  discountPercent: number;
  startsAt: string;
  endsAt: string;
  createdAt: string;
};

type SessionResolver = { resolve(token: string): Promise<PublicAccount | null> };
type AdminPromotions = { list(): Promise<AdminPromotionOversight[]> };

export const createAdminPromotionRoutes = ({ sessions, promotions }: { sessions: SessionResolver; promotions: AdminPromotions }) => {
  const routes = new Hono();
  const guard = createAuthGuard(sessions);
  routes.use("*", guard.requireAccount, guard.requireRole("admin"));
  routes.get("/", async (c) => {
    try {
      return c.json({ promotions: await promotions.list() });
    } catch {
      return c.json({ error: "Unable to load admin promotions" }, 500);
    }
  });
  return routes;
};
