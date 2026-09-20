import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");

test("reference-style Admin sidebar separates seller applications from the Sellers directory", () => {
  assert.match(dashboard, /section: "applications", label: "Seller applications"/);
  assert.match(dashboard, /activeSection === "applications"/);
  assert.match(dashboard, /activeSection === "sellers"/);
  assert.match(dashboard, /sellers\.filter\(\(seller\) => seller\.status === "pending"\)/);
});

test("reference-style overview provides live action queues and never invents SLA or messaging controls", () => {
  assert.match(dashboard, /Pending seller applications/);
  assert.match(dashboard, /Recent Admin Audit/);
  assert.match(dashboard, /Products needing attention/);
  assert.doesNotMatch(dashboard, /SLA|Message seller|Message<\/button>/);
});
