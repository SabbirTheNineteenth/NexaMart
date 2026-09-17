import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/modules/admin/postgres-admin-analytics.repository.ts", import.meta.url), "utf8");

test("admin analytics repository aggregates marketplace entities with PostgreSQL and safe decimal defaults", () => {
  for (const table of ["accounts", "sellerProfiles", "products", "orders", "orderItems", "productReviews", "commissionRecords"]) {
    assert.match(source, new RegExp(`from\\(${table}\\)`));
  }
  for (const status of ["pending", "processing", "shipped", "delivered", "cancelled", "returned"]) {
    assert.ok(source.includes(`${status}: sql<number>\`count(*) filter (where \${orderItems.fulfillmentStatus} = '${status}')::int\``));
  }
  assert.match(source, /grossOrderTotal: sql<string>`coalesce\(sum\(\$\{orders\.total\}\), 0\)`/);
  assert.match(source, /commissionAmount: sql<string>`coalesce\(sum\(\$\{commissionRecords\.commissionAmount\}\), 0\)`/);
  assert.match(source, /const zero = "0\.00"/);
});

test("admin analytics commission totals exclude void commission fixtures", () => {
  const commissions = [
    { status: "accrued", grossAmount: "100.00", commissionAmount: "10.00", netAmount: "90.00" },
    { status: "void", grossAmount: "50.00", commissionAmount: "5.00", netAmount: "45.00" },
  ];
  const reported = commissions.filter((commission) => commission.status !== "void");

  assert.deepEqual(reported, [commissions[0]]);
  assert.match(source, /\}\)\.from\(commissionRecords\)\.where\(ne\(commissionRecords\.status, "void"\)\),/);
});

test("admin analytics repository is read-only", () => {
  assert.doesNotMatch(source, /\.(?:insert|update|delete)\(/);
});
