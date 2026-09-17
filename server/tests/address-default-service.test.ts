import assert from "node:assert/strict";
import test from "node:test";
import { AddressService } from "../src/modules/addresses/services/address-service.js";

const address = { id: "11111111-1111-4111-8111-111111111111", recipientName: "Sabbir Ahmed", phone: "+880****0000", line1: "House 1, Road 2", city: "Dhaka", country: "BD", isDefault: true };

test("address service delegates default selection through the account-scoped repository operation", async () => {
  let received: unknown;
  const service = new AddressService({
    async create() { return address; },
    async list() { return []; },
    async update() { return address; },
    async selectDefault(input) { received = input; return address; },
    async remove() {},
  });

  assert.deepEqual(await service.selectDefault({ accountId: "account-1", addressId: address.id }), address);
  assert.deepEqual(received, { accountId: "account-1", addressId: address.id });
});

test("address service preserves an ownership-concealing missing result from default selection", async () => {
  const service = new AddressService({
    async create() { return address; },
    async list() { return []; },
    async update() { return address; },
    async selectDefault() { return null; },
    async remove() {},
  });

  assert.equal(await service.selectDefault({ accountId: "account-1", addressId: address.id }), null);
});
