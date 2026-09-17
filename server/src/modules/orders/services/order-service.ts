import type { CheckoutItem, OrderRepository } from "../order.repository.js";

export class OrderService {
  constructor(private readonly repository: OrderRepository) {}

  async checkout(input: { customerId: string; shippingAddressId: string; items: CheckoutItem[]; idempotencyKey: string }) {
    if (!input.items.length || !input.shippingAddressId || !input.idempotencyKey || input.items.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1)) throw new Error("Order needs valid items");
    const quantities = new Map<string, CheckoutItem>();
    for (const item of input.items) {
      const key = `${item.productId}:${item.variantId ?? "product"}`;
      const existing = quantities.get(key);
      quantities.set(key, existing ? { ...existing, quantity: existing.quantity + item.quantity } : item);
    }
    return this.repository.checkout({ customerId: input.customerId, idempotencyKey: input.idempotencyKey, shippingAddressId: input.shippingAddressId, items: [...quantities.values()] });
  }

  async listForCustomer(customerId: string) { return this.repository.listForCustomer(customerId); }
  async getTrackingForCustomer(input: { customerId: string; orderId: string }) { return this.repository.getTrackingForCustomer(input); }
  async listForSeller(sellerId: string) { return this.repository.listForSeller(sellerId); }
}
