import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/seller/SellerDashboard.tsx", import.meta.url), "utf8");
const sellerTypes = readFileSync(new URL("../src/types/seller.ts", import.meta.url), "utf8");
const api = readFileSync(new URL("../src/lib/api.ts", import.meta.url), "utf8");

test("seller dashboard loads an owned store profile into an accessible editable form", () => {
  assert.match(dashboard, /getJSON<\{ profile: SellerStoreProfile \}>\("\/seller\/application", controller\.signal\)/);
  assert.match(dashboard, /<section className="seller-profile" aria-labelledby="seller-profile-heading">/);
  assert.match(dashboard, /<h2 id="seller-profile-heading">Store profile<\/h2>/);
  assert.match(dashboard, /<label htmlFor="seller-store-name">Store name<\/label>/);
  assert.match(dashboard, /<input id="seller-store-name" name="storeName"/);
  assert.match(dashboard, /<label htmlFor="seller-store-description">Description<\/label>/);
  assert.match(dashboard, /<textarea id="seller-store-description" name="description"/);
  assert.match(sellerTypes, /export type SellerStoreProfile =/);
  assert.match(sellerTypes, /storeName: string;/);
  assert.match(sellerTypes, /description\?: string;/);
});

test("seller profile save patches only editable fields and reports success, conflicts, and errors", () => {
  assert.match(dashboard, /patchJSON<\{ profile: SellerStoreProfile \}>\("\/seller\/profile", \{ storeName, description \}\)/);
  assert.doesNotMatch(dashboard, /patchJSON<\{ profile: SellerStoreProfile \}>\("\/seller\/profile", \{[^}]*\b(?:status|accountId|sellerId|owner)/);
  assert.match(dashboard, /seller-profile-success/);
  assert.match(dashboard, /Store profile saved\./);
  assert.match(dashboard, /reason instanceof ApiError && reason\.status === 409/);
  assert.match(dashboard, /Store name already in use/);
  assert.match(api, /constructor\(message: string, public readonly status: number\)/);
});
