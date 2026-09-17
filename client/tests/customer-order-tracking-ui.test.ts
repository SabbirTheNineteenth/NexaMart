import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workspace = readFileSync(new URL("../src/features/account/AccountWorkspace.tsx", import.meta.url), "utf8");

test("customer account loads a per-order fulfillment timeline from the authenticated tracking endpoint", () => {
  assert.match(workspace, /getJSON<\{ order: CustomerOrderTracking \}>\(`\/checkout\/orders\/\$\{order\.id\}\/tracking`\)/);
  assert.match(workspace, /Loading fulfillment updates…/);
  assert.match(workspace, /Unable to load fulfillment updates/);
  assert.match(workspace, /customerTrackingEmptyMessage\(\)/);
  assert.match(workspace, /Fulfillment timeline/);
  assert.doesNotMatch(workspace, /Delivery tracking unavailable/);
});
