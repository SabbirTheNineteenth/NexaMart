import { Hono } from "hono";
import { createAuthGuard, getAuthenticatedAccount } from "../auth/auth.guard.js";
import type { PublicAccount } from "../auth/auth.types.js";
import { z } from "zod";
import { CodOperationError, type CodOperationsService } from "../orders/services/cod-operations-service.js";

export type AdminOrderOversight = {
  id: string;
  reference: string;
  createdAt: string;
  status: "pending" | "confirmed" | "cancelled";
  paymentStatus: "unpaid" | "collected";
  total: number;
  customer: { id: string; name: string };
  events?: { id: string; eventType: string; fromStatus: string | null; toStatus: string | null; note: string | null; createdAt: string }[];
  items: {
    id: string;
    seller: { id: string | null; name: string | null };
    product: { id: string | null; name: string; imageUrl: string | null };
    variant?: { sku: string; options: Record<string, string> };
    quantity: number;
    unitPrice: number;
    fulfillmentStatus: "pending" | "processing" | "packed" | "shipped" | "delivered" | "cancelled" | "returned" | "failed_delivery" | "return_requested";
    collectionRecorded?: boolean;
  }[];
};

type SessionResolver = { resolve(token: string): Promise<PublicAccount | null> };
type AdminOrders = { list(): Promise<AdminOrderOversight[]> };
type Operations = Pick<CodOperationsService, "confirm" | "reject" | "transition">;
const uuid = z.string().uuid();
const noteSchema = z.object({ note: z.string().trim().max(500).optional() }).strict();
const deliverySchema = z.object({ action: z.enum(["processing", "packed", "shipped", "delivered", "failed_delivery", "return_requested", "returned"]), note: z.string().trim().min(1).max(500).optional() }).strict();
const operationError = (c: { json: (value: { error: string }, status: 404 | 409 | 500) => Response }, error: unknown) => error instanceof CodOperationError ? c.json({ error: error.message }, error.code === "NOT_FOUND" ? 404 : 409) : c.json({ error: "Unable to update COD order" }, 500);

export const createAdminOrderRoutes = ({ sessions, orders, operations }: { sessions: SessionResolver; orders: AdminOrders; operations: Operations }) => {
  const routes = new Hono();
  const guard = createAuthGuard(sessions);
  routes.use("*", guard.requireAccount, guard.requireRole("admin"));
  routes.get("/", async (c) => {
    try {
      return c.json({ orders: await orders.list() });
    } catch {
      return c.json({ error: "Unable to load admin order oversight" }, 500);
    }
  });
  routes.get("/approval-queue", async (c) => {
    try { return c.json({ orders: (await orders.list()).filter((order) => order.status === "pending") }); }
    catch { return c.json({ error: "Unable to load COD approval queue" }, 500); }
  });
  routes.post("/:orderId/approve", async (c) => {
    const orderId = uuid.safeParse(c.req.param("orderId"));
    if (!orderId.success) return c.json({ error: "Invalid order" }, 400);
    try { return c.json({ order: await operations.confirm({ orderId: orderId.data, actorId: getAuthenticatedAccount(c)!.id }) }); }
    catch (error) { return operationError(c, error); }
  });
  routes.post("/:orderId/reject", async (c) => {
    const orderId = uuid.safeParse(c.req.param("orderId"));
    const body = noteSchema.safeParse(await c.req.json().catch(() => null));
    if (!orderId.success || !body.success) return c.json({ error: "Invalid rejection" }, 400);
    try { return c.json({ order: await operations.reject({ orderId: orderId.data, actorId: getAuthenticatedAccount(c)!.id, ...body.data }) }); }
    catch (error) { return operationError(c, error); }
  });
  routes.patch("/:orderId/items/:orderItemId/delivery", async (c) => {
    const orderId = uuid.safeParse(c.req.param("orderId")); const orderItemId = uuid.safeParse(c.req.param("orderItemId"));
    const body = deliverySchema.safeParse(await c.req.json().catch(() => null));
    if (!orderId.success || !orderItemId.success || !body.success) return c.json({ error: "Invalid delivery update" }, 400);
    try {
      const fulfillment = await operations.transition({ orderId: orderId.data, orderItemId: orderItemId.data, action: body.data.action, actor: { kind: "admin", id: getAuthenticatedAccount(c)!.id }, ...(body.data.note ? { note: body.data.note } : {}) });
      return c.json({ fulfillment });
    } catch (error) { return operationError(c, error); }
  });
  routes.post("/:orderId/items/:orderItemId/collect", async (c) => {
    const orderId = uuid.safeParse(c.req.param("orderId")); const orderItemId = uuid.safeParse(c.req.param("orderItemId"));
    if (!orderId.success || !orderItemId.success) return c.json({ error: "Invalid collection" }, 400);
    try {
      const fulfillment = await operations.transition({ orderId: orderId.data, orderItemId: orderItemId.data, action: "delivered", collectionEvidence: true, actor: { kind: "admin", id: getAuthenticatedAccount(c)!.id } });
      return c.json({ fulfillment });
    } catch (error) { return operationError(c, error); }
  });
  return routes;
};
