# Dossier Management

This guide covers OC-specific dossier pages under `/dashboard/[ocId]/milmgmt`.

## 1. Dossier Entry And OC Context {#dossier-entry-oc-context}

Route:

- `/dashboard/[ocId]/milmgmt`

Who uses it:

- Users with Dossier access for the selected OC.

What it manages:

- OC-specific navigation across profile, academics, military training, discipline, reports, and assessment pages.

Main workflow:

1. Open Dossier from the sidebar or OC Management.
2. Select the OC.
3. Confirm the header shows the correct OC name/course/platoon.
4. Open the required dossier module.

Important business rules:

- Dossier access is module-access controlled for Admin users.
- Platoon-scoped users must only access OCs inside allowed scope.
- OC name should come from canonical OC data.

Validation checklist:

- Edited OC URLs outside scope are denied or not found.
- Header data matches OC Management.
- Sidebar and tabs keep the selected OC context.

Related pages:

- `/dashboard/help/software-overview#oc-lifecycle-overview`

## 2. Snapshot Filling And Inspection {#snapshot-filling-inspection}

Route:

- `/dashboard/[ocId]/milmgmt/dossier-snapshot`
- `/dashboard/[ocId]/milmgmt/dossier-filling`
- `/dashboard/[ocId]/milmgmt/dossier-insp`

Who uses it:

- Dossier staff, platoon commanders, and administrators.

What it manages:

- Core OC snapshot fields, dossier filling progress, and inspection records.

Main workflow:

1. Review snapshot identity and lifecycle details.
2. Update compatible snapshot fields if needed.
3. Record filling state and inspection findings.
4. Re-open after refresh to confirm saved data.

Important business rules:

- Snapshot updates must keep lifecycle compatibility rows synced.
- Dossier filling and inspection records are domain records, not replacements for OC identity.
- Inspection data should preserve reviewer/date context.

Validation checklist:

- Name, TES number, course, branch, platoon, and arrival data are correct.
- Filling and inspection records save and reload.
- Existing domain records remain visible after OC lifecycle edits.

Related pages:

- `/dashboard/help/general-management#oc-management`

## 3. Personal Background And SSB {#personal-background-ssb}

Route:

- `/dashboard/[ocId]/milmgmt/pers-particulars`
- `/dashboard/[ocId]/milmgmt/background-detls`
- `/dashboard/[ocId]/milmgmt/ssb-reports`

Who uses it:

- Dossier staff and authorized OC profile maintainers.

What it manages:

- Personal particulars, imported profile/contact data, family details, education, achievements, autobiography, SSB reports, and SSB points.

Main workflow:

1. Review imported OC upload data.
2. Update personal fields or detailed background sections.
3. Add education, family, achievement, autobiography, and SSB records.
4. Verify data appears in relevant reports/views.

Important business rules:

- Free-form father/guardian/NOK upload data stays in `oc_personal`.
- Structured family member rows are maintained separately and should not overwrite free-form profile data.
- SSB reports and points are detailed domain records.

Validation checklist:

- Excel-uploaded fields show in personal view/edit where supported.
- Structured background rows save independently.
- SSB report and points persist after refresh.

Related pages:

- `/dashboard/help/bulk-upload#oc-bulk-upload`

## 4. Medical Discipline And Parent Communication {#medical-discipline-parent-communication}

Route:

- `/dashboard/[ocId]/milmgmt/med-record`
- `/dashboard/[ocId]/milmgmt/discip-records`
- `/dashboard/[ocId]/milmgmt/comn-parents`

Who uses it:

- Medical, discipline, and administration staff.

What it manages:

- Medical info/category, discipline records, and parent/guardian communication logs.

Main workflow:

1. Select semester or relevant period where applicable.
2. Add or update records.
3. Save and confirm the table refreshes.
4. Review performance graph/report impact where applicable.

Important business rules:

- Medical category and medical info are separate record types.
- Discipline records should retain date, punishment, reason, and authority details.
- Parent communications should keep communication date, mode, and remarks.

Validation checklist:

- Medical and discipline records are visible after refresh.
- Semester lock or historical semester behavior is respected.
- Parent communication table reflects saved entries.

Related pages:

- `/dashboard/help/module-management#punishment-management`

## 5. Academics And Semester Records {#academics-semester-records}

Route:

- `/dashboard/[ocId]/milmgmt/academics`
- `/dashboard/[ocId]/milmgmt/semester-record`
- `/dashboard/[ocId]/milmgmt/final-performance`

Who uses it:

- Academic staff and dossier reviewers.

What it manages:

- OC academic marks, semester performance, final performance, and derived academic records.

Main workflow:

1. Select the correct semester.
2. Enter marks or review imported marks.
3. Save subject/component data.
4. Review semester and final performance pages.

Important business rules:

- Academic data depends on active course enrollment and configured subjects/offerings.
- Grade policy recalculation can affect displayed grades.
- Semester record should reflect saved marks and performance data.

Validation checklist:

