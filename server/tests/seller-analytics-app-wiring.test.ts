import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/app.ts", import.meta.url), "utf8");

test("application wires the protected seller analytics endpoint to its PostgreSQL-backed service", () => {
  assert.match(source, /import \{ createSellerAnalyticsRoutes \} from "\.\/modules\/seller\/seller-analytics\.routes\.js";/);
  assert.match(source, /import \{ PostgresSellerAnalyticsRepository \} from "\.\/modules\/seller\/postgres-seller-analytics\.repository\.js";/);
  assert.match(source, /import \{ SellerAnalyticsService \} from "\.\/modules\/seller\/services\/seller-analytics-service\.js";/);
  assert.match(source, /const sellerAnalyticsService = new SellerAnalyticsService\(new PostgresSellerAnalyticsRepository\(\)\);/);
  assert.match(source, /app\.route\("\/seller", createSellerAnalyticsRoutes\(\{ sessions: sessionService, analytics: sellerAnalyticsService \}\)\);/);
});
