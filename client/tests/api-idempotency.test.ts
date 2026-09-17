import assert from "node:assert/strict";
import test from "node:test";
import { postJSON } from "../src/lib/api.js";

test("postJSON preserves an idempotency key for a retry-safe checkout request", async () => {
  const originalFetch = globalThis.fetch;
  let headers: HeadersInit | undefined;
  globalThis.fetch = async (_input, init) => {
    headers = init?.headers;
    return new Response(JSON.stringify({ order: { reference: "NX-ORDER-1" } }), { status: 201, headers: { "Content-Type": "application/json" } });
  };
  try {
    await postJSON("/checkout/orders", { items: [] }, { "Idempotency-Key": "checkout-1" });
    assert.equal(new Headers(headers).get("Idempotency-Key"), "checkout-1");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
