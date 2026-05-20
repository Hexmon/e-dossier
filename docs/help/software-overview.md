# Software Overview

This guide explains how the E-DOSSIER software is organized and how the main operational areas connect.

## 1. Dashboard Structure {#dashboard-structure}

Route:

- `/dashboard`

Who uses it:

- Admin, Super Admin, platoon commanders, instructors, and other authorized users.

What it manages:

- Entry points to General Management, Dossier, Bulk Upload, Reports, Settings, and Help.

Main workflow:

1. Sign in with an active appointment or role.
2. Use the sidebar to open the module allowed for the current identity.
3. Use cards, tabs, and OC selectors to move into a specific workflow.

Important business rules:

- Sidebar visibility is role and module-access driven.
- Admin users may have Dossier, Bulk Upload, or Reports hidden by module access settings.
- Super Admin keeps full software access.
- Help is always visible after login, but initial setup only allows the setup guide.

Validation checklist:

- Confirm the sidebar shows only allowed sections.
- Confirm switching identity refreshes visible modules.
- Confirm protected URLs redirect when the user lacks module access.

Related pages:

- `/dashboard/help/rbac-permissions`
- `/dashboard/help/settings-controls`

## 2. Role-Based Navigation {#role-based-navigation}

Route:

- `/api/v1/me/navigation`

Who uses it:

- The dashboard sidebar and logged-in users.

What it manages:

- Navigation sections derived from role group, appointment position, and module access settings.

Main workflow:

1. Login returns a session with role and appointment context.
2. The app resolves the role group.
3. Module access settings decide whether Admin can access Dossier, Bulk Upload, and Reports.
4. The sidebar renders only allowed sections.

Important business rules:

- Super Admin sees all primary sections.
- Admin always sees Admin Management and Settings.
- Non-admin users rely on their appointment/role and scope.
- Module access is enforced on both page access and protected APIs.

Validation checklist:

- Test Admin with each module access switch on and off.
- Test Super Admin still sees all modules.
- Test non-admin users cannot reach Admin Management by edited URL.

Related pages:

- `/dashboard/genmgmt/settings/module-access`
- `/dashboard/help/rbac-permissions`

## 3. Initial Setup Gate {#initial-setup-gate}

Route:

- `/setup`

Who uses it:

- Super Admin or Admin during first installation.

What it manages:

- First Super Admin bootstrap and required setup checklist.

Main workflow:

1. Create the first Super Admin.
2. Configure platoons, users, appointments, hierarchy, courses, subjects, offerings, and OCs.
3. Return to `/setup` after each setup task.
4. Complete the checklist before normal dashboard work begins.

Important business rules:

- Only Admin and Super Admin can sign in while setup is incomplete.
- Most dashboard pages and APIs are blocked until setup is complete.
- Setup task pages are allowed only for the configured setup paths.
- `/dashboard/help/setup-guide` remains available during setup.

Validation checklist:

- Edited dashboard URLs redirect back to `/setup` while setup is incomplete.
- Setup task pages keep `returnTo=/setup`.
- Returning from a setup task refreshes setup status.

Related pages:

- `/dashboard/help/setup-guide`
- `/dashboard/genmgmt/hierarchy`

## 4. OC Lifecycle Overview {#oc-lifecycle-overview}

Route:

- `/dashboard/genmgmt/ocmgmt`

Who uses it:

- Admin users managing Officer Cadets and downstream dossier data.

What it manages:

- Canonical OC identity, placement, lifecycle enrollment, and compatibility snapshot data.

Main workflow:

1. Create or bulk upload an OC.
2. Assign course, branch, platoon, and arrival details.
3. The lifecycle helper creates or repairs active enrollment and pre-commission snapshot records.
4. Dossier pages read the OC and enrollment-linked domain records.

Important business rules:

- `oc_cadets` is the canonical identity/current placement source.
- `oc_course_enrollments` is the course lifecycle/current semester source.
- `oc_pre_commission` is a compatibility snapshot, not the source of truth.
- Conflicts must be audited before sync.

Validation checklist:

- Every active OC has one active enrollment.
- Every active OC has a pre-commission snapshot.
- OC detail pages show the OC name from the canonical OC row.
- Bulk upload success refreshes the latest OC list.

Related pages:

- `/dashboard/help/general-management`
- `/dashboard/help/dossier-management`
- `/dashboard/help/bulk-upload`

## 5. Module Access Overview {#module-access-overview}

Route:

- `/dashboard/genmgmt/settings/module-access`

Who uses it:

- Super Admin controlling Admin access to larger software areas.

What it manages:

- Admin access to Dossier, Bulk Upload, and Reports.

Main workflow:

1. Open Module Access settings.
2. Toggle allowed modules for Admin users.
3. Save settings.
4. Re-login or refresh navigation to confirm visibility.

Important business rules:

- Module access does not reduce Super Admin access.
- Bulk workflow assignments can allow specific academic/PT bulk workflows even when broad Admin bulk access is off.
- Server-side page/API checks enforce the same access decisions as the sidebar.

Validation checklist:

- Toggle one module off and verify sidebar removal.
- Try edited URLs and confirm redirect or denial.
- Toggle back on and verify the module returns.

Related pages:

- `/dashboard/help/settings-controls`
- `/dashboard/help/rbac-permissions`

## 6. Using This Manual {#using-this-manual}

Route:

- `/dashboard/help`

Who uses it:

- Operators, admins, QA, and developers validating business workflows.

What it manages:

- Searchable in-app operational guidance.

Main workflow:

