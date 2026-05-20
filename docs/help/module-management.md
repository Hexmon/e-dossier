# Module Management

This guide covers module-level configuration used by dossier, training, marks, templates, and reports.

## 1. Academics Management {#academics-management}

Route:

- `/dashboard/genmgmt/academics`

Who uses it:

- Admin, academic staff, and Super Admin.

What it manages:

- Academic module entry points, subject/offering setup, marks workflows, and academic configuration.

Main workflow:

1. Set up courses, subjects, and offerings.
2. Enter or bulk upload academic marks.
3. Review workflow approval state if enabled.
4. Generate academic reports.

Important business rules:

- Academic marks depend on correct course, semester, subject, and OC enrollment.
- Workflow settings can block direct writes and require review.
- Grade calculations use the active grading policy.

Validation checklist:

- Course/subject/offering choices match the selected OC/course.
- Bulk academic upload preview matches expected row count.
- Reports reflect recalculated grade policy values.

Related pages:

- `/dashboard/help/general-management#subject-offering-management`
- `/dashboard/help/bulk-upload#academic-marks-bulk-upload`

## 2. Grading Policy {#grading-policy}

Route:

- `/dashboard/genmgmt/grading-policy`

Who uses it:

- Admin or academic authority.

What it manages:

- Global grade bands, grade points, GPA formulas, and recalculation actions.

Main workflow:

1. Review default grade bands.
2. Edit thresholds or grade-point values.
3. Preview recalculation.
4. Apply recalculation only after preview is correct.

Important business rules:

- Grade policy affects academic reports and stored grade outputs.
- Recalculation can update many OC/subject records.
- Preview should be used before applying broad changes.

Validation checklist:

- Boundary marks resolve to expected grade.
- Preview count matches intended courses/OCs.
- Reports show updated grades after apply.

Related pages:

- `/dashboard/help/org-templates/grading-policy`

## 3. Camps Management {#camps-management}

Route:

- `/dashboard/genmgmt/camps`

Who uses it:

- Admin and training staff.

What it manages:

- Training camp definitions, activities, reviews, and camp scoring configuration.

Main workflow:

1. Create or edit camp.
2. Add activities.
3. Copy templates where useful.
4. Enter OC camp participation and scores from dossier pages.

Important business rules:

- Camp templates are non-destructive defaults.
- OC camp records should reference active camp definitions.
- Activity scores should match configured camp activities.

Validation checklist:

- Camp appears in OC camp page.
- Activity list matches configuration.
- Copy template does not remove custom rows.

Related pages:

- `/dashboard/[ocId]/milmgmt/camps`
- `/dashboard/help/org-templates`

## 4. Punishment Management {#punishment-management}

Route:

- `/dashboard/genmgmt/punishments`

Who uses it:

- Admin and discipline staff.

What it manages:

- Punishment types and discipline reference data used by OC discipline records.

Main workflow:

1. Create or edit punishment reference rows.
2. Use punishment options while entering OC discipline records.
3. Review consistency between discipline records and configured punishments.

Important business rules:

- Reference rows should remain stable after discipline records use them.
- Discipline entries should preserve date, reason, awarded punishment, and authority.

Validation checklist:

- Punishment options appear in discipline forms.
- Existing discipline records still render after reference updates.

Related pages:

- `/dashboard/[ocId]/milmgmt/discip-records`

## 5. Interview Management {#interview-management}

Route:

- `/dashboard/genmgmt/interviews-mgmt`

Who uses it:

- Admin and interview template owners.

What it manages:

- Interview templates, sections, groups, fields, options, semester availability, and copied templates.

Main workflow:

1. Create or copy an interview template.
2. Configure sections/groups/fields.
3. Assign semesters.
4. Use the template on OC interview pages.

Important business rules:

- Field help text and options drive the form shown to users.
- Template edits can affect future interview entry.
- Existing saved interview data should remain readable.

Validation checklist:

- Template detail page shows sections/groups/fields.
- Field options render in the OC interview form.
- Semester mapping controls where the template appears.

Related pages:

- `/dashboard/[ocId]/milmgmt/interviews`

## 6. Physical Training Management {#physical-training-management}

Route:

