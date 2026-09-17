import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { sellerModerationActions, sellerModerationError, replaceModeratedSeller } from "../src/features/admin/seller-moderation";
import type { AdminSeller } from "../src/types/admin";

const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");

const pendingSeller: AdminSeller = {
  id: "profile-1",
  accountId: "account-1",
  storeName: "Avery Lighting",
  storeSlug: "avery-lighting",
  description: "Lighting studio",
  status: "pending",
  createdAt: "2026-09-12T00:00:00.000Z",
};

test("seller moderation replaces only the returned seller profile", () => {
  const untouched = { ...pendingSeller, id: "profile-2", storeName: "Mina Ceramics" };
  const returned = { ...pendingSeller, status: "active" as const };

  const sellers = replaceModeratedSeller([pendingSeller, untouched], returned);

  assert.deepEqual(sellers, [returned, untouched]);
  assert.equal(sellers[1], untouched);
});

test("seller moderation offers only meaningful server-defined actions for each status", () => {
  assert.deepEqual(sellerModerationActions("pending"), ["approve", "reject"]);
  assert.deepEqual(sellerModerationActions("approved"), ["activate"]);
  assert.deepEqual(sellerModerationActions("active"), ["suspend"]);
  assert.deepEqual(sellerModerationActions("suspended"), ["activate"]);
  assert.deepEqual(sellerModerationActions("rejected"), ["activate"]);
});

test("seller moderation gives clear missing-profile and request failure feedback", () => {
  assert.equal(sellerModerationError({ status: 404 }), "Seller application was not found or is no longer available.");
  assert.equal(sellerModerationError(new Error("Transition unavailable")), "Transition unavailable");
  assert.equal(sellerModerationError(new DOMException("aborted", "AbortError")), "");
});

test("admin dashboard loads seller profiles and exposes accessible action-only moderation controls", () => {
  const sellerPanelStart = dashboard.indexOf('className="admin-panel admin-seller-moderation"');
  const sellerPanelEnd = dashboard.indexOf('className="admin-panel admin-product-oversight"', sellerPanelStart);
  const sellerPanel = dashboard.slice(sellerPanelStart, sellerPanelEnd);

  assert.match(dashboard, /getJSON<\{ sellers: AdminSeller\[\] \}>\("\/admin\/sellers", controller\.signal\)/);
  assert.match(dashboard, /patchJSON<\{ seller: AdminSeller \}>\(`\/admin\/sellers\/\$\{change\.sellerId\}\/status`, \{ action: change\.action \}\)/);
  assert.match(dashboard, /<section className="admin-panel admin-seller-moderation" aria-labelledby="seller-moderation-heading">/);
  assert.match(sellerPanel, /<h2 id="seller-moderation-heading">\{activeSection === "applications" \? "Pending seller applications" : "Sellers"\}<\/h2>/);
  assert.match(sellerPanel, /displayedSellers\.map/);
  assert.match(sellerPanel, /aria-label=\{`\$\{action\} seller \$\{seller\.storeName\}`\}/);
  assert.match(sellerPanel, /disabled=\{isUpdating\}/);
  assert.match(sellerPanel, /role="status"/);
  assert.match(sellerPanel, /role="alert"/);
  assert.doesNotMatch(sellerPanel, /\b(?:accountId|adminId|role|status)\s*:/);
  assert.doesNotMatch(sellerPanel, /\b(?:delete|payment|delivery|credential)\b/i);
});
