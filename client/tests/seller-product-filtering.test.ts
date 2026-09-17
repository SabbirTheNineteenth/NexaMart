import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { filterSellerProducts } from "../src/features/seller/seller-product-filtering";
import type { SellerProduct } from "../src/types/seller";

const dashboard = readFileSync(new URL("../src/features/seller/SellerDashboard.tsx", import.meta.url), "utf8");
const products: SellerProduct[] = [
  { id: "published-lamp", sellerId: "seller-1", name: "Studio Lamp", brand: "Luma", stock: 8, isPublished: true, categoryId: "lighting" },
  { id: "draft-chair", sellerId: "seller-1", name: "Reading Chair", brand: "Oak & Co", stock: 2, isPublished: false, categoryId: "seating" },
  { id: "published-cable", sellerId: "seller-1", name: "USB-C Cable", stock: 0, isPublished: true, categoryId: null },
];

test("seller product filtering searches owned product names and brands case-insensitively", () => {
  assert.deepEqual(
    filterSellerProducts(products, { query: "  lUmA ", categoryId: "all", status: "all" }).map((product) => product.id),
    ["published-lamp"],
  );
});

test("seller product filtering applies category and publication status together", () => {
  assert.deepEqual(
    filterSellerProducts(products, { query: "", categoryId: "lighting", status: "published" }).map((product) => product.id),
    ["published-lamp"],
  );
  assert.deepEqual(filterSellerProducts(products, { query: "", categoryId: "seating", status: "published" }), []);
});

test("seller product filtering can show uncategorized drafts without changing the loaded list", () => {
  const result = filterSellerProducts(products, { query: "", categoryId: "uncategorized", status: "draft" });

  assert.deepEqual(result, []);
  assert.equal(products.length, 3);
  assert.equal(products[2].categoryId, null);
});

test("seller product filtering returns uncategorized products when that category is selected", () => {
  assert.deepEqual(
    filterSellerProducts(products, { query: "", categoryId: "uncategorized", status: "published" }).map((product) => product.id),
    ["published-cable"],
  );
});

test("seller catalog controls filter only already-loaded owned products and distinguish empty from no matches", () => {
  assert.match(dashboard, /import \{ filterSellerProducts \} from "@\/features\/seller\/seller-product-filtering";/);
  assert.match(dashboard, /const filteredProducts = useMemo\(\(\) => filterSellerProducts\(products, productFilters\), \[products, productFilters\]\);/);
  assert.match(dashboard, /aria-label="Search your products"/);
  assert.match(dashboard, /<label[^>]*>Category<select/);
  assert.match(dashboard, /<label[^>]*>Status<select/);
  assert.match(dashboard, /Showing \{filteredProducts\.length\} of \{products\.length\} products/);
  assert.match(dashboard, /No products match these filters\./);
  assert.match(dashboard, /Clear filters/);
  assert.match(dashboard, /Your catalog is clear\./);
});
