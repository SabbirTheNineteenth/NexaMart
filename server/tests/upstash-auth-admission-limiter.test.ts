import assert from "node:assert/strict";
import test from "node:test";
import { UpstashAuthAdmissionLimiter } from "../src/modules/auth/upstash-auth-admission-limiter.js";

test("Upstash limiter consumes through one Redis script and exposes shared-atomic capability", async () => {
  const calls: Array<{ script: string; keys: string[]; args: string[] }> = [];
  const limiter = new UpstashAuthAdmissionLimiter({
    createScript(script) {
      return {
        async eval(keys, args) {
          calls.push({ script, keys, args });
          return [1, 15_000];
        },
      };
    },
  });

  assert.equal(limiter.capability, "shared-atomic");
  assert.deepEqual(await limiter.consume("ip:untrusted-input", 3, 15_000), { allowed: true });
  assert.equal(calls.length, 1);
  assert.match(calls[0]?.script ?? "", /INCR/);
  assert.match(calls[0]?.script ?? "", /PEXPIRE/);
  assert.deepEqual(calls[0]?.args, ["3", "15000"]);
  assert.match(calls[0]?.keys[0] ?? "", /^nexamart:auth-admission:[A-Za-z0-9_-]+$/);
  assert.equal(calls[0]?.keys[0]?.includes("untrusted-input"), false);
});

test("Upstash limiter denies when the Redis script fails", async () => {
  const limiter = new UpstashAuthAdmissionLimiter({
    createScript() {
      return { async eval() { throw new Error("redis unavailable"); } };
    },
  });

  assert.deepEqual(await limiter.consume("ip:bucket", 3, 15_000), { allowed: false, retryAfterSeconds: 60 });
});

test("Upstash limiter returns the remaining fixed-window time when the atomic counter rejects", async () => {
  const limiter = new UpstashAuthAdmissionLimiter({
    createScript() {
      return { async eval() { return [0, 16_001] as const; } };
    },
  });

  assert.deepEqual(await limiter.consume("account:bucket", 3, 30_000), { allowed: false, retryAfterSeconds: 17 });
});

test("Upstash limiter fails closed when a rejected counter has a Redis PTTL sentinel", async (t) => {
  for (const pttl of [-1, -2]) {
    await t.test(`PTTL ${pttl}`, async () => {
      const limiter = new UpstashAuthAdmissionLimiter({
        createScript() {
          return { async eval() { return [0, pttl] as const; } };
        },
      });

      assert.deepEqual(
        await limiter.consume("account:bucket", 3, 30_000),
        { allowed: false, retryAfterSeconds: 60 },
      );
    });
  }
});
