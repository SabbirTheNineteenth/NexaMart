import assert from "node:assert/strict";
import test from "node:test";
import { ReviewService } from "../src/modules/reviews/services/review-service.js";
import { orderItems, productReviews, products } from "../src/db/schema/index.js";

const input = {
  customerId: "11111111-1111-4111-8111-111111111111",
  productId: "22222222-2222-4222-8222-222222222222",
  orderItemId: "33333333-3333-4333-8333-333333333333",
  rating: 5,
};

function createReviewDatabase() {
  const operations: string[] = [];
  const transaction = {
    async execute() { operations.push("advisory-lock"); },
    select() {
      return {
        from(table: unknown) {
          if (table === orderItems) {
            return { innerJoin() { return { where() { operations.push("eligibility-read"); return { limit() { return Promise.resolve([{ id: input.orderItemId }]); } }; } }; } };
          }
          assert.equal(table, productReviews);
          return { where() { operations.push("visible-aggregate"); return Promise.resolve([{ average: "5.00", count: 1 }]); } };
        },
      };
    },
    insert(table: unknown) {
      assert.equal(table, productReviews);
      return { values() { operations.push("review-insert"); return { returning() { return Promise.resolve([{ id: "review-1" }]); } }; } };
    },
    update(table: unknown) {
      assert.equal(table, products);
      return { set() { operations.push("product-aggregate-update"); return { where() { return Promise.resolve(); } }; } };
    },
  };
  return { operations, database: { async transaction<T>(work: (tx: typeof transaction) => Promise<T>) { return work(transaction); } } };
}

test("review creation serializes its delivered-state check and visible aggregate before committing", async () => {
  const fake = createReviewDatabase();
  const service = new ReviewService(fake.database as any);

  assert.deepEqual(await service.create(input), { id: "review-1" });
  assert.deepEqual(fake.operations, [
    "advisory-lock",
    "advisory-lock",
    "eligibility-read",
    "review-insert",
    "visible-aggregate",
    "product-aggregate-update",
  ]);
});
