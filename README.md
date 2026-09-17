# NexaMart

NexaMart has two independently operated applications:

```text
NexaMart/
├─ client/  Next.js storefront, account, and admin UI
└─ server/  Hono API and feature modules
```

## Scope and release boundary

Included: catalog browsing and search, cart, account/session flows, checkout placeholder, order history, wishlists, seller-ready product data, and an admin-ready management surface.

This repository does **not** include payment-provider integration, delivery-partner integration, or n8n/workflow automation. A checkout placeholder is not a payment or fulfillment release.

The source tree contains four explicitly unapplied migrations: [`0015_variant_cart_checkout.sql`](server/src/db/migrations/0015_variant_cart_checkout.sql), [`0019_product_moderation_workflow.sql`](server/src/db/migrations/0019_product_moderation_workflow.sql), [`0020_seller_notifications.sql`](server/src/db/migrations/0020_seller_notifications.sql), and [`0021_add_packed_fulfillment_status.sql`](server/src/db/migrations/0021_add_packed_fulfillment_status.sql). Do not run them automatically or represent any database migration as completed from this repository.

## Environment and runtime boundary

Copy the committed templates locally; they contain local-development values only. Never commit local `.env` files:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env.local
```

| Application | Variable | Local behavior | Production requirement |
| --- | --- | --- | --- |
| Server | `NODE_ENV` | Leave unset for normal local development | Must be exactly `production`; Vercel supplies this for production functions. |
| Server | `DATABASE_URL` | Required to use database-backed API features | Supply through the server runtime's secret configuration; never expose it to the client. |
| Server | `PORT` | Defaults to `3000` | Set only when the selected runtime requires it. |
| Server | `CLIENT_ORIGIN` | Defaults to `http://localhost:3001` outside production | **Required** exact HTTPS client origin, such as `https://app.example.com`. No path, query, fragment, or wildcard. |
| Server | `UPSTASH_REDIS_REST_URL` | Not used outside production | **Required** for shared-atomic authentication admission limiting. |
| Server | `UPSTASH_REDIS_REST_TOKEN` | Not used outside production | **Required** for shared-atomic authentication admission limiting. |
| Client | `NODE_ENV` | Leave unset for normal local development | Vercel/Next supplies `production` for the production build. |
| Client | `NEXAMART_API_URL` | Defaults to `http://localhost:3000` outside production | **Required at build time** as an exact HTTPS API origin, such as `https://api.example.com`. No path, query, fragment, or wildcard. |

Vercel supplies `NODE_ENV=production` during production builds/functions; do not add it to the local templates. That exact production value activates the server's secure-cookie behavior, exact-origin CORS validation, and shared-atomic authentication admission-limiter requirement. The client and server then have separate production configuration gates: a production server fails to initialize without a valid `CLIENT_ORIGIN`, and a production client build fails without a valid `NEXAMART_API_URL`. Neither production path falls back to localhost. Use stable HTTPS origins for both applications.

## Sessions, CORS, and CSRF

The API permits credentialed CORS only for the configured exact `CLIENT_ORIGIN`; it echoes that origin and sets `Access-Control-Allow-Credentials: true`. Do not use `*` with credentials.

Session cookies are `HttpOnly`, use `SameSite=Lax`, have path `/`, and are `Secure` in production. They deliberately have no `Domain` attribute: they are host-only cookies for the **client** origin when the browser receives them through the client-origin `/api/*` rewrite. The browser must use that proxy path, not call the API origin directly. Do not configure a shared cookie domain or expect a cookie set for the client host to authenticate a direct API-origin request. Changing this boundary requires a separately reviewed cookie-policy and application change.

For cookie-bearing `POST`, `PATCH`, and `DELETE` requests, the API requires the exact configured `Origin`, or an exact configured-origin `Referer` when `Origin` is absent. It rejects missing or foreign request sources with `403`. This CSRF source check does not apply to `GET`, `HEAD`, or `OPTIONS`, and it does not block non-cookie mutations.

## Authentication admission limits

Authentication admission uses both client-address and normalized-account buckets before registration or login processing. Defaults are 20 client attempts and 5 account attempts per 15-minute window. Operators may set:

| Variable | Meaning |
| --- | --- |
| `AUTH_ADMISSION_IP_LIMIT` | Positive-integer client-address admission limit. |
| `AUTH_ADMISSION_ACCOUNT_LIMIT` | Positive-integer normalized-account admission limit. |
| `AUTH_ADMISSION_WINDOW_SECONDS` | Positive-integer shared window length in seconds. |
| `AUTH_TRUST_PROXY` | Set to `true` only when a trusted proxy supplies `X-Forwarded-For`; it has no effect unless `AUTH_TRUSTED_PROXY_ADDRESSES` also authorizes the direct peer. |
| `AUTH_TRUSTED_PROXY_ADDRESSES` | Required with `AUTH_TRUST_PROXY=true` to use `X-Forwarded-For`: comma-separated exact IPv4 or IPv6 proxy addresses. CIDR ranges are unsupported. Missing, empty, or malformed lists fail closed to the direct transport address. |

The included fallback limiter is intentionally process-local. Production startup constructs the Upstash Redis shared-atomic limiter only when both `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are present; it otherwise fails closed. The local fallback coordinates only one process and is never suitable for production enforcement.

## Local use

Install from each committed lockfile and start the API before the client:

```bash
cd server && npm ci && npm run dev
cd client && npm ci && npm run dev
```

The local API is `http://localhost:3000`; the local client is `http://localhost:3001`. The client proxies `/api/*` to its configured API target.

