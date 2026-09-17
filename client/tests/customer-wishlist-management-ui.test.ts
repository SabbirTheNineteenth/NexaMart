import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workspace = readFileSync(new URL("../src/features/account/AccountWorkspace.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

test("customer wishlist loads independently with pending, empty, error, and retry states", () => {
  assert.match(workspace, /type WishlistState = \{ state: "loading" \} \| \{ state: "loaded" \} \| \{ state: "error"; message: string \};/);
  assert.match(workspace, /getJSON<\{ items: WishlistItem\[\] \}>\("\/wishlist\/items"\)/);
  assert.match(workspace, /Loading saved pieces…/);
  assert.match(workspace, /Unable to load saved pieces/);
  assert.match(workspace, /Try again/);
  assert.match(workspace, /Save pieces from the collection to revisit them here\./);
  assert.match(workspace, /aria-live="polite"/);
  assert.match(workspace, /role="alert"/);
});

test("customer wishlist removes a product only after its authenticated delete succeeds", () => {
  assert.match(workspace, /import \{ deleteJSON, getJSON, postJSON \} from "@\/lib\/api";/);
  assert.match(workspace, /await deleteJSON<\{ removed: boolean \}>\(`\/wishlist\/\$\{item\.id\}`\);/);
  assert.match(workspace, /setWishlist\(\(current\) => current\.filter\(\(saved\) => saved\.id !== item\.id\)\);/);
  assert.match(workspace, /Removing…/);
  assert.match(workspace, /Remove \$\{item\.name\} from saved pieces/);
  assert.match(styles, /\.wishlist-remove/);
});

test("wishlist removal preserves a visible item and exposes an accessible error when delete fails", () => {
  assert.match(workspace, /type WishlistRemovalState = \{ state: "removing" \} \| \{ state: "error"; message: string \};/);
  assert.match(workspace, /Unable to remove saved piece/);
  assert.match(workspace, /wishlistRemovals\[item\.id\]/);
  assert.match(workspace, /disabled=\{removal\?\.state === "removing"\}/);
});
