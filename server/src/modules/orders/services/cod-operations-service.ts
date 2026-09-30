import { and, eq, isNull, lt, lte, sql } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { auditRecords, codOutbox, commissionRecords, orderEvents, orderItems, orders, sellerProfiles, serviceAuditRecords } from "../../../db/schema/index.js";
import { allCodLinesCollected, canActOnCodLine, codTransitionAllowed, createCodEventPayload, postCodWebhook, type CodAction, type CodEventType } from "../cod.js";
import { codActorColumns } from "../cod-actor.js";

export class CodOperationError extends Error {
  constructor(readonly code: "NOT_FOUND" | "INVALID_TRANSITION" | "INVALID_ACTION", message: string) { super(message); }
}
type Actor = { kind: "seller" | "admin" | "n8n"; id: string; externalEventId?: string };
const eventForStatus: Partial<Record<CodAction, CodEventType>> = {
  shipped: "cod.order.dispatched", delivered: "cod.order.delivered_collected", failed_delivery: "cod.order.delivery_failed", returned: "cod.order.returned",
};

export class CodOperationsService {
  constructor(private readonly database = db) {}

  async transition(input: { orderItemId: string; orderId?: string; action: CodAction; actor: Actor; collectionEvidence?: boolean }) {
    return this.database.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`cod-line:${input.orderItemId}`}))`);
      if (input.actor.externalEventId) {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`cod-event:${input.actor.externalEventId}`}))`);
        const [prior] = await tx.select({ id: orderEvents.id, orderId: orderEvents.orderId, orderItemId: orderEvents.orderItemId, toStatus: orderEvents.toStatus, source: orderEvents.source, serviceActorId: orderEvents.serviceActorId }).from(orderEvents).where(eq(orderEvents.externalEventId, input.actor.externalEventId)).limit(1);
        if (prior) {
          if (prior.orderItemId !== input.orderItemId || prior.toStatus !== input.action || prior.source !== "n8n" || prior.serviceActorId !== input.actor.id) throw new CodOperationError("INVALID_ACTION", "Event identifier already used");
          return { orderId: prior.orderId, orderItemId: input.orderItemId, fulfillmentStatus: input.action, duplicate: true };
        }
      }
      const [line] = await tx.select({ id: orderItems.id, orderId: orderItems.orderId, sellerId: orderItems.sellerId, fulfillmentStatus: orderItems.fulfillmentStatus, codCollectedAt: orderItems.codCollectedAt, quantity: orderItems.quantity, unitPrice: orderItems.unitPrice })
        .from(orderItems).where(eq(orderItems.id, input.orderItemId)).limit(1);
      if (!line || (input.orderId && line.orderId !== input.orderId) || !canActOnCodLine(input.actor.kind, input.actor.id, line.sellerId)) throw new CodOperationError("NOT_FOUND", "Order item not found");
      if (input.actor.kind === "seller") {
        const [active] = await tx.select({ id: sellerProfiles.accountId }).from(sellerProfiles).where(and(eq(sellerProfiles.accountId, input.actor.id), eq(sellerProfiles.status, "active"))).limit(1);
        if (!active) throw new CodOperationError("NOT_FOUND", "Order item not found");
      }
      const collectionEvidence = input.action === "delivered" && (input.actor.kind === "n8n" || (input.actor.kind === "admin" && input.collectionEvidence === true));
      if (collectionEvidence && input.actor.kind === "admin" && line.fulfillmentStatus === "delivered" && line.codCollectedAt) return { orderId: line.orderId, orderItemId: line.id, fulfillmentStatus: "delivered" as const, duplicate: true };
      if (collectionEvidence && input.actor.kind === "admin" && line.fulfillmentStatus !== "delivered") throw new CodOperationError("INVALID_TRANSITION", "Delivery must be recorded before COD collection");
      const [order] = await tx.select().from(orders).where(eq(orders.id, line.orderId)).limit(1);
      if (!order || order.paymentMethod !== "cod") throw new CodOperationError("INVALID_ACTION", "COD order required");
      if (order.status !== "confirmed" || !(codTransitionAllowed(line.fulfillmentStatus, input.action) || (collectionEvidence && line.fulfillmentStatus === "delivered" && !line.codCollectedAt))) throw new CodOperationError("INVALID_TRANSITION", "Invalid fulfillment transition");
      if (input.action === "delivered" && input.actor.kind === "n8n" && !input.actor.externalEventId) throw new CodOperationError("INVALID_ACTION", "Event identifier required");
      const [updated] = await tx.update(orderItems).set({ fulfillmentStatus: input.action, ...(collectionEvidence ? { codCollectedAt: new Date() } : {}) })
        .where(and(eq(orderItems.id, line.id), eq(orderItems.fulfillmentStatus, line.fulfillmentStatus))).returning({ id: orderItems.id });
      if (!updated) throw new CodOperationError("INVALID_TRANSITION", "Invalid fulfillment transition");
      if (input.action === "cancelled" || input.action === "returned") await tx.update(commissionRecords).set({ status: "void" }).where(and(eq(commissionRecords.orderItemId, line.id), eq(commissionRecords.status, "accrued")));
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`cod-order-payment:${line.orderId}`}))`);
      const allLines = await tx.select({ status: orderItems.fulfillmentStatus, collectedAt: orderItems.codCollectedAt }).from(orderItems).where(eq(orderItems.orderId, line.orderId));
      const collected = allCodLinesCollected(allLines.map((item) => ({ status: item.status, collectedAt: item.collectedAt })));
      if (collected) await tx.update(orders).set({ paymentStatus: "collected" }).where(eq(orders.id, line.orderId));
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`order-event-sequence:${line.orderId}`}))`);
      const sequence = Number((await tx.execute(sql`select coalesce(max("sequence"), 0) + 1 as "sequence" from "order_events" where "order_id" = ${line.orderId}`)).rows[0].sequence);
      await tx.insert(orderEvents).values({ orderId: line.orderId, orderItemId: line.id, ...codActorColumns(input.actor), source: input.actor.kind === "n8n" ? "n8n" : "account", externalEventId: input.actor.externalEventId, eventType: collectionEvidence ? "cod_delivered_collected" : `fulfillment_${input.action}`, fromStatus: line.fulfillmentStatus, toStatus: input.action, sequence });
      const audit = { action: collectionEvidence ? "cod.delivery_collected" : `cod.${input.action}`, resourceType: "order_item", resourceId: line.id, metadata: { orderId: line.orderId, source: input.actor.kind, externalEventId: input.actor.externalEventId ?? null } };
      if (input.actor.kind === "n8n") await tx.insert(serviceAuditRecords).values({ ...audit, serviceActorId: input.actor.id });
      else await tx.insert(auditRecords).values({ ...audit, actorId: input.actor.id });
      const eventType = input.action === "delivered" && !collectionEvidence ? undefined : eventForStatus[input.action];
      if (eventType) {
        const [event] = await tx.insert(codOutbox).values({ eventType, payload: {} }).returning({ id: codOutbox.id, createdAt: codOutbox.createdAt });
        await tx.update(codOutbox).set({ payload: createCodEventPayload({ eventId: event.id, eventType, occurredAt: event.createdAt.toISOString(), orderId: order.id, reference: order.reference, sellerId: line.sellerId, amount: (Number(line.unitPrice) * line.quantity).toFixed(2), status: order.status, paymentStatus: collected ? "collected" : "unpaid" }) }).where(eq(codOutbox.id, event.id));
      }
      return { orderId: line.orderId, orderItemId: line.id, fulfillmentStatus: input.action, duplicate: false };
    });
  }

  async confirm(input: { orderId: string; actorId: string }) {
    return this.database.transaction(async (tx) => {
      const [order] = await tx.update(orders).set({ status: "confirmed" }).where(and(eq(orders.id, input.orderId), eq(orders.status, "pending"))).returning();
      if (!order) {
        const [existing] = await tx.select({ id: orders.id }).from(orders).where(eq(orders.id, input.orderId)).limit(1);
        throw existing ? new CodOperationError("INVALID_TRANSITION", "Order is not awaiting approval") : new CodOperationError("NOT_FOUND", "Order not found");
      }
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`order-event-sequence:${order.id}`}))`);
      const sequence = Number((await tx.execute(sql`select coalesce(max("sequence"), 0) + 1 as "sequence" from "order_events" where "order_id" = ${order.id}`)).rows[0].sequence);
      await tx.insert(orderEvents).values({ orderId: order.id, actorId: input.actorId, eventType: "order_confirmed", fromStatus: "pending", toStatus: "confirmed", sequence });
      await tx.insert(auditRecords).values({ actorId: input.actorId, action: "cod.confirmed", resourceType: "order", resourceId: order.id, metadata: {} });
      const [event] = await tx.insert(codOutbox).values({ eventType: "cod.order.confirmed", payload: {} }).returning({ id: codOutbox.id, createdAt: codOutbox.createdAt });
      await tx.update(codOutbox).set({ payload: createCodEventPayload({ eventId: event.id, eventType: "cod.order.confirmed", occurredAt: event.createdAt.toISOString(), orderId: order.id, reference: order.reference, sellerId: null, amount: order.total, status: order.status, paymentStatus: order.paymentStatus }) }).where(eq(codOutbox.id, event.id));
      return { orderId: order.id, status: order.status };
    });
  }

  async reject(input: { orderId: string; actorId: string; note?: string }) {
    return this.database.transaction(async (tx) => {
      const [order] = await tx.update(orders).set({ status: "cancelled" }).where(and(eq(orders.id, input.orderId), eq(orders.status, "pending"), eq(orders.paymentMethod, "cod"))).returning();
      if (!order) {
        const [existing] = await tx.select({ id: orders.id }).from(orders).where(eq(orders.id, input.orderId)).limit(1);
        throw existing ? new CodOperationError("INVALID_TRANSITION", "Order is not awaiting approval") : new CodOperationError("NOT_FOUND", "Order not found");
      }
      const lines = await tx.update(orderItems).set({ fulfillmentStatus: "cancelled" }).where(eq(orderItems.orderId, order.id)).returning({ id: orderItems.id });
      for (const line of lines) await tx.update(commissionRecords).set({ status: "void" }).where(and(eq(commissionRecords.orderItemId, line.id), eq(commissionRecords.status, "accrued")));
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`order-event-sequence:${order.id}`}))`);
      const sequence = Number((await tx.execute(sql`select coalesce(max("sequence"), 0) + 1 as "sequence" from "order_events" where "order_id" = ${order.id}`)).rows[0].sequence);
      await tx.insert(orderEvents).values({ orderId: order.id, actorId: input.actorId, eventType: "order_rejected", fromStatus: "pending", toStatus: "cancelled", note: input.note, sequence });
      await tx.insert(auditRecords).values({ actorId: input.actorId, action: "cod.rejected", resourceType: "order", resourceId: order.id, metadata: { note: input.note ?? null } });
      return { orderId: order.id, status: order.status };
    });
  }

  async pendingConfirmation() {
    return this.database.select({ id: orders.id, reference: orders.reference, createdAt: orders.createdAt }).from(orders).where(and(eq(orders.status, "pending"), eq(orders.paymentMethod, "cod"))).limit(100);
  }

  async dispatch(input: { url: string; secret: string; transport?: typeof fetch }) {
    const transport = input.transport ?? fetch;
    const due = await this.database.select().from(codOutbox).where(and(isNull(codOutbox.deliveredAt), lte(codOutbox.nextAttemptAt, new Date()), lt(codOutbox.attempts, 5))).limit(25);
    let attempted = 0; let delivered = 0; let failed = 0; let exhausted = 0; let skipped = 0;
    for (const event of due) {
      const [claimed] = await this.database.update(codOutbox).set({ attempts: sql`${codOutbox.attempts} + 1`, nextAttemptAt: new Date(Date.now() + 30_000), lastError: "Outcome pending" })
        .where(and(eq(codOutbox.id, event.id), isNull(codOutbox.deliveredAt), lte(codOutbox.nextAttemptAt, new Date()), lt(codOutbox.attempts, 5)))
        .returning();
      if (!claimed) { skipped++; continue; }
      attempted++;
      try {
        const response = await postCodWebhook(input.url, input.secret, claimed.payload, transport);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        await this.database.update(codOutbox).set({ deliveredAt: new Date(), lastError: null }).where(and(eq(codOutbox.id, claimed.id), isNull(codOutbox.deliveredAt), eq(codOutbox.attempts, claimed.attempts)));
        delivered++;
      } catch (error) {
        const safeError = error instanceof Error && /^HTTP [1-5][0-9]{2}$/.test(error.message) ? error.message : "Transport failed";
        await this.database.update(codOutbox).set({ nextAttemptAt: new Date(Date.now() + Math.min(300_000, 1000 * 2 ** (claimed.attempts - 1))), lastError: safeError }).where(and(eq(codOutbox.id, claimed.id), isNull(codOutbox.deliveredAt), eq(codOutbox.attempts, claimed.attempts)));
        failed++;
        if (claimed.attempts >= 5) exhausted++;
      }
    }
    return { attempted, delivered, failed, exhausted, skipped };
  }
}
