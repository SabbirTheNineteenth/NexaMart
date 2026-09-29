# Local COD automation

From `server/automation/n8n`, copy `.env.example` to `.env`. Generate two independent random secrets locally, for example with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`, and place them in `N8N_WEBHOOK_SECRET` and `N8N_SERVICE_TOKEN`. Set `NEXAMART_API_BASE` to the API address reachable from the container (on Docker Desktop, `http://host.docker.internal:3002`). Never commit `.env`.

Set the matching variables on the Server, plus `N8N_COD_ENABLED=1`, `N8N_ACTOR_ID` (a provisioned service account UUID for audit attribution), and `N8N_WEBHOOK_URL=http://localhost:5678/webhook/nexamart-cod` when the Server runs on the host. Start with `docker compose up -d`. n8n is available only on `http://localhost:5678`. Import both JSON files through n8n's workflow import UI, activate them, and configure n8n's local owner account.

Create a COD order through the authenticated checkout API. An authorized local operator invokes `POST /api/cod/local/dispatch` with `Authorization: Bearer <N8N_SERVICE_TOKEN>` to send due outbox records. Inspect the n8n execution and container logs. This dispatch is manual; it has bounded retries but no automatic scheduler or guaranteed delivery. The reminder workflow polls `GET /api/cod/local/pending-confirmation` hourly. n8n callbacks use `POST /api/cod/local/callback` with the same service credential, a stable `eventId`, `orderItemId`, and one allowed action. They still pass Server transition rules.

The webhook checks an HMAC SHA-256 signature over `<unixSeconds>.<rawJson>` in `x-nexamart-signature`, with seconds in `x-nexamart-timestamp`; its replay window is five minutes. n8n uses event IDs to suppress duplicates. Keep clocks synchronized. The static-data deduplication store is local and should not be treated as a durable queue.

Stop with `docker compose down`. `docker compose down -v` deletes only the local n8n volume; it does not touch the NexaMart database. Local n8n cannot receive public provider callbacks without secure public HTTPS exposure. This setup contains no provider callbacks, gateway, courier, or customer messaging.
