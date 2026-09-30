import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, exists, gte, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { orderEvents, orderItems, orders, products, productVariants, accounts, addresses, commissionRecords, promotions, sellerProfiles, codOutbox } from "../../db/schema/index.js";
import { createCodEventPayload } from "./cod.js";
import { calculatePromotionPrice, selectActiveProductPromotion } from "../promotions/promotion-pricing.js";
import type { CustomerOrderTracking, Order, SellerOrder } from "./order.types.js";
import type { CheckoutItem, OrderRepository } from "./order.repository.js";
import { PostgresSellerNotificationRepository } from "../notifications/postgres-seller-notification.repository.js";
import type { SellerNotificationRepository } from "../notifications/seller-notification.repository.js";

type StoredOrderItem = { productId: string | null; variantId: string | null; variantSku: string | null; variantOptions: Record<string, string> | null; quantity: number; unitPrice: string; baseUnitPrice?: string | null; promotionId?: string | null; promotionName?: string | null; discountPercent?: string | null };
export function promotionSnapshotForOrderItem(item: { baseUnitPrice: number; promotionId?: string; promotionName?: string; discountPercent?: number }) {
  return item.promotionId && item.promotionName && item.discountPercent !== undefined
    ? { baseUnitPrice: item.baseUnitPrice.toFixed(2), promotionId: item.promotionId, promotionName: item.promotionName, discountPercent: item.discountPercent.toFixed(2) }
    : {};
}
const toOrderItem = (item: StoredOrderItem) => ({ productId: item.productId ?? "", ...(item.variantId ? { variantId: item.variantId, variantSku: item.variantSku!, variantOptions: item.variantOptions! } : {}), quantity: item.quantity, unitPrice: Number(item.unitPrice), ...(item.baseUnitPrice ? { baseUnitPrice: Number(item.baseUnitPrice) } : {}), ...(item.promotionId && item.promotionName && item.discountPercent ? { promotionId: item.promotionId, promotionName: item.promotionName, discountPercent: Number(item.discountPercent) } : {}) });
const orderItemSnapshotFields = { productId: orderItems.productId, variantId: orderItems.variantId, variantSku: orderItems.variantSku, variantOptions: orderItems.variantOptions, quantity: orderItems.quantity, unitPrice: orderItems.unitPrice, baseUnitPrice: orderItems.baseUnitPrice, promotionId: orderItems.promotionId, promotionName: orderItems.promotionName, discountPercent: orderItems.discountPercent };
const asOrder = (order: { id: string; reference: string; customerId: string; total: string; status: "pending" | "confirmed" | "cancelled"; paymentStatus: "unpaid" | "collected"; paymentMethod?: string; createdAt: Date }, items: StoredOrderItem[]): Order => ({ id: order.id, reference: order.reference, customerId: order.customerId, total: Number(order.total), status: order.status, paymentMethod: "cod", paymentStatus: order.paymentStatus, createdAt: order.createdAt.toISOString(), items: items.map(toOrderItem) });

export class PostgresOrderRepository implements OrderRepository {
  constructor(private readonly notifications: Pick<SellerNotificationRepository, "recordOrderLineCreated"> = new PostgresSellerNotificationRepository()) {}

