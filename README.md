# NexaMart

## Overview

NexaMart is a multi-vendor marketplace with Customer, Seller, and Admin workflows. The repository contains separate Next.js client and Hono API applications.

## Features

### Customer

- Browse, search, sort, and filter the current catalog.
- View product details and available product gallery media.
- Manage a shopping bag and saved items.
- Use account, address, order, and eligible-review workflows.

### Seller

- Apply for and manage a seller profile.
- Create and manage seller-owned catalog products and inventory.
- Classify products with approved taxonomy.
- Use the API-backed fulfillment, promotions, finance, review, notification, and analytics workspaces when available to the seller.

### Admin

- Govern seller applications and seller workspaces.
- Manage category, subcategory, and brand taxonomy.
- Moderate catalog products and manage orders, promotions, feedback, finance, audit, analytics, and account workspaces when supported by the API.

## Tech stack

- Client: Next.js, React, and TypeScript.
- API: Hono and TypeScript.
- Data: PostgreSQL with Drizzle ORM and Drizzle Kit migrations.
- Quality tooling: Node test runner, ESLint, TypeScript, and npm lockfiles.

## Repository structure

```text
NexaMart/
├── client/                 Next.js marketplace application
├── server/                 Hono API, Drizzle schema, migrations, and Vercel adapter
└── .github/workflows/      CI checks for both applications
```

## Prerequisites

- Node.js 22.23.2 (the version used by CI)
- npm
- PostgreSQL for database-backed local API features

## Local development

Install and run each application in a separate terminal.

```bash
# Terminal 1: API
cd server
npm ci
npm run dev
```

```bash
# Terminal 2: client
cd client
npm ci
npm run dev
```

The default local API port is `3000` and the default Next.js development port is `3001`. The client proxies `/api/*` to the API target configured through its environment.

## Environment configuration

Create local environment files from the committed examples before starting database-backed work:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env.local
```

On PowerShell, use `Copy-Item` instead of `cp` if preferred. Fill local values through your local secret management process; never commit a real `.env` file, database connection string, token, or credential.

- `server/.env.example` documents the API database, port, client-origin, and production-only admission-limiter settings.
- `client/.env.example` documents the API origin used by the Next.js rewrite.
- Production values belong in the deployment environment, not in this repository.

## Database and migrations

Generate or apply migrations only against an explicitly approved database target:

```bash
cd server
npm run db:generate
npm run db:migrate
```

The guarded local demo seed is for an isolated local database only. It requires its explicit local confirmation mechanism and must never be run against shared or production databases:

```bash
cd server
NEXAMART_DEMO_SEED=local-confirmed npm run demo:seed:local
```

## Quality checks

Run checks independently for the client and API after configuring their local environments.

### Client zoom-layout regression audit

The Client contains `scripts/zoom-layout-audit.mjs`, a local Chrome DevTools Protocol audit that checks page-level overflow, header collisions, clipped status panels, hydration boundaries, and runtime exceptions across its defined viewport/zoom matrix. Run it only against a freshly rebuilt local production Client and document any authenticated-route limitations; it does not bypass role-based access or fabricate catalog data.

```bash
cd client
npm test
npm run lint
npm run typecheck
npm run build
```

```bash
cd server
npm test
npm run lint
npm run typecheck
npm run build
```

The client test command intentionally preloads `client/scripts/tsx-userinfo-shim.cjs` for a narrow Node platform compatibility case; it is part of the normal test command and should remain in place.

## Deployment

The client and API are separate deployable applications rooted at `client/` and `server/`. Deployment requires the corresponding environment configuration and independent validation; this repository does not perform a deployment.

## Security notes

- Role-based access control is enforced by the API.
- Seller and customer operations use server-side ownership checks.
- Do not commit secrets or real environment files.
- The local demo seed is guarded and intended only for approved loopback-local development targets.
