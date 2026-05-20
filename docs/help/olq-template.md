# OLQ Template (Default Profile)

This guide explains how to apply the standard OLQ template and verify it for one course or all active courses.

## 1. Scope {#scope}

- Template is course-level (not separate template per semester).
- The same course template is used by OLQ assessment screens for Term 1 to Term 6.
- Apply options:
- selected course only
- all active courses

## 2. Default template model {#default-template}

- Version: `default.v1`
- Source file: `src/app/lib/olq/default-template.ts`
- Categories and subtitles:

| Category | Default subtitles | Default max marks |
| --- | --- | --- |
| PLG & ORG | Effective Intelligence, Reasoning Ability, Org Ability, Power of Expression | 20 each |
| Social Adjustment | Social Adaptability, Cooperation, Sense of Responsibility | 20 each |
| Social Effectiveness | Initiative, Self-Confidence, Speed of Decision, Ability to Influence the Gp, Liveliness | 20 each |
| Dynamic | Determination, Courage, Stamina | 20 each |

## 3. Apply options {#apply-options}

Open:

- `Dashboard -> Module Mgmt -> OLQ Management`
- In the `Copy Template` tab, use the `Default OLQ Template` panel.

Available options:

- `Scope`:
- `Selected Course`: applies only to the selected course.
- `All Active Courses`: runs for all active courses.
- `Mode`:
- `replace`: deactivates active template rows and inserts default canonical rows.
- `upsert_missing`: creates missing default rows and updates canonical ordering/labels only.
- `Dry Run`: previews exact counts without writing to DB.

Operational API used by this panel:

- `POST /api/v1/admin/olq/templates/apply`

## 4. Validation checklist {#validation-checklist}

After apply:

- Stay on `OLQ Management` and confirm categories/subtitles are present with expected order.
- Open one OC OLQ page:
- `Dashboard -> {OC} -> Mil Mgmt -> OLQ Assessment`
- Confirm categories render correctly for all semester tabs (1 to 6).
- Enter sample marks and save to confirm scoring flow still works.

## 5. Common mistakes {#common-mistakes}

- Running `replace` when you intended to preserve custom categories.
- Skipping dry-run for all-course apply.
- Expecting semester-specific template differences without customizing course template after apply.

```mermaid
flowchart LR
  A["Open OLQ Management"] --> B["Select scope + mode"]
  B --> C["Run Dry Run"]
  C --> D["Review counts and warnings"]
  D --> E["Apply template"]
  E --> F["Validate in OLQ Assessment page"]
```

## 6. Detailed OLQ Template Reference {#detailed-olq-template-reference}

OLQ configuration defines assessment categories and subtitles. The same course-level template supports semester/term OLQ entry pages.

### 6.1 Category and subtitle detail

| Category | Operator meaning | Validation focus |
|---|---|---|
| PLG & ORG | Planning, reasoning, organization, and expression qualities | Four subtitles with max marks of 20 each. |
| Social Adjustment | Ability to adapt, cooperate, and accept responsibility | Three subtitles with max marks of 20 each. |
| Social Effectiveness | Initiative, confidence, decision speed, influence, liveliness | Five subtitles with max marks of 20 each. |
| Dynamic | Determination, courage, and stamina | Three subtitles with max marks of 20 each. |

The label text matters because assessment pages and reports display it directly. Avoid spelling changes unless they are intentional organization terminology changes.

### 6.2 Replace versus upsert_missing

Use `replace` when:

- The course should exactly match the default OLQ structure.
- Existing active template rows are incorrect or experimental.
- You have reviewed dry-run output and accepted the reset.

Use `upsert_missing` when:

- The course already has customized OLQ rows.
- You only want missing defaults created.
- You want canonical sort/label updates without wiping custom structure.

For production-like data, run dry-run first and record the count of affected courses, created rows, updated rows, deactivated rows, warnings, and skipped rows.

### 6.3 Downstream behavior

OLQ template data affects:

- OC OLQ Assessment page rendering.
- Semester/term tabs that show OLQ subtitles.
- OLQ score entry and total calculation.
- Performance graph and reports that include OLQ-derived values.

When validating, choose one OC in the target course, open every semester/term tab that the UI exposes, and confirm the category layout remains consistent.

### 6.4 OLQ QA matrix

| Scenario | Expected result |
|---|---|
| Selected course dry-run | Only selected course appears in the preview. |
| All active courses dry-run | Every active course is scanned and warnings are visible. |
| upsert_missing on customized course | Missing defaults are inserted and custom rows remain active. |
| replace on customized course | Active custom rows are deactivated or replaced according to apply result. |
| OC OLQ save after template apply | Marks save and reload under the same category/subtitle labels. |
| Report/performance page after apply | OLQ values remain readable and no category is blank. |
