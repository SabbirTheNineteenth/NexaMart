import assert from "node:assert/strict";
import test from "node:test";
import { catalogLoadFailure, catalogLoadSuccess } from "../src/features/catalog/catalog-load-state.js";

test("catalog load ignores aborted requests", () => {
  assert.equal(catalogLoadFailure(new DOMException("aborted", "AbortError")), null);
});

test("catalog load exposes non-abort failures and clears them after a successful reload", () => {
  assert.deepEqual(catalogLoadFailure(new Error("Catalog unavailable")), { error: "Catalog unavailable" });
  assert.deepEqual(catalogLoadSuccess(), { error: "" });
});
