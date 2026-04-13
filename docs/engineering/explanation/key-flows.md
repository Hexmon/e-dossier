# Key Flows

## 1) Signup / Login / Logout

### Signup (`POST /api/v1/auth/signup`)
1. Middleware allows public access for signup path (`src/middleware.ts`).
2. Route applies signup rate limit (`src/lib/ratelimit.ts`).
3. Body validated via `signupSchema` (`src/app/lib/validators.ts`).
4. Duplicate checks run (`preflightConflicts`) before insert.
5. User is created inactive with local credentials (`src/app/db/queries/auth.ts`).
6. Pending signup request is created (`src/app/db/queries/signupRequests.ts`).
7. Audit event logged through `req.audit.log`.
8. `201` envelope returned.

### Login (`POST /api/v1/auth/login`)
1. Public path; route applies login rate limit + lockout checks.
2. Validates required fields and `LoginBody` schema (`src/app/api/v1/auth/login/dto.ts`).
3. Resolves active appointment holder (`getActiveAppointmentWithHolder`).
4. Verifies password hash (`argon2`).
5. Issues JWT (`src/app/lib/jwt.ts`) and sets `access_token` cookie (`src/app/lib/cookies.ts`).
6. Logs success/failure/lockout audit events.
7. Returns profile + appointment context + expiration metadata.

### Logout (`POST /api/v1/auth/logout`)
1. Public path by middleware; route enforces same-origin constraints.
2. Clears auth cookie server-side.
3. Emits logout audit event.
4. Returns `204` with no-cache and `Clear-Site-Data` headers.

## 2) `/api/v1/me` Flow
1. Middleware token gate applies (protected path).
2. Route calls `requireAuth` (`src/app/lib/guard.ts` -> `src/app/lib/authz.ts`).
3. JWT is verified; principal is extracted.
4. User profile is loaded from `users` table.
5. Audit event logged (`API_REQUEST` / user target).
6. Response includes `user`, `roles`, and `apt` claims.

## 3) Representative Admin Endpoint

### `POST /api/v1/admin/appointments`
1. Middleware applies CSRF/rate/token gate (not public for POST).
2. Route calls `requireAuth` (currently no explicit admin-role check in handler).
3. Validates payload with `appointmentCreateSchema`.
4. Resolves position and validates scope/platoon constraints.
5. Checks overlapping slot occupancy.
6. Inserts appointment row.
7. Logs `APPOINTMENT_CREATED` audit event.
8. Returns `201` with created appointment payload.

## 4) Representative `oc/:ocId` Endpoint

### `GET /api/v1/oc/:ocId/academics`
1. Middleware token/CSRF/rate checks (GET skips CSRF validation).
2. Route parses and validates `ocId` param.
3. Calls `authorizeOcAccess` (`src/lib/authorization.ts`) for scope-aware authorization.
4. Confirms OC exists.
5. Loads academics via service layer (`src/app/services/oc-academics.ts`).
6. Emits OC-focused audit event.
7. Returns semester records array.

## 5) Audit Logs Page Data Flow
1. Page `src/app/dashboard/audit-logs/page.tsx` runs as server component.
2. It forwards search params and cookie header to `/api/v1/admin/audit-logs`.
3. API route validates filters (`src/app/lib/auditLogsQuery.ts`).
4. Route queries both legacy `audit_logs` and Hexmon `audit_events`.
5. Results are normalized, merged, sorted, paginated.
6. API returns combined list + counts.
7. Page renders filter form + tabular audit rows.
