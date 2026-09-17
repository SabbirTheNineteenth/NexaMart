import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/seller/SellerDashboard.tsx", import.meta.url), "utf8");

test("seller notifications have a focused accessible workspace with truthful recovery states", () => {
  assert.match(dashboard, /section: "notifications", label: "Notifications"/);
  assert.match(dashboard, /activeSection === "notifications"/);
  assert.match(dashboard, /"\/seller\/notifications"/);
  assert.match(dashboard, /Loading notifications/);
  assert.match(dashboard, /No notifications yet/);
  assert.match(dashboard, /Unable to load notifications/);
  assert.match(dashboard, /Retry/);
  assert.match(dashboard, /Mark as read/);
  assert.match(dashboard, /unreadCount/);
  assert.doesNotMatch(dashboard, /(email|push|SMS|delivery channel)/i);
});

test("seller notifications load only for the active notifications route", () => {
  const notificationEffect = dashboard.slice(dashboard.lastIndexOf("useEffect(() => {", dashboard.indexOf("const markNotificationRead")), dashboard.indexOf("const markNotificationRead"));
  assert.match(notificationEffect, /if \(activeSection !== "notifications"\) return;/);
  assert.match(notificationEffect, /window\.setTimeout\(loadNotifications, 0\)/);
  assert.match(notificationEffect, /\}, \[activeSection, loadNotifications\]\);/);
});
