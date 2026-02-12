# Project Map

## Directory-by-Directory

### `src/app`
- App Router entrypoint (pages/layouts) plus all API routes.
- Public/auth pages live under `src/app/(auth)`.
- Operational dashboard pages live under `src/app/dashboard/**`.

### `src/app/api`
- Versioned API namespace under `src/app/api/v1`.
- Major API groups:
  - `auth`, `me`, `health`, `bootstrap`
  - `admin/*` (appointments, users, courses, instructors, subjects, PT, interview templates, audit logs, etc.)
  - `oc/*` (OC core + many OC subresources)
  - shared resources (`platoons`, `roles`)
- Route wrappers used heavily: `withAuditRoute`; limited legacy use: `withRouteLogging`.

### `src/app/db`
- DB client/config:
  - `client.ts` (drizzle + pg pool)
  - `drizzle.config.ts`
- Schema split into domains:
  - `schema/auth/*`
  - `schema/training/*`
  - `schema/admin/*`
- Query layer in `queries/*`.
- Seed scripts in `seeds/*`.
- Handwritten SQL migrations in `src/app/db/migrations/*`.

### `src/app/lib`
- App-facing runtime helpers:
  - auth/jwt/cookies (`authz.ts`, `jwt.ts`, `cookies.ts`)
  - HTTP envelopes/errors (`http.ts`)
  - API client and frontend API wrappers (`apiClient.ts`, `api/*`)
  - validation schemas (`validators.ts`, `validators.courses.ts`, `oc-validators.ts`, etc.)
  - storage integration (`storage.ts`)
  - security headers helper (`security-headers.ts`)

### `src/components`
- UI components and feature modules for dashboard/public pages.
- Providers:
  - `src/components/providers/QueryProvider.tsx`
  - `src/components/providers/ReduxProvider.tsx`
- Extensive form/table components for OC/admin workflows.

### `src/hooks`
- React Query-driven hooks for most API-backed features.
- Hook naming generally maps to API/domain (e.g., `useMe`, `useAppointments`, `useOCs`, `useApproval`).

### `src/store`
- Redux Toolkit store for large client-side form slices.
- `redux-persist` is enabled for many slices.

### `tests`
- `tests/api/*`: route handler tests.
- `tests/lib/*`: shared library tests (rate limit, audit utils).
- `tests/utils/next.ts`: minimal NextRequest-style mock helpers.
- `tests/setup/env.ts`: test env bootstrap.

## Key Files (Top ~30)
1. `package.json` - scripts, runtime constraints, deps.
2. `src/middleware.ts` - API perimeter controls (request id, rate limit, CSRF, public/protected paths).
3. `src/app/layout.tsx` - root providers (Query + Redux).
4. `src/app/lib/http.ts` - standard response envelope + error mapping.
5. `src/app/lib/jwt.ts` - EdDSA access token sign/verify.
6. `src/app/lib/cookies.ts` - access token cookie set/clear/read.
7. `src/app/lib/authz.ts` - route auth helpers (`requireAuth`, `requireAdmin` behavior).
8. `src/lib/authorization.ts` - scope-based OC/appointment authorization helpers.
9. `src/lib/csrf.ts` - CSRF token generation/validation primitives.
10. `src/lib/ratelimit.ts` - rate limiter + Upstash/in-memory fallback.
11. `src/config/ratelimit.config.ts` - env-driven rate-limit config.
12. `src/lib/audit.ts` - Hexmon v2 audit logger + route wrapper.
13. `src/lib/audit-log.ts` - legacy audit log utility (`audit_logs`).
14. `src/lib/withRouteLogging.ts` - legacy route wrapper for access/audit logging.
15. `src/app/api/v1/auth/login/route.ts` - login + lockout + JWT issuance.
16. `src/app/api/v1/auth/signup/route.ts` - signup request creation flow.
17. `src/app/api/v1/auth/logout/route.ts` - same-origin logout + cookie clear.
18. `src/app/api/v1/me/route.ts` - current principal profile endpoint.
19. `src/app/api/v1/admin/audit-logs/route.ts` - merged read from `audit_logs` + `audit_events`.
20. `src/app/api/v1/admin/appointments/route.ts` - representative admin write/read route.
21. `src/app/api/v1/oc/[ocId]/academics/route.ts` - representative OC scoped endpoint with `authorizeOcAccess`.
22. `src/app/api/v1/oc/[ocId]/spr/route.ts` - legacy wrapper route example.
23. `src/app/db/schema/auth/rbac.ts` - roles/permissions tables.
24. `src/app/db/schema/auth/users.ts` - user core entity.
25. `src/app/db/schema/auth/appointments.ts` - principal role/scope assignment model.
26. `src/app/db/schema/auth/audit.ts` - legacy `audit_logs` table.
27. `src/app/db/schema/auth/audit-events.ts` - Hexmon `audit_events` table.
28. `src/app/db/queries/auth.ts` - signup/password verification/change queries.
29. `src/app/db/queries/signupRequests.ts` - signup approval/rejection transaction flow.
30. `src/app/db/seeds/seedRolesAndPermissions.ts` - RBAC bootstrap seed.
31. `src/app/db/seeds/seedAdminUser.ts` - admin/super-admin bootstrap seed.
32. `src/store/index.ts` - Redux root reducer + persistence config.
33. `src/components/providers/QueryProvider.tsx` - React Query runtime config.
34. `src/app/lib/apiClient.ts` - unified frontend fetch client + CSRF header behavior.
35. `vitest.config.ts` - API test runner config.
