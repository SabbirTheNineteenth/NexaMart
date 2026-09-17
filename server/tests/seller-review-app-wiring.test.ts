import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("application wires the protected seller review read workflow", () => {
  const source = readFileSync(new URL("../src/app.ts", import.meta.url), "utf8");

  assert.match(source, /import \{ createSellerReviewRoutes \} from "\.\/modules\/seller\/seller-review\.routes\.js"/);
  assert.match(source, /import \{ PostgresSellerReviewRepository \} from "\.\/modules\/seller\/postgres-seller-review\.repository\.js"/);
  assert.match(source, /import \{ SellerReviewService \} from "\.\/modules\/seller\/services\/seller-review-service\.js"/);
  assert.match(source, /const sellerReviewService = new SellerReviewService\(new PostgresSellerReviewRepository\(\)\)/);
  assert.match(source, /app\.route\("\/seller\/reviews", createSellerReviewRoutes\(\{ sessions: sessionService, reviews: sellerReviewService \}\)\)/);
});
