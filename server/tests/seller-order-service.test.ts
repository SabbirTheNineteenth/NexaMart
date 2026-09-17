import assert from "node:assert/strict";
import test from "node:test";
import { OrderService } from "../src/modules/orders/services/order-service.js";

test("order service delegates seller order reads to its repository", async () => {
  let requestedSeller = "";
  const service = new OrderService({
    async checkout() { throw new Error("not used"); },
    async listForCustomer() { return []; },
    async listForSeller(sellerId: string) { requestedSeller = sellerId; return []; },
  });
  await service.listForSeller("seller-1");
  assert.equal(requestedSeller, "seller-1");
});