- `/dashboard/genmgmt/pt-mgmt`

Who uses it:

- Admin, PT staff, and Super Admin.

What it manages:

- PT types, attempts, grades, tasks, score matrix, motivation award fields, and default PT templates.

Main workflow:

1. Select course/template context.
2. Create or apply PT type defaults.
3. Configure attempts, grades, tasks, and score matrix.
4. Use configuration in OC PT records and PT bulk upload.

Important business rules:

- Default PT template is course-scoped where course context is required.
- Template view should reflect applied default data.
- Score matrix rows must match configured tasks and grading structure.

Validation checklist:

- PT Types, Grades, Tasks, Score Matrix, and Motivation Awards tabs show expected default rows.
- Applying default template creates missing rows without deleting custom data.
- OC PT page and PT bulk upload can use the configured rows.

Related pages:

- `/dashboard/help/org-templates/physical-training`
- `/dashboard/help/bulk-upload#pt-bulk-upload`

## 7. OLQ Management {#olq-management}

Route:

- `/dashboard/genmgmt/olq-mgmt`

Who uses it:

- Admin and OLQ template owners.

What it manages:

- OLQ categories, subtitles, templates, course-specific copies, and assessment structure.

Main workflow:

1. Review default OLQ categories and subtitles.
2. Apply template to selected course or all courses.
3. Choose replace or upsert-missing behavior.
4. Use OLQ forms in OC dossier pages.

Important business rules:

- Replace mode can remove course-specific category/subtitle structure.
- Upsert-missing preserves custom rows.
- OLQ assessment depends on active course template structure.

Validation checklist:

- Course template shows categories and subtitles after apply.
- OC OLQ form shows configured fields.
- Copy template warnings are reviewed before apply.

Related pages:

- `/dashboard/help/org-templates/olq`
- `/dashboard/[ocId]/milmgmt/olq-assessment`

## 8. Default Templates {#default-templates}

Route:

- `/dashboard/help/org-templates`

Who uses it:

- Admin setting up or restoring baseline configuration.

What it manages:

- Default profiles for PT, camps, platoons, appointments, and OLQ.

Main workflow:

1. Preview default template changes.
2. Review creates, updates, and warnings.
3. Apply only the intended module template.
4. Verify target management page after apply.

Important business rules:

- Default template apply should be non-destructive unless the module explicitly offers replace behavior.
- Missing users/platoons in appointment templates are warnings, not silent failures.
- Extra organization-specific rows should remain.

Validation checklist:

- Dry-run summary is reviewed.
- Expected rows appear after apply.
- Custom rows are still present.

Related pages:

- `/dashboard/help/org-templates`

## 9. Workflow Settings {#workflow-settings}

Route:

- `/dashboard/genmgmt/settings/marks-review-workflow`

Who uses it:

- Super Admin or authorized admin workflow owner.

What it manages:

- Marks review workflow settings and assignments for academic bulk and PT bulk modules.

Main workflow:

1. Enable or disable workflow for a module.
2. Configure actor assignments.
3. Submit bulk marks.
4. Review, approve, reject, or override according to settings.

Important business rules:

- Workflow-enabled modules can block direct writes.
- Assignments decide which users can review workflow tickets.
- Notifications and pending ticker use workflow state.

Validation checklist:

- Workflow setting persists after save.
- Bulk upload creates or updates the expected ticket.
- Reviewer sees pending notification/ticker.

Related pages:

- `/dashboard/help/bulk-upload`
- `/dashboard/settings/ticker`

## 10. Detailed Module Configuration Reference {#detailed-module-configuration-reference}

Use this section to understand what each module configuration page controls before changing templates or source data.

### 10.1 Dependency map

| Configuration | Used by | Impact if missing |
|---|---|---|
| Courses | OC Management, reports, templates, bulk upload | OCs cannot be assigned correctly; reports cannot filter by course. |
| Subjects | Offerings, academic marks, reports | Academic entry/report rows may be missing. |
| Offerings | Manage Marks, academic reports | Subject/semester mapping can fail. |
| Grading Policy | Academic reports, semester records | Grades/points can be wrong or stale. |
| PT Types/Tasks/Scores | OC PT page, PT bulk, PT reports | PT forms and uploads cannot resolve rows. |
| OLQ Categories/Subtitles | OC OLQ assessment | OLQ form has missing or invalid categories. |
| Camps/Activities | OC camps page, camp scoring | Camp rows cannot be selected or scored correctly. |
| Interview Templates | OC interviews | Interview forms cannot render expected fields. |
| Punishments | Discipline records | Discipline form options may be incomplete. |
| Workflow Settings | Academic/PT bulk upload | Direct write/review behavior may be wrong. |

