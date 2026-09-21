# Final local database proof audit

Audit time: 2026-09-21T08:31:09+06:00  
Scope: read-only inspection. No database connection, migration, seed, source change, or environment-file value read was performed.

## Binary conclusion

**NO — a project-local database target cannot be proven from the permitted evidence.**

There is a local PostgreSQL listener, but there is no non-secret, project-specific binding between NexaMart's required `DATABASE_URL` and that listener. Treating the listener as this project's target would be an unsafe inference.

## Evidence

| Check | Result |
| --- | --- |
| Environment filenames found | `client/.env.example`, `server/.env.example` only. No non-example `.env` filename was found in the workspace. Values were not read. |
| Git ignore policy | `.env*` is ignored, while the two example files are explicitly retained. An untracked local environment file could therefore be absent from version control, but none was present in this worktree. |
| Server connection configuration | `server/src/db/client.ts` and `server/drizzle.config.ts` both require `DATABASE_URL`; neither supplies a host fallback. Thus the host is unknown without inspecting a secret-bearing runtime/environment source. |
| Connection host classification | **Unproven.** No `DATABASE_URL` value was accessed or parsed, so it cannot be classified as loopback, private-network, remote, or Unix-socket. |
| PostgreSQL listener | PID 7744, process name `postgres`, listens on IPv4 `0.0.0.0:5432` and IPv6 `[::]:5432`. This is a machine-local service and is reachable through local loopback, but it is also exposed on all interfaces. It is not proof of NexaMart ownership or selection. |
| PostgreSQL/container CLI tools | `psql`, `pg_isready`, `pg_ctl`, `docker`, and `docker-compose` were not available on `PATH`. |
| Local provisioning definitions | No repository-scoped `compose*.yml`, `compose*.yaml`, `Dockerfile*`, or `.dockerignore` was found. |
| Migration inventory | 22 PostgreSQL Drizzle SQL migrations (`0000` through `0021`) and 22 matching journal entries. The configured command is `npm run db:migrate` from `server/`; it was **not run**. |
| Seed inventory | `npm run demo:seed` runs `src/scripts/demo-seed.ts`; it requires explicit demo-seed acknowledgement, rejects production mode, and requires an active seller store slug. It was **not run**. |

## Exact next safe commands

These commands neither connect to nor mutate a database.

1. Reconfirm the local listener and owning process:

```powershell
Get-NetTCPConnection -State Listen -LocalPort 5432 | Select-Object LocalAddress,LocalPort,OwningProcess; Get-Process -Id 7744 | Select-Object Id,ProcessName,Path
```

2. With explicit authorization to let a local process inspect the runtime secret **without displaying it**, run this from `server/`. It prints only a host class, never the URL, username, password, database name, or port. This is the missing proof step.

```powershell
node -e "const v=process.env.DATABASE_URL;if(!v){console.log('DATABASE_URL: absent');process.exitCode=2}else{try{const h=new URL(v).hostname.toLowerCase();console.log(['localhost','127.0.0.1','::1'].includes(h)||h.startsWith('127.')?'DATABASE_URL host: loopback-local':'DATABASE_URL host: non-loopback')}catch{console.log('DATABASE_URL host: unparseable');process.exitCode=3}}"
```

3. If step 2 reports `loopback-local`, establish only configuration-level proof (still no database connection) by recording that result with the listener result above. Do **not** run `npm run db:migrate` or `npm run demo:seed` until the intended database name, ownership, backup/rollback plan, and write authorization have separately been confirmed.

If the value is supplied via a local env file rather than the invoking shell, an authorized operator must use that deployment's normal secret-injection mechanism for step 2; this audit did not open any env file to discover it.

## Integrity notes

- Audited commit: `1e9d6cc56cc58e5034dd671c355c3af62df66050` (`feat(admin): align governance dashboard briefing`).
- Pre-existing untracked `.task.txt` was left untouched.
- This report is the only file created by the audit.
