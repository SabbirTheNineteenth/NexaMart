import assert from "node:assert/strict";
import test from "node:test";
import { applyReviewVisibility, reviewModerationError } from "../src/features/admin/review-moderation.utils";
import type { AdminReview } from "../src/types/admin";

const review: AdminReview = {
  id: "review-1",
  rating: 4,
  title: "Solid build quality.",
  body: "The lamp feels sturdy and well finished.",
  isVisible: true,
  createdAt: "2026-09-12T00:00:00.000Z",
  customer: { id: "customer-1", name: "Avery" },
  product: { id: "product-1", name: "Studio Lamp" },
};

test("review moderation updates only the selected review visibility", () => {
  const reviews = [review, { ...review, id: "review-2", isVisible: false }];

  const updated = applyReviewVisibility(reviews, "review-1", false);

  assert.deepEqual(updated, [{ ...review, isVisible: false }, reviews[1]]);
  assert.notEqual(updated, reviews);
});

test("review moderation keeps the queue usable after a failed visibility update", () => {
  assert.equal(reviewModerationError(new Error("Not authorized")), "Not authorized");
  assert.equal(reviewModerationError(new DOMException("aborted", "AbortError")), "");
});
