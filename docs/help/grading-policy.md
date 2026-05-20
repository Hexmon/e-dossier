# Academic Grading Policy

Use this page to manage grading rules globally and recalculate academic data safely from the UI.

Page:

- `Dashboard -> Gen Mgmt -> Grading Policy`
- Direct route: `/dashboard/genmgmt/grading-policy?tab=module-mgmt`

## 1. What this controls {#what-this-controls}

This page controls three policy blocks used across academics:

- Letter grade bands (AP, AO, AM, BP, BO, BM, CP, CO, CM, F)
- Grade point bands (0 to 9)
- SGPA/CGPA formula + rounding scale

The policy is global (organization-level), not per course.

## 2. Default policy (C# mapping) {#default-policy}

Default letter-grade bands:

- `>= 80 => AP`
- `>= 70 => AO`
- `>= 60 => AM`
- `>= 55 => BP`
- `>= 50 => BO`
- `>= 45 => BM`
- `>= 41 => CP`
- `>= 38 => CO`
- `>= 35 => CM`
- `< 35 => F`

Default grade-point bands:

- `>= 80 => 9`
- `>= 70 => 8`
- `>= 60 => 7`
- `>= 55 => 6`
- `>= 50 => 5`
- `>= 45 => 4`
- `>= 41 => 3`
- `>= 38 => 2`
- `>= 35 => 1`
- `< 35 => 0`

## 3. How to update policy {#update-policy}

1. Edit letter-grade bands and grade-point bands.
2. Set SGPA and CGPA formula templates.
3. Set rounding scale.
4. Click `Save Policy`.

Use descending thresholds and avoid overlaps.

## 4. Recalculation flow (Preview and Apply) {#recalculation-flow}

1. Choose scope:
- `All Courses`
- `Selected Course(s)`
2. Click `Preview Changes` to run dry-run.
3. Review:
- scanned rows
- changed rows
- affected OCs
- affected courses
- sample changes
4. Click `Apply Updates` to persist.

Apply updates only changed rows; unchanged rows are skipped.

## 5. Report impact {#report-impact}

These reports use the current grading policy:

- Consolidated Sessional Mark Sheet (Subject Wise)
- Semester Grade Report (Passing Out Cadet)
- Final Result Compilation Sheet

Behavior:

- If marks exist, grade is derived from current policy.
- If marks are missing, stored grade is used as fallback.

## 6. Validation checklist {#validation-checklist}

After saving and applying:

- Open one OC academics view and verify SGPA/CGPA.
- Open each academic report preview and verify letter grades.
- Confirm expected boundary values (for example 80, 70, 60, 55, 50, 45, 41, 38, 35).

## 7. Common mistakes {#common-mistakes}

- Changing bands and skipping `Preview Changes`.
- Applying to all courses unintentionally.
- Using non-descending thresholds.
- Expecting changes in reports before running `Apply Updates`.

## 8. Detailed Grading Policy Reference {#detailed-grading-policy-reference}

The grading policy controls how numeric academic marks convert into grades, grade points, SGPA, CGPA, and report values.

### 8.1 Data ownership detail

| Data | Owner | Notes |
|---|---|---|
| Numeric marks | Academic marks entry and bulk upload | Should remain unchanged when grading policy changes. |
| Letter grade | Grading policy calculation | Derived from configured threshold bands when marks exist. |
| Grade point | Grading policy calculation | Derived from configured grade-point bands. |
| SGPA formula | Academic grading policy settings | Formula must match institution rules and available mark fields. |
| CGPA formula | Academic grading policy settings | Formula must match semester aggregation rules. |
| Report display | Academic report pages | Reports should use current policy or stored fallback where code supports fallback. |

### 8.2 Boundary testing requirements

Every grading policy change must test boundary values:

- Exactly on each threshold.
- One mark below each threshold.
- Minimum passing threshold.
- Failure threshold.
- Empty or missing mark behavior.
- Existing stored grade fallback where marks are absent.

For the default policy, test `80`, `79`, `70`, `69`, `60`, `59`, `55`, `54`, `50`, `49`, `45`, `44`, `41`, `40`, `38`, `37`, `35`, and `34`.

### 8.3 Recalculation safety rules

Before apply:

- Confirm scope is correct.
- Confirm preview counts match expectations.
- Review sample changed rows.
- Confirm no unrelated courses are included.

During apply:

- Apply only after preview.
- Avoid simultaneous grading changes from multiple users.
- Keep the previous policy values available for rollback.

After apply:

- Verify an OC academics page.
- Verify all affected reports.
- Re-run the preview to confirm changed rows are no longer unexpectedly pending.

### 8.4 Report and workflow impact

Grading changes can affect:

- Consolidated sessional mark sheets.
- Semester grade report.
- Final result compilation.
- OC academic semester pages.
- Course performance reports.
- Workflow review pages if pending marks depend on calculated values.

Grading policy changes should be treated as controlled configuration changes, not normal data-entry edits.

### 8.5 Grading policy QA matrix

| Scenario | Expected result |
|---|---|
| Save valid descending bands | Settings persist after refresh. |
| Save overlapping or non-descending bands | UI or API prevents invalid policy where validation exists. |
| Preview selected course | Only selected course rows are scanned. |
| Apply selected course | Only selected course rows change. |
| Report after apply | Letter grade and grade point match current policy. |
| Missing marks in report | Stored grade fallback is used where implemented. |
