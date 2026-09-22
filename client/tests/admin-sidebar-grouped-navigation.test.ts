import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");

test("Admin sidebar groups every real route in its required operational order", () => {
  const expectedOrder = [
    "Workspace", "Overview",
    "Catalog", "Product Moderation", "Taxonomy", "Promotions",
    "Seller operations", "Seller Review", "Sellers", "Payout Review",
    "Marketplace activity", "Orders", "Feedback", "Analytics",
    "Governance", "Admin Audit", "Settings",
  ];
  let cursor = -1;
  for (const label of expectedOrder) {
    const next = dashboard.indexOf(`label: \"${label}\"`, cursor + 1);
    assert.ok(next > cursor, `${label} should follow the prior navigation label`);
    cursor = next;
  }
  for (const section of ["overview", "products", "taxonomy", "promotions", "applications", "sellers", "finance", "orders", "feedback", "analytics", "audit", "accounts"]) {
    assert.match(dashboard, new RegExp(`section: \"${section}\"`));
  }
});

test("Admin sidebar maps every visible route to the installed named icon family and retains real footer actions", () => {
  for (const icon of ["LayoutDashboard", "ClipboardCheck", "PackageCheck", "Tags", "BadgePercent", "Store", "Banknote", "ShoppingBag", "MessageSquare", "ChartNoAxesCombined", "FileSearch", "Settings"]) {
    assert.match(dashboard, new RegExp(`\\b${icon}\\b`));
  }
  assert.match(dashboard, /import type \{ LucideIcon \} from \"lucide-react\"/);
  assert.match(dashboard, /aria-current=\{isActive \? \"page\" : undefined\}/);
  assert.match(dashboard, /className=\"admin-sidebar-logout\"/);
  assert.match(dashboard, /className=\"admin-sidebar-return admin-action-control\"/);
  assert.doesNotMatch(dashboard, /adminControlRoomOrder/);
});
