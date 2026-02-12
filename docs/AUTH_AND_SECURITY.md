# Auth And Security

## Auth Mechanism

### Token model
- Access token: JWT (EdDSA, `jose`) issued in `src/app/api/v1/auth/login/route.ts`.
- Token payload created by `src/app/lib/jwt.ts` includes:
  - `sub` (user id)
  - `roles` (currently position key list, usually single)
  - `apt` (appointment id/position/scope)
  - `pwd_at` (password update timestamp)
- Access token transport:
  - Primary: HTTP-only cookie `access_token` via `setAccessCookie` in `src/app/lib/cookies.ts`
  - Optional: `Authorization: Bearer ...` accepted by token readers

### Verification
- Middleware (`src/middleware.ts`) only checks token presence for protected paths.
- Actual cryptographic verification happens in route code via `requireAuth` (`src/app/lib/authz.ts`) -> `verifyAccessJWT` (`src/app/lib/jwt.ts`).

### Login
- Endpoint: `POST /api/v1/auth/login`
- Flow:
  - login rate limit check
  - request payload validation (`LoginBody`)
  - active appointment lookup
  - lockout checks (`account_lockouts`)
  - password hash verify (`argon2`)
  - JWT issuance + access cookie set
  - audit emission (success/failure/lockout)

### Logout
- Endpoint: `POST /api/v1/auth/logout`
- Behavior:
  - same-origin checks (Origin/Referer/Sec-Fetch-Site)
  - clears `access_token` cookie server-side
  - sends cache-busting and `Clear-Site-Data` headers
  - logs logout event

## CSRF Strategy
- Middleware-centric CSRF enforcement (`src/middleware.ts`) for `/api/v1/*`:
  - GET requests receive generated CSRF token via cookie + `X-CSRF-Token` header.
  - State-changing methods require valid CSRF token (`X-CSRF-Token` or `csrf-token` header).
  - Exemptions: login/signup/logout/bootstrap.
- CSRF helpers live in `src/lib/csrf.ts`.
- Frontend client (`src/app/lib/apiClient.ts`) fetches token from `/api/v1/health` and attaches it for mutating requests.

## Rate Limiting
- Middleware applies API-wide rate limiting for `/api/v1/*` (except health, if excluded) via `checkApiRateLimit`.
- Route-level endpoint-specific limits:
  - login: `checkLoginRateLimit`
  - signup: `checkSignupRateLimit`
- Config module: `src/config/ratelimit.config.ts`.
- Implementation: `src/lib/ratelimit.ts` with Upstash Redis or in-memory fallback.

## Security Headers And Middleware Behavior
- `src/middleware.ts`:
  - adds/propagates `x-request-id`
  - performs public-vs-protected path gate
  - applies rate limit and CSRF checks
- `src/app/lib/security-headers.ts` defines shared security headers helper, but it is not globally wired in `next.config.ts`.
- `next.config.ts` currently only disables `x-powered-by` (`poweredByHeader: false`).

## RBAC / Authorization (Current)

### Data model
- Roles/permissions tables in `src/app/db/schema/auth/rbac.ts`.
- Appointments are the effective authority source (`src/app/db/schema/auth/appointments.ts`).
- JWT `roles` currently derive from appointment position key (not from `roles` table membership).

### Seed behavior
- `src/app/db/seeds/seedRolesAndPermissions.ts` seeds many permission keys and maps all to `admin`, `super_admin`, and `SUPER_ADMIN` position.
- `src/app/db/seeds/seedAdminUser.ts` creates SUPER_ADMIN and ADMIN users + active appointments.

### Runtime checks
- `requireAuth` used broadly in handlers.
- Scope-aware OC authorization exists in `src/lib/authorization.ts` (`authorizeOcAccess`) but is only used by a subset of OC routes.
- Permission helper `src/app/db/queries/authz.ts` exists but is not wired into API route guards.

## Audit Logging (Hexmon v2 + legacy)
- Primary wrapper: `withAuditRoute` from `src/lib/audit.ts`.
- Hexmon sink writes structured events to `audit_events` (`src/app/db/schema/auth/audit-events.ts`).
- Legacy helper `src/lib/audit-log.ts` writes to `audit_logs` (`src/app/db/schema/auth/audit.ts`).
- `GET /api/v1/admin/audit-logs` merges both tables for UI consumption.
- Remaining legacy routes use `withRouteLogging` (`/oc/[ocId]/spr`, `/oc/[ocId]/fpr`).

## Current Security Notes
- Many `admin/*` routes call `requireAuth` but do not enforce explicit admin-role checks in-handler.
- Middleware validates token presence only; routes that skip `requireAuth` on protected paths can be bypassed by any syntactically present token.
- Scope checks are inconsistent across OC endpoints; some use `authorizeOcAccess`, many only require authentication.
