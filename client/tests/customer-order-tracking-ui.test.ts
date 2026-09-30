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

test("customer tracking renders API payment and per-line fulfillment fields", () => {
  assert.match(workspace, /customerPaymentStatusLabel\(order\.paymentStatus\)/);
  assert.match(workspace, /customerPaymentStatusLabel\(trackingState\.order\.paymentStatus\)/);
  assert.match(workspace, /trackingState\.order\.items\.map/);
  assert.match(workspace, /customerFulfillmentStatusLabel\(item\.fulfillmentStatus\)/);
  assert.match(workspace, /Retry loading orders/);
  assert.match(workspace, /Try again/);
});

test("customer orders keep authentication and API failure states visible", () => {
  assert.match(workspace, /reason instanceof ApiError && reason\.status === 401/);
  assert.match(workspace, /setAccountResolution\(\{ state: "signed-out" \}\)/);
  assert.match(workspace, /ordersState\.state === "error"/);
  assert.match(workspace, /ordersState\.message/);
  assert.match(workspace, /loadOrders\(\)/);
});
