import assert from "node:assert/strict";
import test from "node:test";
import { toProductSlug } from "../src/features/seller/seller-product.utils";

test("seller product slug normalizes a catalog name", () => {
  assert.equal(toProductSlug("  Studio   Lamp & Shade!  "), "studio-lamp-shade");
});
