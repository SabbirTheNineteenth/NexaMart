import { Hono } from "hono";
import { z } from "zod";
import { createAuthGuard, getAuthenticatedAccount } from "../auth/auth.guard.js";
import type { PublicAccount } from "../auth/auth.types.js";
import { ProductUnavailableError } from "./services/cart-service.js";

const cartItemSchema = z.object({ productId: z.string().uuid(), variantId: z.string().uuid().optional(), quantity: z.number().int().positive().max(99) });
const cartQuantitySchema = z.object({ variantId: z.string().uuid().optional(), quantity: z.number().int().nonnegative().max(99) });
const isInsufficientStockError = (error: unknown): error is Error => error instanceof Error && error.message === "Insufficient stock";
const isProductUnavailableError = (error: unknown): error is ProductUnavailableError => error instanceof ProductUnavailableError;

type SessionResolver = { resolve(token: string): Promise<PublicAccount | null> };
type CartActions = {
  addItem(input: { accountId: string; productId: string; variantId?: string; quantity: number }): Promise<void>;
  listItems(accountId: string): Promise<unknown[]>;
  removeItem(input: { accountId: string; productId: string; variantId?: string }): Promise<void>;
  setQuantity(input: { accountId: string; productId: string; variantId?: string; quantity: number }): Promise<void>;
  clear(accountId: string): Promise<void>;
};

export const createCartRoutes = ({ sessions, cart }: { sessions: SessionResolver; cart: CartActions }) => {
  const routes = new Hono();
  const guard = createAuthGuard(sessions);

  routes.get("/items", guard.requireAccount, guard.requireRole("customer"), async (c) => {
    try { return c.json({ items: await cart.listItems(getAuthenticatedAccount(c)!.id) }); }
    catch { return c.json({ error: "Unable to list cart items" }, 500); }
  });
  routes.post("/items", guard.requireAccount, guard.requireRole("customer"), async (c) => {
    const parsed = cartItemSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Invalid cart item" }, 400);
    try { await cart.addItem({ accountId: getAuthenticatedAccount(c)!.id, ...parsed.data }); return c.body(null, 201); }
    catch (error) { return isProductUnavailableError(error) || isInsufficientStockError(error) ? c.json({ error: error.message }, 409) : c.json({ error: "Unable to add cart item" }, 500); }
  });
  routes.delete("/items", guard.requireAccount, guard.requireRole("customer"), async (c) => {
    try { await cart.clear(getAuthenticatedAccount(c)!.id); return c.body(null, 204); }
    catch { return c.json({ error: "Unable to clear cart" }, 500); }
  });
  routes.delete("/items/:productId", guard.requireAccount, guard.requireRole("customer"), async (c) => {
    const productId = z.string().uuid().safeParse(c.req.param("productId"));
    const variantId = z.string().uuid().optional().safeParse(c.req.query("variantId"));
    if (!productId.success || !variantId.success) return c.json({ error: "Invalid cart item" }, 400);
    try {
      await cart.removeItem({ accountId: getAuthenticatedAccount(c)!.id, productId: productId.data, ...(variantId.data ? { variantId: variantId.data } : {}) });
      return c.body(null, 204);
    } catch { return c.json({ error: "Unable to remove cart item" }, 500); }
  });
  routes.patch("/items/:productId", guard.requireAccount, guard.requireRole("customer"), async (c) => {
    const parsed = cartQuantitySchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Invalid cart quantity" }, 400);
    try { await cart.setQuantity({ accountId: getAuthenticatedAccount(c)!.id, productId: c.req.param("productId"), ...parsed.data }); return c.body(null, 204); }
    catch (error) { return isProductUnavailableError(error) || isInsufficientStockError(error) ? c.json({ error: error.message }, 409) : c.json({ error: "Unable to update cart" }, 500); }
  });
  return routes;
};
