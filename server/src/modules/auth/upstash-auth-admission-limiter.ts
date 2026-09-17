import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";
import type { AuthAdmissionResult, SharedAtomicAuthAdmissionLimiter } from "./auth-admission.js";

type AtomicConsumeReply = readonly [number | string, number | string];

type UpstashScript = {
  eval(keys: string[], args: string[]): Promise<AtomicConsumeReply>;
};

export type UpstashScriptClient = {
  createScript<TResult>(script: string): {
    eval(keys: string[], args: string[]): Promise<TResult>;
  };
};

const retryAfterOnLimiterFailure = 60;

const atomicConsumeScript = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[2])
end
local ttl = redis.call("PTTL", KEYS[1])
if count <= tonumber(ARGV[1]) then
  return { 1, ttl }
end
return { 0, ttl }
`;

const redisKeyFor = (key: string) => `nexamart:auth-admission:${createHash("sha256").update(key).digest("base64url")}`;

export class UpstashAuthAdmissionLimiter implements SharedAtomicAuthAdmissionLimiter {
  readonly capability = "shared-atomic" as const;
  private readonly atomicConsume: UpstashScript;

  constructor(redis: UpstashScriptClient) {
    this.atomicConsume = redis.createScript<AtomicConsumeReply>(atomicConsumeScript);
  }

  async consume(key: string, limit: number, windowMs: number): Promise<AuthAdmissionResult> {
    try {
      const response = await this.atomicConsume.eval([redisKeyFor(key)], [String(limit), String(windowMs)]);
      const allowed = Number(response[0]);
      const remainingWindowMs = Number(response[1]);
      if ((allowed !== 0 && allowed !== 1) || !Number.isFinite(remainingWindowMs) || remainingWindowMs <= 0) {
        return { allowed: false, retryAfterSeconds: retryAfterOnLimiterFailure };
      }
      return allowed === 1
        ? { allowed: true }
        : { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(remainingWindowMs / 1_000)) };
    } catch {
      return { allowed: false, retryAfterSeconds: retryAfterOnLimiterFailure };
    }
  }
}

export const createUpstashAuthAdmissionLimiter = (url: string, token: string): UpstashAuthAdmissionLimiter =>
  new UpstashAuthAdmissionLimiter(new Redis({ url, token }));
