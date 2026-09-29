import { timingSafeEqual } from "node:crypto";
import { Hono } from "hono";
import { z } from "zod";
import { createAuthGuard, getAuthenticatedAccount } from "../auth/auth.guard.js";
import type { PublicAccount } from "../auth/auth.types.js";
import { CodOperationError, CodOperationsService } from "./services/cod-operations-service.js";
import type { CodAction } from "./cod.js";

type SessionResolver = { resolve(token: string): Promise<PublicAccount | null> };
type Config = { token: string; actorId: string; webhookUrl: string; webhookSecret: string };
const uuid = z.string().uuid();
const actionSchema = z.object({ action: z.enum(["processing", "packed", "shipped", "delivered", "failed_delivery", "return_requested", "returned", "cancelled"]) }).strict();
const callbackSchema = z.object({ eventId: z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9_-]+$/), orderItemId: uuid, action: z.enum(["cod.delivery_collected", "cod.delivery_failed", "cod.return_requested"]) }).strict();
const callbackAction: Record<z.infer<typeof callbackSchema>["action"], CodAction> = { "cod.delivery_collected": "delivered", "cod.delivery_failed": "failed_delivery", "cod.return_requested": "return_requested" };
const validToken = (actual: string | undefined, expected: string) => !!actual && actual.length === expected.length && timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
const responseFor = (c: { json: (value: { error: string }, status: 404 | 409 | 500) => Response }, error: unknown) => {
  if (error instanceof CodOperationError) return c.json({ error: error.message }, error.code === "NOT_FOUND" ? 404 : 409);
  return c.json({ error: "COD operation failed" }, 500);
};

export function createCodRoutes(input: { sessions: SessionResolver; operations: CodOperationsService; config: Config }) {
  const routes = new Hono(); const guard = createAuthGuard(input.sessions);
  routes.patch("/order-items/:orderItemId", guard.requireAccount, guard.requireRole("seller", "admin"), async (c) => {
    const parsed = actionSchema.safeParse(await c.req.json().catch(() => null)); const itemId = uuid.safeParse(c.req.param("orderItemId"));
    if (!parsed.success || !itemId.success) return c.json({ error: "Invalid COD action" }, 400);
    const account = getAuthenticatedAccount(c)!;
    try { return c.json({ fulfillment: await input.operations.transition({ orderItemId: itemId.data, action: parsed.data.action, actor: { kind: account.role as "seller" | "admin", id: account.id } }) }); }
    catch (error) { return responseFor(c, error); }
  });
  routes.post("/orders/:orderId/confirm", guard.requireAccount, guard.requireRole("admin"), async (c) => {
    const orderId = uuid.safeParse(c.req.param("orderId")); if (!orderId.success) return c.json({ error: "Invalid order" }, 400);
    try { return c.json({ order: await input.operations.confirm({ orderId: orderId.data, actorId: getAuthenticatedAccount(c)!.id }) }); }
    catch (error) { return responseFor(c, error); }
  });
  routes.use("/local/*", async (c, next) => {
    if (!validToken(c.req.header("authorization")?.replace(/^Bearer /, ""), input.config.token)) return c.json({ error: "Service authentication required" }, 401);
    await next();
  });
  routes.post("/local/callback", async (c) => {
    const parsed = callbackSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Invalid COD callback" }, 400);
    try { return c.json({ fulfillment: await input.operations.transition({ orderItemId: parsed.data.orderItemId, action: callbackAction[parsed.data.action], actor: { kind: "n8n", id: input.config.actorId, externalEventId: parsed.data.eventId } }) }); }
    catch (error) { return responseFor(c, error); }
  });
  routes.get("/local/pending-confirmation", async (c) => c.json({ orders: await input.operations.pendingConfirmation() }));
  routes.post("/local/dispatch", async (c) => c.json(await input.operations.dispatch({ url: input.config.webhookUrl, secret: input.config.webhookSecret })));
  return routes;
}
