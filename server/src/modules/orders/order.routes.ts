import { Hono } from "hono";
import { z } from "zod";
import { createAuthGuard, getAuthenticatedAccount } from "../auth/auth.guard.js";
import type { PublicAccount } from "../auth/auth.types.js";
import type { Order } from "./order.types.js";

const checkoutSchema = z.object({ paymentMethod: z.literal("cod").optional(), shippingAddressId: z.string().uuid(), items: z.array(z.object({ productId: z.string().uuid(), variantId: z.string().uuid().optional(), quantity: z.number().int().positive().max(99) })).min(1) });
const idempotencyKeySchema = z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9_-]+$/);
const orderIdSchema = z.string().uuid();
const expectedCheckoutConflictMessages = new Set(["A shipping address is unavailable", "A product or variant is unavailable or out of stock", "A product seller is unavailable"]);
const isExpectedCheckoutConflict = (error: unknown): error is Error => error instanceof Error && expectedCheckoutConflictMessages.has(error.message);
type SessionResolver = { resolve(token: string): Promise<PublicAccount | null> };
type OrderActions = { checkout(input: { customerId: string; shippingAddressId: string; items: { productId: string; variantId?: string; quantity: number }[]; idempotencyKey: string }): Promise<Order>; listForCustomer(customerId: string): Promise<Order[]>; getTrackingForCustomer(input: { customerId: string; orderId: string }): Promise<unknown | null> };

export const createOrderRoutes = ({ sessions, orders }: { sessions: SessionResolver; orders: OrderActions }) => {
  const routes = new Hono(); const guard = createAuthGuard(sessions);
  routes.get("/orders", guard.requireAccount, guard.requireRole("customer"), async (c) => {
    try { return c.json({ orders: await orders.listForCustomer(getAuthenticatedAccount(c)!.id) }); }
    catch { return c.json({ error: "Unable to load orders" }, 500); }
  });
  routes.get("/orders/:orderId/tracking", guard.requireAccount, guard.requireRole("customer"), async (c) => {
    const orderId = orderIdSchema.safeParse(c.req.param("orderId"));
    if (!orderId.success) return c.json({ error: "Invalid order" }, 400);
    try {
      const order = await orders.getTrackingForCustomer({ customerId: getAuthenticatedAccount(c)!.id, orderId: orderId.data });
      return order ? c.json({ order }) : c.json({ error: "Order not found" }, 404);
    } catch {
      return c.json({ error: "Unable to load order tracking" }, 500);
    }
  });
  routes.post("/orders", guard.requireAccount, guard.requireRole("customer"), async (c) => {
    const parsed = checkoutSchema.safeParse(await c.req.json().catch(() => null)); const idempotencyKey = idempotencyKeySchema.safeParse(c.req.header("Idempotency-Key"));
    if (!parsed.success || !idempotencyKey.success) return c.json({ error: "Invalid order" }, 400);
    try { return c.json({ order: await orders.checkout({ customerId: getAuthenticatedAccount(c)!.id, shippingAddressId: parsed.data.shippingAddressId, items: parsed.data.items, idempotencyKey: idempotencyKey.data }) }, 201); }
    catch (error) {
      return isExpectedCheckoutConflict(error)
        ? c.json({ error: error.message }, 409)
        : c.json({ error: "Checkout failed" }, 500);
    }
  });
  return routes;
};
