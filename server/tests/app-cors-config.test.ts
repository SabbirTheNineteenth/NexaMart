import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";

const sharedLimiter = { capability: "shared-atomic" as const, consume: () => ({ allowed: true as const }) };

test("allows credentialed CORS preflight from the configured production origin", async () => {
  const app = createApp({ NODE_ENV: "production", CLIENT_ORIGIN: "https://shop.example.com" }, { authAdmission: { limiter: sharedLimiter } });

  const response = await app.request("https://api.example.com/api/health", {
    method: "OPTIONS",
    headers: {
      Origin: "https://shop.example.com",
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Headers": "Content-Type",
    },
  });

  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), "https://shop.example.com");
  assert.equal(response.headers.get("access-control-allow-credentials"), "true");
  assert.match(response.headers.get("access-control-allow-methods") ?? "", /GET/);
});

test("does not initialize an app with invalid production CORS configuration", () => {
  assert.throws(
    () => createApp({ NODE_ENV: "production", CLIENT_ORIGIN: "https://*.example.com" }),
    /CLIENT_ORIGIN must be an exact HTTPS origin in production/,
  );
});

test("local QA origin is accepted only with the explicit local QA marker", () => {
  assert.doesNotThrow(() =>
    createApp(
      { NODE_ENV: "production", NEXAMART_LOCAL_QA: "1", PORT: "3004", CLIENT_ORIGIN: "http://localhost:3005" },
      { authAdmission: { limiter: sharedLimiter } },
    ),
  );
  assert.throws(
    () => createApp({ NODE_ENV: "production", CLIENT_ORIGIN: "http://localhost:3006" }),
    /CLIENT_ORIGIN must be an exact HTTPS origin/,
  );
  assert.throws(
    () => createApp({ NODE_ENV: "production", NEXAMART_LOCAL_QA: "1", PORT: "3005" }),
    /NEXAMART_LOCAL_QA requires PORT=3004/,
  );
});
