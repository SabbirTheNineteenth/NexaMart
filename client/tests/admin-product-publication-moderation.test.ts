import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { productPublicationError, replacePublishedProduct } from "../src/features/admin/product-publication-moderation";
import type { AdminProduct } from "../src/types/admin";

const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");

const product: AdminProduct = {
  id: "product-1", slug: "studio-lamp", name: "Studio Lamp", brand: "Lumen", primaryImageUrl: "https://cdn.example/lamp.jpg",
  price: 89.5, stock: 12, isPublished: false, category: { id: "category-1", name: "Lighting", slug: "lighting" },
  seller: { id: "seller-1", name: "Avery", storeName: "Avery Lighting", storeSlug: "avery-lighting", status: "approved" },
  createdAt: "2026-09-12T00:00:00.000Z", updatedAt: "2026-09-12T00:00:00.000Z", expectedRevision: "2026-09-12T00:00:00.123456+00",
};

test("publication moderation replaces only the returned local product", () => {
  const untouched = { ...product, id: "product-2", name: "Desk Clock" };
  const returned = { ...product, isPublished: true, updatedAt: "2026-09-13T00:00:00.000Z" };

  const products = replacePublishedProduct([product, untouched], returned);

  assert.deepEqual(products, [returned, untouched]);
  assert.equal(products[1], untouched);
});

test("publication moderation gives clear conflict, 404, and API failure messages", () => {
  assert.equal(productPublicationError({ status: 409 }), "Product changed; reload and review again.");
  assert.equal(productPublicationError({ status: 404 }), "Product was not found or is no longer available.");
  assert.equal(productPublicationError(new Error("Not authorized")), "Not authorized");
  assert.equal(productPublicationError(new DOMException("aborted", "AbortError")), "");
});

test("admin product oversight exposes only accessible publication controls", () => {
  const productPanelStart = dashboard.indexOf('className="admin-panel admin-product-oversight"');
  const productPanelEnd = dashboard.indexOf('className="admin-panel admin-finance"', productPanelStart);
  const productPanel = dashboard.slice(productPanelStart, productPanelEnd);

  assert.match(dashboard, /import \{ getJSON, patchJSON, postJSON \} from "@\/lib\/api"/);
  assert.match(dashboard, /patchJSON<\{ product: AdminProduct \}>\(`\/admin\/products\/\$\{change\.productId\}\/publication`, \{ isPublished: change\.isPublished, expectedRevision: change\.expectedRevision \}\)/);
  assert.match(productPanel, /aria-label=\{`\$\{isPublished \? "Unpublish" : "Publish"\} \$\{product\.name\}`\}/);
  assert.match(productPanel, /\{isUpdating \? "Saving…" : isPublished \? "Unpublish" : "Publish"\}/);
  assert.match(productPanel, /disabled=\{isUpdating \|\| !product\.expectedRevision\}/);
  assert.match(dashboard, /Product publication updated\./);
  assert.match(dashboard, /productPublicationError/);
  assert.doesNotMatch(productPanel, /\b(?:sellerId|price|stock|categoryId)\s*:/);
});
