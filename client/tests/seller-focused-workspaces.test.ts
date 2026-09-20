import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/seller/SellerDashboard.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/features/seller/SellerDashboard.module.css", import.meta.url), "utf8");

test("seller routes render and load only their active workspace", () => {
  for (const section of ["overview", "analytics", "profile", "catalog", "inventory", "taxonomy", "promotions", "fulfillment", "finance", "reviews", "notifications"]) {
    assert.match(dashboard, new RegExp(`activeSection === "${section}"`));
  }
  assert.doesNotMatch(styles, /data-seller-section[\s\S]*:global\(\.seller-(analytics|profile|finance|reviews|queue|promotions|orders)\)/);
  const promotionLoad = dashboard.slice(dashboard.indexOf("Promise.all(["), dashboard.indexOf("]).then(([catalog, promotionFeed])"));
  assert.doesNotMatch(promotionLoad, /seller\/(orders|finance|application)/);
  assert.match(dashboard, /activeSection === "fulfillment"[\s\S]*?"\/seller\/orders"/);
  assert.match(dashboard, /activeSection === "finance"[\s\S]*?"\/seller\/finance"/);
});

test("catalog and inventory both expose real product editing while stock saving remains in inventory", () => {
  const catalogStart = dashboard.indexOf('activeSection === "catalog" && <section');
  const inventoryStart = dashboard.indexOf('activeSection === "inventory" && <section');
  const catalogWorkspace = dashboard.slice(catalogStart, inventoryStart);
  const inventoryWorkspace = dashboard.slice(inventoryStart, dashboard.indexOf('activeSection === "promotions" && <section', inventoryStart));
  assert.match(catalogWorkspace, /<SellerProductEditor product=\{product\} onSaved=/);
  assert.match(catalogWorkspace, /<SellerProductAssets product=\{product\} \/>/);
  assert.match(catalogWorkspace, /<SellerProductForm/);
  assert.doesNotMatch(catalogWorkspace, /seller-stock-form|Save stock/);
  assert.match(inventoryWorkspace, /seller-stock-form/);
  assert.match(inventoryWorkspace, /Save stock/);
  assert.match(inventoryWorkspace, /SellerProductEditor/);
  assert.match(inventoryWorkspace, /SellerProductAssets/);
  assert.doesNotMatch(inventoryWorkspace, /SellerProductForm/);
});
