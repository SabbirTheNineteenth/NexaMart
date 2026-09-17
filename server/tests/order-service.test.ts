import assert from "node:assert/strict";
import test from "node:test";
import { OrderService } from "../src/modules/orders/services/order-service.js";

const checkoutInput = { customerId: "account-1", shippingAddressId: "11111111-1111-4111-8111-111111111111", idempotencyKey: "checkout-1", items: [{ productId: "product-1", quantity: 2 }] };
const orderResult = { id: "order-1", reference: "NX-ORDER-1", customerId: "account-1", items: [], total: 258, status: "pending" as const, paymentStatus: "unpaid" as const, createdAt: "2026-09-11T00:00:00.000Z" };

test("order service delegates authenticated checkout with its idempotency key to a transaction repository", async () => {
  let received: typeof checkoutInput | undefined;
  const orders = new OrderService({
    async checkout(input: typeof checkoutInput) { received = input; return orderResult; },
    async listForCustomer() { return []; }, async listForSeller() { return []; },
  });
  const order = await orders.checkout(checkoutInput);
  assert.equal(order.reference, "NX-ORDER-1");
  assert.deepEqual(received, checkoutInput);
});

test("order service rejects checkout with no items before opening a transaction", async () => {
  let writes = 0;
  const orders = new OrderService({ async checkout() { writes += 1; throw new Error("unexpected"); }, async listForCustomer() { return []; }, async listForSeller() { return []; } });
  await assert.rejects(() => orders.checkout({ customerId: "account-1", shippingAddressId: "11111111-1111-4111-8111-111111111111", idempotencyKey: "checkout-1", items: [] }), /Order needs valid items/);
  assert.equal(writes, 0);
});

test("order service combines duplicate product quantities before checkout", async () => {
  let received: { customerId: string; shippingAddressId: string; idempotencyKey: string; items: { productId: string; quantity: number }[] } | undefined;
  const orders = new OrderService({
    async checkout(input: { customerId: string; shippingAddressId: string; idempotencyKey: string; items: { productId: string; quantity: number }[] }) { received = input; return orderResult; },
    async listForCustomer() { return []; }, async listForSeller() { return []; },
  });
  await orders.checkout({ customerId: "account-1", shippingAddressId: "11111111-1111-4111-8111-111111111111", idempotencyKey: "checkout-1", items: [{ productId: "product-1", quantity: 1 }, { productId: "product-1", quantity: 2 }] });
  assert.deepEqual(received, { customerId: "account-1", shippingAddressId: "11111111-1111-4111-8111-111111111111", idempotencyKey: "checkout-1", items: [{ productId: "product-1", quantity: 3 }] });
});
