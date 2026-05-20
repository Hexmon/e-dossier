# Bulk Upload

This guide covers bulk import workflows and their review behavior.

## 1. Bulk Upload Hub {#bulk-upload-hub}

Route:

- `/dashboard/bulk-upload`

Who uses it:

- Admin users with Bulk Upload access, Super Admin, and assigned workflow users.

What it manages:

- Entry points for OC upload, academic marks upload, and physical training upload.

Main workflow:

1. Open Bulk Upload.
2. Choose the target upload type.
3. Upload or paste/import data.
4. Preview validation results.
5. Submit, then verify target pages refresh.

Important business rules:

- Admin access can be disabled from Module Access settings.
- Academic/PT bulk workflows may require review instead of direct write.
- Upload success should refresh latest data from the API.

Validation checklist:

- Hub only appears for users with access.
- Expected upload module opens.
- Submit response and table refresh match.

Related pages:

- `/dashboard/help/settings-controls#module-access-settings`
- `/dashboard/help/module-management#workflow-settings`

## 2. OC Bulk Upload {#oc-bulk-upload}

Route:

- `/dashboard/genmgmt/ocmgmt`
- `/api/v1/oc/bulk-upload`

Who uses it:

- Admin and Super Admin.

What it manages:

- Bulk creation/update of OC profile, placement, personal/contact, and lifecycle baseline data.

Main workflow:

1. Prepare Excel rows with TES number, name, course, branch, platoon, arrival, and personal fields.
2. Use bulk upload dry run/preview.
3. Review row warnings/errors.
4. Apply upload.
5. Confirm OC table refreshes and new OCs remain after page refresh.

Important business rules:

- OC identity/current placement is canonical in `oc_cadets`.
- Personal/profile fields are kept in `oc_personal`.
- Baseline enrollment and pre-commission snapshot must be created or repaired.
- Free-form family/NOK data must not be automatically split into structured family rows.

Validation checklist:

- Dry run catches missing required values.
- Upload creates or updates expected OC count.
- OC Management list refreshes without full page reload requirement.
- Dossier personal pages show supported imported fields.

Related pages:

- `/dashboard/help/general-management#oc-management`
- `/dashboard/help/dossier-management#personal-background-ssb`

## 3. Academic Marks Bulk Upload {#academic-marks-bulk-upload}

Route:

- `/dashboard/manage-marks`
- `/api/v1/oc/academics/bulk`

Who uses it:

- Academic staff, Admin, Super Admin, and configured workflow reviewers.

What it manages:

- Bulk academic marks for OCs by course, semester, subject, and assessment component.

Main workflow:

1. Select course/semester/subject context.
2. Import marks data.
3. Preview parsed rows and validation messages.
4. Submit directly or into workflow depending on configuration.
5. Verify OC academics and reports.

Important business rules:

- Marks require valid OC, course enrollment, subject/offering, and semester.
- Workflow can require review before persistence.
- Grade policy controls calculated grades/points.

Validation checklist:

- Preview row count matches source file.
- Invalid OC/subject rows are reported.
- Approved upload appears on OC academics page.

Related pages:

- `/dashboard/help/module-management#academics-management`
- `/dashboard/help/reports#academic-reports`

## 4. PT Bulk Upload {#pt-bulk-upload}

Route:

- `/dashboard/manage-pt-marks`
- `/api/v1/oc/physical-training/bulk`

Who uses it:

- PT staff, Admin, Super Admin, and configured workflow reviewers.

What it manages:

- Bulk PT task scores and motivation award data.

Main workflow:

1. Confirm PT template/configuration exists for the course.
2. Select course and PT context.
3. Import PT score rows.
4. Preview validation result.
5. Submit directly or through workflow.
6. Verify OC Physical Training page.

Important business rules:

- PT rows depend on configured PT types, tasks, attempts, grades, and score matrix.
- Workflow settings can require review.
- Motivation award fields are configured separately from PT score rows.

Validation checklist:

- PT configured rows are recognized.
- Invalid task/type rows are rejected.
- Saved bulk scores appear on OC PT page.

Related pages:

- `/dashboard/help/module-management#physical-training-management`

## 5. Dry Run Preview And Refresh {#dry-run-preview-refresh}

Route:

- `/api/v1/oc/bulk-upload?dryRun=1`

Who uses it:

- Upload operators and QA.

What it manages:

- Validation without committing data.

Main workflow:

1. Run dry-run/preview first.
2. Review row errors, warnings, and inferred updates.
3. Apply only after preview is acceptable.
4. Fetch the list/detail API again after success.

Important business rules:

- Dry run should not write database rows.
- Successful write should refresh the affected UI from API data.
- Page refresh must not hide newly created/uploaded records.

Validation checklist:

- Dry-run count does not change DB rows.
- Apply changes expected rows only.
- UI list/detail reflects latest API state immediately after success.

Related pages:

- `/dashboard/help/general-management#oc-management`

## 6. Workflow Approval {#workflow-approval}

Route:

- `/dashboard/genmgmt/settings/marks-review-workflow`

Who uses it:

- Workflow owners, reviewers, and users submitting bulk marks.

What it manages:

- Review tickets, submit/approve/reject/override behavior, notifications, and workflow module settings.

Main workflow:

