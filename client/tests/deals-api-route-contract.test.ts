import assert from "node:assert/strict";
import test from "node:test";
import { getJSON } from "../src/lib/api.js";

async function captureRequest(path: string) {
  const originalFetch = globalThis.fetch;
  let requestedPath: string | undefined;
  globalThis.fetch = async (input) => {
    requestedPath = String(input);
    return new Response(JSON.stringify({ products: [] }), { headers: { "Content-Type": "application/json" } });
  };
  try {
    await getJSON<{ products: unknown[] }>(path);
    return requestedPath;
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test("deals API requests use the public rewrite route without duplicating its API prefix", async () => {
  const expected = "/api/catalog/products?deals=active";

  assert.equal(await captureRequest("/catalog/products?deals=active"), expected);
  assert.equal(await captureRequest(expected), expected);
});
