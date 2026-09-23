import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/seller/SellerDashboard.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/features/seller/SellerDashboard.module.css", import.meta.url), "utf8");

test("S03 inventory frames loaded products in a dense, filterable stock table with real editor destinations", () => {
  const inventoryStart = dashboard.indexOf('activeSection === "inventory" && <section');
  const inventoryWorkspace = dashboard.slice(inventoryStart, dashboard.indexOf('activeSection === "taxonomy" && <', inventoryStart));

  assert.match(inventoryWorkspace, /className=\{styles\.inventoryFilters\}/);
  assert.match(dashboard, /const filteredProducts = useMemo\(\(\) => filterSellerProducts\(products, productFilters\)/);
  assert.match(inventoryWorkspace, /Showing \{filteredProducts\.length\} of \{products\.length\} products/);
  assert.match(inventoryWorkspace, /<table className=\{styles\.inventoryTable\}/);
  assert.match(inventoryWorkspace, /<th scope="col">Product<\/th>/);
  assert.match(inventoryWorkspace, /<th scope="col">Stock<\/th>/);
  assert.match(inventoryWorkspace, /<th scope="col">Actions<\/th>/);
  assert.match(inventoryWorkspace, /product\.brand \?\? "No brand"/);
  assert.match(inventoryWorkspace, /product\.categoryId \? `Category \$\{product\.categoryId\}` : "Uncategorized"/);
  assert.match(inventoryWorkspace, /<SellerProductEditor product=\{product\}/);
  assert.match(inventoryWorkspace, /<SellerProductAssets product=\{product\} \/>/);
  assert.match(inventoryWorkspace, /aria-label=\{`Update stock for \$\{product\.name\}`\}/);
  assert.match(inventoryWorkspace, /<form className="seller-stock-form"[^>]*aria-busy=/);
  assert.match(styles, /\.inventoryTable\s*\{[^}]*min-width:\s*820px/);
  assert.match(styles, /\.catalogFilters,\.inventoryFilters\s*\{/);
});
