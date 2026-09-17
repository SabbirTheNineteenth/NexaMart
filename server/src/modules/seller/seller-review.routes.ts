import { Hono } from "hono";
import { createAuthGuard, getAuthenticatedAccount } from "../auth/auth.guard.js";
import type { PublicAccount } from "../auth/auth.types.js";

export type SellerReview = {
  id: string;
  product: { id: string; name: string };
  rating: number;
  title?: string;
  body?: string;
  createdAt: string;
  isVisible: boolean;
};

type SessionResolver = { resolve(token: string): Promise<PublicAccount | null> };
type SellerReviewActions = { listForSeller(sellerId: string): Promise<SellerReview[]> };

export const createSellerReviewRoutes = ({ sessions, reviews }: { sessions: SessionResolver; reviews: SellerReviewActions }) => {
  const routes = new Hono();
  const guard = createAuthGuard(sessions);

  routes.get("/", guard.requireAccount, guard.requireRole("seller"), async (c) => {
    try {
      return c.json({ reviews: await reviews.listForSeller(getAuthenticatedAccount(c)!.id) });
    } catch {
      return c.json({ error: "Unable to load seller reviews" }, 500);
    }
  });

  return routes;
};
