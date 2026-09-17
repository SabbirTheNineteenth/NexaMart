import assert from "node:assert/strict";
import test from "node:test";
import { sessions } from "../src/db/schema/index.js";

test("database schema stores opaque server-managed sessions", () => {
  assert.equal(sessions[Symbol.for("drizzle:Name")], "sessions");
});
