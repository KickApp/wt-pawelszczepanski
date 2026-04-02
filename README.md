# Kick Accounting Platform

A backend accounting system built with Express.js and PostgreSQL that stores a General Ledger, generates financial reports (Trial Balance, P&L, Balance Sheet), and ingests data from Excel exports.

## Quick Start

```bash
# Start postgres + app
docker compose up --build

# Ingest the provided GL export
curl -X POST http://localhost:3000/api/ingest

# Get Trial Balance
curl "http://localhost:3000/api/reports/trial-balance?startDate=2025-01-01&endDate=2025-12-31"

# Get Profit & Loss
curl "http://localhost:3000/api/reports/profit-and-loss?startDate=2025-01-01&endDate=2025-12-31"

# Get Balance Sheet
curl "http://localhost:3000/api/reports/balance-sheet?asOfDate=2025-12-31"
```

## Google Sheets Credentials

The app uses a Google Cloud service account to sync data to Google Sheets. The credential file is **not committed to git**.

### Setup

1. Place your service account key as `google-sa-key.json` in the project root
2. Configure via environment variable:

| Environment | Configuration |
|---|---|
| **Local dev** | `GOOGLE_SA_KEY_PATH=./google-sa-key.json` in `.env` |
| **docker-compose** | Pre-configured — mounts `google-sa-key.json` as a read-only volume |
| **EKS** | Set `GOOGLE_SA_KEY_JSON` from a K8s Secret, or mount the secret file and use `GOOGLE_SA_KEY_PATH` |

## Local Development

```bash
# Install dependencies
npm install

# Start postgres (requires Docker)
docker compose up postgres -d

# Create .env from example
cp .env.example .env
# Add: GOOGLE_SA_KEY_PATH=./google-sa-key.json

# Run migrations
npm run migrate

# Start dev server with hot reload
npm run dev

# Run tests
npm test
```

---

## Product Decisions

### What I prioritized

1. **Accounting correctness** — The double-entry bookkeeping invariant (debits = credits) is enforced at every layer: database CHECK constraint, service-layer validation before insert, and report-level verification. Reports are computed directly from GL data via SQL aggregations, not cached or materialized, ensuring they always reflect current state.

2. **Data ingestion fidelity** — The Excel parser handles the real-world format: account sections, signed amounts, parenthesized negatives, and deduplication of transactions that appear under both accounts. Every parsed line maintains the double-entry relationship.

3. **Clean separation of concerns** — Controllers handle HTTP, services handle business logic, utilities handle computation. Reports are derived views on the GL, exactly as the accounting spec describes.

### What I intentionally skipped

- **Google Sheets sync** — Deferred to focus on getting the core accounting engine right first. The architecture supports adding it later via a PostgreSQL-backed job queue (pg-boss) without Redis.
- **Authentication** — Per spec, out of scope.
- **Frontend** — Per spec, out of scope.
- **Caching** — With a small GL, computing reports on-the-fly from SQL is fast enough. Materialized views or caching would be premature optimization.

---

## Architecture

### Data Model

Two tables following the spec's simplified schema:

- **accounts** — Chart of Accounts with code, name, class (enum: Assets/Liabilities/Equity/Income/Expenses), and type
- **journal_entries** — GL lines with date, account reference, debit OR credit amount (enforced by CHECK constraint), and reference_number grouping related lines

### Report Computation

All three reports derive from the same base query that aggregates GL lines by account:

```
GL Lines → GROUP BY account → Trial Balance → filter/bucket → P&L or Balance Sheet
```

- **Trial Balance**: Aggregates all debits/credits per account for a date range. Validates grand totals balance.
- **P&L**: Filters Trial Balance to Income + Expense accounts, buckets by code range (Income 4xxxx, COGS 5xxxx, OpEx 6-7xxxx, Other 8-9xxxx), computes Gross Profit → Net Operating Income → Net Income.
- **Balance Sheet**: Cumulative Trial Balance (inception to date) filtered to Assets/Liabilities/Equity. Injects current-period Net Income from P&L into Equity section. Validates Assets = Liabilities + Equity.