- Current semester appears correctly.
- Marks save and reload.
- Semester/final performance summaries match academic inputs.

Related pages:

- `/dashboard/help/module-management#academics-management`
- `/dashboard/help/reports`

## 6. Physical And Military Training {#physical-military-training}

Route:

- `/dashboard/[ocId]/milmgmt/physical-training`
- `/dashboard/[ocId]/milmgmt/wpn-trg`
- `/dashboard/[ocId]/milmgmt/obstacle-trg`
- `/dashboard/[ocId]/milmgmt/speed-march`

Who uses it:

- PT and military training staff.

What it manages:

- OC PT scores, PT motivation awards, weapon training, firing achievements, obstacle training, speed march, and run-back records.

Main workflow:

1. Verify PT and training templates/configuration exist.
2. Select semester or attempt context.
3. Add scores, awards, or training records.
4. Save and review totals/derived output.

Important business rules:

- PT forms depend on PT management type/task/score configuration.
- Weapon, obstacle, and speed march records are detailed domain records.
- Bulk PT upload can update PT records when access/workflow allows it.

Validation checklist:

- Configured PT rows appear in OC PT form.
- Weapon/obstacle/speed records save and reload.
- PT bulk changes appear on the OC PT page.

Related pages:

- `/dashboard/help/module-management#physical-training-management`
- `/dashboard/help/bulk-upload#pt-bulk-upload`

## 7. Sports Camps Clubs And Drill {#sports-camps-clubs-drill}

Route:

- `/dashboard/[ocId]/milmgmt/sports-awards`
- `/dashboard/[ocId]/milmgmt/camps`
- `/dashboard/[ocId]/milmgmt/club-detls`

Who uses it:

- Training, sports, and activity staff.

What it manages:

- Sports/games, motivation awards, camp participation/reviews, club participation, club achievements, and drill details.

Main workflow:

1. Open the relevant activity page.
2. Add or update row-level participation/performance data.
3. Save and verify table rows.
4. Review impact in overall/final performance if applicable.

Important business rules:

- Sports profile values from upload remain separate from detailed sports/award records.
- Camp records should align with configured camp/activity data.
- Club and drill records are saved as dedicated domain records.

Validation checklist:

- Existing activity rows remain visible.
- Add/edit/delete actions affect only the selected OC.
- Configured camp/activity names match management setup.

Related pages:

- `/dashboard/help/module-management#camps-management`

## 8. Leave Hike Detention And Counselling {#leave-hike-detention-counselling}

Route:

- `/dashboard/[ocId]/milmgmt/leave-record`
- `/dashboard/[ocId]/milmgmt/hikes`
- `/dashboard/[ocId]/milmgmt/detention`
- `/dashboard/[ocId]/milmgmt/counselling`

Who uses it:

- Platoon commanders, admin staff, and counselling authorities.

What it manages:

- Leave records, hike records, detention records, counselling sessions, and warnings.

Main workflow:

1. Select the OC and module.
2. Add date/status/details.
3. Save the record.
4. Confirm record appears after refresh.

Important business rules:

- Leave, hike, and detention are recorded separately even though grouped in some dossier references.
- Counselling/warning records should preserve date, reason, and remarks.
- Records belong to one OC and should not leak across OC scopes.

Validation checklist:

- Rows save and reload for the selected OC.
- Date/status fields display correctly.
- Scoped users cannot edit unrelated OCs.

Related pages:

- `/dashboard/help/rbac-permissions#appointment-scope`

## 9. OLQ Interviews CFE And Overall Assessment {#olq-interviews-cfe-overall}

Route:

- `/dashboard/[ocId]/milmgmt/olq-assessment`
- `/dashboard/[ocId]/milmgmt/interviews`
- `/dashboard/[ocId]/milmgmt/credit-excellence`
- `/dashboard/[ocId]/milmgmt/overall-assessment`
- `/dashboard/[ocId]/milmgmt/performance-graph`

Who uses it:

- Assessors, interviewers, commanders, and performance reviewers.

What it manages:

- OLQ scores, interview forms, credit for excellence, final/overall assessment views, and performance visualizations.

Main workflow:

1. Confirm templates or categories exist.
2. Enter assessment/interview/CFE values.
3. Save records.
4. Review overall assessment and performance graph.

Important business rules:

- OLQ pages depend on course OLQ template setup.
- Interview forms depend on interview template configuration.
- Performance graph summarizes domain records and should not be treated as the source of truth.

Validation checklist:

- OLQ categories/subtitles load.
- Interview template fields render for the selected semester.
- Performance graph loads without missing data errors.

Related pages:

- `/dashboard/help/module-management#olq-management`
- `/dashboard/help/module-management#interview-management`

## 10. Detailed Dossier Page Reference {#detailed-dossier-page-reference}

This reference lists what each OC dossier page should be used for and what QA should verify.

### 10.1 Dossier page matrix

