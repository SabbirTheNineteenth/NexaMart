import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/modules/seller/postgres-seller-analytics.repository.ts", import.meta.url), "utf8");

test("seller analytics repository aggregates only the requested seller's catalog and order lines", () => {
  assert.match(source, /from\(products\)[\s\S]*where\(eq\(products\.sellerId, sellerId\)\)/);
  assert.match(source, /from\(orderItems\)[\s\S]*where\(eq\(orderItems\.sellerId, sellerId\)\)/);
  assert.match(source, /productCount: sql<number>`count\(\*\)::int`/);
  assert.match(source, /totalStock: sql<number>`coalesce\(sum\(\$\{products\.stock\}\), 0\)::int`/);
  assert.match(source, /unitsSold: sql<number>`coalesce\(sum\(\$\{orderItems\.quantity\}\), 0\)::int`/);
  assert.match(source, /grossSalesAmount: sql<string>`coalesce\(sum\(\$\{orderItems\.unitPrice\} \* \$\{orderItems\.quantity\}\), 0\)`/);
});

test("seller analytics repository returns packed fulfillment counts and safe zero defaults without mutations", () => {
  for (const status of ["pending", "processing", "packed", "shipped", "delivered", "cancelled", "returned"]) {
    assert.ok(source.includes(`${status}: sql<number>\`count(*) filter (where \${orderItems.fulfillmentStatus} = '${status}')::int\``));
  }
  assert.match(source, /const zero = "0\.00"/);
  assert.match(source, /packed: orders\?\.packed \?\? 0/);
  assert.doesNotMatch(source, /\.(?:insert|update|delete)\(/);
});
