import assert from "node:assert/strict";
import test from "node:test";
import { PostgresAddressRepository } from "../src/modules/addresses/postgres-address.repository.js";

const input = { accountId: "account-1", addressId: "11111111-1111-4111-8111-111111111111" };
const row = { id: input.addressId, accountId: input.accountId, recipientName: "Sabbir Ahmed", phone: "+880****0000", line1: "House 1, Road 2", line2: null, city: "Dhaka", region: null, postalCode: null, country: "BD", isDefault: true, createdAt: new Date(), updatedAt: new Date() };

const createDatabase = (owned: boolean) => {
  const mutations: unknown[] = [];
  const transaction = async (callback: (tx: unknown) => Promise<unknown>) => callback(database);
  const database = {
    transaction,
    select() {
      const query = { from() { return query; }, where() { return query; }, limit() { return Promise.resolve(owned ? [{ id: input.addressId }] : []); } };
      return query;
    },
    update() {
      const query = { set(values: unknown) { mutations.push(values); return query; }, where() { return query; }, returning() { return Promise.resolve([row]); } };
      return query;
    },
  };
  return { database, mutations };
};

test("address repository atomically makes an owned address the sole account default and returns a safe projection", async () => {
  const { database, mutations } = createDatabase(true);

  const address = await new PostgresAddressRepository(database as never).selectDefault(input);

  assert.equal(mutations.length, 2);
  assert.deepEqual(mutations[0], { isDefault: false, updatedAt: (mutations[0] as { updatedAt: unknown }).updatedAt });
  assert.deepEqual(mutations[1], { isDefault: true, updatedAt: (mutations[1] as { updatedAt: unknown }).updatedAt });
  assert.deepEqual(address, { id: row.id, recipientName: row.recipientName, phone: row.phone, line1: row.line1, city: row.city, country: row.country, isDefault: true });
  assert.equal("accountId" in (address ?? {}), false);
  assert.equal("createdAt" in (address ?? {}), false);
});

test("address repository conceals an unowned address without changing any default", async () => {
  const { database, mutations } = createDatabase(false);

  assert.equal(await new PostgresAddressRepository(database as never).selectDefault(input), null);
  assert.deepEqual(mutations, []);
});
