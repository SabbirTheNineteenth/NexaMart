import assert from "node:assert/strict";
import test from "node:test";
import { SellerPromotionService } from "../src/modules/promotions/services/seller-promotion-service.js";

test("seller promotion service rejects an inactive date range before persisting", async () => {
  let createCalls = 0;
  const service = new SellerPromotionService({
    async create() { createCalls += 1; throw new Error("not reached"); },
    async list() { return []; },
  });

  await assert.rejects(
    service.create({ sellerId: "seller-1", name: "Expired", scope: "product", productId: "product-1", discountPercent: 10, startsAt: new Date("2026-10-31T00:00:00.000Z"), endsAt: new Date("2026-10-01T00:00:00.000Z") }),
    /end after it starts/,
  );
  assert.equal(createCalls, 0);
});

test("seller promotion service lists only the requested seller promotions", async () => {
  let requestedSellerId = "";
  const service = new SellerPromotionService({
    async create(input) { return { id: "promotion-1", ...input }; },
    async list(sellerId) { requestedSellerId = sellerId; return []; },
  });

  assert.deepEqual(await service.list("seller-1"), []);
  assert.equal(requestedSellerId, "seller-1");
});

test("seller promotion create rejects before mutation when audit support is unavailable", async () => {
  let createCalls = 0;
  const repository = {
    async create(input: any) { createCalls += 1; return { id: "promotion-1", ...input, createdAt: new Date(), updatedAt: new Date() }; },
    async list() { return []; },
    async withTransaction(work: any) { return work(repository, {}); },
  };
  const service = new SellerPromotionService(repository, undefined as never);

  await assert.rejects(
    () => service.create({ sellerId: "seller-1", name: "Autumn launch", scope: "product", productId: "product-1", discountPercent: 15, startsAt: new Date("2026-10-01T00:00:00.000Z"), endsAt: new Date("2026-10-31T23:59:59.000Z") }),
    /audit/i,
  );
  assert.equal(createCalls, 0);
});

test("seller promotion create rejects before mutation when transaction support is unavailable", async () => {
  let createCalls = 0;
  const service = new SellerPromotionService({
    async create(input) { createCalls += 1; return { id: "promotion-1", ...input, createdAt: new Date(), updatedAt: new Date() }; },
    async list() { return []; },
  }, { async record() {} });

  await assert.rejects(
    () => service.create({ sellerId: "seller-1", name: "Autumn launch", scope: "product", productId: "product-1", discountPercent: 15, startsAt: new Date("2026-10-01T00:00:00.000Z"), endsAt: new Date("2026-10-31T23:59:59.000Z") }),
    /transaction/i,
  );
  assert.equal(createCalls, 0);
});

test("seller promotion creation appends an audit record after persistence", async () => {
  let auditInput: unknown;
  const input = { sellerId: "seller-1", name: "Autumn launch", scope: "product" as const, productId: "product-1", discountPercent: 15, startsAt: new Date("2026-10-01T00:00:00.000Z"), endsAt: new Date("2026-10-31T23:59:59.000Z") };
  const service = new SellerPromotionService({
    async create(value) { return { id: "promotion-1", ...value, createdAt: new Date(), updatedAt: new Date() }; },
    async list() { return []; },
    async withTransaction(work) { return work(this as never, {} as never); },
  }, {
    async record(value) { auditInput = value; },
  });

  await service.create(input);

  assert.deepEqual(auditInput, {
    actorId: input.sellerId,
    action: "promotion.created",
    resourceType: "promotion",
    resourceId: "promotion-1",
    metadata: { scope: "product", productId: "product-1", discountPercent: 15 },
  });
});

test("seller promotion creation rolls back when the audit append fails", async () => {
  let persisted = false;
  const transaction = {};
  let auditDatabase: unknown;
  const repository = {
    async create(value: any) { persisted = true; return { id: "promotion-1", ...value, createdAt: new Date(), updatedAt: new Date() }; },
    async list() { return []; },
    async withTransaction(work: any) {
      try { return await work(repository, transaction); } catch (error) { persisted = false; throw error; }
    },
  };
  const service = new SellerPromotionService(repository, { async record(_input, database) { auditDatabase = database; throw new Error("audit unavailable"); } });

  await assert.rejects(() => service.create({ sellerId: "seller-1", name: "Autumn launch", scope: "product", productId: "product-1", discountPercent: 15, startsAt: new Date("2026-10-01T00:00:00.000Z"), endsAt: new Date("2026-10-31T23:59:59.000Z") }), /audit unavailable/);
  assert.equal(auditDatabase, transaction);
  assert.equal(persisted, false);
});

