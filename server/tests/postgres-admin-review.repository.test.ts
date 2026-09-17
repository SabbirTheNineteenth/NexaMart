import assert from "node:assert/strict";
import test from "node:test";
import { PostgresAdminReviewRepository } from "../src/modules/admin/postgres-admin-review.repository.js";
import { productReviews, products } from "../src/db/schema/index.js";

type Aggregate = { average: string | null; count: number };

function createTransactionalDatabase(review: { id: string; productId: string; customerId: string; rating: number; isVisible: boolean; createdAt: Date }, aggregate: Aggregate) {
  const operations: string[] = [];
  const productUpdates: unknown[] = [];
  const transaction = {
    async execute() { operations.push("product-lock"); },
    select() {
      return {
        from() {
          return {
            where() {
              return {
                limit() { operations.push("review-product-read"); return Promise.resolve([{ productId: review.productId }]); },
                then(resolve: (value: unknown) => unknown) { operations.push("visible-aggregate"); return Promise.resolve([aggregate]).then(resolve); },
              };
            },
          };
        },
      };
    },
    update(table: unknown) {
      if (table === productReviews) {
        return {
          set() {
            operations.push("review-update");
            return {
              where() {
                return {
                  returning() {
                    return Promise.resolve([review]);
                  },
                };
              },
            };
          },
        };
      }
      assert.equal(table, products);
      return {
        set(values: unknown) {
          operations.push("product-aggregate-update");
          productUpdates.push(values);
          return { where() { return Promise.resolve(); } };
        },
      };
    },
  };
  return {
    operations,
    productUpdates,
    database: {
      ...transaction,
      async transaction<T>(work: (tx: typeof transaction) => Promise<T>) {
        return work(transaction);
      },
    },
  };
}

test("transactional visibility moderation recomputes the visible aggregate after hiding the final visible review", async () => {
  const review = { id: "review-1", productId: "product-1", customerId: "customer-1", rating: 5, isVisible: false, createdAt: new Date("2026-09-11T00:00:00.000Z") };
  const fake = createTransactionalDatabase(review, { average: null, count: 0 });
  const repository = new PostgresAdminReviewRepository(fake.database as any);

  const result = await repository.withTransaction((tx) => tx.setVisibility({ reviewId: review.id, isVisible: false }));

  assert.equal(result?.isVisible, false);
  assert.deepEqual(fake.operations, ["review-product-read", "product-lock", "review-update", "visible-aggregate", "product-aggregate-update"]);
  assert.deepEqual(fake.productUpdates, [{ rating: "0.00", reviewCount: 0, updatedAt: fake.productUpdates[0] && (fake.productUpdates[0] as { updatedAt: Date }).updatedAt }]);
});

test("transactional visibility moderation recomputes the visible aggregate after restoring a hidden review", async () => {
  const review = { id: "review-2", productId: "product-1", customerId: "customer-1", rating: 5, isVisible: true, createdAt: new Date("2026-09-11T00:00:00.000Z") };
  const fake = createTransactionalDatabase(review, { average: "4.50", count: 2 });
  const repository = new PostgresAdminReviewRepository(fake.database as any);

  const result = await repository.withTransaction((tx) => tx.setVisibility({ reviewId: review.id, isVisible: true }));

  assert.equal(result?.isVisible, true);
  assert.deepEqual(fake.operations, ["review-product-read", "product-lock", "review-update", "visible-aggregate", "product-aggregate-update"]);
  assert.deepEqual(fake.productUpdates, [{ rating: "4.50", reviewCount: 2, updatedAt: fake.productUpdates[0] && (fake.productUpdates[0] as { updatedAt: Date }).updatedAt }]);
});

test("visibility moderation serializes a product before changing its review and recomputing its visible aggregate", async () => {
  const operations: string[] = [];
  const review = { id: "review-3", productId: "product-1", customerId: "customer-1", rating: 4, isVisible: false, createdAt: new Date("2026-09-11T00:00:00.000Z") };
  const transaction = {
    async execute() { operations.push("product-lock"); },
    select() {
      return {
        from() {
          return {
            where() {
              return {
                limit() { operations.push("review-product-read"); return Promise.resolve([{ productId: review.productId }]); },
                then(resolve: (value: unknown) => unknown) { operations.push("visible-aggregate"); return Promise.resolve([{ average: "4.00", count: 1 }]).then(resolve); },
              };
            },
          };
        },
      };
    },
    update(table: unknown) {
      if (table === productReviews) return { set() { return { where() { operations.push("review-update"); return { returning() { return Promise.resolve([review]); } }; } }; } };
      assert.equal(table, products);
      return { set() { return { where() { operations.push("product-aggregate-update"); return Promise.resolve(); } }; } };
    },
  };
  const database = { ...transaction, async transaction<T>(work: (tx: typeof transaction) => Promise<T>) { return work(transaction); } };
  const repository = new PostgresAdminReviewRepository(database as any);

  await repository.withTransaction((tx) => tx.setVisibility({ reviewId: review.id, isVisible: false }));

  assert.deepEqual(operations, ["review-product-read", "product-lock", "review-update", "visible-aggregate", "product-aggregate-update"]);
});