## Independent validation gates

Run and evaluate the client and server gates independently:

```bash
cd server && npm test && npm run lint && npm run typecheck && npm run build && npm audit --omit=dev
cd client && npm test && npm run lint && npm run typecheck && NEXAMART_API_URL=https://api.example.com npm run build && npm audit --omit=dev
```

These commands validate local source and dependencies; they do not prove a deployment, provider configuration, database execution, HTTPS routing, or a completed release. Before any release decision, separately verify the intended runtime configuration, HTTPS health endpoint, credentialed allowed-origin preflight, rejected foreign-origin request, and sign-in/session/sign-out behavior.

## Migration order and manual release boundary

A release operator must explicitly approve and execute migrations outside application request handling. The repository's Drizzle journal order is `0000` through `0021`; it cannot be selectively reordered or skipped. The release-relevant pending tail is, in this exact order: `0015_variant_cart_checkout` → `0019_product_moderation_workflow` → `0020_seller_notifications` → `0021_add_packed_fulfillment_status`. Although intervening `0016`–`0018` entries are earlier in the journal, an operator must inspect the target database's migration history and apply the journal's next missing entries in order—never jump directly to a later file.

This repository cannot prove the target database's applied state. Before approval, an authorized operator must compare its Drizzle migration history with [`server/src/db/migrations/meta/_journal.json`](server/src/db/migrations/meta/_journal.json), record the next unapplied migration, confirm a backup/rollback plan, and approve the full ordered change set. Do not use `npm run db:migrate` or `npm run demo:seed` as an unreviewed release step.

Keep a prior compatible client/server artifact and its matching configuration available for rollback. If a release is rolled back, route the client and server as a compatible pair; do not imply that an application rollback also reverses schema changes.

## Vercel two-project production release runbook

This is a manual release procedure. It documents the approved target only; it does not authorize a provider login, deployment, migration, commit, or push.

1. In Vercel, use two projects from this repository:
   - **Client project:** Root Directory `client`
   - **API project:** Root Directory `server`

   The API uses the native filesystem catch-all at `server/api/[...route].ts`. Do not add `server/vercel.json` or a rewrite to its bracketed filename.

2. Configure the API project's **Production** environment with these exact names, using production values held outside this repository. Vercel supplies `NODE_ENV=production`; verify it is present rather than storing a duplicate local-template value.

   | Name | Required production setting |
   | --- | --- |
   | `NODE_ENV` | `production` (Vercel-provided; required by the API handler) |
   | `DATABASE_URL` | Target production database connection string |
   | `CLIENT_ORIGIN` | Exact HTTPS client origin; no path, query, fragment, or wildcard |
   | `UPSTASH_REDIS_REST_URL` | Production Upstash REST URL |
   | `UPSTASH_REDIS_REST_TOKEN` | Production Upstash REST token |

3. Configure the client project's **Production** build environment: set `NEXAMART_API_URL` to the exact HTTPS API origin, with **no `/api` suffix** (for example, `https://api.example.com`, not `https://api.example.com/api`). The client rewrite appends `/api/:path*`. Set the API project's `CLIENT_ORIGIN` to the exact client production origin. Do not use a shared cookie domain: authentication must remain on the client origin through `/api/*`.

4. Complete the normal independent validation gates, then build and deploy the API project first. After its intended production API origin is healthy, build and deploy the client project using that exact API origin. This ordering is conceptual release guidance only; it is not a deployment instruction in this repository.

5. Keep database change control separate from application deployment. The source documents `0015`, `0019`, `0020`, and `0021` as deliberately unapplied. Do not run any migration unless the production-database migration approval is recorded, the target database is confirmed, and the full journal order has been checked.

6. After an approved deployment, run these exact smoke checks against the stable production origins (substitute the bracketed origins; do not test an unrelated preview URL):

   ```bash
   curl --fail --silent --show-error https://<api-origin>/api/health
   # Expected JSON: {"ok":true,"service":"nexamart"}
   curl --fail --silent --show-error https://<client-origin>/api/health
   # Expected: the same JSON through the Next.js rewrite.

   curl --include --request OPTIONS https://<api-origin>/api/health \
     --header "Origin: https://<client-origin>" \
     --header "Access-Control-Request-Method: GET" \
     --header "Access-Control-Request-Headers: Content-Type"
   # Expected: 204, Access-Control-Allow-Origin: https://<client-origin>,
   # and Access-Control-Allow-Credentials: true.

   curl --include --request OPTIONS https://<api-origin>/api/health \
     --header "Origin: https://foreign.example" \
     --header "Access-Control-Request-Method: GET"
   # Expected: no Access-Control-Allow-Origin header granting https://foreign.example
   # (and never '*' with credentials).
   ```

   Then, in a real browser on the client production origin, sign in through `/api/*`, make an authenticated follow-up request through `/api/*`, and sign out through `/api/*`. Verify the cookie is `HttpOnly`, `Secure`, `SameSite=Lax`, path `/`, and host-only for the client host (no `Domain` attribute); verify the follow-up fails after sign-out. This is a functional verification, not a payment or delivery verification.

Do not claim authenticated compatibility for an unrelated Vercel preview URL. Each production API instance permits credentialed CORS only for its configured exact client origin; preview testing that needs authentication requires its own explicitly configured, reviewed origin pairing.
