# Settings Controls

This guide covers settings and controls that affect runtime behavior.

## 1. Device Site Settings {#device-site-settings}

Route:

- `/dashboard/settings/device`

Who uses it:

- Admin and Super Admin.

What it manages:

- Device/site branding, theme-related settings, logo/background references, and public display configuration.

Main workflow:

1. Open Device Site Settings.
2. Update allowed site fields.
3. Upload or select assets where supported.
4. Save and verify public/dashboard display.

Important business rules:

- Storage-backed image changes depend on MinIO/S3 configuration.
- Public site settings should have safe fallbacks if no data exists.
- Theme token rules should be preserved.

Validation checklist:

- Settings load without 500 errors.
- Asset presign/upload works when storage env is valid.
- Public page reflects saved content.

Related pages:

- `/dashboard/help/deployment-environment#minio-and-storage`

## 2. Module Access Settings {#module-access-settings}

Route:

- `/dashboard/genmgmt/settings/module-access`

Who uses it:

- Super Admin.

What it manages:

- Admin visibility/access for Dossier, Bulk Upload, and Reports.

Main workflow:

1. Open Module Access.
2. Toggle Admin access.
3. Save settings.
4. Verify sidebar and edited URL behavior.

Important business rules:

- Super Admin access is not reduced by these toggles.
- Server-side checks enforce the same access as sidebar visibility.
- Workflow assignments may allow specific bulk workflows.

Validation checklist:

- Admin sidebar updates after setting change.
- Disabled module URL redirects or denies.
- API requests for disabled modules return access denial.

Related pages:

- `/dashboard/help/software-overview#module-access-overview`
- `/dashboard/help/rbac-permissions`

## 3. Marks Review Workflow {#marks-review-workflow}

Route:

- `/dashboard/genmgmt/settings/marks-review-workflow`

Who uses it:

- Super Admin and workflow owners.

What it manages:

- Review settings and assignments for academic bulk and PT bulk uploads.

Main workflow:

1. Choose workflow module.
2. Enable or disable workflow.
3. Configure reviewer assignments.
4. Verify bulk upload behavior.

Important business rules:

- Enabled workflow can block direct write and require review.
- Reviewer assignments affect pending tickets and notifications.
- Settings affect Academic Bulk and PT Bulk independently.

Validation checklist:

- Setting persists.
- Bulk upload creates expected workflow ticket.
- Assigned reviewer sees pending notification.

Related pages:

- `/dashboard/help/bulk-upload#workflow-approval`

## 4. Dossier Lock Settings {#dossier-lock-settings}

Route:

- `/dashboard/genmgmt/settings/dossier-lock`

Who uses it:

- Admin or Super Admin managing historical semester edits.

What it manages:

- Lock settings for dossier/semester editing behavior.

Main workflow:

1. Open Dossier Lock settings.
2. Review current lock behavior.
3. Update allowed edit policy.
4. Verify affected dossier pages.

Important business rules:

- Historical semester locking should prevent unintended edits.
- Current semester workflows should remain usable.
- Lock notices should be visible on affected pages.

Validation checklist:

- Locked pages show a clear notice.
- Save actions are blocked or allowed according to setting.
- Current semester still works.

Related pages:

- `/dashboard/[ocId]/milmgmt/med-record`
- `/dashboard/help/dossier-management`

## 5. Ticker And Notifications {#ticker-notifications}

Route:

- `/dashboard/settings/ticker`

Who uses it:

- Admin and users monitoring workflow notifications.

What it manages:

- Interview pending ticker, workflow notifications, and visible notification behavior.

Main workflow:

1. Open ticker settings.
2. Review current logs/settings.
3. Update display behavior.
4. Confirm dashboard notification behavior.

Important business rules:

- Pending workflow tickets can drive visible notifications.
- Ticker settings should not expose data to unauthorized users.
- Notification state should match workflow assignments.

Validation checklist:

- Settings load and save.
- Pending items appear only for expected users.
- No stale notification remains after action.

Related pages:

- `/dashboard/help/module-management#workflow-settings`

## 6. Public Site Content Settings {#public-site-content-settings}

Route:

- `/dashboard/genmgmt/settings/site`

Who uses it:

- Admin and Super Admin managing public homepage content.

What it manages:

- Site settings, awards, commanders, events/news, history, footer, logo, and hero background.

Main workflow:

1. Select public content area.
2. Create, edit, reorder, or remove content.
3. Upload assets if needed.
4. Verify public homepage sections.

Important business rules:

- Hard delete actions should be used carefully.
- Reorder changes affect public display order.
- Asset upload depends on storage configuration.

Validation checklist:

- Public sections render saved content.
- Reordering persists after refresh.
- Upload errors are clear when storage is unavailable.

Related pages:

- `/dashboard/help/deployment-environment#minio-and-storage`

## 7. Detailed Settings Reference {#detailed-settings-reference}

Settings pages can affect multiple modules. Treat settings changes as configuration changes requiring verification.

### 7.1 Settings impact map

| Setting | Affects | Risk if wrong |
|---|---|---|
| Device/site settings | Public pages, dashboard branding, assets | Broken images or incorrect institution display. |
| Module access | Sidebar, page access, protected APIs | Admin can access too much or too little. |
| Marks review workflow | Academic/PT bulk upload | Data may bypass review or remain pending unexpectedly. |
| Dossier lock | Historical dossier edits | Locked data may be edited or valid edits may be blocked. |
| Ticker/notifications | Pending work visibility | Users may miss pending reviews/interviews. |
| Public site content | Public homepage content | Incorrect public information. |

### 7.2 Safe settings change process

Before changing:

- Record current setting value.
- Identify affected modules.
- Confirm user role is authorized.
- Decide rollback value.

During change:

- Save one logical change at a time.
- Confirm API success.
- Refresh the page.
- Verify persisted value.

After change:

- Test at least one affected user journey.
- Test a user who should not have access.
- Capture screenshots or notes for QA evidence.

### 7.3 Module access verification detail

For each toggle:

1. Set Admin access off.
2. Login or switch to Admin.
3. Confirm sidebar section is hidden.
4. Try edited page URL.
5. Try related API through the UI flow.
6. Set Admin access on.
7. Confirm access returns.

Expected outcomes:

- Dossier off blocks OC dossier pages and dossier child APIs for Admin.
- Bulk Upload off blocks bulk upload hub unless workflow assignment grants specific bulk module.
- Reports off blocks reports page and report APIs for Admin.

### 7.4 Dossier lock verification detail

When changing dossier lock settings:

- Use one OC with current semester data.
- Use one historical semester route.
- Verify lock notice appears where expected.
- Verify save action is blocked where expected.
- Verify current semester save still works if policy allows it.

Do not infer lock behavior from UI disabled state only; confirm API behavior through the actual save flow.

### 7.5 Public content verification detail

For public content:

- Verify create/edit/reorder/delete behavior.
- Verify soft/hard delete distinction where the UI offers it.
- Verify uploaded image or media displays.
- Verify fallback content displays if no row exists.
- Verify mobile layout does not overlap text and media.

### 7.6 Settings troubleshooting

| Symptom | Likely cause | Check |
|---|---|---|
| Saved setting reverts after refresh | API save failed or cache stale | Network response and settings API. |
| Admin still sees disabled module | Stale session/navigation | Refresh navigation or re-login. |
| API allows disabled module | Server module-access enforcement missing | Check protected API path and tests. |
| Upload asset fails | MinIO/S3 config issue | Presign API, bucket, endpoint, credentials. |
| Public page blank | Missing fallback or bad content row | Public site APIs and settings rows. |
