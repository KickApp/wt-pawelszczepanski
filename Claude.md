# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev

- `npm run dev` — starts Express with hot reload (requires postgres running)
- `npm run build` — TypeScript compilation via `tsc`
- `npm run lint` — ESLint on `src/` (no auto-formatter configured)
- `npm test` — Vitest (unit tests, no DB required)
- `npm run migrate` — Knex migrations (TypeScript files in `src/db/migrations/`)
- `npm run load` — truncate + reload GL data from Excel (prompts for confirmation)

## Database

- PostgreSQL 17. Start with `docker compose up postgres -d`
- Migrations must run before the app starts; docker-compose does this automatically
- Config via individual env vars: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` (defaults: localhost:5432/accounting/app/devpassword)
- Amounts are DECIMAL(15,2) — Postgres returns strings
- All amount arithmetic must use `big.js` to avoid floating-point errors — never use native JS math (+, -, *, /) on monetary values

## Google Sheets Auth

- Service account key: `google-sa-key.json` (gitignored, never commit)
- Set `GOOGLE_SA_KEY_PATH=./google-sa-key.json` in `.env` for local dev
- Or `GOOGLE_SA_KEY_JSON` env var for EKS (raw JSON from K8s Secret)
- Auth helper: `src/services/google-auth.ts` — `getSheetsClient()`, `getDriveClient()`

## Accounting Domain

- Double-entry bookkeeping: every journal entry must have debits = credits (DB CHECK constraint)
- Account classification by code range: 1xxxx Assets, 2xxxx Liabilities, 3xxxx Equity, 4xxxx Income, 5-9xxxx Expenses
- Reports (Trial Balance, P&L, Balance Sheet) are computed from GL aggregations, not cached
- `reference_number` groups related GL lines into a single logical transaction

## Conventions

- Plan before coding — propose approach before implementing
- Be terse — minimal explanations
- Explain tradeoffs when making design decisions
- TypeScript strict mode, ES2022 target, CommonJS output
- Path alias: `@/*` maps to `src/*`
- Layers: controllers (HTTP) → services (logic) → db (Knex queries)
- Validation with Zod schemas in `src/validators/`
- Over tested is better than under tested
- source of truth for api schema is openapi.yaml, schema should be written first and then implemented
