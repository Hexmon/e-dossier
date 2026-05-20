# Reports

This guide covers report preview, download, versioning, and verification.

## 1. Reports Hub {#reports-hub}

Route:

- `/dashboard/reports`

Who uses it:

- Admin, Super Admin, and users with Reports module access.

What it manages:

- Entry point to academic, physical assessment, and course performance reports.

Main workflow:

1. Open Reports.
2. Select report card.
3. Choose course/semester/OC filters.
4. Preview before download.
5. Download with password/version code where applicable.

Important business rules:

- Admin report access can be disabled from Module Access settings.
- Reports depend on data entered in OC dossier and management modules.
- Downloaded reports include verification metadata.

Validation checklist:

- Reports hub only appears for users with access.
- Filters load course/semester/OC options.
- Preview and download use the same selected filters.

Related pages:

- `/dashboard/help/settings-controls#module-access-settings`

## 2. Academic Reports {#academic-reports}

Route:

- `/dashboard/reports`
- `/api/v1/reports/academics/*`

Who uses it:

- Academic staff, Admin, and report reviewers.

What it manages:

- Consolidated sessional, final result compilation, semester grade candidates, and per-OC semester grade previews/downloads.

Main workflow:

1. Select academic report.
2. Select course and semester where required.
3. Preview records.
4. Download report.
5. Verify PDF if needed.

Important business rules:

- Academic reports depend on subjects, offerings, marks, grade policy, and OC enrollment.
- Recalculated grading policy affects report values.
- Missing marks or invalid subject mapping can produce incomplete report output.

Validation checklist:

- Preview includes expected OC count.
- Grade values match current grading policy.
- Downloaded PDF verifies by version code.

Related pages:

- `/dashboard/help/module-management#grading-policy`
- `/dashboard/help/bulk-upload#academic-marks-bulk-upload`

## 3. Physical Assessment Report {#physical-assessment-report}

Route:

- `/api/v1/reports/mil-training/physical-assessment/*`

Who uses it:

- PT staff, Admin, and report reviewers.

What it manages:

- Physical training assessment report preview and download.

Main workflow:

1. Confirm PT records exist.
2. Select course/semester/context.
3. Preview assessment report.
4. Download and verify.

Important business rules:

- Report output depends on PT management configuration and OC PT records.
- Bulk PT upload changes should appear after approval/write.
- Missing PT template rows can affect report completeness.

Validation checklist:

- Preview loads expected OC/PT rows.
- Download succeeds.
- Version code verifies.

Related pages:

- `/dashboard/help/module-management#physical-training-management`
- `/dashboard/help/bulk-upload#pt-bulk-upload`

## 4. Course Performance Reports {#course-performance-reports}

Route:

- `/api/v1/reports/overall-training/*`

Who uses it:

- Commanders, Admin, and performance reviewers.

What it manages:

- Course-wise performance and course-wise final performance reports.

Main workflow:

1. Select course.
2. Preview course performance.
3. Review aggregate and OC-level values.
4. Download report.

Important business rules:

- Course performance reports summarize multiple dossier domains.
- Missing dossier data can reduce report completeness.
- Final performance depends on final/overall assessment records.

Validation checklist:

- Expected OCs appear for selected course.
- Aggregate values are consistent with source records.
- Downloaded report can be verified.

Related pages:

- `/dashboard/help/dossier-management`

## 5. Download Password And Version Code {#download-password-version-code}

Route:

- `/dashboard/reports`

Who uses it:

- Report downloaders and verification staff.

What it manages:

- Password protected downloads and report version metadata.

Main workflow:

1. Enter required download password if prompted.
2. Download report.
3. Read version code from the PDF.
4. Use verification page to validate authenticity.

Important business rules:

- Version code ties a PDF to stored report download metadata.
- Password protects generated report files where configured.
- Re-exporting or editing a PDF can change checksum.

Validation checklist:

- Password prompt works as expected.
- Version code appears in downloaded report.
- Verification status is clear.

Related pages:

