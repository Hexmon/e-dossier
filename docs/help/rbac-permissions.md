# RBAC And Permissions

This guide explains how access control is organized in E-DOSSIER.

## 1. Action Map And Permission Matrix {#action-map-permission-matrix}

Route:

- `/dashboard/genmgmt/rbac`

Who uses it:

- Super Admin and developers maintaining permission coverage.

What it manages:

- API/page action definitions, permission records, role mappings, and position mappings.

Main workflow:

1. Maintain action-map coverage for pages and APIs.
2. Sync permission records.
3. Map permissions to roles or positions.
4. Validate with action-map and API coverage commands.

Important business rules:

- Every API route and dashboard page should have an action-map entry.
- New API routes require tests and coverage manifest updates.
- Permission mapping should match operational responsibility, not only UI visibility.

Validation checklist:

- `pnpm run validate:action-map` passes.
- RBAC page shows expected permissions.
- Route access matches role/position mapping.

Related pages:

- `/dashboard/help/setup-guide#rbac-seeding-flow`

## 2. Roles Positions And Appointments {#roles-positions-appointments}

Route:

- `/dashboard/genmgmt/appointmentmgmt`
- `/dashboard/genmgmt/rbac`

Who uses it:

- Super Admin and Admin managing authority.

What it manages:

- Roles, positions, active appointment holder, and appointment scope.

Main workflow:

1. Create/seed roles and positions.
2. Assign users to appointments.
3. Set scope where applicable.
4. Verify login authority and visible modules.

Important business rules:

- Login authority uses active role/appointment context.
- Position mappings can grant permissions.
- Appointment changes should preserve served history.

Validation checklist:

- User logs in with expected position.
- Active appointment appears in session/navigation.
- Old appointment holder no longer has active authority after handover.

Related pages:

- `/dashboard/help/general-management#appointment-management`

## 3. Appointment Scope {#appointment-scope}

Route:

- `/dashboard/genmgmt/appointmentmgmt`

Who uses it:

- Admin assigning platoon or organization-scoped authority.

What it manages:

- Scope type and scope ID for an appointment.

Main workflow:

1. Select position.
2. Select scope type.
3. Select platoon or relevant scope ID when required.
4. Save and verify scoped access.

Important business rules:

- Platoon-scoped users should only work with OCs in that platoon.
- Scope is enforced by server checks, not just UI filtering.
- Missing scope can block platoon commander workflows.

Validation checklist:

- In-scope OC page opens.
- Out-of-scope OC page is denied or hidden.
- Commander history reflects scoped appointment.

Related pages:

- `/dashboard/help/dossier-management#dossier-entry-oc-context`

## 4. Field Rules {#field-rules}

Route:

- `/dashboard/genmgmt/rbac`

Who uses it:

- Super Admin controlling field-level behavior.

What it manages:

- Field permission rules and mappings used for sensitive UI/API fields.

Main workflow:

1. Review field rule list.
2. Add or edit rule.
3. Map rule to permission/role/position as required.
4. Verify affected field behavior.

Important business rules:

- Field rules should be narrow and documented.
- Field restrictions should not silently drop required business data.
- Tests should cover sensitive field behavior when changed.

Validation checklist:

- Rule appears in RBAC management.
- Authorized user can see/edit field.
- Unauthorized user is blocked or read-only as intended.

Related pages:

- `/dashboard/help/general-management#user-approval-management`

## 5. Module Access {#module-access}

Route:

- `/dashboard/genmgmt/settings/module-access`

Who uses it:

- Super Admin.

What it manages:

- Admin-level access to Dossier, Bulk Upload, and Reports.

Main workflow:

1. Toggle module access.
2. Save.
3. Check sidebar.
4. Check edited URLs and APIs.

Important business rules:

- Module access is separate from fine-grained RBAC permissions.
- Super Admin remains unrestricted.
- Admin denied modules should be blocked server-side.

Validation checklist:

- Disabled section disappears from sidebar.
- Direct page URL redirects.
- Direct API call returns module access denial.

Related pages:

- `/dashboard/help/settings-controls#module-access-settings`

## 6. Setup Restrictions {#setup-restrictions}

Route:

- `/setup`

Who uses it:

- Admin and Super Admin completing first-run setup.

What it manages:

- Temporary setup-only access mode.

Main workflow:

1. Bootstrap Super Admin.
2. Complete setup checklist.
3. Use only setup-allowed dashboard pages.
4. Finish setup before normal users sign in.

Important business rules:

- Non-admin login is blocked during setup.
- Most pages/APIs are locked while setup is incomplete.
- Only `/dashboard/help/setup-guide` is allowed from Help during setup.

Validation checklist:

- Edited URL access redirects to `/setup`.
- Setup allowed pages work with `returnTo=/setup`.
- Help pages other than setup guide are blocked until setup complete.

