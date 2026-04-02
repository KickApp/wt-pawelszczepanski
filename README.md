# Accounting Platform

### 1. Product Decisions

First goal was to design complete product, start from data, understand general ledger import and try to generate reporting, which seems to be a core of it all.

### 2. Architecture

#### Scaling (as of today this does not scale)

- ingestion
  - batch api to minimize limit of PG transactions
    - persistent queue with PG autoscaling
- reports
  - limit entries per page, add pagination or cursor
- google sheets:
  - Current: Full sheet replacement per sync (simple, correct for small GL)
  - Next: Delta sync tracking `updated_at` timestamps
  - At scale: Batch writes with exponential backoff for Sheets API rate limits

### 3. Tradeoffs

- current implementation fulfils a need to demonstrate prototype, in real example ingestion pipeline could be batched, async and mostly separate from reporting
- data modeling
  - **Flat GL lines** rather than nested journal entry → lines structure. The spec models it this way, and it makes SQL aggregation for reports trivial. The `reference_number` groups related lines.
  - **DECIMAL(15,2)** for amounts, parsed carefully to avoid JavaScript floating-point issues. Postgres returns strings for DECIMAL which are parsed with `parseFloat` after rounding.
  - **Code-based classification** (1xxxx = Assets, etc.) rather than storing class redundantly on GL lines. The account code is the source of truth; class is derived at query time via JOIN.

### 4. AI Usage

#### Where AI helped
- **Mostly vibe coded**
- **Scaffolding**: Generated the full project structure, Express boilerplate, Knex migrations, Docker/CI config. Proposed setup is simple and was accepted.
- **Excel parsing**: AI analyzed the raw Excel structure and identified the deduplication requirement (transactions appearing under both accounts). The parser logic was generated with the correct sign handling.
- **Report computation**: The Trial Balance → P&L → Balance Sheet derivation chain was generated with correct accounting math, including the sign-flip logic for credit-normal accounts.
- **Testing and refining spec**:

#### Corrections ####
- Feedback loop is not great here, all integration with external world, google sheet, excel, parsing initially failed

### 5. Deployment
- index https://accounting-8cvbj8765rv.pawel.dev/
- terraform "infra" deployment is not automated, executed manually, proper stack will require flow to plan and approve changes with tools like runatlantis.io or custom, not worth implementing, for simple setup this is better, trust me ;)
- Simplified EKS, common k8s cluster for main deployment and ephemeral (per pr deployment)
- Separate RDS per production/dev environment, all ephemeral dbs will live inside dev rds, this limits nr of concurrent envs, small rds allows only 80 connections (min 2 connections per app instance)
- Ephemeral environments (helm charts and dbs) are managed outside of terraform, that's simplification, with tools like ArgoCD that could be implemented as a code
- Security:
  - app uses rds_superuser - simplification
  - domain is managed outside of AWS (cloudflare) and this setup ignores that, communication between cloudflare->aws is done without TLS, lets encrypt with http validation or importing cloudflare zone to terraform would solve this - simplification

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

## API Reference
See [openapi.yaml](./openapi.yaml) or open [/docs](https://main.accounting-8cvbj8765rv.pawel.dev/docs/) endpoint to see swagger docs


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
