import "dotenv/config";
import { assertLocalN8nActorProvisionGuard, formatN8nActorProvisionOutput, runLocalN8nActorProvisioning } from "./n8n-cod-actor-provision.helpers.js";

try {
  assertLocalN8nActorProvisionGuard(process.env);
  const { getOrCreateN8nCodActor } = await import("./n8n-cod-actor-provision.repository.js");
  const id = await runLocalN8nActorProvisioning({ getOrCreate: getOrCreateN8nCodActor }, process.env);
  for (const line of formatN8nActorProvisionOutput(id)) process.stdout.write(`${line}\n`);
} catch {
  process.stderr.write("N8N actor provisioning refused or failed. Check local target, confirmation, and migrations.\n");
  process.exitCode = 1;
}
