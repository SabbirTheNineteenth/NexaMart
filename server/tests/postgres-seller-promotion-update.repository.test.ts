import assert from "node:assert/strict";
import test from "node:test";
import { PostgresSellerPromotionRepository } from "../src/modules/promotions/postgres-seller-promotion.repository.js";

test("seller promotion repository atomically updates only editable configuration for an owned promotion and product", async () => {
  let persisted: unknown;
  let whereCalled = false;
  let selectCount = 0;
  const database = {
    update() {
      const query = {
        set(values: unknown) { persisted = values; return query; },
        where() { whereCalled = true; return query; },
        returning() {
          return Promise.resolve([{ id: "promotion-1", sellerId: "seller-1", name: "Winter launch", scope: "product", productId: "11111111-1111-4111-8111-111111111111", discountPercent: "20.00", startsAt: new Date("2026-11-01T00:00:00.000Z"), endsAt: new Date("2026-11-30T23:59:59.000Z"), createdAt: new Date("2026-10-01T00:00:00.000Z"), updatedAt: new Date("2026-10-15T00:00:00.000Z") }]);
        },
      };
      return query;
    },
    select() {
      selectCount += 1;
      const result = selectCount === 2
        ? [{ id: "promotion-1", sellerId: "seller-1", name: "Winter launch", scope: "product", productId: "11111111-1111-4111-8111-111111111111", discountPercent: "20.00", startsAt: new Date("2026-11-01T00:00:00.000Z"), endsAt: new Date("2026-11-30T23:59:59.000Z"), createdAt: new Date("2026-10-01T00:00:00.000Z"), updatedAt: new Date("2026-10-15T00:00:00.000Z") }]
        : [];
      const query = { from() { return query; }, where() { return query; }, limit() { return Promise.resolve(result); } };
      return query;
    },
  };
  const repository = new PostgresSellerPromotionRepository(database as never);

  const promotion = await repository.update({ sellerId: "seller-1", promotionId: "promotion-1", name: "Winter launch", discountPercent: 20, startsAt: new Date("2026-11-01T00:00:00.000Z"), endsAt: new Date("2026-11-30T23:59:59.000Z") });

  assert.equal(whereCalled, true);
  assert.deepEqual(persisted, { name: "Winter launch", discountPercent: "20.00", startsAt: new Date("2026-11-01T00:00:00.000Z"), endsAt: new Date("2026-11-30T23:59:59.000Z"), updatedAt: (persisted as { updatedAt: unknown }).updatedAt });
  assert.deepEqual(promotion, { id: "promotion-1", sellerId: "seller-1", name: "Winter launch", scope: "product", productId: "11111111-1111-4111-8111-111111111111", discountPercent: 20, startsAt: new Date("2026-11-01T00:00:00.000Z"), endsAt: new Date("2026-11-30T23:59:59.000Z"), createdAt: new Date("2026-10-01T00:00:00.000Z"), updatedAt: new Date("2026-10-15T00:00:00.000Z") });
});

test("seller promotion repository returns null when the promotion or its product is outside seller ownership", async () => {
  const database = {
    update() {
      const query = { set() { return query; }, where() { return query; }, returning() { return Promise.resolve([]); } };
      return query;
    },
    select() {
      const query = { from() { return query; }, where() { return query; } };
      return query;
    },
  };

  assert.equal(await new PostgresSellerPromotionRepository(database as never).update({ sellerId: "seller-1", promotionId: "other-seller-promotion", name: "Winter launch" }), null);
});

test("seller promotion repository rejects a partial schedule update that overlaps another active offer without writing", async () => {
  let updates = 0;
  let selectCount = 0;
  const database = {
    update() { updates += 1; throw new Error("update must not run for an overlap"); },
    select() {
      selectCount += 1;
      const result = selectCount === 2
        ? [{ id: "promotion-1", sellerId: "seller-1", name: "October offer", scope: "product", productId: "11111111-1111-4111-8111-111111111111", discountPercent: "15.00", startsAt: new Date("2026-10-01T00:00:00.000Z"), endsAt: new Date("2026-10-10T00:00:00.000Z"), createdAt: new Date(), updatedAt: new Date() }]
        : selectCount === 3 ? [{ id: "promotion-2" }] : [];
      const query = { from() { return query; }, where() { return query; }, limit() { return Promise.resolve(result); } };
      return query;
    },
  };

  await assert.rejects(
    new PostgresSellerPromotionRepository(database as never).update({ sellerId: "seller-1", promotionId: "promotion-1", endsAt: new Date("2026-10-20T00:00:00.000Z") }),
    /Promotion schedule overlaps an existing promotion/,
  );
  assert.equal(updates, 0);
});

test("seller promotion repository deletes only an owned promotion configuration", async () => {
  let whereCalled = false;
  const database = {
    delete() {
      const query = { where() { whereCalled = true; return query; }, returning() { return Promise.resolve([{ id: "11111111-1111-4111-8111-111111111111" }]); } };
      return query;
    },
    select() {
      const query = { from() { return query; }, where() { return query; } };
      return query;
    },
  };

  assert.equal(await new PostgresSellerPromotionRepository(database as never).delete({ sellerId: "seller-1", promotionId: "11111111-1111-4111-8111-111111111111" }), true);
  assert.equal(whereCalled, true);
});

test("seller promotion repository does not delete a missing or another seller's promotion", async () => {
  const database = {
    delete() {
      const query = { where() { return query; }, returning() { return Promise.resolve([]); } };
      return query;
    },
    select() {
      const query = { from() { return query; }, where() { return query; } };
      return query;
    },
  };

  assert.equal(await new PostgresSellerPromotionRepository(database as never).delete({ sellerId: "seller-1", promotionId: "22222222-2222-4222-8222-222222222222" }), false);
});
