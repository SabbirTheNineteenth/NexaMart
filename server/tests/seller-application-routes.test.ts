import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createSellerApplicationRoutes } from "../src/modules/seller/seller-application.routes.js";

const customer = { id: "customer-1", name: "Sabbir", email: "sabbir@example.com", role: "customer" as const, createdAt: "2026-09-11T00:00:00.000Z" };
const seller = { ...customer, id: "seller-1", role: "seller" as const };
const application = { id: "profile-1", accountId: customer.id, storeName: "Sabbir Studio", storeSlug: "sabbir-studio", status: "pending" as const, createdAt: "2026-09-11T00:00:00.000Z" };

function makeApp(account = customer, actions = {
  async apply(input: { accountId: string; storeName: string; storeSlug: string; description?: string }) { return { ...application, ...input }; },
  async getOwnProfile(accountId: string) { return accountId === customer.id ? application : null; },
  async updateStoreProfile(input: { accountId: string; storeName?: string; description?: string }) { return { ...application, ...input }; },
}) {
  const routes = createSellerApplicationRoutes({ sessions: { async resolve() { return account; } }, sellerProfiles: actions });
  const app = new Hono().basePath("/api");
  app.route("/seller", routes);
  return app;
}

test("seller application binds the pending store profile to the authenticated customer", async () => {
  let received: { accountId: string; storeName: string; storeSlug: string; description?: string } | undefined;
  const app = makeApp(customer, {
    async apply(input) { received = input; return { ...application, ...input }; },
    async getOwnProfile() { return null; },
  });

  const response = await app.request("http://localhost/api/seller/application", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: "nexamart_session=customer-token" },
    body: JSON.stringify({ accountId: "attacker", storeName: "Sabbir Studio", storeSlug: "sabbir-studio", description: "Hand-finished home goods." }),
  });

  assert.equal(response.status, 201);
  assert.deepEqual(received, { accountId: customer.id, storeName: "Sabbir Studio", storeSlug: "sabbir-studio", description: "Hand-finished home goods." });
});

test("seller application rejects a second application for the same account", async () => {
  const app = makeApp(customer, {
    async apply() { throw new Error("A seller application already exists"); },
    async getOwnProfile() { return application; },
  });

  const response = await app.request("http://localhost/api/seller/application", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: "nexamart_session=customer-token" },
    body: JSON.stringify({ storeName: "Sabbir Studio", storeSlug: "sabbir-studio" }),
  });

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "A seller application already exists" });
});

test("seller application maps the store-name unique constraint to a safe conflict", async () => {
  const duplicate = Object.assign(new Error("duplicate key value violates unique constraint seller_profiles_store_name_unique"), {
    code: "23505",
    constraint: "seller_profiles_store_name_unique",
  });
  const app = makeApp(customer, {
    async apply() { throw duplicate; },
    async getOwnProfile() { return null; },
  });

  const response = await app.request("http://localhost/api/seller/application", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: "nexamart_session=customer-token" },
    body: JSON.stringify({ storeName: "Sabbir Studio", storeSlug: "sabbir-studio" }),
  });

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "Store name already in use" });
});

test("seller profile reads are restricted to the authenticated account", async () => {
  const app = makeApp(seller, {
    async apply() { throw new Error("unexpected"); },
    async getOwnProfile(accountId) { return accountId === seller.id ? { ...application, accountId: seller.id, status: "active" as const } : null; },
  });

  const response = await app.request("http://localhost/api/seller/application", { headers: { Cookie: "nexamart_session=seller-token" } });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { profile: { ...application, accountId: seller.id, status: "active" } });
});

test("seller application profile reads return a generic JSON failure without persistence details", async () => {
  const persistenceMessage = "PostgresError: connection refused postgres://internal-db";
  const app = makeApp(seller, {
    async apply() { throw new Error("not used"); },
    async getOwnProfile() { throw new Error(persistenceMessage); },
  });

  const response = await app.request("http://localhost/api/seller/application", { headers: { Cookie: "nexamart_session=seller-token" } });

  const responseText = await response.clone().text();
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Unable to load seller application" });
  assert.equal(responseText.includes(persistenceMessage), false);
});

test("seller store-profile update rejects user-supplied ownership and status fields", async () => {
  let updates = 0;
  const actions = {
    async apply(input: { accountId: string; storeName: string; storeSlug: string; description?: string }) { return { ...application, ...input }; },
    async getOwnProfile() { return { ...application, accountId: seller.id, status: "active" as const }; },
    async updateStoreProfile() { updates += 1; return { ...application, accountId: seller.id, status: "active" as const }; },
  };
  const app = makeApp(seller, actions);

  const response = await app.request("http://localhost/api/seller/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: "nexamart_session=seller-token" },
    body: JSON.stringify({ accountId: "attacker", status: "suspended", storeName: "New Studio" }),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Invalid seller store profile" });
  assert.equal(updates, 0);
});
test("seller store-profile update returns a conflict for an existing store name", async () => {
  const actions = {
    async apply(input: { accountId: string; storeName: string; storeSlug: string; description?: string }) { return { ...application, ...input }; },
    async getOwnProfile() { return { ...application, accountId: seller.id, status: "active" as const }; },
    async updateStoreProfile() { throw new Error("Store name already in use"); },
  };
  const app = makeApp(seller, actions);

  const response = await app.request("http://localhost/api/seller/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: "nexamart_session=seller-token" },
    body: JSON.stringify({ storeName: "Existing Store" }),
  });

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "Store name already in use" });
});

