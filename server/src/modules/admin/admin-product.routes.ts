import { Hono } from "hono";
import { z } from "zod";
import { createAuthGuard, getAuthenticatedAccount } from "../auth/auth.guard.js";
import type { PublicAccount } from "../auth/auth.types.js";
import type { AdminProduct } from "./admin.types.js";

const publicationSchema = z.object({ isPublished: z.boolean(), expectedRevision: z.string().trim().min(1) }).strict();
const moderationSchema = z.object({ status: z.enum(["approved", "rejected", "changes_requested"]), reason: z.string().trim().min(1).max(2_000).optional(), expectedRevision: z.string().trim().min(1) }).strict().superRefine((input, ctx) => { if (input.status !== "approved" && !input.reason) ctx.addIssue({ code: "custom", message: "A reason is required" }); });
type SessionResolver = { resolve(token: string): Promise<PublicAccount | null> };
type AdminProductActions = {
  setPublication(input: { productId: string; isPublished: boolean; expectedRevision: string; adminId: string }): Promise<AdminProduct>;
  moderate(input: { productId: string; status: "approved" | "rejected" | "changes_requested"; reason?: string; expectedRevision: string; adminId: string }): Promise<AdminProduct>;
};

export const createAdminProductRoutes = ({ sessions, products }: { sessions: SessionResolver; products: AdminProductActions }) => {
  const routes = new Hono();
  const guard = createAuthGuard(sessions);
  routes.use("*", guard.requireAccount, guard.requireRole("admin"));
  routes.patch("/:productId/publication", async (c) => {
    const parsed = publicationSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Invalid product publication" }, 400);
    try {
      const product = await products.setPublication({ productId: c.req.param("productId"), isPublished: parsed.data.isPublished, expectedRevision: parsed.data.expectedRevision, adminId: getAuthenticatedAccount(c)!.id });
      return c.json({ product });
    } catch (error) {
      if (error instanceof Error && error.message === "Product not found") return c.json({ error: "Product not found" }, 404);
      if (error instanceof Error && error.message === "Product changed; reload and review again.") return c.json({ error: error.message }, 409);
      if (error instanceof Error && error.message === "Product taxonomy is not eligible for publication") return c.json({ error: error.message }, 400);
      return c.json({ error: "Unable to update product publication" }, 500);
    }
  });
  routes.patch("/:productId/moderation", async (c) => {
    const parsed = moderationSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Invalid product moderation" }, 400);
    try { return c.json({ product: await products.moderate({ productId: c.req.param("productId"), ...parsed.data, adminId: getAuthenticatedAccount(c)!.id }) }); }
    catch (error) {
      if (error instanceof Error && error.message === "Product not found") return c.json({ error: error.message }, 404);
      if (error instanceof Error && error.message === "Product changed; reload and review again.") return c.json({ error: error.message }, 409);
      return c.json({ error: "Unable to moderate product" }, 500);
    }
  });
  return routes;
};
