import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/seller/SellerDashboard.tsx", import.meta.url), "utf8");

test("seller dashboard has no product publication action or publication API request", () => {
  assert.doesNotMatch(dashboard, /\/seller\/products\/\$\{product\.id\}\/publish/);
  assert.doesNotMatch(dashboard, /className="publish-button"/);
  assert.doesNotMatch(dashboard, /\bPublish\b/);
  assert.doesNotMatch(dashboard, /const publish\s*=/);
});
