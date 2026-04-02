---
name: ingest
description: Run the Excel GL data import and validate results. Requires postgres running.
disable-model-invocation: true
---

Run the Excel GL ingestion pipeline:

1. Ensure postgres is running (`docker compose up postgres -d` if needed)
2. Run migrations: `npm run migrate`
3. Run ingestion: `npm run ingest`
4. Validate by hitting the API:
   - `curl -s http://localhost:3000/api/reports/trial-balance?startDate=2025-01-01&endDate=2025-12-31 | head -c 500`
   - Confirm debits = credits in the trial balance response

Report the number of accounts and journal entries imported, and whether the trial balance is balanced.