- `/dashboard/genmgmt/report-verification`

## 6. Report Verification {#report-verification}

Route:

- `/dashboard/genmgmt/report-verification`

Who uses it:

- Report consumers and admin verification users.

What it manages:

- Version-code lookup and optional exact PDF checksum validation.

Main workflow:

1. Enter version code.
2. Optionally upload the PDF.
3. Click verify.
4. Review authenticity result.

Important business rules:

- `AUTHENTIC_EXACT` means version code exists and checksum matches.
- `AUTHENTIC_CODE_ONLY` means version code exists but no exact file match was checked.
- `NOT_AUTHENTIC` means invalid code or file mismatch.

Validation checklist:

- Known version code verifies.
- Wrong file against valid code does not show exact match.
- Invalid code fails.

Related pages:

- `/dashboard/help/admin-operations#verify-downloaded-report-pdf`

## 7. Detailed Reports Reference {#detailed-reports-reference}

Reports are generated views over existing data. If a report is wrong, first verify source records and filters before changing report code.

### 7.1 Report source map

| Report area | Main source data | Setup dependencies |
|---|---|---|
| Consolidated sessional | Academic marks, subjects, offerings, OC enrollment | Courses, subjects, offerings, grading policy |
| Final result compilation | Academic marks and grade policy | Courses, grading policy, OC enrollment |
| Semester grade | OC academic marks by semester | Subjects, offerings, grading policy |
| Physical assessment | OC PT scores and PT configuration | PT types, tasks, scores, attempts |
| Course-wise performance | Dossier/training domain records | OC lifecycle, domain records |
| Course-wise final performance | Final/overall performance records | OC lifecycle, final performance data |
| Verification | Report download version rows and optional checksum | Successful report download |

### 7.2 Report generation flow

Standard flow:

1. User selects report and filters.
2. UI calls preview API.
3. Preview returns rows/counts/summaries.
4. User reviews preview.
5. UI calls download API.
6. Download endpoint creates report artifact and version metadata.
7. PDF displays version code.
8. Verification page checks the version code and optional file checksum.

QA should not skip preview. Preview is the safest place to catch wrong filters or missing data.

### 7.3 Filter detail

Common filters:

- Course.
- Semester.
- Branch.
- OC.
- PT type.
- Search query.

Validation rules:

- Course must exist and contain matching OCs.
- Semester must be valid for the course/report.
- Branch filters should reduce rows predictably.
- OC filter should not show unrelated OCs.
- Empty result should explain missing data rather than failing silently.

### 7.4 Download and verification detail

Every downloaded report should be treated as an artifact:

- Version code identifies generated report metadata.
- Optional checksum proves exact file match.
- Password protection may be required by report type or environment.
- Edited PDF files may no longer match exact checksum.

Verification result interpretation:

| Result | Meaning | Operator action |
|---|---|---|
| `AUTHENTIC_EXACT` | Code exists and uploaded file checksum matches. | Accept file as exact generated artifact. |
| `AUTHENTIC_CODE_ONLY` | Code exists but exact file was not checked. | Accept only code authenticity, not file bytes. |
| `NOT_AUTHENTIC` | Code missing or file mismatch. | Reject or investigate source/download history. |

### 7.5 Report troubleshooting

| Symptom | Likely cause | Check |
|---|---|---|
| Preview empty | Wrong filters or missing source data | Course, semester, OC enrollment, source records. |
| Grades incorrect | Grading policy not applied/recalculated | Policy thresholds and recalculation state. |
| PT report missing rows | PT config or scores missing | PT management and OC PT page. |
| Download fails | Runtime/report generation issue | Build/runtime logs and selected filters. |
| Verification code missing | Report was not generated through download flow | Use official download action. |
| Exact verification fails | PDF modified or wrong file uploaded | Re-download and compare again. |

### 7.6 QA evidence for reports

For every report type, capture:

- User role and module access state.
- Selected filters.
- Preview row count.
- Download success.
- Version code.
- Verification result.
- At least one source OC record used to cross-check values.
