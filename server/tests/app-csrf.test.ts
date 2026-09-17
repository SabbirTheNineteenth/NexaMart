import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";

const configuredOrigin = "https://shop.example.com";
const appEnvironment = { NODE_ENV: "production", CLIENT_ORIGIN: configuredOrigin };
const sessionCookie = "nexamart_session=session-token";
const appDependencies = { authAdmission: { limiter: { capability: "shared-atomic" as const, consume: () => ({ allowed: true as const }) } } };

function createMutationProbe(method: "POST" | "PATCH" | "DELETE") {
  const app = createApp(appEnvironment, appDependencies);
  let handlerReached = false;
  app.on(method, "/__csrf-probe", (c) => {
    handlerReached = true;
    return c.json({ ok: true });
  });

  return { app, wasHandlerReached: () => handlerReached };
}

for (const method of ["POST", "PATCH", "DELETE"] as const) {
  test(`rejects a foreign-origin cookie-authenticated ${method} before the mounted handler`, async () => {
    const { app, wasHandlerReached } = createMutationProbe(method);

    const response = await app.request("https://api.example.com/api/__csrf-probe", {
      method,
      headers: { Cookie: sessionCookie, Origin: "https://attacker.example" },
    });
    const body = await response.text();

    assert.equal(response.status, 403);
    assert.deepEqual(JSON.parse(body), { error: "Forbidden" });
    assert.equal(wasHandlerReached(), false);
    assert.doesNotMatch(body, /attacker\.example/);
  });

  test(`permits a configured-origin cookie-authenticated ${method}`, async () => {
    const { app, wasHandlerReached } = createMutationProbe(method);

    const response = await app.request("https://api.example.com/api/__csrf-probe", {
      method,
      headers: { Cookie: sessionCookie, Origin: configuredOrigin },
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
    assert.equal(wasHandlerReached(), true);
  });
}

test("permits a cookie-authenticated mutation with an exact configured Referer when Origin is absent", async () => {
  const { app, wasHandlerReached } = createMutationProbe("POST");

  const response = await app.request("https://api.example.com/api/__csrf-probe", {
    method: "POST",
    headers: { Cookie: sessionCookie, Referer: `${configuredOrigin}/cart` },
  });

  assert.equal(response.status, 200);
  assert.equal(wasHandlerReached(), true);
});

test("rejects a cookie-authenticated mutation when both Origin and Referer are absent", async () => {
  const { app, wasHandlerReached } = createMutationProbe("POST");

  const response = await app.request("https://api.example.com/api/__csrf-probe", {
    method: "POST",
    headers: { Cookie: sessionCookie },
  });

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "Forbidden" });
  assert.equal(wasHandlerReached(), false);
});

test("does not block a non-cookie mutation without browser source headers", async () => {
  const { app, wasHandlerReached } = createMutationProbe("POST");

  const response = await app.request("https://api.example.com/api/__csrf-probe", { method: "POST" });

  assert.equal(response.status, 200);
  assert.equal(wasHandlerReached(), true);
});

test("does not apply CSRF checks to cookie-bearing GET, HEAD, or OPTIONS requests", async () => {
  const app = createApp(appEnvironment, appDependencies);
  let getReached = false;
  app.get("/__csrf-read-probe", (c) => {
    getReached = true;
    return c.body(null, 204);
  });
  app.options("/__csrf-options-probe", (c) => c.body(null, 204));

  const [getResponse, headResponse, optionsResponse] = await Promise.all([
    app.request("https://api.example.com/api/__csrf-read-probe", { headers: { Cookie: sessionCookie } }),
    app.request("https://api.example.com/api/__csrf-read-probe", { method: "HEAD", headers: { Cookie: sessionCookie } }),
    app.request("https://api.example.com/api/__csrf-options-probe", { method: "OPTIONS", headers: { Cookie: sessionCookie } }),
  ]);

  assert.equal(getResponse.status, 204);
  assert.equal(headResponse.status, 204);
  assert.equal(optionsResponse.status, 204);
  assert.equal(getReached, true);
});
