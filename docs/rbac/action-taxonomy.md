# Action Taxonomy (Phase 0 Draft)

## Purpose
Define a single, deterministic action naming scheme used by:
- DB permissions (`permissions.key`),
- API authorization checks,
- page/module access checks,
- audit decision logging.

The generated inventory-backed draft map is in `src/app/lib/acx/action-map.ts`.

## Naming Rules

### API actions
Format:
- `<resourceType>:<verb>`

Where:
- `resourceType` = static API path segments after `/api/v1`, joined with `:`.
- dynamic path params (`:id`, `:ocId`, etc.) are omitted from `resourceType`.
- `verb` mapping by HTTP method:
  - `GET|HEAD|OPTIONS -> read`
  - `POST -> create`
  - `PUT|PATCH -> update`
  - `DELETE -> delete`

Examples:
- `GET /api/v1/admin/appointments` -> `admin:appointments:read`
- `POST /api/v1/admin/appointments` -> `admin:appointments:create`
- `PATCH /api/v1/oc/:ocId/academics/:semester` -> `oc:academics:update`
- `DELETE /api/v1/oc/:ocId/clubs/:id` -> `oc:clubs:delete`

### Page actions
Format:
- `page:<dashboardRouteSegments>:view`

Where:
- dashboard route segments are static segments from page route, joined with `:`.
- dynamic route params are omitted.

Examples:
- `/dashboard/genmgmt/usersmgmt` -> `page:dashboard:genmgmt:usersmgmt:view`
- `/dashboard/manage-marks` -> `page:dashboard:manage-marks:view`
- `/dashboard/:id/milmgmt/academics` -> `page:dashboard:milmgmt:academics:view`

## Resource Type Rules
- API `resourceType` is route-domain oriented (e.g. `admin:appointments`, `oc:academics:subjects`).
- Page `resourceType` is namespaced with `page:`.
- Field-level rules are attached to the same action key (`<resourceType>:update` for PATCH/PUT).

## Determinism Rules
- Deny by default.
- Deny overrides allow.
- SUPER_ADMIN shortcut allow (still auditable).
- ADMIN baseline allow is constrained to:
  - pages under `/dashboard/genmgmt/**`,
  - page `/dashboard/manage-marks`,
  - backing APIs for those surfaces,
  - RBAC management APIs/pages.

## Artifacts Produced in Phase 0
- API + page inventory driven action map:
  - `src/app/lib/acx/action-map.ts`
- API surface inventory:
  - `docs/rbac/surface-inventory.apis.json`
- Page surface inventory:
  - `docs/rbac/surface-inventory.pages.json`

## Future Tightening (Phase 2+)
- Add explicit override table for exceptional routes where static-segment mapping is too coarse.
- Add per-action metadata:
  - `scopeKind` (`GLOBAL|WING|SQUADRON|PLATOON|OC`),
  - `resourceBuilder` key,
  - `fieldRuleSet` key.
- Add CI guard to fail if any new `route.ts`/`page.tsx` is missing a mapped action.
