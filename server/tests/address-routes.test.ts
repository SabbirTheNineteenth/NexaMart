import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createAddressRoutes } from "../src/modules/addresses/address.routes.js";

const account = { id: "account-1", name: "Sabbir", email: "sabbir@example.com", role: "customer" as const, createdAt: "2026-09-11T00:00:00.000Z" };
const address = { id: "11111111-1111-4111-8111-111111111111", recipientName: "Sabbir Ahmed", phone: "+8801700000000", line1: "House 1, Road 2", city: "Dhaka", country: "BD", isDefault: true };

test("address route creates an address for the authenticated account", async () => {
  let received: unknown;
  const routes = createAddressRoutes({
    sessions: { async resolve() { return account; } },
    addresses: { async create(input) { received = input; return address; }, async list() { return []; }, async update() { return address; }, async remove() {} },
  });
  const app = new Hono().basePath("/api");
  app.route("/addresses", routes);
  const response = await app.request("http://localhost/api/addresses", { method: "POST", headers: { "Content-Type": "application/json", Cookie: "nexamart_session=valid-token" }, body: JSON.stringify({ ...address, id: undefined, accountId: "attacker" }) });
  assert.equal(response.status, 201);
  assert.deepEqual(received, { accountId: account.id, recipientName: address.recipientName, phone: address.phone, line1: address.line1, city: address.city, country: address.country });
});

test("address route forwards an omitted default flag to preserve existing default selection", async () => {
  let received: unknown;
  const routes = createAddressRoutes({
    sessions: { async resolve() { return account; } },
    addresses: { async create(input) { received = input; return address; }, async list() { return []; }, async update() { return address; }, async remove() {} },
  });
  const app = new Hono().basePath("/api");
  app.route("/addresses", routes);
  const response = await app.request("http://localhost/api/addresses", { method: "POST", headers: { "Content-Type": "application/json", Cookie: "nexamart_session=valid-token" }, body: JSON.stringify({ recipientName: address.recipientName, phone: address.phone, line1: address.line1, city: address.city, country: address.country }) });

  assert.equal(response.status, 201);
  assert.deepEqual(received, { accountId: account.id, recipientName: address.recipientName, phone: address.phone, line1: address.line1, city: address.city, country: address.country });
});

test("address creation normalizes blank optional fields and never forwards a forged default flag", async () => {
  let received: unknown;
  const routes = createAddressRoutes({
    sessions: { async resolve() { return account; } },
    addresses: { async create(input) { received = input; return address; }, async list() { return []; }, async update() { return address; }, async selectDefault() { return address; }, async remove() {} },
  });
  const app = new Hono().basePath("/api");
  app.route("/addresses", routes);

  const response = await app.request("http://localhost/api/addresses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: "nexamart_session=valid-token" },
    body: JSON.stringify({ recipientName: address.recipientName, phone: address.phone, line1: address.line1, line2: "   ", city: address.city, region: "\t", postalCode: " ", country: address.country, isDefault: false }),
  });

  assert.equal(response.status, 201);
  assert.deepEqual(received, { accountId: account.id, recipientName: address.recipientName, phone: address.phone, line1: address.line1, city: address.city, country: address.country });
});

test("address deletion is scoped to the authenticated account", async () => {
  let received: unknown;
  const routes = createAddressRoutes({
    sessions: { async resolve() { return account; } },
    addresses: { async create() { return address; }, async list() { return []; }, async update() { return address; }, async remove(input) { received = input; } },
  });
  const app = new Hono().basePath("/api");
  app.route("/addresses", routes);
  const response = await app.request(`http://localhost/api/addresses/${address.id}`, { method: "DELETE", headers: { Cookie: "nexamart_session=valid-token" } });
  assert.equal(response.status, 204);
  assert.deepEqual(received, { accountId: account.id, addressId: address.id });
});

