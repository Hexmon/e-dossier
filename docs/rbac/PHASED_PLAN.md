# RBAC + Access-Control Phased Plan

## Implementation Status (2026-02-11)
- Phase 0: Completed (Excel parse + API/page inventory + action taxonomy + generated action map).
- Phase 1: Completed (ACX engine/principal/context/wrapper/obligations + feature flag + unit tests).
- Phase 2: Completed for read path (DB schema extension, migration, effective-permission query + cache, Excel import seed/CLI).
- Phase 3: In progress (pilot enforcement added for selected genmgmt/manage-marks APIs and page/sidebar gating).
- Phase 4: In progress (admin RBAC APIs + initial RBAC management page/hooks added).
- Phase 5: Pending (full API/page migration in domain batches).
- Phase 6: Pending (legacy authz cleanup + CI coverage guardrails).

Verification snapshot:
- `pnpm install`: pass
- `pnpm lint`: pass
- `pnpm typecheck`: pass
- `pnpm build`: pass
- `pnpm test`: fails in pre-existing OC API suites unrelated to RBAC admin routes (focused RBAC tests pass).

## Phase 0 Status (Completed)
Artifacts generated:
- `docs/rbac/permission-matrix.parsed.json`
- `docs/rbac/surface-inventory.apis.json`
- `docs/rbac/surface-inventory.pages.json`
- `docs/rbac/action-taxonomy.md`
- `src/app/lib/acx/action-map.ts`
- `scripts/rbac/phase0-generate.ts`

Observed baseline:
- Excel parsed rows: `893` data rows, roles detected: `HOAT, DS_CORD, PL_CDR, DY_CDR, CDR, CCO, ADMIN`.
- API method inventory entries: `318` across `138` route files.
- Dashboard pages: `51`.
- Field-level candidate API methods (`PATCH|PUT`): `61`.
- No existing `export const runtime = 'nodejs'` in current API handlers.

Current auth/scope model to carry forward:
- Identity from JWT (`src/app/lib/jwt.ts`) with `roles[]` and `apt` claim.
- Gate in route handlers via `requireAuth`/`requireAdmin` (`src/app/lib/authz.ts`).
- Scope checks for OC and related resources in `src/lib/authorization.ts` using appointment scope (`GLOBAL|WING|SQUADRON|PLATOON`) and OC platoon.
- RBAC schema present in `src/app/db/schema/auth/rbac.ts`; seed baseline in `src/app/db/seeds/seedRolesAndPermissions.ts`.

