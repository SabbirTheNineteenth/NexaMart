import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");

const supportingFeed = (name: "Products" | "Sellers" | "Finance" | "Analytics") => {
  const start = dashboard.indexOf(`const load${name} = useCallback`);
  const callbackEnd = "\n  }, []);";
  const end = dashboard.indexOf(callbackEnd, start);
  assert.notEqual(start, -1, `load${name} is defined`);
  assert.notEqual(end, -1, `load${name} has its useCallback terminator`);
  return dashboard.slice(start, end + callbackEnd.length);
};

test("admin product retry reloads only products, clears only its error, and prevents duplicate pending requests", () => {
  const products = supportingFeed("Products");
  assert.match(products, /if \(productRequestPending\.current\) return;/);
  assert.match(products, /setProductError\(""\);/);
  assert.match(products, /getJSON<\{ products: AdminProduct\[\] \}>\("\/admin\/products", controller\.signal\)/);
  assert.match(products, /setData\(\(current\) => \(\{ \.\.\.current, products: productFeed\.products \}\)\)/);
  assert.doesNotMatch(products, /\/admin\/(accounts|audits|orders|promotions|reviews|sellers|finance|analytics)/);
  assert.match(products, /if \(!controller\.signal\.aborted\) setProductLoading\(false\);/);
  assert.match(dashboard, /aria-label="Retry product records"/);
  assert.match(dashboard, /onClick=\{loadProducts\}/);
  assert.match(dashboard, /disabled=\{productLoading\}/);
  assert.match(dashboard, /productRequestController\.current\?\.abort\(\)/);
});

test("admin seller retry reloads only sellers, clears only its error, and prevents duplicate pending requests", () => {
  const sellers = supportingFeed("Sellers");
  assert.match(sellers, /if \(sellerRequestPending\.current\) return;/);
  assert.match(sellers, /setSellerLoadError\(""\);/);
  assert.match(sellers, /getJSON<\{ sellers: AdminSeller\[\] \}>\("\/admin\/sellers", controller\.signal\)/);
  assert.match(sellers, /setSellers\(sellerFeed\.sellers\)/);
  assert.doesNotMatch(sellers, /\/admin\/(accounts|audits|orders|products|promotions|reviews|finance|analytics)/);
  assert.match(sellers, /if \(!controller\.signal\.aborted\) setSellerLoading\(false\);/);
  assert.match(dashboard, /aria-label="Retry seller applications"/);
  assert.match(dashboard, /onClick=\{loadSellers\}/);
  assert.match(dashboard, /disabled=\{sellerLoading\}/);
  assert.match(dashboard, /sellerRequestController\.current\?\.abort\(\)/);
});

test("admin finance retry reloads only finance, clears only its error, and prevents duplicate pending requests", () => {
  const finance = supportingFeed("Finance");
  assert.match(finance, /if \(financeRequestPending\.current\) return;/);
  assert.match(finance, /setFinanceError\(""\);/);
  assert.match(finance, /getJSON<AdminFinanceOverview>\("\/admin\/finance", controller\.signal\)/);
  assert.match(finance, /setFinance\(financeFeed\)/);
  assert.doesNotMatch(finance, /\/admin\/(accounts|audits|orders|products|promotions|reviews|sellers|analytics)/);
  assert.match(finance, /if \(!controller\.signal\.aborted\) setFinanceLoading\(false\);/);
  assert.match(dashboard, /aria-label="Retry finance records"/);
  assert.match(dashboard, /onClick=\{loadFinance\}/);
  assert.match(dashboard, /disabled=\{financeLoading\}/);
  assert.match(dashboard, /financeRequestController\.current\?\.abort\(\)/);
});

test("admin analytics retry reloads only analytics, clears only its error, and prevents duplicate pending requests", () => {
  const analytics = supportingFeed("Analytics");
  assert.match(analytics, /if \(analyticsRequestPending\.current\) return;/);
  assert.match(analytics, /setAnalyticsError\(""\);/);
  assert.match(analytics, /getJSON<\{ analytics: AdminAnalytics \}>\("\/admin\/analytics", controller\.signal\)/);
  assert.match(analytics, /setAnalytics\(analyticsFeed\.analytics\)/);
  assert.doesNotMatch(analytics, /\/admin\/(accounts|audits|orders|products|promotions|reviews|sellers|finance)/);
  assert.match(analytics, /if \(!controller\.signal\.aborted\) setAnalyticsLoading\(false\);/);
  assert.match(dashboard, /aria-label="Retry marketplace analytics"/);
  assert.match(dashboard, /onClick=\{loadAnalytics\}/);
  assert.match(dashboard, /disabled=\{analyticsLoading\}/);
  assert.match(dashboard, /analyticsRequestController\.current\?\.abort\(\)/);
});
