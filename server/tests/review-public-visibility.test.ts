import assert from "node:assert/strict";
import test from "node:test";
import { ReviewService } from "../src/modules/reviews/services/review-service.js";
import { productReviews } from "../src/db/schema/index.js";

const productId = "22222222-2222-4222-8222-222222222222";
const visibleReview = { id: "review-1", rating: 5, title: "Excellent", body: "Built to last.", createdAt: new Date("2026-09-11T00:00:00.000Z") };

function publicReviewDatabase({ published, sellerActive }: { published: boolean; sellerActive: boolean }) {
  let policyJoinApplied = false;
  return {
    select() {
      return {
        from(table: unknown) {
          assert.equal(table, productReviews);
          const query = {
            innerJoin() { policyJoinApplied = true; return query; },
            where() {
              return {
                orderBy() {
                  return Promise.resolve(policyJoinApplied && published && sellerActive ? [visibleReview] : []);
                },
              };
            },
          };
          return query;
        },
      };
    },
  };
}

test("public review reads conceal reviews when the product is unpublished", async () => {
  const service = new ReviewService(publicReviewDatabase({ published: false, sellerActive: true }) as any);

  assert.deepEqual(await service.list(productId), []);
});

test("public review reads conceal reviews when the product seller is inactive", async () => {
  const service = new ReviewService(publicReviewDatabase({ published: true, sellerActive: false }) as any);

  assert.deepEqual(await service.list(productId), []);
});

test("public review reads retain visible reviews for published products from active sellers", async () => {
  const service = new ReviewService(publicReviewDatabase({ published: true, sellerActive: true }) as any);

  assert.deepEqual(await service.list(productId), [visibleReview]);
});
