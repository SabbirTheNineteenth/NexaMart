import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { createApp } from "../src/app.js";
import { LocalAuthAdmissionLimiter, type SharedAtomicAuthAdmissionLimiter } from "../src/modules/auth/auth-admission.js";

const productionEnvironment = { NODE_ENV: "production", CLIENT_ORIGIN: "https://shop.example.com" };

test("production app initialization rejects a missing auth admission limiter", () => {
  assert.throws(
    () => createApp(productionEnvironment),
    /shared-atomic AuthAdmissionLimiter must be injected in production/,
  );
});

test("production app initialization rejects the process-local auth admission limiter", () => {
  assert.throws(
    () => createApp(productionEnvironment, { authAdmission: { limiter: new LocalAuthAdmissionLimiter() } }),
    /shared-atomic AuthAdmissionLimiter must be injected in production/,
  );
});

test("production app accepts an injected shared auth admission limiter for authentication admission", async () => {
  const calls: Array<{ key: string; limit: number; windowMs: number }> = [];
  const limiter: SharedAtomicAuthAdmissionLimiter = {
    capability: "shared-atomic",
    consume(key, limit, windowMs) {
      calls.push({ key, limit, windowMs });
      return { allowed: false, retryAfterSeconds: 31 };
    },
  };
  const app = createApp(productionEnvironment, {
    authAdmission: { limiter, getDirectClientAddress: () => "198.51.100.44" },
  });

  const response = await app.request("https://api.example.test/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  });

  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "31");
  assert.equal(calls.length, 1);
});

test("production app uses its supplied environment for auth admission limits and trust proxy", async () => {
  const calls: Array<{ key: string; limit: number; windowMs: number }> = [];
  const limiter: SharedAtomicAuthAdmissionLimiter = {
    capability: "shared-atomic",
    consume(key, limit, windowMs) {
      calls.push({ key, limit, windowMs });
      return { allowed: true };
    },
  };
  const environment = {
    ...productionEnvironment,
    AUTH_ADMISSION_IP_LIMIT: "2",
    AUTH_ADMISSION_ACCOUNT_LIMIT: "3",
    AUTH_ADMISSION_WINDOW_SECONDS: "7",
    AUTH_TRUST_PROXY: "true",
    AUTH_TRUSTED_PROXY_ADDRESSES: "10.0.0.8",
  };
  const app = createApp(environment, {
    authAdmission: { limiter, getDirectClientAddress: () => "10.0.0.8" },
  });
  const request = (forwarded: string) => app.request("https://api.example.test/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": forwarded },
    body: "{",
  });

  assert.equal((await request("198.51.100.1")).status, 401);
  assert.equal((await request("198.51.100.2")).status, 401);
  assert.deepEqual(calls.map(({ limit, windowMs }) => ({ limit, windowMs })), [
    { limit: 2, windowMs: 7_000 },
    { limit: 2, windowMs: 7_000 },
  ]);
  assert.notEqual(calls[0]?.key, calls[1]?.key);
});

test("non-production app retains the local auth admission fallback", async () => {
  const app = createApp({ NODE_ENV: "test", CLIENT_ORIGIN: "http://localhost:5173" }, {
    authAdmission: { ipLimit: 1, accountLimit: 10, windowMs: 60_000, getDirectClientAddress: () => "198.51.100.45" },
  });
  const request = () => app.request("http://api.example.test/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  });

  assert.equal((await request()).status, 401);
  assert.equal((await request()).status, 429);
});

test("runtime composition constructs the Upstash limiter when its required variables are present", () => {
  const result = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", `
    import { startServer } from './src/index.ts';
    const server = startServer(
      {
        NODE_ENV: 'production', CLIENT_ORIGIN: 'https://shop.example.com', PORT: '0',
        UPSTASH_REDIS_REST_URL: 'https://example.upstash.io', UPSTASH_REDIS_REST_TOKEN: 'test-token',
      },
    );
    server.close();
  `], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
});

test("default production startup fails closed without required Upstash variables", () => {
  const result = spawnSync(process.execPath, ["--import", "tsx", "src/index.ts"], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
    env: { ...process.env, NODE_ENV: "production", CLIENT_ORIGIN: "https://shop.example.com" },
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production/);
});

test("default production startup fails closed when required Upstash variables are absent", () => {
  const result = spawnSync(process.execPath, ["--import", "tsx", "src/index.ts"], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
    env: { ...process.env, NODE_ENV: "production", CLIENT_ORIGIN: "https://shop.example.com", UPSTASH_REDIS_REST_URL: undefined, UPSTASH_REDIS_REST_TOKEN: undefined },
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production/);
});
