import type { CustomerOrderTracking, Order, SellerOrder } from "./order.types.js";

export type CheckoutItem = { productId: string; variantId?: string; quantity: number };
export type OrderRepository = {
  checkout(input: { customerId: string; shippingAddressId: string; items: CheckoutItem[]; idempotencyKey: string }): Promise<Order>;
  listForCustomer(customerId: string): Promise<Order[]>;
  getTrackingForCustomer(input: { customerId: string; orderId: string }): Promise<CustomerOrderTracking | null>;
  listForSeller(sellerId: string): Promise<SellerOrder[]>;
};