### Sync Architecture (Planned)

The planned Google Sheets sync would use **pg-boss** (PostgreSQL-backed job queue):

```
API mutation → Enqueue sync job → pg-boss (in Postgres) → Worker → Google Sheets API
```

**Scaling approach:**
- Current: Full sheet replacement per sync (simple, correct for small GL)
- Next: Delta sync tracking `updated_at` timestamps
- At scale: Batch writes with exponential backoff for Sheets API rate limits

---

## Tradeoffs

### Real-time vs eventual consistency (sync)
For Google Sheets sync, eventual consistency is the right call. Financial data doesn't change frequently, and Sheets API has rate limits (100 req/100s). A debounced queue (5s delay) naturally batches rapid mutations while keeping sync lag under 10 seconds.

### Data modeling
- **Flat GL lines** rather than nested journal entry → lines structure. The spec models it this way, and it makes SQL aggregation for reports trivial. The `reference_number` groups related lines.
- **DECIMAL(15,2)** for amounts, parsed carefully to avoid JavaScript floating-point issues. Postgres returns strings for DECIMAL which are parsed with `parseFloat` after rounding.
- **Code-based classification** (1xxxx = Assets, etc.) rather than storing class redundantly on GL lines. The account code is the source of truth; class is derived at query time via JOIN.

### Ingestion deduplication
The Excel format lists each transaction under both involved accounts. Rather than processing all rows and deduplicating complex multi-line entries, the parser tracks seen reference numbers and only processes the first occurrence, then generates both debit and credit GL lines from it.

---

## AI Usage

### Where AI helped
- **Scaffolding**: Generated the full project structure, Express boilerplate, Knex migrations, Docker/CI config. This saved significant time on repetitive setup.
- **Excel parsing**: AI analyzed the raw Excel structure and identified the deduplication requirement (transactions appearing under both accounts). The parser logic was generated with the correct sign handling.
- **Report computation**: The Trial Balance → P&L → Balance Sheet derivation chain was generated with correct accounting math, including the sign-flip logic for credit-normal accounts.

### Where it needed correction
- **Express v5 types**: Generated code assumed Express v4 param types (`string`), but `@types/express@5` returns `string | string[]`. Required manual type assertions.
- **Account type parsing**: The Excel account headers have variable formats ("10100 - Bank Account - Chase Business Checking - 0205" vs "40000 - Revenue"). The initial parser needed adjustment to correctly extract the account type from the first segment after the code.

---

## API Reference
See [openapi.yaml](./openapi.yaml)

---

## Deployment
- terraform "infra" deployment is not automated, executed manually, proper stack will require flow to plan and approve changes with tools like runatlantis.io or custom, not worth implementing, for simple setup this is better, trust me ;)
- Simplified EKS, common k8s cluster for main deployment and ephemeral (per pr deployment)
- Separate RDS per production/dev environment, all ephemeral dbs will live inside dev rds, this limits nr of concurrent envs, small rds allows only 80 connections (min 2 connections per app instance)
- Ephemeral environments (helm charts and dbs) are managed outside of terraform, thats simplification, with tools like ArgoCD that could be implemented as a code
- Security:
- - app uses rds_superuser - simplification
- - domain is managed outside of AWS (cloudflare) and this setup ignores that, communication between cloudflare->aws is done without TLS, lets encrypt with http validation or importing cloudflare zone to terraform would solve this - simplification


## Tech Stack

| Component | Technology |
|---|---|
| Runtime | Node.js + TypeScript |
| Framework | Express.js |
| Database | PostgreSQL 16 |
| Query Builder | Knex |
| Validation | Zod |
| Logging | Pino |
| Testing | Vitest |
| Container | Docker (multi-stage) + Docker Compose |
| CI/CD | GitHub Actions → GHCR |