test("seller promotion update rejects before mutation when transaction support is unavailable", async () => {
  let updateCalls = 0;
  const service = new SellerPromotionService({
    async update(input) {
      updateCalls += 1;
      return { id: input.promotionId, sellerId: input.sellerId, name: input.name ?? "Autumn launch", scope: "product", productId: "product-1", discountPercent: 15, startsAt: new Date("2026-10-01T00:00:00.000Z"), endsAt: new Date("2026-10-31T23:59:59.000Z"), createdAt: new Date(), updatedAt: new Date() };
    },
    async list() { return []; },
  }, { async record() {} });

  await assert.rejects(
    () => service.update({ sellerId: "seller-1", promotionId: "promotion-1", name: "Winter launch" }),
    /transaction/i,
  );
  assert.equal(updateCalls, 0);
});

test("seller promotion update appends sensitive-safe audit metadata after an owned mutation", async () => {
  let auditInput: unknown;
  const input = { sellerId: "seller-1", promotionId: "promotion-1", name: "Winter launch", discountPercent: 20 };
  const service = new SellerPromotionService({
    async create(value) { return { id: "promotion-1", ...value, createdAt: new Date(), updatedAt: new Date() }; },
    async update(value) { return { id: value.promotionId, sellerId: value.sellerId, name: value.name ?? "Autumn launch", scope: "product" as const, productId: "product-1", discountPercent: value.discountPercent ?? 15, startsAt: new Date("2026-10-01T00:00:00.000Z"), endsAt: new Date("2026-10-31T00:00:00.000Z"), createdAt: new Date(), updatedAt: new Date() }; },
    async list() { return []; },
    async withTransaction(work) { return work(this as never, {} as never); },
  }, { async record(value) { auditInput = value; } });

  await service.update(input);

  assert.deepEqual(auditInput, {
    actorId: "seller-1",
    action: "promotion.updated",
    resourceType: "promotion",
    resourceId: "promotion-1",
    metadata: { fields: ["name", "discountPercent"] },
  });
});

test("seller promotion update conceals missing or unowned promotions", async () => {
  const service = new SellerPromotionService({
    async create(value) { return { id: "promotion-1", ...value, createdAt: new Date(), updatedAt: new Date() }; },
    async update() { return null; },
    async list() { return []; },
    async withTransaction(work) { return work(this as never, {} as never); },
  }, { async record() {} });

  await assert.rejects(service.update({ sellerId: "seller-1", promotionId: "other-seller-promotion", name: "Winter launch" }), /Promotion not found/);
});

test("seller promotion delete rejects before mutation when transaction support is unavailable", async () => {
  let deleteCalls = 0;
  const service = new SellerPromotionService({
    async delete() { deleteCalls += 1; return true; },
    async list() { return []; },
  }, { async record() {} });

  await assert.rejects(
    () => service.delete({ sellerId: "seller-1", promotionId: "promotion-1" }),
    /transaction/i,
  );
  assert.equal(deleteCalls, 0);
});

test("seller promotion deletion audits only after an owned configuration record is removed", async () => {
  const calls: string[] = [];
  let auditInput: unknown;
  const service = new SellerPromotionService({
    async create(value) { return { id: "promotion-1", ...value, createdAt: new Date(), updatedAt: new Date() }; },
    async update() { return null; },
    async delete(input) { calls.push(`delete:${input.sellerId}:${input.promotionId}`); return true; },
    async list() { return []; },
    async withTransaction(work) { return work(this as never, {} as never); },
  }, { async record(value) { calls.push("audit"); auditInput = value; } });

  await service.delete({ sellerId: "seller-1", promotionId: "11111111-1111-4111-8111-111111111111" });

  assert.deepEqual(calls, ["delete:seller-1:11111111-1111-4111-8111-111111111111", "audit"]);
  assert.deepEqual(auditInput, {
    actorId: "seller-1",
    action: "promotion.deleted",
    resourceType: "promotion",
    resourceId: "11111111-1111-4111-8111-111111111111",
    metadata: {},
  });
});

test("seller promotion deletion conceals missing or unowned promotions without auditing", async () => {
  let auditCalls = 0;
  const service = new SellerPromotionService({
    async create(value) { return { id: "promotion-1", ...value, createdAt: new Date(), updatedAt: new Date() }; },
    async update() { return null; },
    async delete() { return false; },
    async list() { return []; },
    async withTransaction(work) { return work(this as never, {} as never); },
  }, { async record() { auditCalls += 1; } });

  await assert.rejects(service.delete({ sellerId: "seller-1", promotionId: "11111111-1111-4111-8111-111111111111" }), /Promotion not found/);
  assert.equal(auditCalls, 0);
});