  async checkout(input: { customerId: string; shippingAddressId: string; items: CheckoutItem[]; idempotencyKey: string }) {
    if (!this.notifications || typeof this.notifications.recordOrderLineCreated !== "function") throw new Error("Notification support is required for checkout");
    return db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.customerId} || ':' || ${input.idempotencyKey}))`);
      const [existing] = await tx.select().from(orders).where(and(eq(orders.customerId, input.customerId), eq(orders.idempotencyKey, input.idempotencyKey))).limit(1);
      if (existing) {
        const items = await tx.select(orderItemSnapshotFields).from(orderItems).where(eq(orderItems.orderId, existing.id));
        return asOrder(existing, items);
      }
      const [shippingAddress] = await tx.select().from(addresses).where(and(eq(addresses.id, input.shippingAddressId), eq(addresses.accountId, input.customerId))).limit(1);
      if (!shippingAddress) throw new Error("A shipping address is unavailable");
      const shippingAddressSnapshot = { recipientName: shippingAddress.recipientName, phone: shippingAddress.phone, line1: shippingAddress.line1, ...(shippingAddress.line2 ? { line2: shippingAddress.line2 } : {}), city: shippingAddress.city, ...(shippingAddress.region ? { region: shippingAddress.region } : {}), ...(shippingAddress.postalCode ? { postalCode: shippingAddress.postalCode } : {}), country: shippingAddress.country };
      const purchased: { productId: string; variantId?: string; variantSku?: string; variantOptions?: Record<string, string>; quantity: number; unitPrice: number; baseUnitPrice: number; promotionId?: string; promotionName?: string; discountPercent?: number; productName: string; sellerId: string; sellerName: string; productImageUrl: string }[] = [];
      for (const item of input.items) {
        const activeSellerProduct = exists(tx.select({ id: products.id }).from(products).innerJoin(sellerProfiles, and(eq(sellerProfiles.accountId, products.sellerId), eq(sellerProfiles.status, "active"))).where(and(eq(products.id, item.productId), eq(products.isPublished, true))));
        const [inventory] = item.variantId
          ? await tx.update(productVariants).set({ stock: sql`${productVariants.stock} - ${item.quantity}`, updatedAt: new Date() }).where(and(eq(productVariants.id, item.variantId), eq(productVariants.productId, item.productId), gte(productVariants.stock, item.quantity), activeSellerProduct)).returning({ id: productVariants.id, sku: productVariants.sku, options: productVariants.options, price: productVariants.price })
          : await tx.update(products).set({ stock: sql`${products.stock} - ${item.quantity}`, updatedAt: new Date() }).where(and(eq(products.id, item.productId), gte(products.stock, item.quantity), activeSellerProduct)).returning({ id: products.id, sku: sql<string | null>`null`, options: sql<Record<string, string> | null>`null`, price: products.price });
        if (!inventory) throw new Error("A product or variant is unavailable or out of stock");
        const [product] = await tx.select({ id: products.id, name: products.name, sellerId: products.sellerId, primaryImageUrl: products.primaryImageUrl }).from(products).where(eq(products.id, item.productId)).limit(1);
        if (!product?.sellerId) throw new Error("A product seller is unavailable");
        const [seller] = await tx.select({ id: accounts.id, name: accounts.name }).from(accounts).where(eq(accounts.id, product.sellerId)).limit(1);
        if (!seller) throw new Error("A product seller is unavailable");
        const applicablePromotions = await tx.select({ id: promotions.id, name: promotions.name, scope: promotions.scope, discountPercent: promotions.discountPercent, startsAt: promotions.startsAt, endsAt: promotions.endsAt, createdAt: promotions.createdAt }).from(promotions).where(and(eq(promotions.productId, product.id), eq(promotions.scope, "product")));
        const promotion = selectActiveProductPromotion(applicablePromotions, new Date());
        const priced = promotion ? calculatePromotionPrice(inventory.price, promotion.discountPercent) : calculatePromotionPrice(inventory.price, "0.01");
        const baseUnitPrice = Number(inventory.price);
        const unitPrice = promotion ? priced.effectiveUnitPrice : baseUnitPrice;
        purchased.push({ productId: product.id, ...(item.variantId ? { variantId: item.variantId, variantSku: inventory.sku!, variantOptions: inventory.options! } : {}), quantity: item.quantity, unitPrice, baseUnitPrice, ...(promotion ? { promotionId: promotion.id, promotionName: promotion.name, discountPercent: Number(promotion.discountPercent) } : {}), productName: product.name, sellerId: seller.id, sellerName: seller.name, productImageUrl: product.primaryImageUrl });
      }
      const total = purchased.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      const [order] = await tx.insert(orders).values({ customerId: input.customerId, reference: `NX-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`, idempotencyKey: input.idempotencyKey, shippingAddressSnapshot, total: total.toFixed(2) }).returning();
      const insertedItems = await tx.insert(orderItems).values(purchased.map((item) => ({ orderId: order.id, productId: item.productId, variantId: item.variantId, variantSku: item.variantSku, variantOptions: item.variantOptions, sellerId: item.sellerId, sellerName: item.sellerName, productName: item.productName, productImageUrl: item.productImageUrl, quantity: item.quantity, unitPrice: item.unitPrice.toFixed(2), ...promotionSnapshotForOrderItem(item) }))).returning({ id: orderItems.id, sellerId: orderItems.sellerId, quantity: orderItems.quantity, unitPrice: orderItems.unitPrice });
      await Promise.all(insertedItems.map((item, index) => this.notifications.recordOrderLineCreated({ sellerId: item.sellerId!, orderId: order.id, orderItemId: item.id, orderReference: order.reference, productName: purchased[index]!.productName, quantity: item.quantity }, tx)));
      const commissionRatePercent = 10;
      await tx.insert(commissionRecords).values(insertedItems.map((item) => { const grossAmount = Number(item.unitPrice) * item.quantity; const commissionAmount = grossAmount * (commissionRatePercent / 100); return { orderItemId: item.id, sellerId: item.sellerId!, grossAmount: grossAmount.toFixed(2), ratePercent: commissionRatePercent.toFixed(2), commissionAmount: commissionAmount.toFixed(2), netAmount: (grossAmount - commissionAmount).toFixed(2) }; }));
      await tx.insert(orderEvents).values([{ orderId: order.id, actorId: input.customerId, eventType: "order_created", toStatus: "pending", sequence: 1 }, ...insertedItems.map((item, index) => ({ orderId: order.id, orderItemId: item.id, actorId: input.customerId, eventType: "fulfillment_pending", toStatus: "pending", sequence: index + 2 }))]);
      for (const item of insertedItems) {
        const [event] = await tx.insert(codOutbox).values({ eventType: "cod.order.created", payload: {} }).returning({ id: codOutbox.id, createdAt: codOutbox.createdAt });
        await tx.update(codOutbox).set({ payload: createCodEventPayload({ eventId: event.id, eventType: "cod.order.created", occurredAt: event.createdAt.toISOString(), orderId: order.id, reference: order.reference, sellerId: item.sellerId, amount: (Number(item.unitPrice) * item.quantity).toFixed(2), status: order.status, paymentStatus: order.paymentStatus }) }).where(eq(codOutbox.id, event.id));
      }
      return asOrder(order, purchased.map((item) => ({ productId: item.productId, variantId: item.variantId ?? null, variantSku: item.variantSku ?? null, variantOptions: item.variantOptions ?? null, quantity: item.quantity, unitPrice: item.unitPrice.toFixed(2), ...promotionSnapshotForOrderItem(item) })));
    });
  }

  async listForCustomer(customerId: string) {
    const persistedOrders = await db.select().from(orders).where(eq(orders.customerId, customerId)).orderBy(desc(orders.createdAt));
    return Promise.all(persistedOrders.map(async (order) => asOrder(order, await db.select(orderItemSnapshotFields).from(orderItems).where(eq(orderItems.orderId, order.id)))));
  }

  async getTrackingForCustomer(input: { customerId: string; orderId: string }): Promise<CustomerOrderTracking | null> {
    const [order] = await db.select({ id: orders.id, reference: orders.reference, status: orders.status, paymentStatus: orders.paymentStatus, createdAt: orders.createdAt }).from(orders).where(and(eq(orders.id, input.orderId), eq(orders.customerId, input.customerId))).limit(1);
    if (!order) return null;
    const [items, events] = await Promise.all([
      db.select({ id: orderItems.id, productName: orderItems.productName, productImageUrl: orderItems.productImageUrl, variantSku: orderItems.variantSku, variantOptions: orderItems.variantOptions, quantity: orderItems.quantity, unitPrice: orderItems.unitPrice, fulfillmentStatus: orderItems.fulfillmentStatus }).from(orderItems).where(eq(orderItems.orderId, order.id)),
      db.select({ id: orderEvents.id, orderItemId: orderEvents.orderItemId, eventType: orderEvents.eventType, fromStatus: orderEvents.fromStatus, toStatus: orderEvents.toStatus, note: orderEvents.note, createdAt: orderEvents.createdAt }).from(orderEvents).where(eq(orderEvents.orderId, order.id)).orderBy(asc(orderEvents.sequence)),
    ]);
    return { id: order.id, reference: order.reference, status: order.status, paymentMethod: "cod", paymentStatus: order.paymentStatus, createdAt: order.createdAt.toISOString(), items: items.map((item) => ({ id: item.id, productName: item.productName, productImageUrl: item.productImageUrl, ...(item.variantSku ? { variantSku: item.variantSku, variantOptions: item.variantOptions! } : {}), quantity: item.quantity, unitPrice: Number(item.unitPrice), fulfillmentStatus: item.fulfillmentStatus })), events: events.map((event) => ({ ...event, createdAt: event.createdAt.toISOString() })) };
  }

  async listForSeller(sellerId: string): Promise<SellerOrder[]> {
    const rows = await db.select({ id: orders.id, reference: orders.reference, status: orders.status, createdAt: orders.createdAt, orderItemId: orderItems.id, productName: orderItems.productName, quantity: orderItems.quantity, fulfillmentStatus: orderItems.fulfillmentStatus }).from(orderItems).innerJoin(orders, eq(orderItems.orderId, orders.id)).where(eq(orderItems.sellerId, sellerId)).orderBy(desc(orders.createdAt));
    const grouped = new Map<string, SellerOrder>();
    for (const row of rows) { const order = grouped.get(row.id) ?? { id: row.id, reference: row.reference, status: row.status, createdAt: row.createdAt.toISOString(), items: [] }; order.items.push({ id: row.orderItemId, productName: row.productName, quantity: row.quantity, fulfillmentStatus: row.fulfillmentStatus }); grouped.set(row.id, order); }
    return [...grouped.values()];
  }
}
