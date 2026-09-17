import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { applyPublicPromotionPricing, toPublicProductDetail } from "../src/modules/catalog/catalog.types.js";

type PublicSource = {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviews: number;
  image: string;
  description: string;
  colors: string[];
  inStock: boolean;
};

const product: PublicSource = {
  id: "product-1", slug: "studio-lamp", name: "Studio Lamp", category: "Home", price: 19.99,
  originalPrice: 29.99, rating: 4.7, reviews: 91, image: "https://cdn.example/lamp.jpg",
  description: "Warm lamp", colors: ["White"], inStock: true,
};
const now = new Date("2026-09-13T12:00:00.000Z");
const active = { id: "promotion-1", productId: product.id, name: "Flash offer", scope: "product" as const, discountPercent: "12.50", startsAt: new Date("2026-09-13T11:00:00.000Z"), endsAt: new Date("2026-09-13T13:00:00.000Z"), createdAt: new Date("2026-09-13T10:00:00.000Z") };

const price = (products: PublicSource[], promotions = [active]) => applyPublicPromotionPricing(products, promotions, now);

test("public catalog list, detail, and store products expose the same exact active flash-offer price", () => {
  const [listed] = price([product]);
  const detail = toPublicProductDetail({ ...product, ...listed, galleryImages: [], variants: [] });
  const [storeProduct] = price([product]);

  const expected = {
    basePrice: 19.99,
    effectivePrice: 17.49,
    promotion: { id: "promotion-1", name: "Flash offer", discountPercent: 12.5, endsAt: active.endsAt },
  };
  assert.deepEqual({ basePrice: listed!.basePrice, effectivePrice: listed!.effectivePrice, promotion: listed!.promotion }, expected);
  assert.deepEqual({ basePrice: detail.basePrice, effectivePrice: detail.effectivePrice, promotion: detail.promotion }, expected);
  assert.deepEqual({ basePrice: storeProduct!.basePrice, effectivePrice: storeProduct!.effectivePrice, promotion: storeProduct!.promotion }, expected);
  assert.equal(listed!.price, product.price);
  assert.equal(listed!.originalPrice, product.originalPrice);
});

test("public catalog excludes exact-end, future, and legacy order promotions while resolving legacy product overlaps deterministically", () => {
  const [priced] = price([product], [
    { ...active, id: "order", name: "Order scope", scope: "order", discountPercent: "90.00" },
    { ...active, id: "future", name: "Future", discountPercent: "80.00", startsAt: new Date("2026-09-13T12:00:00.001Z") },
    { ...active, id: "ended", name: "Ended", discountPercent: "70.00", endsAt: now },
    { ...active, id: "later", name: "Later created", discountPercent: "20.00", createdAt: new Date("2026-09-13T10:30:00.000Z") },
    { ...active, id: "winner", name: "Winner", discountPercent: "20.00", createdAt: new Date("2026-09-13T10:00:00.000Z") },
  ]);

  assert.deepEqual(priced!.promotion, { id: "winner", name: "Winner", discountPercent: 20, endsAt: active.endsAt });
  assert.equal(priced!.basePrice, 19.99);
  assert.equal(priced!.effectivePrice, 15.99);
});

test("unpromoted public catalog products expose only their base and effective prices", () => {
  const [priced] = price([product], [
    { ...active, id: "future", startsAt: new Date("2026-09-13T12:00:00.001Z") },
    { ...active, id: "ended", endsAt: now },
    { ...active, id: "order", scope: "order" },
  ]);

  assert.deepEqual(priced, { ...product, basePrice: 19.99, effectivePrice: 19.99 });
});

test("active-deals catalog filtering is server-enforced by an eligible current product promotion", () => {
  const repository = readFileSync(new URL("../src/modules/catalog/postgres-catalog.repository.ts", import.meta.url), "utf8");

  assert.match(repository, /if \(filters\.deals === "active"\) conditions\.push\(exists\(this\.database\.select\(\{ id: promotions\.id \}\)\.from\(promotions\)\.where\(and\(eq\(promotions\.productId, products\.id\), eq\(promotions\.sellerId, products\.sellerId\), eq\(promotions\.scope, "product"\), lte\(promotions\.startsAt, sql`now\(\)`\), gt\(promotions\.endsAt, sql`now\(\)`\)\)\)\)\);/);
});

test("promotion activation migration requires a complete promoted snapshot and a discounted effective unit price", () => {
  const migration = readFileSync(new URL("../src/db/migrations/0018_product_promotion_activation.sql", import.meta.url), "utf8");

  assert.match(migration, /"promotion_id" IS NULL AND "promotion_name" IS NULL AND "discount_percent" IS NULL AND "base_unit_price" IS NULL/);
  assert.match(migration, /"promotion_id" IS NOT NULL AND "promotion_name" IS NOT NULL AND "discount_percent" >= 0\.01 AND "discount_percent" <= 99\.99 AND "base_unit_price" IS NOT NULL AND "unit_price" < "base_unit_price"/);
});
