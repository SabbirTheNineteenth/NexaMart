import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sellerTypes = readFileSync(new URL("../src/types/seller.ts", import.meta.url), "utf8");
const dashboard = readFileSync(new URL("../src/features/seller/SellerDashboard.tsx", import.meta.url), "utf8");

test("seller order lines expose their order-item ID for line-level fulfillment transitions", () => {
  assert.ok(sellerTypes.includes("items: { id: string; productName: string; quantity: number; fulfillmentStatus: FulfillmentStatus }[];"));
});

test("seller fulfillment queue provides an accessible status-aware action for each owned order line", () => {
  assert.match(dashboard, /const fulfillmentNextStatuses: Record<FulfillmentStatus, readonly FulfillmentStatus\[\]>/);
  assert.match(dashboard, /aria-label=\{`Update \$\{item\.productName\} fulfillment status`\}/);
  assert.match(dashboard, /fulfillmentNextStatuses\[item\.fulfillmentStatus\]\.map/);
  assert.match(dashboard, /onClick=\{\(\) => setFulfillmentConfirmation\(\{ order, item, status \}\)\}/);
});

test("seller fulfillment updates submit only the chosen status and reconcile only the returned order line", () => {
  assert.match(dashboard, /patchJSON<\{ fulfillment: \{ orderId: string; fulfillmentStatus: FulfillmentStatus \} \}>\(`\/seller\/order-items\/\$\{item\.id\}\/fulfillment`, \{ status \}\)/);
  assert.match(dashboard, /order\.id === result\.fulfillment\.orderId/);
  assert.match(dashboard, /candidate\.id === item\.id/);
  assert.match(dashboard, /fulfillmentStatus: result\.fulfillment\.fulfillmentStatus/);
});

test("seller fulfillment queue reports isolated pending success and unavailable or raced transition feedback", () => {
  assert.match(dashboard, /const \[fulfillmentFeedback, setFulfillmentFeedback\] = useState<Record<string, FulfillmentFeedback>>\(\{\}\)/);
  assert.match(dashboard, /Updating…/);
  assert.match(dashboard, /Fulfillment status updated\./);
  assert.match(dashboard, /This order line is no longer available\./);
  assert.match(dashboard, /This fulfillment status is no longer available\./);
  assert.match(dashboard, /role=\{feedback\.kind === "error" \? "alert" : "status"\}/);
});

test("seller fulfillment controls make no payment carrier delivery-partner or settlement claims", () => {
  const start = dashboard.indexOf('className="seller-orders"');
  const panel = dashboard.slice(start);
  assert.doesNotMatch(panel, /payment|carrier|delivery partner|settlement/i);
});

test("seller fulfillment requires an accessible confirmation and offers a focused retry after a failed transition", () => {
  assert.match(dashboard, /<ConfirmationDialog title=\{`Mark \$\{fulfillmentConfirmation\.item\.productName\} as \$\{fulfillmentConfirmation\.status\}\?`\}/);
  assert.match(dashboard, /onConfirm=\{confirmFulfillmentUpdate\}/);
  assert.match(dashboard, /Retry \{failedFulfillmentChange\.status\}/);
});
