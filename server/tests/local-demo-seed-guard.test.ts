import assert from "node:assert/strict";
import test from "node:test";
import { assertLocalDemoSeedGuard } from "../src/db/seeds/runLocalDemoSeed.js";

test("local demo seed guard accepts an explicit acknowledgement for localhost PostgreSQL URLs", () => {
  assert.doesNotThrow(() => assertLocalDemoSeedGuard({
    DATABASE_URL: "postgresql://demo:password@localhost:5432/nexamart",
    NEXAMART_DEMO_SEED: "local-confirmed",
  }));
  assert.doesNotThrow(() => assertLocalDemoSeedGuard({
    DATABASE_URL: "postgres://demo:password@127.0.0.1/nexamart",
    NEXAMART_DEMO_SEED: "local-confirmed",
  }));
});

test("local demo seed guard refuses missing or incorrect acknowledgement without exposing environment values", () => {
  const environment = {
    DATABASE_URL: "postgresql://demo:secret@localhost/nexamart",
  };

  assert.throws(() => assertLocalDemoSeedGuard(environment), /NEXAMART_DEMO_SEED=local-confirmed/);
  assert.throws(() => assertLocalDemoSeedGuard({ ...environment, NEXAMART_DEMO_SEED: "confirmed" }), /NEXAMART_DEMO_SEED=local-confirmed/);
  for (const acknowledgement of [undefined, "confirmed"]) {
    try {
      assertLocalDemoSeedGuard({ ...environment, NEXAMART_DEMO_SEED: acknowledgement });
    } catch (error) {
      assert.doesNotMatch(String(error), /demo:secret|DATABASE_URL|localhost/);
    }
  }
});

test("local demo seed guard refuses malformed, remote, and credential-bearing URL variants without exposing them", () => {
  const unsafeUrls = [
    undefined,
    "not a URL",
    "postgresql://demo:secret@example.com/nexamart",
    "postgresql://demo:secret@localhost.evil.example/nexamart",
    "postgresql://demo:secret@127.0.0.2/nexamart",
  ];

  for (const databaseUrl of unsafeUrls) {
    try {
      assertLocalDemoSeedGuard({ DATABASE_URL: databaseUrl, NEXAMART_DEMO_SEED: "local-confirmed" });
      assert.fail(`Expected ${databaseUrl ?? "an absent URL"} to be rejected`);
    } catch (error) {
      assert.doesNotMatch(String(error), /demo:secret|example\.com|localhost\.evil|127\.0\.0\.2|not a URL/);
    }
  }
});

test("local demo seed guard has no database, migration, write, or logging side effects", async () => {
  const moduleSource = await import("node:fs/promises").then((fs) => fs.readFile(new URL("../src/db/seeds/runLocalDemoSeed.ts", import.meta.url), "utf8"));

  assert.doesNotMatch(moduleSource, /from\s+["'][^"']*(?:migration|drizzle|repository|schema)[^"']*["']/i);
  assert.doesNotMatch(moduleSource, /\b(?:console\.|insert\(|update\(|delete\(|migrate\()/i);
});
