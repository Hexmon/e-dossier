# Testing Strategy

## Vitest Setup
- Config file: `vitest.config.ts`
- Runtime:
  - environment: `node`
  - globals: enabled
  - setup file: `tests/setup/env.ts`
  - include pattern: `tests/**/*.test.{ts,tsx}`
- Coverage:
  - provider: `v8`
  - outputs: `text`, `html`, `json-summary`
  - directory: `coverage/`

## Test Helpers

### `tests/setup/env.ts`
- Loads `.env` via `dotenv/config`.
- Ensures `NODE_ENV=test` default.

### `tests/utils/next.ts`
- `makeJsonRequest(...)`:
  - builds a minimal NextRequest-like object for route handlers.
  - supports method/path/headers/body/cookies.
- `createRouteContext(...)`:
  - builds `{ params: Promise<...> }` context for dynamic routes.

## Current Test Style
- Route handlers are imported directly and invoked as functions.
- External dependencies are heavily mocked (`vi.mock(...)`):
  - DB client/query modules
  - auth helpers
  - rate limit helpers
  - audit helpers
- Tests are grouped by endpoint and behavior (auth, me, courses, OC routes, etc.).

## How To Add API Tests For New Routes
1. Create file in `tests/api/<feature>.test.ts`.
2. Import route handler(s), e.g. `GET`, `POST`, `PATCH`.
3. Use `makeJsonRequest` for request object and `createRouteContext` for params.
4. Mock external dependencies with `vi.mock(...)`.
5. Cover at least:
  - success path
  - invalid input (400)
  - unauthorized/forbidden (401/403)
  - not found/conflict as applicable
6. Assert response status and envelope/body fields.

## Recommended Additional Coverage For Integrations
- Authorization policy decision tests (allow/deny matrix).
- Audit event emission tests for success + denial paths.
- Middleware interaction tests for CSRF and rate-limit behavior (where practical).

## Commands
- `pnpm test`
- `pnpm test:watch`
- `pnpm test:coverage`
