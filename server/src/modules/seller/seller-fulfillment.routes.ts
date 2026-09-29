import { Hono } from "hono";
import { z } from "zod";
import { createAuthGuard, getAuthenticatedAccount } from "../auth/auth.guard.js";
import type { PublicAccount } from "../auth/auth.types.js";

const statusSchema = z.object({ status: z.enum(["processing", "packed", "shipped", "delivered", "cancelled", "returned"]) });
type FulfillmentStatus = "processing" | "packed" | "shipped" | "delivered" | "cancelled" | "returned";
type SessionResolver = { resolve(token: string): Promise<PublicAccount | null> };
type FulfillmentActions = { transition(input: { sellerId: string; orderItemId: string; status: FulfillmentStatus }): Promise<{ orderId: string; fulfillmentStatus: string }> };
type FulfillmentFailure = { code: "ORDER_ITEM_NOT_FOUND" | "INVALID_FULFILLMENT_TRANSITION" | "NOT_FOUND" | "INVALID_TRANSITION" | "INVALID_ACTION"; message: string };
const isFulfillmentFailure = (error: unknown): error is FulfillmentFailure => typeof error === "object" && error !== null && "code" in error && ["ORDER_ITEM_NOT_FOUND", "INVALID_FULFILLMENT_TRANSITION", "NOT_FOUND", "INVALID_TRANSITION", "INVALID_ACTION"].includes(String((error as { code?: unknown }).code)) && "message" in error;

export const createSellerFulfillmentRoutes = ({ sessions, fulfillment }: { sessions: SessionResolver; fulfillment: FulfillmentActions }) => {
  const routes = new Hono();
  const guard = createAuthGuard(sessions);
  routes.patch("/order-items/:orderItemId/fulfillment", guard.requireAccount, guard.requireRole("seller"), async (c) => {
    const parsed = statusSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Invalid fulfillment status" }, 400);
    try {
      const result = await fulfillment.transition({ sellerId: getAuthenticatedAccount(c)!.id, orderItemId: c.req.param("orderItemId"), status: parsed.data.status });
      return c.json({ fulfillment: result });
    } catch (error) {
      if (isFulfillmentFailure(error)) return c.json({ error: error.code === "ORDER_ITEM_NOT_FOUND" || error.code === "NOT_FOUND" ? "Order item not found" : "Invalid fulfillment transition" }, error.code === "ORDER_ITEM_NOT_FOUND" || error.code === "NOT_FOUND" ? 404 : 409);
      return c.json({ error: "Unable to update fulfillment" }, 500);
    }
  });
  return routes;
};