Related pages:

- `/dashboard/help/setup-guide`

## 7. Verification Commands {#verification-commands}

Route:

- Project root command line.

Who uses it:

- Developers and QA validating access changes.

What it manages:

- Static and test verification of permissions, action-map, and page/API coverage.

Main workflow:

1. Run focused tests for changed access behavior.
2. Run action-map validation.
3. Run API coverage validation when API routes change.
4. Run full validation before handoff.

Important business rules:

- Do not add uncovered API route handlers.
- Page additions require action-map entries.
- Access changes need runtime/browser checks where relevant.

Validation checklist:

- `pnpm run validate:action-map`
- `pnpm run validate:api-tests` when API routes changed
- `pnpm run test`
- `pnpm run lint`
- `pnpm run typecheck`

Related pages:

- `/dashboard/help/deployment-environment#validation-and-release-checks`

## 8. Detailed Access Control Reference {#detailed-access-control-reference}

RBAC must be checked at multiple layers. A page being hidden is useful, but it is not sufficient proof of access control.

### 8.1 Access-control layers

| Layer | Purpose | Example |
|---|---|---|
| Login/session | Establishes authenticated user and active authority | JWT payload with role and appointment context. |
| Role group | Groups user into Super Admin, Admin, or other user | Sidebar defaults and setup permissions. |
| Appointment scope | Limits operational reach | Platoon-scoped commander can work only in assigned platoon. |
| Module access | Enables/disables large sections for Admin | Dossier, Bulk Upload, Reports. |
| Action-map permissions | Maps pages/APIs to permission actions | `/dashboard/genmgmt/rbac` page action. |
| Field rules | Controls sensitive field behavior | Read/edit restrictions for specific fields. |
| Server page auth | Blocks edited dashboard URLs | Redirect to `/dashboard` or `/setup`. |
| API auth | Blocks direct API requests | 403 or setup incomplete response. |

### 8.2 Permission change process

Before changing permissions:

- Identify affected pages and APIs.
- Identify roles, positions, and appointment scopes.
- Check current action-map entry.
- Check whether module access also applies.
- Decide focused tests and runtime smoke flow.

After changing permissions:

- Run action-map validation.
- Run API coverage validation if any API route changed.
- Test allowed user.
- Test denied user.
- Test edited URL.
- Test direct API path where relevant.

### 8.3 Role and position mapping detail

Roles are broad identity groupings. Positions represent operational appointments.

Use roles for:

- Super Admin baseline.
- Admin baseline.
- Broad user grouping.

Use positions for:

- COMDT, DCCI, HOAT, CDR, CCO, DS Coord, instructor, platoon commander, and other operational posts.
- Scope-specific authority.
- Appointment history and handover.

Do not rely only on display names. Permission decisions should use stable role/position keys or mapped action permissions.

### 8.4 Setup-gate access matrix

| State | Super Admin | Admin | Other user |
|---|---|---|---|
| Bootstrap required | Create first Super Admin | Not applicable unless existing | Blocked |
| Setup incomplete | Allowed setup pages/APIs | Allowed setup pages/APIs | Login/dashboard blocked |
| Setup complete | Full according to permissions | According to module access/RBAC | According to role/scope |

Help behavior during setup:

- `/dashboard/help/setup-guide` is allowed.
- Other help pages are blocked like normal dashboard pages.
- This prevents bypassing setup through Help sidebar/navigation.

### 8.5 API coverage expectations

Every new or changed route under `src/app/api/**/route.ts` requires:

- Matching API tests in `tests/api/**`.
- Updated `tests/api/coverage.manifest.ts`.
- `pnpm run validate:api-tests`.
- Focused tests for success and denial paths where access changes.

Page-only documentation additions do not require API coverage changes, but they do require action-map page entries.

### 8.6 RBAC troubleshooting

| Symptom | Likely cause | Check |
|---|---|---|
| User sees page but action fails | API permission or module access denies write | API response and action-map mapping. |
| User cannot see expected sidebar item | Role group, module access, or navigation config | `/api/v1/me/navigation` response. |
| Edited URL works during setup | Setup dashboard allowlist too broad | `setup-gate` dashboard rules. |
| Super Admin blocked | Role group derivation or session authority issue | Login payload, role mapping, active appointment. |
| Platoon commander sees wrong OC | Scope check issue | Appointment scope and OC platoon ID. |
| Permission exists but not effective | Missing role/position mapping | RBAC mappings page and seed output. |

### 8.7 Access-control QA evidence

For each access-related change, capture:

- User role.
- Appointment position.
- Scope type and ID.
- Module access setting state.
- Page route tested.
- API path tested.
- Expected result.
- Actual result.
- Redirect or error code.
