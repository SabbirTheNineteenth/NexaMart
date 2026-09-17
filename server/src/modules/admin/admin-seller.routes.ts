import { Hono } from "hono";
import { z } from "zod";
import { createAuthGuard, getAuthenticatedAccount } from "../auth/auth.guard.js";
import type { PublicAccount } from "../auth/auth.types.js";
import type { SellerProfile } from "../seller/seller-profile.repository.js";

const transitionSchema = z.object({ action: z.enum(["approve", "reject", "suspend", "activate"]) });
const sellerProfileIdSchema = z.string().uuid();
type SellerAction = z.infer<typeof transitionSchema>["action"];
type SessionResolver = { resolve(token: string): Promise<PublicAccount | null> };
type AdminSellerActions = {
  list(): Promise<SellerProfile[]>;
  transition(input: { sellerProfileId: string; action: SellerAction; adminId: string }): Promise<SellerProfile>;
};

export const createAdminSellerRoutes = ({ sessions, sellers }: { sessions: SessionResolver; sellers: AdminSellerActions }) => {
  const routes = new Hono();
  const guard = createAuthGuard(sessions);
  routes.use("*", guard.requireAccount, guard.requireRole("admin"));
  routes.get("/", async (c) => {
    try {
      return c.json({ sellers: await sellers.list() });
    } catch {
      return c.json({ error: "Unable to list sellers" }, 500);
    }
  });
  routes.patch("/:sellerProfileId/status", async (c) => {
    const sellerProfileId = sellerProfileIdSchema.safeParse(c.req.param("sellerProfileId"));
    if (!sellerProfileId.success) return c.json({ error: "Invalid seller application" }, 400);
    const parsed = transitionSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Invalid seller action" }, 400);
    try {
      const seller = await sellers.transition({ sellerProfileId: sellerProfileId.data, action: parsed.data.action, adminId: getAuthenticatedAccount(c)!.id });
      return c.json({ seller });
    } catch (error) {
      if (error instanceof Error && error.message === "Seller application not found") return c.json({ error: "Seller application not found" }, 409);
      if (error instanceof Error && error.message === "Seller transition is no longer available") return c.json({ error: "Seller transition is no longer available" }, 409);
      return c.json({ error: "Unable to update seller" }, 500);
    }
  });
  return routes;
};
