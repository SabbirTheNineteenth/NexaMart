# Local demo seed guard handoff

`server/src/db/seeds/runLocalDemoSeed.ts` provides `assertLocalDemoSeedGuard` for a caller to invoke before any demo-seed action.

It permits execution only when both conditions hold:

- `NEXAMART_DEMO_SEED=local-confirmed`
- `DATABASE_URL` parses as a `postgres:` or `postgresql:` URL whose hostname resolves syntactically to `localhost` or `127.0.0.1`

The module is deliberately side-effect free: it does not load environment files, connect to a database, run migrations, write rows, or log. Its refusal messages never include the database URL or credentials.

No existing seed command was changed. A future caller must invoke the guard before performing any database action.
