import { Hono } from "hono";
import { z } from "zod";
import { createAuthGuard, getAuthenticatedAccount } from "../auth/auth.guard.js";
import type { PublicAccount } from "../auth/auth.types.js";
import { ProductUnavailableError } from "../cart/services/cart-service.js";

const itemSchema = z.object({ productId: z.string().uuid() });
type SessionResolver = { resolve(token: string): Promise<PublicAccount | null> };
type WishlistActions = { add(input: { accountId: string; productId: string }): Promise<void>; remove(input: { accountId: string; productId: string }): Promise<void>; list(accountId: string): Promise<unknown[]> };

export const createWishlistRoutes = ({ sessions, wishlist }: { sessions: SessionResolver; wishlist: WishlistActions }) => {
  const routes = new Hono();
  const guard = createAuthGuard(sessions);
  routes.get("/items", guard.requireAccount, guard.requireRole("customer"), async (c) => {
    try { return c.json({ items: await wishlist.list(getAuthenticatedAccount(c)!.id) }); }
    catch { return c.json({ error: "Unable to list wishlist items" }, 500); }
  });
  routes.post("/items", guard.requireAccount, guard.requireRole("customer"), async (c) => {
    const parsed = itemSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Invalid wishlist item" }, 400);
    try { await wishlist.add({ accountId: getAuthenticatedAccount(c)!.id, productId: parsed.data.productId }); }
    catch (error) { return error instanceof ProductUnavailableError ? c.json({ error: error.message }, 409) : c.json({ error: "Unable to add wishlist item" }, 500); }
    return c.body(null, 201);
  });
  routes.delete("/:productId", guard.requireAccount, guard.requireRole("customer"), async (c) => {
    const productId = z.string().uuid().safeParse(c.req.param("productId"));
    if (!productId.success) return c.json({ error: "Invalid wishlist item" }, 400);
    try { await wishlist.remove({ accountId: getAuthenticatedAccount(c)!.id, productId: productId.data }); }
    catch { return c.json({ error: "Unable to remove wishlist item" }, 500); }
    return c.json({ removed: true });
  });
  return routes;
};
