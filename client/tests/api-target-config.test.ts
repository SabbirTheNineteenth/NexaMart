import assert from "node:assert/strict";
import test from "node:test";
// The Next configuration module runs as native ESM and is intentionally JavaScript.
// @ts-expect-error no declaration file is needed for a Next config helper
import { resolveApiTarget } from "../config/api-target.mjs";

test("uses the local API target when not in production", () => {
  assert.equal(resolveApiTarget({}), "http://localhost:3000");
});

test("preserves an explicit local HTTP API target outside production", () => {
  assert.equal(resolveApiTarget({ NEXAMART_API_URL: "http://localhost:3000" }), "http://localhost:3000");
});

test("requires NEXAMART_API_URL in production", () => {
  assert.throws(() => resolveApiTarget({ NODE_ENV: "production" }), /NEXAMART_API_URL is required in production/);
});

test("rejects a wildcard API target in production", () => {
  assert.throws(
    () => resolveApiTarget({ NODE_ENV: "production", NEXAMART_API_URL: "https://*.example.com" }),
    /NEXAMART_API_URL must be an exact HTTPS origin in production/,
  );
});

test("rejects an API target with a path in production", () => {
  assert.throws(
    () => resolveApiTarget({ NODE_ENV: "production", NEXAMART_API_URL: "https://api.example.com/v1" }),
    /NEXAMART_API_URL must be an exact HTTPS origin in production/,
  );
});

test("rejects a malformed API target in production", () => {
  assert.throws(
    () => resolveApiTarget({ NODE_ENV: "production", NEXAMART_API_URL: "api.example.com" }),
    /NEXAMART_API_URL must be an exact HTTPS origin in production/,
  );
});

test("rejects a non-HTTPS API target in production", () => {
  assert.throws(
    () => resolveApiTarget({ NODE_ENV: "production", NEXAMART_API_URL: "http://api.example.com" }),
    /NEXAMART_API_URL must be an exact HTTPS origin in production/,
  );
});

test("uses an exact HTTPS API target in production", () => {
  assert.equal(resolveApiTarget({ NODE_ENV: "production", NEXAMART_API_URL: "https://api.example.com" }), "https://api.example.com");
});

test("permits the loopback API only for explicitly marked local production screenshot QA", () => {
  assert.equal(resolveApiTarget({ NODE_ENV: "production", NEXAMART_LOCAL_QA: "1", NEXAMART_API_URL: "http://localhost:3000" }), "http://localhost:3000");
  assert.throws(
    () => resolveApiTarget({ NODE_ENV: "production", NEXAMART_LOCAL_QA: "1", NEXAMART_API_URL: "http://127.0.0.1:3000" }),
    /NEXAMART_API_URL must be an exact HTTPS origin/,
  );
});