test("seller store-profile update maps the store-name unique constraint to a safe conflict", async () => {
  const duplicate = Object.assign(new Error("duplicate key value violates unique constraint seller_profiles_store_name_unique"), {
    code: "23505",
    constraint: "seller_profiles_store_name_unique",
  });
  const actions = {
    async apply(input: { accountId: string; storeName: string; storeSlug: string; description?: string }) { return { ...application, ...input }; },
    async getOwnProfile() { return { ...application, accountId: seller.id, status: "active" as const }; },
    async updateStoreProfile() { throw duplicate; },
  };
  const app = makeApp(seller, actions);

  const response = await app.request("http://localhost/api/seller/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: "nexamart_session=seller-token" },
    body: JSON.stringify({ storeName: "Existing Store" }),
  });

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "Store name already in use" });
});

test("seller store-profile update derives ownership from the authenticated seller", async () => {
  let received: { accountId: string; storeName?: string; description?: string } | undefined;
  const actions = {
    async apply(input: { accountId: string; storeName: string; storeSlug: string; description?: string }) { return { ...application, ...input }; },
    async getOwnProfile(accountId: string) { return accountId === seller.id ? { ...application, accountId: seller.id, status: "active" as const } : null; },
    async updateStoreProfile(input: { accountId: string; storeName?: string; description?: string }) {
      received = input;
      return { ...application, accountId: seller.id, status: "active" as const, ...input };
    },
  };
  const app = makeApp(seller, actions);

  const response = await app.request("http://localhost/api/seller/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: "nexamart_session=seller-token" },
    body: JSON.stringify({ storeName: "  New Studio  ", description: "  Updated public storefront description.  " }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(received, { accountId: seller.id, storeName: "New Studio", description: "Updated public storefront description." });
  assert.deepEqual(await response.json(), { profile: { ...application, accountId: seller.id, status: "active", storeName: "New Studio", description: "Updated public storefront description." } });
});

test("seller application writes expose only explicit domain conflicts and generic operation failures", async () => {
  const applicationPayload = JSON.stringify({ storeName: "Sabbir Studio", storeSlug: "sabbir-studio" });
  const applicationHeaders = { "Content-Type": "application/json", Cookie: "nexamart_session=customer-token" };

  for (const [message, expected] of [
    ["Store name already in use", { status: 409, error: "Store name already in use" }],
    ["PostgresError: relation seller_profiles does not exist", { status: 500, error: "Unable to submit seller application" }],
  ]) {
    const app = makeApp(customer, {
      async apply() { throw new Error(message); },
      async getOwnProfile() { return null; },
      async updateStoreProfile() { return application; },
    });
    const response = await app.request("http://localhost/api/seller/application", { method: "POST", headers: applicationHeaders, body: applicationPayload });
    assert.equal(response.status, expected.status);
    assert.deepEqual(await response.json(), { error: expected.error });
  }
});

test("seller application keeps an unexpected unique violation generic and private", async () => {
  const rawDetail = "duplicate key value violates unique constraint seller_profiles_store_slug_unique";
  const duplicate = Object.assign(new Error(rawDetail), { code: "23505", constraint: "seller_profiles_store_slug_unique" });
  const app = makeApp(customer, {
    async apply() { throw duplicate; },
    async getOwnProfile() { return null; },
  });

  const response = await app.request("http://localhost/api/seller/application", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: "nexamart_session=customer-token" },
    body: JSON.stringify({ storeName: "Sabbir Studio", storeSlug: "sabbir-studio" }),
  });

  const responseText = await response.clone().text();
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Unable to submit seller application" });
  assert.equal(responseText.includes(rawDetail), false);
  assert.equal(responseText.includes("seller_profiles_store_slug_unique"), false);
});

test("seller store-profile writes preserve explicit conflicts and hide unexpected failures", async () => {
  for (const [message, expected] of [
    ["Seller profile not found", { status: 404, error: "Seller profile not found" }],
    ["ECONNRESET postgres://internal-db", { status: 500, error: "Unable to update seller store profile" }],
  ]) {
    const app = makeApp(seller, {
      async apply(input) { return { ...application, ...input }; },
      async getOwnProfile() { return { ...application, accountId: seller.id, status: "active" as const }; },
      async updateStoreProfile() { throw new Error(message); },
    });
    const response = await app.request("http://localhost/api/seller/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: "nexamart_session=seller-token" },
      body: JSON.stringify({ storeName: "New Studio" }),
    });
    assert.equal(response.status, expected.status);
    assert.deepEqual(await response.json(), { error: expected.error });
  }
});

test("seller store-profile keeps an unexpected unique violation generic and private", async () => {
  const rawDetail = "duplicate key value violates unique constraint seller_profiles_store_slug_unique";
  const duplicate = Object.assign(new Error(rawDetail), { code: "23505", constraint: "seller_profiles_store_slug_unique" });
  const app = makeApp(seller, {
    async apply(input) { return { ...application, ...input }; },
    async getOwnProfile() { return { ...application, accountId: seller.id, status: "active" as const }; },
    async updateStoreProfile() { throw duplicate; },
  });

  const response = await app.request("http://localhost/api/seller/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: "nexamart_session=seller-token" },
    body: JSON.stringify({ storeName: "New Studio" }),
  });

  const responseText = await response.clone().text();
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Unable to update seller store profile" });
  assert.equal(responseText.includes(rawDetail), false);
  assert.equal(responseText.includes("seller_profiles_store_slug_unique"), false);
});