1. Search by module, route, common term, or workflow name.
2. Open the guide card.
3. Use section anchors for the exact module.
4. Validate the page against the checklist before handoff.

Important business rules:

- Help documentation must describe implemented behavior only.
- New feature work should update the matching help guide when user-facing workflow changes.
- Setup access remains limited to the setup guide.

Validation checklist:

- Search terms such as `OC`, `bulk upload`, `RBAC`, `reports`, `PT`, `dossier`, `setup`, and `hierarchy` return useful results.
- Every active help card opens a real page.
- Every indexed section anchor exists in the markdown file.

Related pages:

- `/dashboard/help/general-management`
- `/dashboard/help/module-management`
- `/dashboard/help/dossier-management`

## 7. Detailed Operating Model {#detailed-operating-model}

This section is the operator and QA reference for how the software should be understood at a system level.

### 7.1 Primary user journeys

Fresh deployment journey:

1. Operator configures environment values and starts data services.
2. Operator runs migrations.
3. First Super Admin is created from `/setup`.
4. Super Admin completes baseline setup.
5. Normal users sign in only after setup completion.
6. Admin validates General Management, Dossier, Bulk Upload, Reports, Settings, and Help.

Daily operations journey:

1. User signs in.
2. Session authority is resolved from role and active appointment.
3. Sidebar sections are derived from resolved authority and module access.
4. User opens an allowed module.
5. User creates, edits, imports, reviews, verifies, or downloads records.
6. Saved data is reloaded from the API before the page is considered current.

OC lifecycle journey:

1. Course, platoon, subject, offering, and appointment setup is completed.
2. OC is created manually or through bulk upload.
3. Canonical OC row stores identity/current placement.
4. Active enrollment stores lifecycle/current semester context.
5. Pre-commission snapshot stores compatibility fields.
6. Dossier child records attach to OC and, where applicable, enrollment.
7. Reports read from canonical and domain tables.

### 7.2 Source-of-truth rules

| Area | Canonical source | Compatibility/read model | Notes |
|---|---|---|---|
| OC identity and current placement | `oc_cadets` | Dossier snapshot fields | Name, TES number, course, branch, platoon, arrival/current lifecycle fields should resolve from canonical OC data. |
| OC course lifecycle | `oc_course_enrollments` | OC list/detail derived fields | There should be one active enrollment for every active OC. |
| Pre-commission compatibility | `oc_cadets` plus enrollment | `oc_pre_commission` | Snapshot should mirror compatible fields and preserve conflicts in audit before sync. |
| Imported personal profile | `oc_personal` | Personal particulars UI | Free-form family/NOK fields stay as imported profile data. |
| Detailed family records | `oc_family_members` | Background details UI | Manual structured family rows do not replace imported free-form data. |
| Training and dossier records | Domain tables | Reports and graph summaries | Domain tables remain source for detailed records. |
| Access decisions | Role, appointment, module access, action-map | Sidebar visibility | UI visibility is not the only control; server checks also apply. |
| Reports | Report services and stored source data | PDF downloads/version records | Version code verifies a generated artifact; source data remains in domain tables. |

### 7.3 Roles and authority behavior

Super Admin:

- Can access all primary sections.
- Can complete setup, manage RBAC, module access, and global settings.
- Should be used for configuration and exceptional administration, not routine data entry.

Admin:

- Can access Admin Management and Settings by default.
- Can access Dossier, Bulk Upload, and Reports only when module access permits it or a workflow assignment grants a specific bulk workflow.
- Can complete initial setup if authenticated during setup mode.

Other users:

- Access depends on appointment/role group and scope.
- Platoon-scoped access must stay limited to the assigned platoon where implemented.
- Cannot bypass setup lock while setup is incomplete.

### 7.4 Navigation and page protection detail

Navigation is expected to behave in layers:

1. Sidebar hides sections the user cannot access.
2. Server page auth blocks edited URL navigation.
3. API auth blocks direct API calls where a module is disabled.
4. Scope checks prevent access to unrelated OCs.
5. Setup gate blocks normal work until setup is complete.

QA should verify all layers because a hidden sidebar item alone is not enough.

### 7.5 Data refresh expectations

For every create, update, delete, import, or workflow action:

- The user should see a success or error state.
- The page should refresh the affected list/detail data from the API.
- A browser page refresh should still show the same saved records.
- Newly uploaded OCs or marks should not disappear after navigation.
- Pagination, search, and filters should not silently reset unless the page deliberately resets them.

### 7.6 Standard QA evidence per module

For any feature handoff, capture:

- Route tested.
- User role/appointment used.
- Setup complete or incomplete state.
- Input record identifiers, such as OC number, course code, report version code, or template name.
- API responses that changed data.
- Page state after refresh.
- Console/network errors, if any.
- Whether the corresponding help guide was updated.

### 7.7 Common system-level failure patterns

| Symptom | Likely cause | What to check |
|---|---|---|
| User can see module but API returns 403 | Module access or permission mismatch | Check module access, action-map, role/position mappings, and session authority. |
| Page works before refresh but data disappears | UI state not refetched or write failed silently | Check API response, DB row, query invalidation, and list/detail reload. |
| OC detail shows wrong name/course/platoon | Test data or stale canonical row | Check `oc_cadets`, active enrollment, and soft-deleted smoke/test rows. |
| Setup page still shows pending after completing task | Setup status was not refetched | Return flow should call setup status API again. |
| Report data missing | Source domain data incomplete | Check OC enrollment, marks/training records, and report filters. |
| Bulk upload previews cleanly but write fails | Workflow, auth, or DB constraint issue | Check module access, workflow setting, and row-level validation. |
