import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");

test("admin mutations are row-scoped and retain pending state across concurrent completions", () => {
  assert.match(dashboard, /const \[updatingReviewIds, setUpdatingReviewIds\] = useState<Set<string>>\(\(\) => new Set\(\)\);/);
  assert.match(dashboard, /const \[updatingProductIds, setUpdatingProductIds\] = useState<Set<string>>\(\(\) => new Set\(\)\);/);
  assert.match(dashboard, /const \[updatingSellerIds, setUpdatingSellerIds\] = useState<Set<string>>\(\(\) => new Set\(\)\);/);
  assert.match(dashboard, /const reviewMutationIds = useRef\(new Set<string>\(\)\);/);
  assert.match(dashboard, /if \(reviewMutationIds\.current\.has\(change\.reviewId\)\) return;/);
  assert.match(dashboard, /setUpdatingReviewIds\(\(current\) => new Set\(\[\.\.\.current, change\.reviewId\]\)\);/);
  assert.match(dashboard, /const isUpdating = updatingReviewIds\.has\(review\.id\);/);
  assert.match(dashboard, /const isUpdating = updatingProductIds\.has\(product\.id\);/);
  assert.match(dashboard, /const isUpdating = updatingSellerIds\.has\(seller\.id\);/);
});
