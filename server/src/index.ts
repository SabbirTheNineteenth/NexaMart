import { serve } from "@hono/node-server";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { createApp, type AppDependencies } from "./app.js";
import { createUpstashAuthAdmissionLimiter } from "./modules/auth/upstash-auth-admission-limiter.js";

export type RuntimeEnvironment = Record<string, string | undefined>;

/**
 * Deployment composition seam. Production constructs the Upstash-backed,
 * shared-atomic limiter only after both required configuration variables exist.
 */
export function startServer(environment: RuntimeEnvironment = process.env, dependencies: AppDependencies = {}) {
  const upstashUrl = environment.UPSTASH_REDIS_REST_URL?.trim();
  const upstashToken = environment.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (environment.NODE_ENV === "production" && (!upstashUrl || !upstashToken)) {
    throw new Error("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production");
  }
  const port = Number(environment.PORT ?? 3000);
  const app = createApp(
    environment,
    environment.NODE_ENV === "production"
      ? { ...dependencies, authAdmission: { ...dependencies.authAdmission, limiter: createUpstashAuthAdmissionLimiter(upstashUrl!, upstashToken!) } }
      : dependencies,
  );
  const server = serve({ fetch: app.fetch, port });
  console.log(`NexaMart API listening on http://localhost:${port}`);
  return server;
}

const isEntrypoint = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  startServer();
}
