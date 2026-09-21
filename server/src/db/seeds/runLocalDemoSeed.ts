export type LocalDemoSeedEnvironment = Pick<NodeJS.ProcessEnv, "DATABASE_URL" | "NEXAMART_DEMO_SEED">;

const LOCAL_DATABASE_HOSTS = new Set(["localhost", "127.0.0.1"]);
const LOCAL_DEMO_SEED_CONFIRMATION = "local-confirmed";

function isLocalPostgresUrl(databaseUrl: string | undefined) {
  if (!databaseUrl) return false;

  try {
    const url = new URL(databaseUrl);
    return (url.protocol === "postgres:" || url.protocol === "postgresql:") && LOCAL_DATABASE_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

/**
 * Performs no database work. Call this before any local-only demo seed action.
 */
export function assertLocalDemoSeedGuard(environment: LocalDemoSeedEnvironment): void {
  if (environment.NEXAMART_DEMO_SEED !== LOCAL_DEMO_SEED_CONFIRMATION) {
    throw new Error("Refusing local demo seed: set NEXAMART_DEMO_SEED=local-confirmed.");
  }

  if (!isLocalPostgresUrl(environment.DATABASE_URL)) {
    throw new Error("Refusing local demo seed: database target must be a valid local PostgreSQL URL.");
  }
}
