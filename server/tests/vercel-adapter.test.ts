import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { Hono } from "hono";
import { createApp } from "../src/app.js";
import vercelHandler, { createVercelHandler } from "../api/[...route].js";

type HeaderValue = string | number | readonly string[] | undefined;

function requestFrom(body = "", options: { method?: string; url?: string; headers?: Record<string, string | string[]> } = {}) {
  const bytes = new TextEncoder().encode(body);
  return {
    method: options.method ?? "GET",
    url: options.url ?? "/api/health",
    headers: { host: "api.example.test", ...options.headers },
    async *[Symbol.asyncIterator]() {
      if (bytes.byteLength > 0) yield bytes;
    },
  };
}

function responseCollector() {
  const headers = new Map<string, HeaderValue>();
  const chunks: Uint8Array[] = [];
  let statusCode = 200;

  return {
    get statusCode() {
      return statusCode;
    },
    set statusCode(value: number) {
      statusCode = value;
    },
    setHeader(name: string, value: HeaderValue) {
      headers.set(name.toLowerCase(), value);
    },
    write(chunk: Uint8Array) {
      chunks.push(chunk);
    },
    end(chunk?: Uint8Array) {
      if (chunk) chunks.push(chunk);
    },
    result() {
      return { statusCode, headers, body: new TextDecoder().decode(Buffer.concat(chunks)) };
    },
  };
}

async function invoke(handler: ReturnType<typeof createVercelHandler>, body = "", options: Parameters<typeof requestFrom>[1] = {}) {
  const response = responseCollector();
  await handler(requestFrom(body, options) as never, response as never);
  return response.result();
}

test("uses the filesystem catch-all without rewriting API paths to its bracketed filename", () => {
  assert.equal(existsSync(resolve("api", "[...route].ts")), true, "Vercel requires the filesystem catch-all");

  const configPath = resolve("vercel.json");
  if (!existsSync(configPath)) return;

  const config = JSON.parse(readFileSync(configPath, "utf8")) as {
    rewrites?: Array<{ source?: string; destination?: string }>;
  };
  assert.equal(
    config.rewrites?.some(
      ({ source, destination }) => source?.startsWith("/api/") && destination?.includes("[...route]"),
    ) ?? false,
    false,
    "filesystem routing must preserve the requested API path instead of rewriting it to /api/[...route]",
  );
});

test("forwards the Vercel health request to Hono and returns its response", async () => {
  const app = new Hono().basePath("/api");
  app.get("/health", (c) => c.json({ ok: true }));

  const result = await invoke(createVercelHandler(app.fetch));

  assert.equal(result.statusCode, 200);
  assert.equal(result.headers.get("content-type"), "application/json");
  assert.deepEqual(JSON.parse(result.body), { ok: true });
});

test("forwards a nested API path without dropping route segments", async () => {
  const app = new Hono().basePath("/api");
  app.get("/catalog/items/featured", (c) => c.text("nested route"));

  const result = await invoke(createVercelHandler(app.fetch), "", { url: "/api/catalog/items/featured" });

  assert.equal(result.statusCode, 200);
  assert.equal(result.body, "nested route");
});

test("buffers a JSON POST body before forwarding it to Hono", async () => {
  const app = new Hono().basePath("/api");
  app.post("/nested/json", async (c) => c.json({ received: await c.req.json() }));

  const result = await invoke(createVercelHandler(app.fetch), JSON.stringify({ productId: "p-1", quantity: 2 }), {
    method: "POST",
    url: "/api/nested/json",
    headers: { "content-type": "application/json" },
  });

  assert.equal(result.statusCode, 200);
  assert.deepEqual(JSON.parse(result.body), { received: { productId: "p-1", quantity: 2 } });
});

test("forwards every Set-Cookie response header separately", async () => {
  const app = new Hono().basePath("/api");
  app.get("/cookies", (c) => {
    c.header("set-cookie", "session=one; Path=/", { append: true });
    c.header("set-cookie", "csrf=two; Path=/", { append: true });
    return c.text("ok");
  });

  const result = await invoke(createVercelHandler(app.fetch), "", { url: "/api/cookies" });

  assert.deepEqual(result.headers.get("set-cookie"), ["session=one; Path=/", "csrf=two; Path=/"]);
});

const sharedLimiter = { capability: "shared-atomic" as const, consume: () => ({ allowed: true as const }) };
const productionApp = () => createApp(
  { NODE_ENV: "production", CLIENT_ORIGIN: "https://shop.example.com" },
  { authAdmission: { limiter: sharedLimiter } },
);

test("forwards an allowed CORS preflight through the Vercel adapter", async () => {
  const result = await invoke(createVercelHandler(productionApp().fetch), "", {
    method: "OPTIONS",
    headers: {
      origin: "https://shop.example.com",
      "access-control-request-method": "GET",
      "access-control-request-headers": "content-type",
    },
  });

  assert.equal(result.statusCode, 204);
  assert.equal(result.headers.get("access-control-allow-origin"), "https://shop.example.com");
  assert.equal(result.headers.get("access-control-allow-credentials"), "true");
});

test("does not grant a rejected CORS preflight its untrusted origin", async () => {
  const result = await invoke(createVercelHandler(productionApp().fetch), "", {
    method: "OPTIONS",
    headers: {
      origin: "https://attacker.example.com",
      "access-control-request-method": "GET",
    },
  });

  assert.notEqual(result.headers.get("access-control-allow-origin"), "https://attacker.example.com");
});

test("rejects a production Vercel invocation without DATABASE_URL", async () => {
  const original = {
    NODE_ENV: process.env.NODE_ENV,
    CLIENT_ORIGIN: process.env.CLIENT_ORIGIN,
    DATABASE_URL: process.env.DATABASE_URL,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  };
  Object.assign(process.env, {
    NODE_ENV: "production",
    CLIENT_ORIGIN: "https://shop.example.com",
    UPSTASH_REDIS_REST_URL: "https://redis.example.com",
    UPSTASH_REDIS_REST_TOKEN: "test-token",
  });
  delete process.env.DATABASE_URL;

  try {
    await assert.rejects(
      vercelHandler(requestFrom() as never, responseCollector() as never),
      /DATABASE_URL, UPSTASH_REDIS_REST_URL, and UPSTASH_REDIS_REST_TOKEN are required in production/,
    );
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("requires NODE_ENV=production for the Vercel entry point", async () => {
  const original = process.env.NODE_ENV;
  process.env.NODE_ENV = "test";

  try {
    await assert.rejects(
      vercelHandler(requestFrom() as never, responseCollector() as never),
      /NODE_ENV must be production for the Vercel API/,
    );
  } finally {
    if (original === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = original;
  }
});
