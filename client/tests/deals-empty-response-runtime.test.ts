import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
require.extensions[".css"] = () => undefined;

test("deals accepts the live empty catalog response without passing a non-array into the render path", async () => {
  const response = { products: [], categories: [] };
  const { activeDealsFromCatalogResponse } = await import("../src/features/catalog/DealsDiscovery");

  assert.deepEqual(activeDealsFromCatalogResponse(response), []);
});
