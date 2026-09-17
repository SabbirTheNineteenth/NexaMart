import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ApiError } from "../src/lib/api";
import { wishlistSaveError } from "../src/features/catalog/wishlist-save";

const storefront = readFileSync(new URL("../src/features/catalog/Storefront.tsx", import.meta.url), "utf8");
const detail = readFileSync(new URL("../src/features/catalog/ProductDetail.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

test("wishlist save errors tell unauthenticated and forbidden customers to sign in", () => {
  assert.equal(wishlistSaveError(new ApiError("Request failed", 401)), "Sign in from Account to save pieces.");
  assert.equal(wishlistSaveError(new ApiError("Forbidden", 403)), "Sign in from Account to save pieces.");
  assert.equal(wishlistSaveError(new Error("Network unavailable")), "Network unavailable");
});

test("catalog save control keeps wishlist feedback scoped to the saved product", () => {
  assert.match(storefront, /type WishlistSaveState = \{ state: "saving" \} \| \{ state: "success" \} \| \{ state: "error"; message: string \};/);
  assert.match(storefront, /const \[wishlistSaves, setWishlistSaves\] = useState<Record<string, WishlistSaveState \| undefined>>\(\{\}\);/);
  assert.match(storefront, /const wishlistSavingIds = useRef\(new Set<string>\(\)\);/);
  assert.match(storefront, /if \(wishlistSavingIds\.current\.has\(productId\)\) return;/);
  assert.match(storefront, /await postJSON<void>\("\/wishlist\/items", \{ productId \}\);/);
  assert.match(storefront, /\[productId\]: \{ state: "success" \}/);
  assert.match(storefront, /const wishlistSave = wishlistSaves\[product\.id\];/);
  assert.match(storefront, /aria-label=\{`Save \$\{product\.name\} to saved pieces`\}/);
  assert.match(storefront, /disabled=\{wishlistSave\?\.state === "saving"\}/);
  assert.match(storefront, /Saving…/);
  assert.match(storefront, /Saved\./);
  assert.match(storefront, /role="status"/);
  assert.match(storefront, /role="alert"/);
});

test("product detail save control waits for POST completion before showing per-product success", () => {
  assert.match(detail, /type WishlistSaveState = \{ state: "saving" \} \| \{ state: "success" \} \| \{ state: "error"; message: string \};/);
  assert.match(detail, /const \[wishlistSave, setWishlistSave\] = useState<WishlistSaveState \| undefined>\(undefined\);/);
  assert.match(detail, /const wishlistSavingRef = useRef\(false\);/);
  assert.match(detail, /setWishlistSave\(undefined\);/);
  assert.match(detail, /if \(wishlistSavingRef\.current\) return;/);
  assert.match(detail, /await postJSON<void>\("\/wishlist\/items", \{ productId: product\.id \}\);/);
  assert.match(detail, /setWishlistSave\(\{ state: "success" \}\);/);
  assert.match(detail, /aria-label=\{wishlistSave\?\.state === "saving" \? `Saving \$\{product\.name\} to saved pieces` : `Save \$\{product\.name\} to saved pieces`\}/);
  assert.match(detail, /disabled=\{wishlistSave\?\.state === "saving"\}/);
  assert.match(detail, /Saving…/);
  assert.match(detail, /Saved\./);
  assert.match(detail, /role="status"/);
  assert.match(detail, /role="alert"/);
});

test("product detail save control gives the compact heart a visible pending affordance", () => {
  assert.match(detail, /LoaderCircle/);
  assert.match(detail, /className="wishlist-save-indicator" aria-hidden="true"/);
  assert.match(detail, /wishlistSave\?\.state === "saving" \? <LoaderCircle/);
  assert.match(styles, /\.wishlist-save-indicator\{animation:wishlist-save-spin/);
  assert.match(styles, /@media\(prefers-reduced-motion:reduce\)\{\.wishlist-save-indicator\{animation:none/);
});

test("wishlist save feedback has responsive presentation styles", () => {
  assert.match(styles, /\.wishlist-save-feedback/);
  assert.match(styles, /\.wishlist-button:disabled/);
  assert.match(styles, /@media\(max-width:760px\)\{[^}]*\.wishlist-save-feedback/s);
});
