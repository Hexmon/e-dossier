# Testing Guide

This project uses Vitest for the main automated test suite and Playwright for browser-level smoke or live-flow verification. Use `pnpm` commands only.

## Required Feature Workflow

For every feature, bug fix, or behavior change:

1. Identify the touched feature area before editing.
2. Add or update the closest relevant tests in the same change.
3. Run focused tests while developing, for example:

```bash
pnpm run test tests/api/oc.list.test.ts
pnpm run test tests/lib/setup-status.test.ts
pnpm run test tests/unit/oc-lifecycle.test.ts
```

4. After the feature is complete, run the full Vitest suite:

```bash
pnpm run test
```

5. Run the other gates required by the type of change.

Do not claim a feature works only because tests pass. For runtime behavior, also verify the real code path with an API call, browser flow, DB verification command, or manual smoke check as appropriate.

## Test Locations

- `tests/api/**`: Next.js API route tests.
- `tests/lib/**`: shared library, hooks, server-page, middleware, and UI behavior tests.
- `tests/unit/**`: domain helper, pure function, lifecycle, parser, and calculation tests.
- `tests/e2e/**`: Playwright browser or live-system smoke checks.
- `tests/utils/**`: shared request builders, mocks, and route-flow helpers.

## API Route Coverage

Every new or changed route under `src/app/api/**/route.ts` must include matching API coverage:

1. Add or update a test under `tests/api/**`.
2. Update `tests/api/coverage.manifest.ts`.
3. Run:

```bash
pnpm run validate:api-tests
pnpm run test tests/api/<changed-feature>.test.ts
pnpm run test
```

API tests should cover the relevant success path, auth or permission failure, validation failure, not-found/conflict cases where applicable, and response-shape compatibility.

## Action Map And Page Access

When changing dashboard routes, navigation, route guards, permissions, setup-gate access, or action-map entries, run:

```bash
pnpm run validate:action-map
pnpm run test
```

If a page flow changes, add or update the matching library/component test and use a browser smoke check when data refresh, routing, auth, or setup-gate behavior is involved.

## DB And Data Integrity Changes

For migrations, reconciliation logic, data cleanup, or canonical-source changes:

```bash
pnpm run db:verify:oc-reconciliation
pnpm run db:verify:zero-loss
```

Use the relevant disposable-DB or live-smoke command when the feature has one. For OC lifecycle work, the current commands are:

```bash
pnpm run verify:oc-db-integration
pnpm run verify:oc-live-api-smoke
pnpm run verify:oc-frontend-smoke
```

Data integrity work must preserve row counts and compatibility behavior unless the task explicitly authorizes a destructive migration.

## Full Validation Before Handoff

For code changes, run:

```bash
pnpm run validate:api-tests
pnpm run validate:action-map
pnpm run test
pnpm run lint
pnpm run typecheck
pnpm run build
```

If a command is not relevant, state why. If a command cannot run in the local environment, record the exact command and failure reason.

## Local Development Commands

```bash
pnpm install
pnpm run test
pnpm run test:watch
pnpm run test:coverage
pnpm run lint
pnpm run typecheck
pnpm run build
```

Vitest configuration lives in `vitest.config.ts`, and the global test setup lives in `tests/setup/env.ts`.
