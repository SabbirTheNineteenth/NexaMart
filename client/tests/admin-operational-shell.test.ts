import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = () => readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");

test("admin overview keeps an operational governance shell with truthful empty states", () => {
  const source = dashboard();
  assert.match(source, /Catalog governance/);
  assert.match(source, /Keep NexaMart’s catalog healthy and compliant/);
  assert.match(source, /No live activity available/);
  assert.match(source, /Awaiting real API data/);
});
