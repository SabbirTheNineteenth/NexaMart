import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { Hono } from "hono";
import { createAuthRoutes } from "../src/modules/auth/auth.routes.js";
import {
  LOCAL_CUSTOMER_QA_EMAIL,
  runLocalCustomerQaFixtureSeed,
  verifyLocalCustomerQaFixture,
  type LocalCustomerQaFixtureRepository,
} from "../src/db/seeds/runLocalCustomerQaFixture.js";

const environment = {
  DATABASE_URL: "postgresql://demo:password@127.0.0.1:5433/nexamart",
  NEXAMART_DEMO_SEED: "local-confirmed",
} as const;

test("local customer QA fixture refuses production and unsafe targets before any repository write", async () => {
  let writes = 0;
  const repository = fixtureRepository(() => { writes += 1; });

  await assert.rejects(
    () => runLocalCustomerQaFixtureSeed(repository, { ...environment, NODE_ENV: "production" }, "hash"),
    /NODE_ENV=production/,
  );
  await assert.rejects(
    () => runLocalCustomerQaFixtureSeed(repository, { ...environment, DATABASE_URL: "postgresql://example.invalid/nexamart" }, "hash"),
    /database target/,
  );
  assert.equal(writes, 0);
});

test("local customer QA fixture upserts exactly one namespaced customer idempotently", async () => {
  const inputs: Array<{ email: string; name: string; role: string; passwordHash: string }> = [];
  const repository = fixtureRepository((input) => inputs.push(input));

  const first = await runLocalCustomerQaFixtureSeed(repository, environment, "first-hash");
  const second = await runLocalCustomerQaFixtureSeed(repository, environment, "second-hash");

  assert.deepEqual(first, { email: LOCAL_CUSTOMER_QA_EMAIL, role: "customer" });
  assert.deepEqual(second, first);
  assert.deepEqual(inputs, [
    { email: LOCAL_CUSTOMER_QA_EMAIL, name: "Local Customer QA", role: "customer", passwordHash: "first-hash" },
    { email: LOCAL_CUSTOMER_QA_EMAIL, name: "Local Customer QA", role: "customer", passwordHash: "second-hash" },
  ]);
});

test("local verification uses the standard in-process loopback login and Customer session routes without logging sensitive material", async () => {
  const password = randomBytes(32).toString("base64url");
  const sessionToken = randomBytes(32).toString("base64url");
  const account = { id: "customer-qa", name: "Local Customer QA", email: LOCAL_CUSTOMER_QA_EMAIL, role: "customer" as const, createdAt: "2026-09-22T00:00:00.000Z" };
  const routes = createAuthRoutes({
    auth: {
      async register() { return account; },
      async login(email, suppliedPassword) { return email === LOCAL_CUSTOMER_QA_EMAIL && suppliedPassword === password ? account : null; },
    },
    sessions: {
      async create() { return { token: sessionToken, expiresAt: new Date("2026-09-23T00:00:00.000Z") }; },
      async resolve(token) { return token === sessionToken ? account : null; },
      async revoke() {},
    },
    secureCookies: false,
  });
  const app = new Hono().basePath("/api");
  app.route("/auth", routes);
  const output: string[] = [];

  await verifyLocalCustomerQaFixture(app, password, (line) => output.push(line));

  assert.deepEqual(output, ["Local customer QA verification passed: login=200, session=200, role=customer."]);
  assert.doesNotMatch(output.join("\n"), new RegExp(`${password}|${sessionToken}`));
});

test("fixture implementation does not embed or log passwords, cookies, tokens, database URLs, or remote targets", async () => {
  const source = await import("node:fs/promises").then((fs) => fs.readFile(new URL("../src/db/seeds/runLocalCustomerQaFixture.ts", import.meta.url), "utf8"));
  const script = await import("node:fs/promises").then((fs) => fs.readFile(new URL("../src/scripts/local-customer-qa-fixture.ts", import.meta.url), "utf8"));
  const repository = await import("node:fs/promises").then((fs) => fs.readFile(new URL("../src/scripts/local-customer-qa-fixture.helpers.ts", import.meta.url), "utf8"));

  assert.match(source, /assertLocalDemoCatalogSeedExecutionGuard\(environment\)/);
  assert.match(source, /127\.0\.0\.1/);
  assert.doesNotMatch(source, /console\.|passwordHash:\s*["'`]|nexamart_session=[A-Za-z0-9_-]+|https?:\/\/(?!127\.0\.0\.1)/);
  assert.match(script, /randomBytes\(32\)\.toString\("base64url"\)/);
  assert.match(script, /assertLocalDemoCatalogSeedExecutionGuard\(process\.env\)/);
  assert.match(script, /console\.log\(line\)/);
  assert.doesNotMatch(script, /console\.log\([^)]*(?:password|cookie|token|DATABASE_URL)/i);
  assert.match(repository, /onConflictDoUpdate\(\{[\s\S]*target: accounts\.email/);
});

function fixtureRepository(record: (input: { email: string; name: string; role: string; passwordHash: string }) => void): LocalCustomerQaFixtureRepository {
  return { async upsertCustomer(input) { record(input); } };
}