| Page | Route suffix | Primary data | Key checks |
|---|---|---|---|
| Performance Graph | `/performance-graph` | Derived visual summaries | Graph loads, no blank charts, values match source records. |
| Dossier Snapshot | `/dossier-snapshot` | OC snapshot/core lifecycle fields | Name, TES number, course, branch, platoon, arrival, withdrawal/pass-out values. |
| Dossier Filling | `/dossier-filling` | Filling status and remarks | Save/reload status, semester/context if applicable. |
| Dossier Inspection | `/dossier-insp` | Inspection sheet records | Inspector, date, remarks, table refresh. |
| Personal Particulars | `/pers-particulars` | `oc_personal` profile/contact/import fields | Excel-uploaded values display and remain editable where supported. |
| Background Details | `/background-detls` | Family, education, achievements, autobiography | Structured rows do not overwrite imported free-form profile data. |
| SSB Reports | `/ssb-reports` | SSB report and points | Report fields save, point rows persist. |
| Medical Records | `/med-record` | Medical info/category | Historical lock behavior, category rows, medical info rows. |
| Discipline Records | `/discip-records` | Discipline and punishment records | Date, reason, punishment, authority, refresh. |
| Parent Communication | `/comn-parents` | Parent/guardian communication logs | Mode/date/remarks visible after save. |
| Sports & Motivation Awards | `/sports-awards` | Sports rows, games, awards | Saved rows and profile sports values are not confused. |
| Weapon Training | `/wpn-trg` | Weapon/firing performance | Weapon rows and firing achievements save. |
| Obstacle Training | `/obstacle-trg` | Obstacle records | Attempt/time/score rows save. |
| Speed March / Runs | `/speed-march` | Speed march and run-back records | Timings and remarks save. |
| Camps | `/camps` | Camp participation, scores, reviews | Configured camp/activity data appears. |
| Club Details | `/club-detls` | Clubs, drill, club achievements | Club and drill rows save independently. |
| Leave Records | `/leave-record` | Leave history | Date range, reason, authority, return status. |
| Hikes | `/hikes` | Hike records | Hike date, distance/details, result. |
| Detention | `/detention` | Detention records | Date, reason, duration, authority. |
| Counselling | `/counselling` | Counselling/warning records | Counselling type, date, remarks. |
| OLQ Assessment | `/olq-assessment` | OLQ categories/subtitles/scores | Template loads for course, scores save. |
| Interviews | `/interviews` | Interview templates/responses | Correct template and fields render. |
| Credit for Excellence | `/credit-excellence` | CFE records | Award/credit rows save. |
| Physical Training | `/physical-training` | PT scores and motivation awards | PT config appears; totals update. |
| Semester Record | `/semester-record` | Semester performance summary | Current semester and saved marks reflected. |
| Final Performance | `/final-performance` | Final performance record | Final summary saves and appears in reports. |
| Overall Assessment | `/overall-assessment` | Overall passing-out assessment | Overall values and narrative remain visible. |
| Academics | `/academics` | Academic marks by semester/subject | Subject rows, grades, and zero-credit behavior. |

### 10.2 Dossier edit policy

For every dossier page:

- The page must load the selected OC details first or show a clear loading state.
- The page must save only records belonging to the selected OC.
- The page must reload saved records after create/edit/delete.
- The page must preserve existing rows not touched by the current edit.
- Errors should identify the failing section or row.
- Historical semester locks must be respected where implemented.

### 10.3 Data ownership detail

Profile and identity:

- OC name, TES number, course, branch, platoon, and active lifecycle are canonical OC/lifecycle data.
- Personal/contact/free-form imported profile fields live in personal/profile data.
- Structured background rows are separate detailed records.

Training and assessment:

- PT, weapon, obstacle, speed march, camps, clubs, drill, OLQ, interviews, CFE, medical, discipline, counselling, and communication records are dedicated domain records.
- Reports and graphs should summarize these records, not replace them.

### 10.4 Semester handling

When a page uses semester context:

- Query parameter aliases should normalize to the supported semester parameter where implemented.
- Current semester should be derived from lifecycle/course context.
- Historical semester lock should protect restricted edits.
- Save actions should write against the intended semester only.

QA checks:

- Open current semester.
- Open a historical semester.
- Try an invalid semester query.
- Confirm redirect/normalization/lock behavior.

### 10.5 Dossier troubleshooting

| Symptom | Likely cause | Check |
|---|---|---|
| Page header shows wrong OC | Wrong URL ID, stale cache, or corrupted OC row | Check `/api/v1/oc/:ocId` response and OC Management. |
| Page table is empty after save | Query invalidation/refetch missing or save failed | Check network response and DB row. |
| Form options missing | Management/template setup incomplete | Check PT, OLQ, camp, interview, subject, or punishment setup. |
| User can open wrong OC | Scope/access issue | Check appointment scope and server page auth. |
| Report does not include dossier entry | Report source mapping incomplete or filter excludes OC | Check report filters and source domain table. |
| Edit disabled unexpectedly | Dossier lock or historical semester | Check dossier lock settings and current semester. |
