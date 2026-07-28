# Tap2Order Monti

## Local verification

Copy `server/.env.example` and `client/.env.example` to local `.env` files and
set real values outside Git. `AUTH_SECRET` must be a unique random value of at
least 32 bytes; `STAFF_PIN` is the single shared staff credential.

Run the checks with Node `22.12.0` or newer:

```bash
cd server && npm ci && npm test
cd ../client && npm ci && npm run lint && npm run build
```

## Database changes

The repository contains a pending Prisma migration that aligns the schema with
the application and adds safe indexes/idempotency support. Do not apply it
directly to production: first back up the database, run it on staging, then use
`prisma migrate deploy` in a planned maintenance window.

This repository intentionally has CI verification only. Production deployment,
server restart and migration execution require a separate reviewed runbook.
