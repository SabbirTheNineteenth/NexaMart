export type N8nActorProvisionEnvironment = { NODE_ENV?: string; N8N_ACTOR_PROVISION?: string; DATABASE_URL?: string };
type Repository = { getOrCreate(): Promise<string> };

/** Validate before importing a database client or issuing any query. */
export function assertLocalN8nActorProvisionGuard(environment: N8nActorProvisionEnvironment): void {
  if (environment.NODE_ENV === "production") throw new Error("Refusing n8n actor provisioning in production.");
  if (environment.N8N_ACTOR_PROVISION !== "local-confirmed") throw new Error("Set N8N_ACTOR_PROVISION=local-confirmed for local provisioning.");
  let local = false;
  try {
    const url = new URL(environment.DATABASE_URL ?? "");
    local = ["postgres:", "postgresql:"].includes(url.protocol) && ["localhost", "127.0.0.1"].includes(url.hostname);
  } catch { /* invalid target */ }
  if (!local) throw new Error("Provisioning requires a local PostgreSQL target.");
}

export async function runLocalN8nActorProvisioning(repository: Repository, environment: N8nActorProvisionEnvironment): Promise<string> {
  assertLocalN8nActorProvisionGuard(environment);
  return repository.getOrCreate();
}

export function formatN8nActorProvisionOutput(id: string): string[] {
  return [`N8N_ACTOR_ID=${id}`, `Set-Item Env:N8N_ACTOR_ID '${id}'`];
}
