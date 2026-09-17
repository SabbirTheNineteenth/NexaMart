import assert from "node:assert/strict";
import test from "node:test";
import { wishlistItems } from "../src/db/schema/index.js";

test("database schema stores customer wishlist items", () => {
  assert.equal(wishlistItems[Symbol.for("drizzle:Name")], "wishlist_items");
});
