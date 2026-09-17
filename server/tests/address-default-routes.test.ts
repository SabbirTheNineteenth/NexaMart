import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createAddressRoutes } from "../src/modules/addresses/address.routes.js";

const account = { id: "account-1", name: "Sabbir", email: "sabbir@example.com", role: "customer" as const, createdAt: "2026-09-11T00:00:00.000Z" };
const address = { id: "11111111-1111-4111-8111-111111111111", recipientName: "Sabbir Ahmed", phone: "+880****0000", line1: "House 1, Road 2", city: "Dhaka", country: "BD", isDefault: true };

const makeApp = (resolved: typeof account | { role: "seller"; id: string; name: string; email: string; createdAt: string } | null, selectDefault: (input: { accountId: string; addressId: string }) => Promise<typeof address | null>) => {
  const routes = createAddressRoutes({
    sessions: { async resolve() { return resolved; } },
    addresses: { async create() { return address; }, async list() { return []; }, async update() { return address; }, async remove() {}, selectDefault },
  } as never);
  const app = new Hono().basePath("/api");
  app.route("/addresses", routes);
  return app;
};

test("customer default-address selection derives ownership from the session and returns a safe address", async () => {
  let received: unknown;
  const app = makeApp(account, async (input) => { received = input; return address; });

  const response = await app.request(`http://localhost/api/addresses/${address.id}/default`, { method: "PATCH", headers: { Cookie: "nexamart_session=valid-token" } });

  assert.equal(response.status, 200);
  assert.deepEqual(received, { accountId: account.id, addressId: address.id });
  assert.deepEqual(await response.json(), { address });
});

test("customer default-address selection rejects unauthenticated, non-customer, and malformed requests before mutation", async () => {
  let calls = 0;
  const selectDefault = async () => { calls += 1; return address; };
  const seller = { ...account, role: "seller" as const };

  const missing = await makeApp(null, selectDefault).request(`http://localhost/api/addresses/${address.id}/default`, { method: "PATCH" });
  const forbidden = await makeApp(seller, selectDefault).request(`http://localhost/api/addresses/${address.id}/default`, { method: "PATCH", headers: { Cookie: "nexamart_session=valid-token" } });
  const malformed = await makeApp(account, selectDefault).request("http://localhost/api/addresses/not-a-uuid/default", { method: "PATCH", headers: { Cookie: "nexamart_session=valid-token" } });

  assert.equal(missing.status, 401);
  assert.equal(forbidden.status, 403);
  assert.equal(malformed.status, 400);
  assert.equal(calls, 0);
});

test("customer default-address selection conceals unowned addresses and does not mutate another account", async () => {
  let calls = 0;
  const app = makeApp(account, async () => { calls += 1; return null; });

  const response = await app.request(`http://localhost/api/addresses/${address.id}/default`, { method: "PATCH", headers: { Cookie: "nexamart_session=valid-token" } });

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "Address not found" });
  assert.equal(calls, 1);
});
