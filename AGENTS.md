# Repo Instructions

## Feature Work And Tests

- Every feature, bug fix, or behavior change must include matching tests in the same change. Do not defer feature tests to a later prompt or follow-up.
- Start with focused tests for the changed feature while developing, for example `pnpm run test tests/api/oc.list.test.ts`.
- After the feature is complete, run the full Vitest suite with `pnpm run test`.
- Do not claim a feature works only because tests pass. Also verify the affected code path and, when relevant, the live API, browser flow, DB invariant, or security gate.
- Do not change unrelated feature behavior, business rules, API response shapes, DB schema, or UI workflows while updating tests or governance files.

## API And Route Coverage

- Any new or changed API route under `src/app/api/**/route.ts` must ship with matching coverage in `tests/api/**` and an updated entry in `tests/api/coverage.manifest.ts` in the same change.
- Run `pnpm run validate:api-tests` after adding, removing, or renaming API routes or API tests.
- Run `pnpm run validate:action-map` after changing dashboard routes, route guards, navigation access, or action-map entries.
- Do not add uncovered API route handlers and defer tests to a later change.

## Required Validation Before Handoff

- For code changes, run `pnpm run lint`, `pnpm run typecheck`, and `pnpm run build` before final handoff.
- For docs-only changes, run the most relevant documentation or validation command when available.
- If a required command cannot be run, state exactly which command was skipped and why.

## Module Safety

- Client/UI surfaces must not import database clients, schema, server services, Node-only modules, or direct backend implementation details. Use API routes or server helpers as the boundary.
- API, DB, and server service modules must not import UI components, React hooks, browser-only notification libraries, or client state modules.
- Tests may mock across boundaries when needed, but production modules should keep these boundaries clean so one module does not silently affect another.
