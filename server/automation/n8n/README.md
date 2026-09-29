# Local COD automation

From `server/automation/n8n`, copy `.env.example` to `.env`. Generate two independent random secrets locally, for example with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`, and place them in `N8N_WEBHOOK_SECRET` and `N8N_SERVICE_TOKEN`. Set `NEXAMART_API_BASE` to the API address reachable from the container (on Docker Desktop, `http://host.docker.internal:3002`). Never commit `.env`.

Before enabling COD, apply the Server migrations to a local PostgreSQL database. From `server/` in PowerShell, with a local `DATABASE_URL` configured and `NODE_ENV` unset or set to `development`, run:

```powershell
npm.cmd run db:migrate
Set-Item Env:N8N_ACTOR_PROVISION 'local-confirmed'
npm.cmd run n8n:actor:provision:local
Remove-Item Env:N8N_ACTOR_PROVISION
```

The command prints the dedicated `N8N_ACTOR_ID` UUID and a `Set-Item Env:N8N_ACTOR_ID '...'` next-step command. Run that printed command or copy the UUID into `server/.env`. Repeating provisioning returns the same UUID. It creates only a `service_actors` row, never a human account, password, or token. It refuses production and remote database targets. `order_events.service_actor_id` and `service_audit_records.service_actor_id` then record n8n attribution; human account actor IDs remain separate.

Set the matching token and webhook secret on the Server, plus `N8N_COD_ENABLED=1` and `N8N_WEBHOOK_URL=http://localhost:5678/webhook/nexamart-cod` when the Server runs on the host. Start n8n with `docker compose up -d`. n8n is available only on `http://localhost:5678`. Import both JSON files through n8n's workflow import UI, activate them, and configure n8n's local owner account.

Create a COD order through the authenticated checkout API. An authorized local operator invokes `POST /api/cod/local/dispatch` with `Authorization: Bearer <N8N_SERVICE_TOKEN>` to send due outbox records. Inspect the n8n execution and container logs. This dispatch is manual; it has bounded retries but no automatic scheduler or guaranteed delivery. The reminder workflow polls `GET /api/cod/local/pending-confirmation` hourly. n8n callbacks use `POST /api/cod/local/callback` with the same service credential, a stable `eventId`, `orderItemId`, and one allowed action. They still pass Server transition rules.

The webhook checks an HMAC SHA-256 signature over `<unixSeconds>.<rawJson>` in `x-nexamart-signature`, with seconds in `x-nexamart-timestamp`; its replay window is five minutes. n8n uses event IDs to suppress duplicates. Keep clocks synchronized. The static-data deduplication store is local and should not be treated as a durable queue.

Stop with `docker compose down`. `docker compose down -v` deletes only the local n8n volume; it does not touch the NexaMart database. Local n8n cannot receive public provider callbacks without secure public HTTPS exposure. This setup contains no provider callbacks, gateway, courier, or customer messaging.