1. Enable workflow for Academic Bulk or PT Bulk.
2. Assign reviewers.
3. Submit bulk data.
4. Reviewer acts on the ticket.
5. Submitter verifies outcome and target records.

Important business rules:

- Workflow-enabled modules may block direct write.
- Review action should preserve audit trail.
- Pending ticker/notifications depend on active workflow state.

Validation checklist:

- Submission creates expected ticket.
- Reviewer sees pending item.
- Approved ticket updates target records.

Related pages:

- `/dashboard/help/settings-controls#marks-review-workflow`

## 7. Common Validation Failures {#common-validation-failures}

Route:

- `/dashboard/bulk-upload`

Who uses it:

- Upload operators and QA.

What it manages:

- Troubleshooting upload errors.

Main workflow:

1. Read the preview error.
2. Correct source file or setup data.
3. Re-run preview.
4. Apply after clean validation.

Important business rules:

- Missing course/platoon/OC references usually mean setup data is incomplete or mismatched.
- Invalid semester/subject rows should be fixed in setup or source file.
- Upload should not silently skip invalid rows without reporting them.

Validation checklist:

- Error message identifies row/field.
- Corrected file passes preview.
- Applied data is visible in target module.

Related pages:

- `/dashboard/help/setup-guide`
- `/dashboard/help/general-management`

## 8. Detailed Bulk Upload Reference {#detailed-bulk-upload-reference}

Bulk upload should be treated as a controlled data import workflow. Preview, apply, and post-apply verification are all required.

### 8.1 OC upload field ownership

| Upload field group | Stored/owned by | Notes |
|---|---|---|
| TES/OC number | OC canonical record | Must identify the OC. |
| Name | OC canonical record | Should display across all OC detail pages. |
| Course | OC canonical record and enrollment | Course must resolve to an existing course. |
| Branch | OC canonical record and snapshot | Should sync to compatibility fields. |
| Platoon | OC canonical record | Must resolve to an active platoon where provided. |
| Arrival date | OC canonical/profile lifecycle fields | Used in dossier snapshot and lifecycle display. |
| Email/mobile/address | Personal/profile data | Imported profile data, not appointment/user login data. |
| Father/guardian/NOK | Personal/profile data | Free-form imported values should not be auto-split. |
| Games/hobbies/blood group/SSB centre | Personal/profile data | Profile fields, not detailed sports/SSB domain records. |
| Detailed sports/achievements/medical | Dedicated domain pages | Should be entered in dossier modules if detailed row-level data is required. |

### 8.2 OC upload validation detail

Before apply, preview should catch:

- Missing OC number.
- Missing name where required.
- Unknown course code/name.
- Unknown platoon.
- Duplicate rows in the same file.
- Existing OC that will be updated.
- Invalid date format.
- Invalid value type for numeric or date fields.

After apply, verify:

- OC count changed by the expected amount.
- Updated rows reflect expected values.
- Every active OC has active enrollment.
- Every active OC has pre-commission snapshot.
- Personal profile fields appear in the personal page.
- OC Management search finds the new/updated OC.

### 8.3 Academic bulk data expectations

Academic bulk rows should be validated against:

- Course.
- Semester.
- OC.
- Subject/offering.
- Marks component.
- Allowed marks range.
- Workflow setting.

Post-apply checks:

- OC Academics page displays the values.
- Semester record reflects updated marks.
- Grade policy mapping is correct.
- Academic report preview includes the updated marks.

### 8.4 PT bulk data expectations

PT bulk rows should be validated against:

- Course.
- OC.
- PT type.
- Attempt.
- Task.
- Score range.
- Motivation award field where applicable.
- Workflow setting.

Post-apply checks:

- OC Physical Training page displays scores.
- Grand total/derived results update.
- PT report preview includes scores.
- Workflow ticket state is closed if approval was required.

### 8.5 Preview-to-apply acceptance checklist

Preview is acceptable only when:

- Total parsed rows equals expected source rows.
- Error count is zero.
- Warning count is reviewed.
- Create/update/skip counts are understood.
- Operator has confirmed target course/semester/platoon.
- Workflow mode is understood.

Apply is acceptable only when:

- API returns success.
- UI refetches target data.
- Browser refresh preserves the updated data.
- No unrelated records changed.
- Any generated audit/workflow rows are expected.

### 8.6 Common operator mistakes

| Mistake | Result | Prevention |
|---|---|---|
| Uploading before course setup | Unknown course errors | Create course first. |
| Platoon spelling mismatch | Unknown platoon or unassigned OC | Use exact configured platoon label/key. |
| Reusing old template columns | Missing field mapping | Compare against current upload preview fields. |
| Assuming preview saved data | No DB changes | Preview is dry-run only. |
| Not refreshing after apply | Stale UI | Force API refetch or browser refresh. |
| Ignoring workflow state | Data not visible yet | Check pending/approved ticket. |
| Treating personal profile as detailed records | Missing domain report details | Enter detailed rows in dossier pages. |

### 8.7 Evidence to capture for QA

For each upload test, capture:

- File name and row count.
- Upload type.
- User role.
- Module access/workflow setting.
- Preview response counts.
- Apply response.
- Target page after refetch.
- Browser refresh result.
- Relevant OC IDs/course IDs/semester.
