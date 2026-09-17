import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";

test("returns a generic JSON 500 for uncaught API route errors", async () => {
  const app = createApp();
  const rawError = "database password leaked at db.internal.example.test";
  const originalError = new Error(rawError);

  app.get("/__test-uncaught-error", () => {
    throw originalError;
  });

  const originalConsoleError = console.error;
  const loggedErrors: unknown[][] = [];
  console.error = (...args: unknown[]) => {
    loggedErrors.push(args);
  };

  try {
    const response = await app.request("http://api.example.test/api/__test-uncaught-error");
    const body = await response.text();

    assert.equal(response.status, 500);
    assert.equal(response.headers.get("content-type"), "application/json");
    assert.deepEqual(JSON.parse(body), { error: "Internal server error" });
    assert.doesNotMatch(body, /database password|db\.internal\.example\.test/);
    assert.equal(response.headers.get("content-security-policy"), "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    assert.equal(response.headers.get("referrer-policy"), "no-referrer");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("x-frame-options"), "DENY");
    assert.deepEqual(loggedErrors, [[originalError]]);
  } finally {
    console.error = originalConsoleError;
  }
});
