import assert from "node:assert/strict";
import test from "node:test";
import { resolveClientOrigin } from "../src/config/environment.js";

test("uses the local client origin when not in production", () => {
  assert.equal(resolveClientOrigin({}), "http://localhost:3001");
});

test("preserves an explicit local HTTP client origin outside production", () => {
  assert.equal(resolveClientOrigin({ CLIENT_ORIGIN: "http://localhost:3001" }), "http://localhost:3001");
});

test("requires CLIENT_ORIGIN in production", () => {
  assert.throws(() => resolveClientOrigin({ NODE_ENV: "production" }), /CLIENT_ORIGIN is required in production/);
});

test("rejects a wildcard client origin in production", () => {
  assert.throws(
    () => resolveClientOrigin({ NODE_ENV: "production", CLIENT_ORIGIN: "https://*.example.com" }),
    /CLIENT_ORIGIN must be an exact HTTPS origin in production/,
  );
});

test("rejects a client origin with a path in production", () => {
  assert.throws(
    () => resolveClientOrigin({ NODE_ENV: "production", CLIENT_ORIGIN: "https://shop.example.com/store" }),
    /CLIENT_ORIGIN must be an exact HTTPS origin in production/,
  );
});

test("rejects a malformed non-origin client origin in production", () => {
  assert.throws(
    () => resolveClientOrigin({ NODE_ENV: "production", CLIENT_ORIGIN: "shop.example.com" }),
    /CLIENT_ORIGIN must be an exact HTTPS origin in production/,
  );
});

test("rejects a non-HTTPS client origin in production", () => {
  assert.throws(
    () => resolveClientOrigin({ NODE_ENV: "production", CLIENT_ORIGIN: "http://shop.example.com" }),
    /CLIENT_ORIGIN must be an exact HTTPS origin in production/,
  );
});

test("uses an exact HTTPS client origin in production", () => {
  assert.equal(resolveClientOrigin({ NODE_ENV: "production", CLIENT_ORIGIN: "https://shop.example.com" }), "https://shop.example.com");
});
