import { Hono } from "hono";
import { z } from "zod";
import { createAuthGuard, getAuthenticatedAccount } from "../auth/auth.guard.js";
import type { PublicAccount } from "../auth/auth.types.js";

const productIdSchema = z.string().uuid();
const reviewSchema = z.object({ productId: productIdSchema, orderItemId: z.string().uuid(), rating: z.number().int().min(1).max(5), title: z.string().trim().min(2).max(120).optional(), body: z.string().trim().min(2).max(2000).optional() });
const isUniqueViolation = (error: unknown) => typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "23505";
type SessionResolver = { resolve(token: string): Promise<PublicAccount | null> };
type ReviewEligibility = { product: { id: string; name: string; image: string | null }; orderItem: { id: string }; order: { id: string; reference: string } };
type ReviewActions = { create(input: { customerId: string; productId: string; orderItemId: string; rating: number; title?: string; body?: string }): Promise<{ id: string }>; list(productId: string): Promise<unknown[]>; listEligibleForCustomer(customerId: string): Promise<ReviewEligibility[]> };

export const createReviewRoutes = ({ sessions, reviews }: { sessions: SessionResolver; reviews: ReviewActions }) => {
  const routes = new Hono(); const guard = createAuthGuard(sessions);
  routes.get("/product/:productId", async (c) => {
    const productId = productIdSchema.safeParse(c.req.param("productId"));
    if (!productId.success) return c.json({ error: "Invalid product" }, 400);
    try { return c.json({ reviews: await reviews.list(productId.data) }); }
    catch { return c.json({ error: "Unable to list reviews" }, 500); }
  });
  routes.get("/eligible", guard.requireAccount, guard.requireRole("customer"), async (c) => {
    try { return c.json({ items: await reviews.listEligibleForCustomer(getAuthenticatedAccount(c)!.id) }); }
    catch { return c.json({ error: "Unable to list eligible reviews" }, 500); }
  });
  routes.post("/", guard.requireAccount, guard.requireRole("customer"), async (c) => {
    const parsed = reviewSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Invalid review" }, 400);
    try { return c.json({ review: await reviews.create({ customerId: getAuthenticatedAccount(c)!.id, ...parsed.data }) }, 201); }
    catch (error) {
      if (error instanceof Error && error.message === "Only delivered purchases can be reviewed") return c.json({ error: "Only delivered purchases can be reviewed" }, 409);
      if (isUniqueViolation(error)) return c.json({ error: "A review has already been submitted for this purchase" }, 409);
      return c.json({ error: "Unable to save review" }, 500);
    }
  });
  return routes;
};
