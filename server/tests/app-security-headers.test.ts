import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";

const sharedLimiter = { capability: "shared-atomic" as const, consume: () => ({ allowed: true as const }) };

const expectedSecurityHeaders = {
  "content-security-policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
};

function assertSecurityHeaders(response: Response): void {
  for (const [name, value] of Object.entries(expectedSecurityHeaders)) {
    assert.equal(response.headers.get(name), value);
  }
}

test("applies security headers to API health responses", async () => {
  const response = await createApp().request("http://api.example.test/api/health");

  assert.equal(response.status, 200);
  assertSecurityHeaders(response);
});

test("applies security headers to API not-found responses", async () => {
  const response = await createApp().request("http://api.example.test/api/not-found");

  assert.equal(response.status, 404);
  assertSecurityHeaders(response);
});

test("applies security headers to credentialed CORS preflight responses", async () => {
  const response = await createApp({ NODE_ENV: "production", CLIENT_ORIGIN: "https://shop.example.com" }, { authAdmission: { limiter: sharedLimiter } }).request(
    "https://api.example.test/api/health",
    {
      method: "OPTIONS",
      headers: {
        Origin: "https://shop.example.com",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "Content-Type",
      },
    },
  );

  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), "https://shop.example.com");
  assert.equal(response.headers.get("access-control-allow-credentials"), "true");
  assertSecurityHeaders(response);
});