### 10.2 Academics configuration details

Before marks entry or reports:

- Create courses.
- Create subjects.
- Create course offerings for the correct semester.
- Confirm instructors where the workflow expects instructor context.
- Confirm grading policy is acceptable.
- Confirm workflow settings for Academic Bulk.

QA should test:

- Manual academic entry.
- Academic bulk upload preview.
- Academic bulk submit path with workflow on and off.
- Consolidated sessional report preview.
- Semester grade preview for one OC.

### 10.3 PT configuration details

PT Management has multiple related tabs. They should be validated together.

PT Types:

- Define the broad test or PT category.
- Should be course-scoped where the UI requires course context.
- Should remain stable after OC PT records exist.

Attempts:

- Define attempt rounds for a PT type.
- Used by grades and scores.

Grades:

- Define grade thresholds for an attempt.
- Must align with score matrix expectations.

Tasks:

- Define scored activities.
- Should not be removed if historical scores exist.

Score Matrix:

- Connects task scores to grading behavior.
- Must be checked after default template apply.

Motivation Awards:

- Defines award fields used by OC PT motivation pages and PT bulk.

QA should verify each tab after applying the default template, because a template can appear partially applied if only one tab is checked.

### 10.4 OLQ configuration details

OLQ has course-specific structure.

Categories:

- Broad OLQ dimensions.
- Used as top-level grouping in assessment.

Subtitles:

- Detailed items under categories.
- Used as scored fields in OC OLQ assessment.

Apply modes:

- `upsert_missing` preserves existing custom structure and fills missing defaults.
- `replace` should be used only when the course should exactly match the template.

QA should test:

- Default template preview.
- Apply to selected course.
- OC OLQ page for an OC in that course.
- Existing custom category behavior under each apply mode.

### 10.5 Interview template details

Interview templates define form structure.

Template:

- Owns sections, groups, semester mapping, and metadata.

Sections:

- Main layout blocks in the form.

Groups:

- Repeatable or grouped field areas.

Fields:

- Actual input definitions, type, label, help text, and validation shape.

Options:

- Choices for select-like fields.

Semester mapping:

- Controls when the template is available.

QA should create at least one template with:

- One normal section field.
- One grouped field.
- One select option field.
- Semester mapping.
- A saved OC interview response.

### 10.6 Workflow setting detail

Workflow settings must be tested as a behavior switch, not only as a saved configuration row.

When disabled:

- Direct bulk write should be allowed for authorized users.
- No review ticket should be required.

When enabled:

- Bulk submission should create or update a workflow ticket.
- Reviewer assignment should determine who can act.
- Notifications/ticker should reflect pending work.
- Final approval should write data to the target domain.

Failure modes:

- No assigned reviewer.
- User not assigned to act.
- Duplicate workflow key.
- Rejected ticket not writing data.
- Override behavior not clearly surfaced.

### 10.7 Module Management QA matrix

| Module | Setup action | Runtime page affected | Report affected | Bulk affected |
|---|---|---|---|---|
| Academics | Course/subject/offering | OC Academics | Academic reports | Academic bulk |
| Grading | Policy update/recalculate | Semester/final records | Academic reports | Indirect |
| Camps | Camp/activity setup | OC Camps | Course performance | No direct bulk |
| Punishments | Punishment setup | Discipline records | Performance summaries | No direct bulk |
| Interviews | Template setup | OC Interviews | Interview review outputs | No direct bulk |
| PT | Type/task/score setup | OC Physical Training | PT assessment | PT bulk |
| OLQ | Category/subtitle setup | OC OLQ | Overall/performance summaries | No direct bulk |
| Workflow | Enable/assign | Pending notifications | No direct report | Academic/PT bulk |
