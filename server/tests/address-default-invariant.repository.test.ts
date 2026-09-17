import assert from "node:assert/strict";
import test from "node:test";
import { PostgresAddressRepository } from "../src/modules/addresses/postgres-address.repository.js";

const input = { accountId: "account-1", addressId: "11111111-1111-4111-8111-111111111111" };
const row = { id: input.addressId, accountId: input.accountId, recipientName: "Sabbir Ahmed", phone: "+880****0000", line1: "House 1, Road 2", line2: null, city: "Dhaka", region: null, postalCode: null, country: "BD", isDefault: true, createdAt: new Date(), updatedAt: new Date() };

test("first address is persisted as default even when a forged input requests false", async () => {
  let inserted: unknown;
  const database = {
    transaction: async (callback: (tx: unknown) => Promise<unknown>) => callback(database),
    select() { const query = { from() { return query; }, where() { return query; }, limit() { return Promise.resolve([]); } }; return query; },
    update() { const query = { set() { return query; }, where() { return query; } }; return query; },
    insert() { const query = { values(values: unknown) { inserted = values; return query; }, returning() { return Promise.resolve([row]); } }; return query; },
  };

  await new PostgresAddressRepository(database as never).create({ accountId: input.accountId, recipientName: row.recipientName, phone: row.phone, line1: row.line1, city: row.city, country: row.country, isDefault: false } as never);
  assert.deepEqual(inserted, { accountId: input.accountId, recipientName: row.recipientName, phone: row.phone, line1: row.line1, city: row.city, country: row.country, isDefault: true });
});

test("address updates clear explicitly null optional fields", async () => {
  let saved: unknown;
  const database = {
    transaction: async (callback: (tx: unknown) => Promise<unknown>) => callback(database),
    select() { const query = { from() { return query; }, where() { return query; }, limit() { return Promise.resolve([{ id: input.addressId }]); } }; return query; },
    update() { const query = { set(values: unknown) { saved = values; return query; }, where() { return query; }, returning() { return Promise.resolve([row]); } }; return query; },
  };

  await new PostgresAddressRepository(database as never).update({ ...input, city: "Chattogram", line2: null, region: null, postalCode: null });
  assert.deepEqual(saved, { city: "Chattogram", line2: null, region: null, postalCode: null, updatedAt: (saved as { updatedAt: unknown }).updatedAt });
});

test("address updates preserve populated optional fields omitted from a partial PATCH", async () => {
  let saved: unknown;
  const database = {
    transaction: async (callback: (tx: unknown) => Promise<unknown>) => callback(database),
    select() { const query = { from() { return query; }, where() { return query; }, limit() { return Promise.resolve([{ id: input.addressId }]); } }; return query; },
    update() { const query = { set(values: unknown) { saved = values; return query; }, where() { return query; }, returning() { return Promise.resolve([{ ...row, line2: "Apartment 4B", region: "Dhaka", postalCode: "1205", city: "Chattogram" }]); } }; return query; },
  };

  await new PostgresAddressRepository(database as never).update({ ...input, city: "Chattogram" });
  assert.deepEqual(saved, { city: "Chattogram", updatedAt: (saved as { updatedAt: unknown }).updatedAt });
});

test("removing a default promotes a deterministic remaining address in the same transaction", async () => {
  const mutations: unknown[] = [];
  const replacement = { ...row, id: "22222222-2222-4222-8222-222222222222", isDefault: false };
  let selects = 0;
  const database = {
    transaction: async (callback: (tx: unknown) => Promise<unknown>) => callback(database),
    delete() { const query = { where() { return query; }, returning() { return Promise.resolve([{ isDefault: true }]); } }; return query; },
    select() { selects += 1; const query = { from() { return query; }, where() { return query; }, orderBy() { return query; }, limit() { return Promise.resolve([{ id: replacement.id }]); } }; return query; },
    update() { const query = { set(values: unknown) { mutations.push(values); return query; }, where() { return query; } }; return query; },
  };

  await new PostgresAddressRepository(database as never).remove(input);
  assert.equal(selects, 1);
  assert.deepEqual(mutations, [{ isDefault: true, updatedAt: (mutations[0] as { updatedAt: unknown }).updatedAt }]);
});

test("removing an absent or unowned address is idempotent and does not promote another address", async () => {
  let selects = 0;
  let updates = 0;
  const database = {
    transaction: async (callback: (tx: unknown) => Promise<unknown>) => callback(database),
    delete() { const query = { where() { return query; }, returning() { return Promise.resolve([]); } }; return query; },
    select() { selects += 1; throw new Error("must not select another account address"); },
    update() { updates += 1; throw new Error("must not alter another account"); },
  };

  await new PostgresAddressRepository(database as never).remove(input);
  assert.equal(selects, 0);
  assert.equal(updates, 0);
});
