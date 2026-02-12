# API Guide

## Versioning Layout
- All APIs are under `src/app/api/v1/**` and served at `/api/v1/...`.
- Main groups:
  - `auth/*`, `me`, `health`, `bootstrap/*`
  - `admin/*` for admin operations
  - `oc/*` for OC domain records
  - shared resources (`platoons`, `roles`, `appointments/[id]/active-user`)

## Public vs Auth-Required Endpoints

### Public by middleware allowlist (`src/middleware.ts`)
- Any method:
  - `/api/v1/auth/login`
  - `/api/v1/auth/signup`
  - `/api/v1/auth/logout`
  - `/api/v1/admin/users/check-username`
  - `/api/v1/health`
  - `/api/v1/bootstrap/super-admin`
- GET only:
  - `/api/v1/admin/appointments`
  - `/api/v1/admin/positions`
  - `/api/v1/platoons`

### Protected by middleware token gate
- Everything else under `/api/v1/*`.
- Note: middleware checks token presence; most routes still call `requireAuth` for full JWT verification.

## Handler Patterns
- Wrapper:
  - Primary: `withAuditRoute` + `withAuthz` (`src/lib/audit.ts`, `src/app/lib/acx/withAuthz.ts`)
  - Legacy-only in two routes: `withRouteLogging` (`/oc/[ocId]/spr`, `/oc/[ocId]/fpr`)
- Error model:
  - `ApiError` + `handleApiError` (`src/app/lib/http.ts`)
- Success envelope:
  - `{ status, ok: true, ... }`
- Failure envelope:
  - `{ status, ok: false, error, message, ...extras }`

## Validation Patterns
- Most route inputs use Zod:
  - shared schemas in `src/app/lib/validators.ts`, `src/app/lib/validators.courses.ts`, `src/app/lib/oc-validators.ts`, etc.
  - route-local schema in some handlers (e.g., auth DTOs)
- Common parse style:
  - `schema.parse(...)` for throw-on-fail
  - `schema.safeParse(...)` for custom 400 responses

## Representative Error Shapes
- Validation error:
  - `400`, `error: "bad_request"`, often includes `issues`/`details`
- Auth errors:
  - `401`, `error: "unauthorized"`
  - `403`, `error: "forbidden"`
- Conflict:
  - `409`, `error: "conflict"`
- Not found:
  - `404`, `error: "not_found"`
- Rate limit:
  - `429`, `error: "too_many_requests"`, includes `retryAfter`

## Where To Add New Endpoints Safely
1. Pick route namespace under `src/app/api/v1/...`.
2. Add/extend Zod schemas in `src/app/lib/validators*.ts`.
3. Keep DB work in `src/app/db/queries/*`.
4. Add/update action mapping in `src/app/lib/acx/action-map.ts` (or regenerate via `pnpm tsx scripts/rbac/phase0-generate.ts`).
5. Use `withAuditRoute` + `withAuthz` and log at least one domain audit event.
6. Use `requireAuth` (and explicit role/scope checks where needed).
7. Return standardized envelopes via `json.*` from `src/app/lib/http.ts`.
8. Run `pnpm run validate:action-map` before opening PR.

## Recommended Guarding Baseline For New Routes
- Always call `requireAuth` in protected routes even if middleware already gated token presence.
- For admin routes, add explicit admin check (`hasAdminRole`/`requireAdmin` pattern).
- For OC scoped resources, reuse `authorizeOcAccess` where applicable.
- Keep protected handlers on Node runtime where required:
  - `export const runtime = 'nodejs';`

## How To Test New Routes
- Add Vitest route tests in `tests/api/<feature>.test.ts`.
- Use `makeJsonRequest` and `createRouteContext` from `tests/utils/next.ts`.
- Test at least:
  - happy path
  - unauthorized/forbidden
  - validation failure
  - domain conflict/not-found
