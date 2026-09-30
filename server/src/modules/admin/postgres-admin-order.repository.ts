import { asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../db/client.js";
import { accounts, orderEvents, orderItems, orders } from "../../db/schema/index.js";
import type { AdminOrderRepository } from "./admin-order.repository.js";
import type { AdminOrderOversight } from "./admin-order.routes.js";

export class PostgresAdminOrderRepository implements AdminOrderRepository {
  async list(): Promise<AdminOrderOversight[]> {
    const persistedOrders = await db.select({
      id: orders.id,
      reference: orders.reference,
      createdAt: orders.createdAt,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      total: orders.total,
      customerId: accounts.id,
      customerName: accounts.name,
    }).from(orders)
      .innerJoin(accounts, eq(orders.customerId, accounts.id))
      .orderBy(desc(orders.createdAt));
    const orderIds = persistedOrders.map((order) => order.id);
    const persistedItems = orderIds.length === 0 ? [] : await db.select({
      id: orderItems.id,
      orderId: orderItems.orderId,
      sellerId: orderItems.sellerId,
      sellerName: orderItems.sellerName,
      productId: orderItems.productId,
      productName: orderItems.productName,
      productImageUrl: orderItems.productImageUrl,
      variantSku: orderItems.variantSku,
      variantOptions: orderItems.variantOptions,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
      fulfillmentStatus: orderItems.fulfillmentStatus,
      codCollectedAt: orderItems.codCollectedAt,
    }).from(orderItems).where(inArray(orderItems.orderId, orderIds));
    const persistedEvents = orderIds.length === 0 ? [] : await db.select({ id: orderEvents.id, orderId: orderEvents.orderId, eventType: orderEvents.eventType, fromStatus: orderEvents.fromStatus, toStatus: orderEvents.toStatus, note: orderEvents.note, createdAt: orderEvents.createdAt }).from(orderEvents).where(inArray(orderEvents.orderId, orderIds)).orderBy(asc(orderEvents.sequence));
    const eventsByOrder = new Map<string, NonNullable<AdminOrderOversight["events"]>>();
    for (const event of persistedEvents) {
      const events = eventsByOrder.get(event.orderId) ?? [];
      events.push({ id: event.id, eventType: event.eventType, fromStatus: event.fromStatus, toStatus: event.toStatus, note: event.note, createdAt: event.createdAt.toISOString() });
      eventsByOrder.set(event.orderId, events);
    }
    const itemsByOrder = new Map<string, AdminOrderOversight["items"]>();
    for (const item of persistedItems) {
      const items = itemsByOrder.get(item.orderId) ?? [];
      items.push({
        id: item.id,
        seller: { id: item.sellerId, name: item.sellerName },
        product: { id: item.productId, name: item.productName, imageUrl: item.productImageUrl },
        ...(item.variantSku && item.variantOptions ? { variant: { sku: item.variantSku, options: item.variantOptions } } : {}),
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        fulfillmentStatus: item.fulfillmentStatus,
        collectionRecorded: item.codCollectedAt !== null,
      });
      itemsByOrder.set(item.orderId, items);
    }
    return persistedOrders.map((order) => ({
      id: order.id,
      reference: order.reference,
      createdAt: order.createdAt.toISOString(),
      status: order.status,
      paymentStatus: order.paymentStatus,
      total: Number(order.total),
      customer: { id: order.customerId, name: order.customerName },
      events: eventsByOrder.get(order.id) ?? [],
      items: itemsByOrder.get(order.id) ?? [],
    }));
  }
}
