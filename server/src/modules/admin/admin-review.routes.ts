import { Hono } from "hono";
import { z } from "zod";
import { createAuthGuard, getAuthenticatedAccount } from "../auth/auth.guard.js";
import type { PublicAccount } from "../auth/auth.types.js";
import type { AdminReview } from "./admin-review.repository.js";

const visibilitySchema = z.object({ isVisible: z.boolean() });
type SessionResolver = { resolve(token: string): Promise<PublicAccount | null> };
type AdminReviewActions = {
  list(): Promise<AdminReview[]>;
  setVisibility(input: { reviewId: string; isVisible: boolean; adminId: string }): Promise<AdminReview>;
};

export const createAdminReviewRoutes = ({ sessions, reviews }: { sessions: SessionResolver; reviews: AdminReviewActions }) => {
  const routes = new Hono();
  const guard = createAuthGuard(sessions);
  routes.use("*", guard.requireAccount, guard.requireRole("admin"));
  routes.get("/", async (c) => {
    try {
      return c.json({ reviews: await reviews.list() });
    } catch {
      return c.json({ error: "Unable to list reviews" }, 500);
    }
  });
  routes.patch("/:reviewId/visibility", async (c) => {
    const parsed = visibilitySchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Invalid review visibility" }, 400);
    try {
      const review = await reviews.setVisibility({ reviewId: c.req.param("reviewId"), isVisible: parsed.data.isVisible, adminId: getAuthenticatedAccount(c)!.id });
      return c.json({ review });
    } catch (error) {
      if (error instanceof Error && error.message === "Review not found") return c.json({ error: "Review not found" }, 409);
      return c.json({ error: "Unable to update review" }, 500);
    }
  });
  return routes;
};
