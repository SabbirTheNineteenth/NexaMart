import assert from "node:assert/strict";
import test from "node:test";
import { assertLocalN8nActorProvisionGuard, formatN8nActorProvisionOutput, runLocalN8nActorProvisioning } from "../src/scripts/n8n-cod-actor-provision.helpers.js";
import { codActorColumns } from "../src/modules/orders/cod-actor.js";
import { getOrCreateN8nCodActor } from "../src/scripts/n8n-cod-actor-provision.repository.js";
import { serviceActors } from "../src/db/schema/index.js";
import { auditRecords, orderEvents, serviceAuditRecords } from "../src/db/schema/index.js";
import { getTableConfig } from "drizzle-orm/pg-core";
import { spawnSync } from "node:child_process";

const local = { NODE_ENV: "development", N8N_ACTOR_PROVISION: "local-confirmed", DATABASE_URL: "postgresql://user:secret@localhost:5432/nexamart" };
const id = "11111111-1111-4111-8111-111111111111";

test("provisioning requires an explicit local target and refuses production before repository access", async () => {
  let writes = 0;
  const repository = { async getOrCreate() { writes++; return id; } };
  await assert.rejects(runLocalN8nActorProvisioning(repository, { ...local, NODE_ENV: "production" }), /production/);
  await assert.rejects(runLocalN8nActorProvisioning(repository, { ...local, N8N_ACTOR_PROVISION: undefined }), /N8N_ACTOR_PROVISION/);
  await assert.rejects(runLocalN8nActorProvisioning(repository, { ...local, DATABASE_URL: "postgresql://user:secret@remote.example/nexamart" }), /local PostgreSQL/);
  assert.equal(writes, 0);
  assert.doesNotThrow(() => assertLocalN8nActorProvisionGuard(local));
});

test("repeat provisioning returns the same dedicated actor and never provisions a human account", async () => {
  let created: string | undefined; let calls = 0;
  const repository = { async getOrCreate() { calls++; return created ??= id; } };
  assert.equal(await runLocalN8nActorProvisioning(repository, local), id);
  assert.equal(await runLocalN8nActorProvisioning(repository, local), id);
  assert.equal(calls, 2);
  assert.deepEqual(formatN8nActorProvisionOutput(id), [`N8N_ACTOR_ID=${id}`, `Set-Item Env:N8N_ACTOR_ID '${id}'`]);
});

test("n8n attribution uses a service identity, never a human account actor", () => {
  assert.deepEqual(codActorColumns({ kind: "n8n", id }), { actorId: null, serviceActorId: id });
  assert.deepEqual(codActorColumns({ kind: "admin", id }), { actorId: id, serviceActorId: null });
});

test("database provisioning inserts only the dedicated service actor key and resolves the same UUID on conflict", async () => {
  let stored: string | undefined;
  const database = {
    insert(table: unknown) {
      assert.equal(table, serviceActors);
      return { values(value: unknown) {
        assert.deepEqual(value, { key: "n8n_cod_local" });
        return { onConflictDoNothing() { return { async returning() { if (stored) return []; stored = id; return [{ id }]; } }; } };
      } };
    },
    select() { return { from(table: unknown) {
      assert.equal(table, serviceActors);
      return { where() { return { async limit() { return stored ? [{ id: stored }] : []; } }; } };
    } }; },
  };
  assert.equal(await getOrCreateN8nCodActor(database as never), id);
  assert.equal(await getOrCreateN8nCodActor(database as never), id);
});

test("order and service audit records reference the machine identity while human audit remains account-scoped", () => {
  assert.equal(orderEvents.serviceActorId.name, "service_actor_id");
  assert.equal(serviceAuditRecords.serviceActorId.name, "service_actor_id");
  assert.equal(auditRecords.actorId.notNull, true);
  for (const table of [orderEvents, serviceAuditRecords]) {
    const references = getTableConfig(table).foreignKeys.flatMap((foreignKey) => foreignKey.reference().foreignColumns);
    assert.ok(references.includes(serviceActors.id));
  }
});

test("provisioning CLI refuses production without opening a database or printing credentials", () => {
  const result = spawnSync(process.execPath, ["--import", "tsx", "src/scripts/provision-n8n-cod-actor.ts"], {
    cwd: new URL("..", import.meta.url),
    env: { ...process.env, NODE_ENV: "production", N8N_ACTOR_PROVISION: "local-confirmed", DATABASE_URL: "postgresql://user:secret@localhost:5432/nexamart" },
    encoding: "utf8",
  });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /provisioning refused or failed/);
  assert.doesNotMatch(result.stderr, /user:secret|password|token/i);
});
