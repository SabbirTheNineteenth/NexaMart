import assert from "node:assert/strict";
import test from "node:test";
import { SellerProfileService } from "../src/modules/seller/services/seller-profile-service.js";

const ownProfile = {
  id: "profile-1",
  accountId: "seller-1",
  storeName: "Current Store",
  storeSlug: "current-store",
  status: "active" as const,
  createdAt: "2026-09-12T00:00:00.000Z",
};

test("seller store-profile service rejects a store name already used by another seller", async () => {
  let updates = 0;
  const repository = {
    async findByAccountId() { return ownProfile; },
    async createApplication() { return ownProfile; },
    async updateStoreProfile() { updates += 1; return ownProfile; },
    async findByStoreName() { return { ...ownProfile, id: "profile-2", accountId: "seller-2" }; },
  };
  const service = new SellerProfileService(repository);

  await assert.rejects(
    () => service.updateStoreProfile({ accountId: ownProfile.accountId, storeName: "Other Store" }),
    { message: "Store name already in use" },
  );
  assert.equal(updates, 0);
});

test("seller application service rejects a store name already used by another seller", async () => {
  let applications = 0;
  const repository = {
    async findByAccountId() { return null; },
    async createApplication() { applications += 1; return ownProfile; },
    async updateStoreProfile() { return ownProfile; },
    async findByStoreName() { return { ...ownProfile, id: "profile-2", accountId: "seller-2" }; },
  };
  const service = new SellerProfileService(repository);

  await assert.rejects(
    () => service.apply({ accountId: ownProfile.accountId, storeName: "Other Store", storeSlug: "other-store" }),
    { message: "Store name already in use" },
  );
  assert.equal(applications, 0);
});
