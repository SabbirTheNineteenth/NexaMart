import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { replaceSellerProductStock, validateSellerStock } from "../src/features/seller/seller-stock-management";

const dashboard = readFileSync(new URL("../src/features/seller/SellerDashboard.tsx", import.meta.url), "utf8");

test("seller stock validation accepts nonnegative whole units and rejects invalid quantities", () => {
  assert.equal(validateSellerStock("0"), undefined);
  assert.equal(validateSellerStock("12"), undefined);
  assert.match(validateSellerStock("") ?? "", /Enter a stock quantity/);
  assert.match(validateSellerStock("1.5") ?? "", /whole number/);
  assert.match(validateSellerStock("-1") ?? "", /zero or greater/);
  assert.match(validateSellerStock("12e3") ?? "", /whole number/);
  assert.match(validateSellerStock("9007199254740992") ?? "", /safe whole number/);
});

test("seller stock replacement changes only the successfully saved product", () => {
  const products = [
    { id: "product-1", sellerId: "seller-1", name: "Studio Lamp", stock: 3, isPublished: false },
    { id: "product-2", sellerId: "seller-1", name: "Desk Chair", stock: 7, isPublished: true },
  ];

  const updated = replaceSellerProductStock(products, "product-1", 12);

  assert.deepEqual(updated, [
    { ...products[0], stock: 12 },
    products[1],
  ]);
  assert.notEqual(updated[0], products[0]);
  assert.equal(updated[1], products[1]);
});

test("seller product rows expose accessible per-product stock forms", () => {
  assert.match(dashboard, /aria-label=\{`Update stock for \$\{product\.name\}`\}/);
  assert.match(dashboard, /name="stock" type="number" min="0" step="1" inputMode="numeric"/);
  assert.match(dashboard, /Save stock/);
  assert.match(dashboard, /aria-busy=\{stockFeedback\[product\.id\]\?\.kind === "pending"\}/);
});

test("seller stock saving waits for the owned stock endpoint before replacing local stock", () => {
  assert.match(dashboard, /await patchJSON<void>\(`\/seller\/products\/\$\{product\.id\}\/stock`, \{ stock \}\)/);
  assert.match(dashboard, /setProducts\(\(items\) => replaceSellerProductStock\(items, product\.id, stock\)\)/);
});

test("seller stock feedback is isolated per product for pending success errors and unavailable products", () => {
  assert.match(dashboard, /const \[stockFeedback, setStockFeedback\] = useState<Record<string, StockFeedback>>\(\{\}\)/);
  assert.match(dashboard, /Saving stock…/);
  assert.match(dashboard, /Stock updated\./);
  assert.match(dashboard, /This product is no longer available\./);
  assert.match(dashboard, /role=\{feedback\.kind === "error" \? "alert" : "status"\}/);
});

test("seller stock controls are mounted only in inventory, apart from catalog detail and asset editors", () => {
  const inventoryStart = dashboard.indexOf('activeSection === "inventory" && <section');
  const inventoryWorkspace = dashboard.slice(inventoryStart, dashboard.indexOf('activeSection === "promotions" && <section', inventoryStart));
  assert.match(inventoryWorkspace, /seller-stock-form/);
  assert.doesNotMatch(inventoryWorkspace, /SellerProductEditor|SellerProductAssets/);
  assert.doesNotMatch(inventoryWorkspace, /payment|checkout|delivery|n8n/i);
});
