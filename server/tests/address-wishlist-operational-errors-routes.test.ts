import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createAddressRoutes } from "../src/modules/addresses/address.routes.js";
import { createWishlistRoutes } from "../src/modules/wishlist/wishlist.routes.js";

const account = { id: "account-1", name: "Sabbir", email: "sabbir@example.com", role: "customer" as const, createdAt: "2026-09-11T00:00:00.000Z" };

test("address list returns a generic JSON failure without persistence details", async () => {
  const routes = createAddressRoutes({
    sessions: { async resolve() { return account; } },
    addresses: {
      async create() { throw new Error("database password leaked"); },
      async list() { throw new Error("database password leaked"); },
      async update() { throw new Error("database password leaked"); },
      async selectDefault() { throw new Error("database password leaked"); },
      async remove() { throw new Error("database password leaked"); },
    },
  });
  const app = new Hono().basePath("/api");
  app.route("/addresses", routes);

  const response = await app.request("http://localhost/api/addresses", { headers: { Cookie: "nexamart_session=valid-token" } });

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Unable to list addresses" });
});

test("address creation returns a generic JSON failure without persistence details", async () => {
  const routes = createAddressRoutes({
    sessions: { async resolve() { return account; } },
    addresses: {
      async create() { throw new Error("duplicate key detail"); },
      async list() { return []; },
      async update() { return null; },
      async selectDefault() { return null; },
      async remove() {},
    },
  });
  const app = new Hono().basePath("/api");
  app.route("/addresses", routes);

  const response = await app.request("http://localhost/api/addresses", { method: "POST", headers: { "Content-Type": "application/json", Cookie: "nexamart_session=valid-token" }, body: JSON.stringify({ recipientName: "Sabbir Ahmed", phone: "+8800000000", line1: "House 1", city: "Dhaka", country: "BD" }) });

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Unable to create address" });
});

for (const [name, path, method, body, failingAction, expectedError] of [
  ["default selection", "/11111111-1111-4111-8111-111111111111/default", "PATCH", undefined, "selectDefault", "Unable to select default address"],
  ["update", "/11111111-1111-4111-8111-111111111111", "PATCH", { city: "Dhaka" }, "update", "Unable to update address"],
  ["removal", "/11111111-1111-4111-8111-111111111111", "DELETE", undefined, "remove", "Unable to remove address"],
] as const) {
  test(`address ${name} returns a generic JSON failure without persistence details`, async () => {
    const failure = async () => { throw new Error("database detail"); };
    const routes = createAddressRoutes({
      sessions: { async resolve() { return account; } },
      addresses: {
        async create() { throw new Error("unexpected"); },
        async list() { return []; },
        async update() { return failingAction === "update" ? failure() : null; },
        async selectDefault() { return failingAction === "selectDefault" ? failure() : null; },
        async remove() { if (failingAction === "remove") await failure(); },
      },
    });
    const app = new Hono().basePath("/api");
    app.route("/addresses", routes);
    const response = await app.request(`http://localhost/api/addresses${path}`, { method, headers: { Cookie: "nexamart_session=valid-token", ...(body ? { "Content-Type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: expectedError });
  });
}

for (const [name, path, method, body, failingAction, expectedError] of [
  ["list", "/items", "GET", undefined, "list", "Unable to list wishlist items"],
  ["addition", "/items", "POST", { productId: "11111111-1111-4111-8111-111111111111" }, "add", "Unable to add wishlist item"],
  ["removal", "/11111111-1111-4111-8111-111111111111", "DELETE", undefined, "remove", "Unable to remove wishlist item"],
] as const) {
  test(`wishlist ${name} returns a generic JSON failure without persistence details`, async () => {
    const failure = async () => { throw new Error("database detail"); };
    const routes = createWishlistRoutes({
      sessions: { async resolve() { return account; } },
      wishlist: {
        async add() { if (failingAction === "add") await failure(); },
        async list() { if (failingAction === "list") return failure(); return []; },
        async remove() { if (failingAction === "remove") await failure(); },
      },
    });
    const app = new Hono().basePath("/api");
    app.route("/wishlist", routes);
    const response = await app.request(`http://localhost/api/wishlist${path}`, { method, headers: { Cookie: "nexamart_session=valid-token", ...(body ? { "Content-Type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: expectedError });
  });
}
