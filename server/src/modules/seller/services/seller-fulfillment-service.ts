import { and, eq, exists, sql } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { commissionRecords, orderEvents, orderItems, orders, sellerProfiles } from "../../../db/schema/index.js";

type Status = "pending" | "processing" | "packed" | "shipped" | "delivered" | "cancelled" | "returned" | "failed_delivery" | "return_requested";
type FulfillmentStatus = Exclude<Status, "pending">;
const allowed: Record<FulfillmentStatus, readonly Status[]> = {
  processing: ["pending"],
  packed: ["processing"],
  shipped: ["packed"],
  delivered: ["shipped"],
  cancelled: ["pending", "processing"],
  returned: ["delivered"],
  failed_delivery: ["shipped"],
  return_requested: ["failed_delivery"],
};

export const isSellerFulfillmentTransitionAllowed = (fromStatus: Status, toStatus: FulfillmentStatus) => allowed[toStatus].includes(fromStatus);

export class SellerFulfillmentError extends Error {
  constructor(readonly code: "ORDER_ITEM_NOT_FOUND" | "INVALID_FULFILLMENT_TRANSITION", message: string) {
    super(message);
  }
}

export class SellerFulfillmentService {
  constructor(private readonly database = db) {}

  async transition(input: { sellerId: string; orderItemId: string; status: FulfillmentStatus }) {
    return this.database.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`review-order-item:${input.orderItemId}`}))`);
      const activeSeller = exists(tx.select({ accountId: sellerProfiles.accountId }).from(sellerProfiles).where(and(eq(sellerProfiles.accountId, input.sellerId), eq(sellerProfiles.status, "active"))));
      const [current] = await tx.select({ id: orderItems.id, orderId: orderItems.orderId, fulfillmentStatus: orderItems.fulfillmentStatus })
        .from(orderItems).innerJoin(sellerProfiles, and(eq(sellerProfiles.accountId, orderItems.sellerId), eq(sellerProfiles.status, "active")))
        .where(and(eq(orderItems.id, input.orderItemId), eq(orderItems.sellerId, input.sellerId))).limit(1);
      if (!current) throw new SellerFulfillmentError("ORDER_ITEM_NOT_FOUND", "Order item not found");
      const [order] = await tx.select({ status: orders.status }).from(orders).where(eq(orders.id, current.orderId)).limit(1);
      if (order?.status !== "confirmed") throw new SellerFulfillmentError("INVALID_FULFILLMENT_TRANSITION", "Order is awaiting Admin approval");
      if (!isSellerFulfillmentTransitionAllowed(current.fulfillmentStatus, input.status)) throw new SellerFulfillmentError("INVALID_FULFILLMENT_TRANSITION", "Invalid fulfillment transition");
      const [updated] = await tx.update(orderItems).set({ fulfillmentStatus: input.status })
        .where(and(eq(orderItems.id, input.orderItemId), eq(orderItems.sellerId, input.sellerId), eq(orderItems.fulfillmentStatus, current.fulfillmentStatus), activeSeller))
        .returning({ orderId: orderItems.orderId, fulfillmentStatus: orderItems.fulfillmentStatus });
      if (!updated) throw new SellerFulfillmentError("INVALID_FULFILLMENT_TRANSITION", "Invalid fulfillment transition");
      if (input.status === "cancelled" || input.status === "returned") {
        await tx.update(commissionRecords).set({ status: "void" }).where(and(eq(commissionRecords.orderItemId, input.orderItemId), eq(commissionRecords.sellerId, input.sellerId), eq(commissionRecords.status, "accrued")));
      }
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`order-event-sequence:${current.orderId}`}))`);
      const nextSequence = Number((await tx.execute(sql`select coalesce(max("sequence"), 0) + 1 as "sequence" from "order_events" where "order_id" = ${updated.orderId}`)).rows[0].sequence);
      await tx.insert(orderEvents).values({ orderId: updated.orderId, orderItemId: input.orderItemId, actorId: input.sellerId, eventType: "fulfillment_updated", fromStatus: current.fulfillmentStatus, toStatus: updated.fulfillmentStatus, sequence: nextSequence });
      return updated;
    });
  }
}