test("address update derives ownership from the authenticated session", async () => {
  let received: unknown;
  const routes = createAddressRoutes({
    sessions: { async resolve() { return account; } },
    addresses: {
      async create() { return address; },
      async list() { return []; },
      async remove() {},
      async update(input: { accountId: string; addressId: string; city?: string }) { received = input; return { ...address, city: input.city ?? address.city }; },
    } as never,
  });
  const app = new Hono().basePath("/api");
  app.route("/addresses", routes);

  const response = await app.request(`http://localhost/api/addresses/${address.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: "nexamart_session=valid-token" },
    body: JSON.stringify({ city: "Chattogram" }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(received, { accountId: account.id, addressId: address.id, city: "Chattogram" });
  assert.deepEqual(await response.json(), { address: { ...address, city: "Chattogram" } });
});

test("address update converts explicit null and blank optional fields to null while rejecting default changes", async () => {
  let received: unknown;
  let calls = 0;
  const routes = createAddressRoutes({
    sessions: { async resolve() { return account; } },
    addresses: {
      async create() { return address; }, async list() { return []; }, async selectDefault() { return address; }, async remove() {},
      async update(input) { calls += 1; received = input; return address; },
    },
  });
  const app = new Hono().basePath("/api");
  app.route("/addresses", routes);

  const blankOptional = await app.request(`http://localhost/api/addresses/${address.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Cookie: "nexamart_session=valid-token" }, body: JSON.stringify({ line2: null, region: "\t", postalCode: "  " }) });
  const forgedDefault = await app.request(`http://localhost/api/addresses/${address.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Cookie: "nexamart_session=valid-token" }, body: JSON.stringify({ isDefault: true }) });

  assert.equal(blankOptional.status, 200);
  assert.deepEqual(received, { accountId: account.id, addressId: address.id, line2: null, region: null, postalCode: null });
  assert.equal(forgedDefault.status, 400);
  assert.equal(calls, 1);
});

test("address update rejects unauthenticated and non-customer sessions", async () => {
  let calls = 0;
  const sellerAccount = { ...account, role: "seller" as const };
  const makeApp = (resolved: typeof account | typeof sellerAccount | null) => {
    const routes = createAddressRoutes({
      sessions: { async resolve() { return resolved; } },
      addresses: { async create() { return address; }, async list() { return []; }, async update() { calls += 1; return address; }, async remove() {} },
    });
    const app = new Hono().basePath("/api");
    app.route("/addresses", routes);
    return app;
  };
  const missing = await makeApp(null).request(`http://localhost/api/addresses/${address.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ city: "Dhaka" }) });
  const seller = await makeApp(sellerAccount).request(`http://localhost/api/addresses/${address.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Cookie: "nexamart_session=token" }, body: JSON.stringify({ city: "Dhaka" }) });
  assert.equal(missing.status, 401);
  assert.equal(seller.status, 403);
  assert.equal(calls, 0);
});

test("address update rejects malformed identifiers and non-editable or invalid payloads", async () => {
  let calls = 0;
  const routes = createAddressRoutes({
    sessions: { async resolve() { return account; } },
    addresses: { async create() { return address; }, async list() { return []; }, async update() { calls += 1; return address; }, async remove() {} },
  });
  const app = new Hono().basePath("/api");
  app.route("/addresses", routes);
  for (const [id, body] of [["not-a-uuid", { city: "Dhaka" }], [address.id, {}], [address.id, { accountId: "attacker" }], [address.id, { city: "" }]]) {
    const response = await app.request(`http://localhost/api/addresses/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Cookie: "nexamart_session=token" }, body: JSON.stringify(body) });
    assert.equal(response.status, 400);
  }
  assert.equal(calls, 0);
});

test("address update conceals missing or unowned addresses", async () => {
  const routes = createAddressRoutes({
    sessions: { async resolve() { return account; } },
    addresses: { async create() { return address; }, async list() { return []; }, async update() { return null; }, async remove() {} },
  });
  const app = new Hono().basePath("/api");
  app.route("/addresses", routes);
  const response = await app.request(`http://localhost/api/addresses/${address.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Cookie: "nexamart_session=token" }, body: JSON.stringify({ city: "Dhaka" }) });
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "Address not found" });
});

test("address list, creation, and deletion reject unauthenticated, seller, and admin sessions before actions", async () => {
  const seller = { ...account, role: "seller" as const };
  const admin = { ...account, role: "admin" as const };
  const requests = [
    { method: "GET", path: "", body: undefined },
    { method: "POST", path: "", body: { recipientName: address.recipientName, phone: address.phone, line1: address.line1, city: address.city, country: address.country } },
    { method: "DELETE", path: `/${address.id}`, body: undefined },
  ] as const;

  for (const resolved of [null, seller, admin]) {
    let calls = 0;
    const routes = createAddressRoutes({
      sessions: { async resolve() { return resolved; } },
      addresses: {
        async create() { calls += 1; return address; },
        async list() { calls += 1; return [address]; },
        async update() { return address; },
        async remove() { calls += 1; },
      },
    });
    const app = new Hono().basePath("/api");
    app.route("/addresses", routes);

    for (const request of requests) {
      const response = await app.request(`http://localhost/api/addresses${request.path}`, {
        method: request.method,
        headers: { ...(resolved ? { Cookie: "nexamart_session=token" } : {}), ...(request.body ? { "Content-Type": "application/json" } : {}) },
        ...(request.body ? { body: JSON.stringify(request.body) } : {}),
      });
      assert.equal(response.status, resolved ? 403 : 401);
    }
    assert.equal(calls, 0);
  }
});

test("customer address list and idempotent deletion retain session-scoped and validation contracts", async () => {
  let listedFor: unknown;
  const removals: unknown[] = [];
  const routes = createAddressRoutes({
    sessions: { async resolve() { return account; } },
    addresses: {
      async create() { return address; },
      async list(accountId) { listedFor = accountId; return [address]; },
      async update() { return address; },
      async remove(input) { removals.push(input); },
    },
  });
  const app = new Hono().basePath("/api");
  app.route("/addresses", routes);

  const list = await app.request("http://localhost/api/addresses", { headers: { Cookie: "nexamart_session=token" } });
  const firstDelete = await app.request(`http://localhost/api/addresses/${address.id}`, { method: "DELETE", headers: { Cookie: "nexamart_session=token" } });
  const repeatedDelete = await app.request(`http://localhost/api/addresses/${address.id}`, { method: "DELETE", headers: { Cookie: "nexamart_session=token" } });
  const malformedDelete = await app.request("http://localhost/api/addresses/not-a-uuid", { method: "DELETE", headers: { Cookie: "nexamart_session=token" } });

  assert.equal(list.status, 200);
  assert.deepEqual(await list.json(), { addresses: [address] });
  assert.equal(listedFor, account.id);
  assert.equal(firstDelete.status, 204);
  assert.equal(repeatedDelete.status, 204);
  assert.equal(malformedDelete.status, 400);
  assert.deepEqual(await malformedDelete.json(), { error: "Invalid address" });
  assert.deepEqual(removals, [
    { accountId: account.id, addressId: address.id },
    { accountId: account.id, addressId: address.id },
  ]);
});
