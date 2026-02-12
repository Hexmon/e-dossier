# RBAC Import Guide

## Purpose
Import Excel-derived RBAC permissions into PostgreSQL in an idempotent way.

The importer uses:
- `docs/rbac/permission-matrix.parsed.json` (generated in Phase 0),
- `src/app/lib/acx/action-map.ts` action keys,
- ADMIN/SUPER_ADMIN override rules.

## Commands
- Generate Phase 0 artifacts (if not already generated):
  - `pnpm tsx scripts/rbac/phase0-generate.ts`
- Import permissions from parsed matrix:
  - `pnpm import:permissions`
- Alternative direct seed command:
  - `pnpm seed:permissions`
- Optional explicit path:
  - `pnpm tsx scripts/import-permissions-from-excel.ts docs/rbac/permission-matrix.parsed.json`

## What It Does
1. Upserts permission keys for API actions and page actions.
2. Derives role permission sets from Excel module rows using mapping hints.
3. Upserts role records and matching position records.
4. Synchronizes:
  - `role_permissions`
  - `position_permissions`
5. Enforces overrides:
  - `SUPER_ADMIN` gets wildcard-style full action coverage.
  - `ADMIN` gets baseline access for:
    - `/dashboard/genmgmt/**`
    - `/dashboard/manage-marks`
    - their backing APIs
    - RBAC management actions.
6. Bumps `authz_policy_state.version` for cache invalidation.

## Notes
- Import is idempotent for managed roles and mappings.
- Field-level rules are not auto-imported from Excel labels by default, because workbook field labels are human-readable and often do not map 1:1 to API payload keys.
- Field-level rules should be configured via RBAC admin APIs/UI.

## Expected Output
JSON summary similar to:
```json
{
  "parsedPath": "/.../docs/rbac/permission-matrix.parsed.json",
  "rolesProcessed": 9,
  "permissionsProcessed": 300
}
```

## Common Failures
- `Parsed permission matrix not found`:
  - Run `pnpm tsx scripts/rbac/phase0-generate.ts`.
- `DATABASE_URL` not set:
  - Ensure environment variables are loaded (`.env`).
- Migration errors for RBAC extension tables:
  - Run `pnpm db:migrate` before import.
