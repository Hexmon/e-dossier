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