## Global Rollout Rules
- Keep feature flag OFF by default until pilot is ready.
- Every protected mutation must produce decision audit (allow/deny metadata).
- Every phase must pass: `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- Enforce Node runtime in protected handlers that use ACX wrappers:
  - `export const runtime = 'nodejs';`

## PHASE 1 — Foundation Glue (Feature Flagged)
### Goal
Introduce ACX engine/principal/wrapper modules without changing global behavior.

### File-by-file implementation plan
- `src/app/lib/acx/feature-flag.ts`
  - Add `isAuthzV2Enabled()` using `AUTHZ_V2_ENABLED` env flag.
- `src/app/lib/acx/engine.ts`
  - Engine singleton bootstrap.
  - Compile/load minimal policy once per process.
  - Add deterministic deny-default evaluator wrapper.
- `src/app/lib/acx/principal.ts`
  - Map `requireAuth` output + DB appointment context to ACX principal attrs:
    - `userId`, `roles`, `position`, `scopeType`, `scopeId`, `tenantId`.
- `src/app/lib/acx/context.ts`
  - Build decision context from Next request + route metadata + resource attrs.
- `src/app/lib/acx/obligations.ts`
  - Obligation applicator stubs for `maskFields`, `omitFields`, `deny`.
- `src/app/lib/acx/withAuthz.ts`
  - Route wrapper that:
    - resolves action via `action-map.ts`,
    - evaluates decision when flag enabled,
    - returns 401/403 consistently with existing HTTP envelope,
    - composes with `withAuditRoute` (no audit break).
- `src/app/lib/acx/action-map.ts`
  - Keep generated draft; add explicit override support table.
- `.env.example`, `.env.development.example`, `.env.production.example`, `.env.qa.example`
  - Add `AUTHZ_V2_ENABLED=false`.

### Tests
- `tests/unit/acx/principal.test.ts`
  - JWT claim to principal mapping (admin, super admin, scoped roles).
- `tests/unit/acx/withAuthz.test.ts`
  - Feature-flag OFF pass-through.
  - 401 for missing auth context.
  - 403 for deny decision.
  - audit payload shape for allow/deny decision metadata.

### Acceptance
- No route behavior change when `AUTHZ_V2_ENABLED=false`.
- Wrappers and engine compile, tests pass.

## PHASE 2 — DB-driven RBAC Read Path + Excel Import
### Goal
Use DB as source of truth for permissions and field rules; import Excel into DB idempotently.

### File-by-file implementation plan
- `src/app/db/schema/auth/rbac-extensions.ts` (new)
  - Add tables:
    - `permission_field_rules` (`permission_id`, `mode`, `fields`, `strategy`, timestamps)
    - optional `authz_policy_versions` for cache busting/versioning.
- `src/app/db/schema/auth/rbac.ts`
  - If needed: add uniques/indexes for `roles.key`, `permissions.key`.
- `drizzle/*` (new migration)
  - DDL for field-level rules and indexes.
- `src/app/db/queries/authz-permissions.ts` (new)
  - Compute effective permission set from:
    - appointment.position_id -> `position_permissions`,
    - optional role-based links,
    - ADMIN baseline grants,
    - SUPER_ADMIN shortcut.
  - Load field rules keyed by permission key.
- `src/app/lib/acx/cache.ts` (new)
  - In-memory TTL/LRU for effective permission bundles.
- `src/app/db/seeds/seedPermissionsFromExcel.ts` (new)
  - Read `docs/rbac/permission-matrix.parsed.json`.
  - Upsert permission keys from action taxonomy.
  - Upsert role/position permission mappings for Excel roles.
  - Apply ADMIN and SUPER_ADMIN non-negotiable overrides.
- `scripts/import-permissions-from-excel.ts` (new)
  - CLI wrapper around seed importer.
- `docs/rbac/IMPORT_GUIDE.md` (new)
  - Import command and idempotency expectations.

### Tests
- `tests/db/authz-permissions.test.ts`
  - Effective permission computation for 3 Excel roles + ADMIN + SUPER_ADMIN.
- `tests/db/authz-admin-baseline.test.ts`
  - ADMIN baseline includes `/dashboard/genmgmt/**` and `/dashboard/manage-marks` actions.
- `tests/db/authz-field-rules.test.ts`
  - Field-rule fetch and merge precedence.

### Acceptance
- Permission updates driven by DB and seed/import path.
- No redeploy needed for permission changes.

## PHASE 3 — Pilot Enforcement (GenMgmt + Manage Marks)
### Goal
Safely enforce new authz on critical admin surfaces first.

### File-by-file implementation plan
- API pilot routes under `src/app/api/v1/admin/**` and manage-marks backing routes
  - Add `export const runtime = 'nodejs';` where ACX wrapper is used.
  - Wrap handlers with `withAuthz` + `withAuditRoute` composition.
  - Build resource attrs consistently (scope, target ids, module keys).
- `src/app/dashboard/genmgmt/**`
  - Add server-side page guard using page action resolution.
  - Add unauthorized redirect/403 handling.
- `src/app/dashboard/manage-marks/page.tsx`
  - Add page action guard.
- `src/components/layout/app-sidebar.tsx` (or existing nav source)
  - Hide unauthorized entries based on page-action checks.
- `src/app/lib/acx/context.ts`
  - Add helper builders for pilot resources.

### Tests
- `tests/api/admin/*` pilot allow/deny matrix.
- `tests/api/manage-marks*.test.ts` allow/deny matrix.
- `tests/ui/authz-page-guard.test.tsx` for redirect/403 behavior.

### Acceptance
- Unauthorized users get `403` on protected APIs/pages.
- Audit logs include decision metadata (`action`, `resource`, `outcome`, `principal`, `traceId`).

## PHASE 4 — Admin Permission Management UI/API
### Goal
Make RBAC and field-level rules fully modifiable by Admin from UI.

### File-by-file implementation plan
- `src/app/api/v1/admin/rbac/roles/route.ts`
- `src/app/api/v1/admin/rbac/roles/[roleId]/route.ts`
- `src/app/api/v1/admin/rbac/permissions/route.ts`
- `src/app/api/v1/admin/rbac/permissions/[permissionId]/route.ts`
- `src/app/api/v1/admin/rbac/mappings/route.ts`
- `src/app/api/v1/admin/rbac/field-rules/route.ts`
- `src/app/api/v1/admin/rbac/field-rules/[ruleId]/route.ts`
  - CRUD with zod validation, transactions, withAuditRoute, withAuthz.
- `src/app/db/queries/rbac-admin.ts` (new)
  - transactional mutation helpers + cache invalidation hooks.
- `src/hooks/useRbacRoles.ts`
- `src/hooks/useRbacPermissions.ts`
- `src/hooks/useRbacMappings.ts`
- `src/hooks/useRbacFieldRules.ts`
- `src/components/genmgmt/rbac/**` (new)
  - tables/forms for permissions and field rules.
- `src/app/dashboard/genmgmt/rbac/page.tsx` and subpages
  - admin-only management console.

### Tests
- API CRUD tests for roles/permissions/mappings/field rules.
- Cache invalidation test: changes reflected on next decision.
- Audit assertions for permission mutations.

### Acceptance
- Admin can edit RBAC and field rules without redeploy.
- Updates are auditable and transactional.

## PHASE 5 — Full Enforcement (All APIs + Dashboard Pages)
### Goal
Extend enforcement incrementally by domain until complete.

### Batch order
1. `/api/v1/me`, low-risk auth/user profile routes.
2. `/api/v1/admin/**` full domain.
3. `/api/v1/oc/**` core + submodules.
4. reports, uploads/storage, and remaining modules.
5. all `src/app/dashboard/**` pages.

### File-by-file implementation plan
- All `src/app/api/v1/**/route.ts`
  - add runtime export where needed,
  - wrap with `withAuthz`,
  - map actions via `action-map.ts`,
  - enforce obligations on PATCH/PUT paths.
- All `src/app/dashboard/**/page.tsx`
  - page-level action guard.
- `src/app/lib/acx/obligations.ts`
  - implement final field filtering/denial behavior for update payloads.
- `src/app/lib/acx/action-map.ts`
  - update for any new routes/pages introduced during migration.

### Tests
- Domain-wise API matrices (allow/deny/scope/field rules).
- PATCH field-level tests (deny/omit behavior).
- Regression tests for existing authn and CSRF/rate-limit behavior.

### Acceptance
- Full API + UI protection aligned to DB-configured permissions.
- Field-level restrictions enforced on partial updates.

## PHASE 6 — Hardening, Cleanup, and CI Guardrails
### Goal
Remove legacy duplication, complete docs, and prevent regressions.

### File-by-file implementation plan
- `src/app/lib/authz.ts`, `src/lib/authorization.ts`
  - remove/reduce legacy checks replaced by ACX decisions while preserving scope helpers where reused.
- `src/lib/audit.ts`, `src/lib/audit-log.ts`
  - ensure unified decision audit schema.
- `scripts/validate-action-map.ts` (new)
  - fail if any `route.ts`/`page.tsx` lacks action-map coverage.
- `.github/workflows/*` (if present)
  - add CI step to run action-map validation + standard verification.
- `docs/rbac/*`
  - add “How to add a new route/page/action” and operational runbook.

### Tests
- CI guard tests for route/page inventory parity.
- Full suite pass with authz flag ON and OFF.

### Acceptance
- No dead authz branches.
- Decision audits on every protected mutation.
- CI blocks unmapped routes/pages.

## Verification Gate (Every Phase)
Run in order:
1. `pnpm install`
2. `pnpm lint`
3. `pnpm typecheck`
4. `pnpm test`
5. `pnpm build`

Optional local DB checks when schema/seed changes:
1. `pnpm db:migrate`
2. `pnpm seed:rbac`
3. `pnpm seed:admins`
4. `pnpm tsx scripts/import-permissions-from-excel.ts`

## Risks and Controls
- Risk: action naming collisions from static-segment derivation.
  - Control: explicit override table in `action-map.ts` + CI coverage checker.
- Risk: stale cached permissions after admin updates.
  - Control: cache version key + explicit invalidation on RBAC mutations.
- Risk: inconsistent legacy guard behavior.
  - Control: staged pilot + dual-run logging before full cutover.
- Risk: field-level over-blocking on existing PATCH flows.
  - Control: per-endpoint allowlist tests before enforcement expansion.
