# Local COD automation

From `server/automation/n8n`, copy `.env.example` to `.env`. Required n8n variable names are `N8N_WEBHOOK_SECRET`, `N8N_SERVICE_TOKEN`, and `NEXAMART_API_BASE`. Generate independent credentials in a local secret manager and configure them without displaying or committing their values. The API base must be reachable from the container. Never commit `.env`.

Before enabling COD, apply the Server migrations to a local PostgreSQL database. From `server/` in PowerShell, with a local `DATABASE_URL` configured and `NODE_ENV` unset or set to `development`, run:

```powershell
npm.cmd run db:migrate
Set-Item Env:N8N_ACTOR_PROVISION 'local-confirmed'
npm.cmd run n8n:actor:provision:local
Remove-Item Env:N8N_ACTOR_PROVISION
```

The command prints the dedicated `N8N_ACTOR_ID` UUID and a `Set-Item Env:N8N_ACTOR_ID '...'` next-step command. Run that printed command or copy the UUID into `server/.env`. Repeating provisioning returns the same UUID. It creates only a `service_actors` row, never a human account, password, or token. It refuses production and remote database targets. `order_events.service_actor_id` and `service_audit_records.service_actor_id` then record n8n attribution; human account actor IDs remain separate.

Required Server variable names are `N8N_COD_ENABLED`, `N8N_ACTOR_ID`, `N8N_SERVICE_TOKEN`, `N8N_WEBHOOK_SECRET`, and `N8N_WEBHOOK_URL`. The webhook URL must point to the local NexaMart COD webhook registered by this workflow. The tracked Compose file already sets `NODE_FUNCTION_ALLOW_BUILTIN=crypto` and `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`, which the signature-verification Code node requires. Start a dedicated local instance with `docker compose up -d`; n8n is bound to localhost port 5678. Import the two NexaMart JSON files through n8n's workflow import UI, activate them, and configure n8n's local owner account.

Create a COD order through the authenticated checkout API. An authorized local operator invokes `POST /api/cod/local/dispatch` with the dedicated service bearer credential to send due outbox records. The response reports `attempted`, `delivered`, `failed`, `exhausted` (newly failed at the limit), and `skipped` (concurrent claims), without a payload or credential. Dispatch atomically claims a due row, retries failures up to five attempts, and never resends a row marked delivered. A crash after claim can cause a later retry; n8n must deduplicate the stable `eventId`. This dispatch is manual, with no scheduler or guaranteed delivery. The reminder workflow polls `GET /api/cod/local/pending-confirmation` hourly. n8n callbacks use `POST /api/cod/local/callback` with the same service credential, a stable `eventId`, `orderItemId`, and one allowed action. They still pass Server transition rules; only the authorized shipped-to-delivered collection transition can collect COD money.

For a **dedicated** NexaMart n8n instance, keep successful and failed execution records with `EXECUTIONS_DATA_SAVE_ON_SUCCESS=all` and `EXECUTIONS_DATA_SAVE_ON_ERROR=all`. Bound local retention with `EXECUTIONS_DATA_PRUNE=true`, `EXECUTIONS_DATA_MAX_AGE=168` (hours), and `EXECUTIONS_DATA_PRUNE_MAX_COUNT=10000`. These are instance-wide settings: on a shared n8n instance, inspect its existing retention policy and do not change it for NexaMart. After dispatch, open the NexaMart COD workflow's **Executions** tab and verify a successful run for the expected event ID; inspect only that workflow's execution details and the local operator log. [n8n documents these settings](https://docs.n8n.io/deploy/host-n8n/configure-n8n/basic-configuration/use-environment-variables/executions).

For a dedicated instance managed by this Compose file, `docker compose restart n8n` restarts the existing container. After changing Compose environment settings, use `docker compose up -d --no-deps --force-recreate n8n` to apply them while retaining the named volume. Do not run these commands against another project's n8n instance. Existing unrelated workflows must not be touched, imported over, renamed, disabled, deleted, or changed.

The webhook checks an HMAC SHA-256 signature over `<unixSeconds>.<rawJson>` in `x-nexamart-signature`, with seconds in `x-nexamart-timestamp`; its replay window is five minutes. n8n uses event IDs to suppress duplicates. Keep clocks synchronized. The static-data deduplication store is local and should not be treated as a durable queue.

Stop a dedicated instance managed by this Compose file with `docker compose down`; keep its named volume. Never delete a shared n8n volume because it may contain unrelated workflows and execution history. Local n8n cannot receive public provider callbacks without secure public HTTPS exposure. This setup contains no provider callbacks, gateway, courier, or customer messaging.
