---
name: verify
description: Run lint, build, and tests to verify the project is in a good state. Use after making code changes.
---

Run the following commands in sequence, stopping on first failure:

1. `npm run lint` — ESLint checks
2. `npm run build` — TypeScript compilation
3. `npm test` — Vitest unit tests

Report results concisely. If any step fails, show the relevant error and suggest a fix.
