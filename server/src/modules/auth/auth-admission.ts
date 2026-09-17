import { createHash } from "node:crypto";
import { isIP } from "node:net";
import type { Context } from "hono";

/**
 * Injectable admission contract. Deployments with more than one API instance
 * must provide a shared, atomic implementation (for example Redis); the local
 * fallback below is intentionally process-local and does not coordinate limits
 * between instances.
 */
export type AuthAdmissionLimiter = {
  consume(key: string, limit: number, windowMs: number): AuthAdmissionResult | Promise<AuthAdmissionResult>;
};

/**
 * A deployment-provided limiter must explicitly declare this capability before
 * production composition will accept it. The declaration is an operator
 * attestation: runtime code cannot prove that a provider is shared or atomic.
 */
export type SharedAtomicAuthAdmissionLimiter = AuthAdmissionLimiter & {
  readonly capability: "shared-atomic";
};

export const isSharedAtomicAuthAdmissionLimiter = (limiter: AuthAdmissionLimiter | undefined): limiter is SharedAtomicAuthAdmissionLimiter => {
  const candidate = limiter as (AuthAdmissionLimiter & { capability?: unknown }) | undefined;
  return typeof candidate?.consume === "function" && candidate.capability === "shared-atomic";
};

export type AuthAdmissionResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

export type AuthAdmissionEnvironment = Record<string, string | undefined>;

type AuthAdmissionConfiguration = {
  limiter?: AuthAdmissionLimiter;
  environment?: AuthAdmissionEnvironment;
  ipLimit?: number;
  accountLimit?: number;
  windowMs?: number;
  trustProxy?: boolean;
  trustedProxyAddresses?: readonly string[];
  getDirectClientAddress?: (context: Context) => string | undefined;
};

type ResolvedAuthAdmissionConfiguration = Required<Omit<AuthAdmissionConfiguration, "limiter" | "environment" | "trustedProxyAddresses">> & {
  limiter: AuthAdmissionLimiter;
  trustedProxyAddresses: ReadonlySet<string> | undefined;
};

type LocalWindow = { startedAt: number; used: number };

const defaultIpLimit = 20;
const defaultAccountLimit = 5;
const defaultWindowMs = 15 * 60_000;
const retryAfterOnLimiterFailure = 60;

const positiveInteger = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const exactIpAllowlist = (addresses: readonly string[] | undefined): ReadonlySet<string> | undefined => {
  if (!addresses?.length) return undefined;
  const normalized = addresses.map((address) => address.trim());
  return normalized.every((address) => isIP(address) !== 0) ? new Set(normalized) : undefined;
};

export class LocalAuthAdmissionLimiter implements AuthAdmissionLimiter {
  private readonly windows = new Map<string, LocalWindow>();

  constructor(private readonly now: () => number = Date.now) {}

  consume(key: string, limit: number, windowMs: number): AuthAdmissionResult {
    const currentTime = this.now();
    const existing = this.windows.get(key);
    const window = !existing || currentTime - existing.startedAt >= windowMs ? { startedAt: currentTime, used: 0 } : existing;
    if (window.used >= limit) {
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (currentTime - window.startedAt)) / 1_000)) };
    }
    window.used += 1;
    this.windows.set(key, window);
    return { allowed: true };
  }
}

const directTransportAddress = (context: Context): string | undefined => {
  const environment = (context as unknown as { env?: { incoming?: { socket?: { remoteAddress?: string } } } }).env;
  return environment?.incoming?.socket?.remoteAddress;
};

const forwardedAddress = (context: Context): string | undefined => context.req.header("X-Forwarded-For")?.split(",")[0]?.trim() || undefined;

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const hashKeyIdentity = (identity: string) => createHash("sha256").update(identity).digest("base64url");
const clientKey = (address: string) => `ip:${hashKeyIdentity(address)}`;
const accountKey = (email: string) => `account:${hashKeyIdentity(normalizeEmail(email))}`;

const resolveConfiguration = (configuration: AuthAdmissionConfiguration = {}): ResolvedAuthAdmissionConfiguration => {
  const environment = configuration.environment ?? process.env;
  const trustedProxyAddresses = exactIpAllowlist(configuration.trustedProxyAddresses ?? environment.AUTH_TRUSTED_PROXY_ADDRESSES?.split(","));
  return {
    limiter: configuration.limiter ?? new LocalAuthAdmissionLimiter(),
    ipLimit: configuration.ipLimit ?? positiveInteger(environment.AUTH_ADMISSION_IP_LIMIT, defaultIpLimit),
    accountLimit: configuration.accountLimit ?? positiveInteger(environment.AUTH_ADMISSION_ACCOUNT_LIMIT, defaultAccountLimit),
    windowMs: configuration.windowMs ?? positiveInteger(environment.AUTH_ADMISSION_WINDOW_SECONDS, defaultWindowMs / 1_000) * 1_000,
    trustProxy: configuration.trustProxy ?? environment.AUTH_TRUST_PROXY === "true",
    trustedProxyAddresses,
    getDirectClientAddress: configuration.getDirectClientAddress ?? directTransportAddress,
  };
};

export class AuthAdmissionController {
  private readonly configuration: ResolvedAuthAdmissionConfiguration;

  constructor(configuration: AuthAdmissionConfiguration = {}) {
    this.configuration = resolveConfiguration(configuration);
  }

  private async consume(key: string, limit: number): Promise<AuthAdmissionResult> {
    try {
      return await this.configuration.limiter.consume(key, limit, this.configuration.windowMs);
    } catch {
      return { allowed: false, retryAfterSeconds: retryAfterOnLimiterFailure };
    }
  }

  async admitClient(context: Context): Promise<AuthAdmissionResult> {
    const directAddress = this.configuration.getDirectClientAddress(context)?.trim() || "unknown";
    const identity = this.configuration.trustProxy && this.configuration.trustedProxyAddresses?.has(directAddress) ? forwardedAddress(context) ?? directAddress : directAddress;
    return this.consume(clientKey(identity), this.configuration.ipLimit);
  }

  admitAccount(email: string): Promise<AuthAdmissionResult> {
    return this.consume(accountKey(email), this.configuration.accountLimit);
  }
}

export type { AuthAdmissionConfiguration };
