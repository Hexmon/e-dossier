# Contributing To e-dossier

This repository expects feature work, tests, linting, type checking, and build validation to move together. Do not defer tests or verification to a later change.

## Local Setup

```bash
git clone https://github.com/your-org/e-dossier.git
cd e-dossier
pnpm install
git checkout -b feature/my-feature
```

Requirements:

- Node.js 20 or newer.
- pnpm 9 or newer.
- `pnpm-lock.yaml` must stay committed and current.

Git hooks live in `.githooks/` and are configured by `pnpm install` through `pnpm run setup:git-hooks`.

## Feature Workflow

For every feature, fix, cleanup, or security hardening change:

1. Identify the touched feature area and its existing tests.
2. Add or update tests in the same change.
3. Run focused tests while developing:

```bash
pnpm run test tests/api/<feature>.test.ts
pnpm run test tests/lib/<feature>.test.ts
pnpm run test tests/unit/<feature>.test.ts
```

4. After the feature is complete, run the full Vitest suite:

```bash
pnpm run test
```

5. Verify the runtime behavior when the feature affects API calls, routing, auth/setup gates, DB state, uploads, pagination, or browser-visible flows.

Tests are required evidence, not the only evidence. A feature should not be marked working until the relevant code path has also been reviewed or exercised.

## Required Checks

Run the checks that match the change:

```bash
pnpm run validate:api-tests   # API route additions, removals, or behavior changes
pnpm run validate:action-map  # dashboard route, access, navigation, or action-map changes
pnpm run test                 # full Vitest suite after feature completion
pnpm run lint                 # ESLint and theme-token checks
pnpm run typecheck            # TypeScript type checking
pnpm run build                # production build
```

For normal code changes, run all of the above before handoff. For docs-only changes, run the most relevant validation command and state what was run.

## API Route Rules

Any new or changed API route under `src/app/api/**/route.ts` must include:

- Matching coverage in `tests/api/**`.
- A matching entry update in `tests/api/coverage.manifest.ts`.
- `pnpm run validate:api-tests`.
- Focused API tests and then full `pnpm run test`.

Do not add uncovered route handlers.

## Module Boundaries

Keep production code boundaries clean:

- Client/UI code must not import DB clients, schema, server services, Node-only modules, or direct backend implementation details.
- API, DB, and server service modules must not import UI components, React hooks, client state, or browser-only notification libraries.
- Shared types and pure helpers should live in neutral modules rather than being imported from UI components or API handlers.
- Tests may mock across boundaries where needed, but production modules should not.

ESLint enforces the safest boundaries first. If a new boundary rule exposes legacy violations, split cleanup into a separate safe change instead of mixing it with feature work.

## Pre-Push Hook

The Unix and PowerShell pre-push hooks run:

```bash
pnpm run validate:action-map
pnpm run validate:api-tests
pnpm run test
pnpm run lint
pnpm run typecheck
pnpm run build
```

If any step fails, the push is blocked. Fix the issue and push again. `git push --no-verify` skips only the local hook; CI still runs.

## CI

The GitHub Actions lint/build workflow installs dependencies with pnpm and runs validation on every push and pull request. A pull request should not be merged unless CI passes and the feature-specific verification has been done locally or in a suitable environment.

## DB And Live Smoke Verification

When a change affects DB cleanup, OC lifecycle, bulk upload, dossier data visibility, or other data integrity paths, add the relevant DB or live smoke command:

```bash
pnpm run db:verify:oc-reconciliation
pnpm run db:verify:zero-loss
pnpm run verify:oc-db-integration
pnpm run verify:oc-live-api-smoke
pnpm run verify:oc-frontend-smoke
```

Use these in addition to unit/API tests, not as replacements.
