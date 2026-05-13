# General Management

This guide covers administrative modules under General Management.

## 1. Course Management {#course-management}

Route:

- `/dashboard/genmgmt/coursemgmt`

Who uses it:

- Admin and Super Admin.

What it manages:

- Course definitions, course dates, training model, and course-level records used by OCs, offerings, reports, and lifecycle workflows.

Main workflow:

1. Create or edit a course.
2. Confirm course code/number, start date, end date, and training model.
3. Use course records when assigning OCs, subjects, offerings, and templates.

Important business rules:

- Course data is referenced by OC placement, academic reports, PT templates, OLQ templates, and promotion/relegation.
- Avoid deleting or changing historical courses without checking existing OC enrollments.
- Course table pagination should fetch the next page from the API without a full page refresh.

Validation checklist:

- Course list paginates correctly.
- Course create/edit reflects after refresh.
- Course names/codes appear correctly in OC and report workflows.

Related pages:

- `/dashboard/genmgmt/subjectmgmt`
- `/dashboard/genmgmt/coursemgmt/[courseId]/offerings`

## 2. Subject And Offering Management {#subject-offering-management}

Route:

- `/dashboard/genmgmt/subjectmgmt`
- `/dashboard/genmgmt/coursemgmt/[courseId]/offerings`

Who uses it:

- Admin and academic management users.

What it manages:

- Subjects, course offerings, semester mapping, instructors, and assignable academic components.

Main workflow:

1. Create subjects.
2. Open a course offering page.
3. Add offerings for semester/course context.
4. Assign instructors or offering details as required.

Important business rules:

- Academic marks and reports depend on correct course/offering/semester mapping.
- Subject codes and names should remain stable once marks exist.
- Offerings must belong to the intended course.

Validation checklist:

- Subject appears in offering and marks screens.
- Offering semester matches the course structure.
- Academic reports include the expected subject rows.

Related pages:

- `/dashboard/manage-marks`
- `/dashboard/help/module-management#academics-management`

## 3. OC Management {#oc-management}

Route:

- `/dashboard/genmgmt/ocmgmt`

Who uses it:

- Admin and Super Admin.

What it manages:

- Officer Cadet identity, course, branch, platoon, lifecycle state, and uploaded profile data.

Main workflow:

1. Add an OC manually or upload OCs in bulk.
2. Set course, branch, platoon, arrival date, and personal identifiers.
3. View, edit, search, filter, and paginate OCs.
4. Open an OC into Dossier Management.

Important business rules:

- The OC name shown across the software comes from the canonical OC record.
- OC creation must create lifecycle enrollment and pre-commission compatibility records.
- Editing lifecycle fields must sync compatible snapshot data without losing prior conflicting values.
- Soft-deleted or test OCs should not appear in active OC lists.

Validation checklist:

- Add OC and refresh; the OC remains visible.
- Bulk upload success refreshes the list from API.
- Edit modal can edit uploaded Excel fields that are supported by the OC/profile model.
- Search and pagination preserve filters.

Related pages:

- `/dashboard/help/bulk-upload`
- `/dashboard/help/dossier-management`

## 4. User And Approval Management {#user-approval-management}

Route:

- `/dashboard/genmgmt/usersmgmt`
- `/dashboard/genmgmt/approvalmgmt`

Who uses it:

- Admin and Super Admin.

What it manages:

- Users, signup requests, approval status, rank, appointment context, and account activation.

Main workflow:

1. Review user or signup request.
2. Assign the correct appointment/position and scope.
3. Approve, reject, activate, disable, or update user details.
4. Confirm the user can sign in only with valid active authority.

Important business rules:

- Non-admin sign-in is disabled during initial setup.
- Approved users still need valid appointment/authority context for protected work.
- Username checks reserve system names and prevent duplicates.

Validation checklist:

- Signup approval creates the expected active user/appointment relationship.
- Disabled users cannot continue with protected workflows.
- Appointment context appears correctly in user listings.

Related pages:

- `/dashboard/genmgmt/appointmentmgmt`
- `/dashboard/help/rbac-permissions`

## 5. Appointment Management {#appointment-management}

Route:

- `/dashboard/genmgmt/appointmentmgmt`

Who uses it:

- Admin and Super Admin.

What it manages:

- Positions, appointment assignments, handover/takeover, served history, and appointment scope.

Main workflow:

1. Create or select an appointment position.
2. Assign a user and scope.
3. Use handover/takeover when an appointment changes holder.
4. Review active and historical appointment records.

Important business rules:

- Appointment scope can control platoon-level access.
- Current active appointment context is included in login/session authority.
- Default appointment template can create baseline positions and assignments where matching users/platoons exist.

Validation checklist:

- Active holder displays correctly.
- Previous holder moves to history after handover.
- Platoon-scoped appointment uses the intended platoon.

Related pages:

- `/dashboard/help/admin-operations`
- `/dashboard/help/org-templates#appointment-default-template`

## 6. Hierarchy Management {#hierarchy-management}

Route:

- `/dashboard/genmgmt/hierarchy`

Who uses it:

- Admin and Super Admin configuring command/reporting structure.

What it manages:

- Organization hierarchy nodes and functional role mappings.

Main workflow:

1. Define the hierarchy structure.
2. Add root and child nodes in the required order.
3. Map functional roles where command responsibility differs from strict tree placement.
4. Review the tree/graph view for expected reporting path.

Important business rules:

- Hierarchy setup should happen after positions and appointments exist.
- Platoon commander and other scoped roles must map to the correct platoon/user context.
- Setup mode should not allow sidebar bypass while editing hierarchy.

Validation checklist:

- Tree shows the expected root and child structure.
- Functional role mapping resolves to the expected user/appointment.
- Page does not trigger maximum update depth errors.

Related pages:

- `/dashboard/help/rbac-permissions`
- `/dashboard/genmgmt/appointmentmgmt`

## 7. Instructor And Platoon Management {#instructor-platoon-management}

Route:

- `/dashboard/genmgmt/instructors`
- `/dashboard/genmgmt/platoon-management`

Who uses it:

- Admin and training staff.

What it manages:

- Instructor records, platoon details, commander history, images, and platoon metadata.

Main workflow:

1. Create platoons or apply default platoon template.
2. Maintain commander history through appointment changes.
3. Create instructor records and assignments.
4. Use platoon selection in OC and scope-based workflows.

Important business rules:

- Platoon keys should remain stable once used in assignments.
- Commander history is derived from appointment changes and should be reviewed after handover.
- Setup returns to `/setup` after platoon work when setup is incomplete.

Validation checklist:

- Default platoon template creates the six baseline platoons.
- Commander history matches appointment changes.
- Platoon dropdowns show active platoons only.

Related pages:

- `/dashboard/help/org-templates#platoon-default-template`
- `/dashboard/help/setup-guide`

## 8. Promotion And Relegation {#promotion-relegation}

Route:

- `/dashboard/genmgmt/promotion-relegation`
- `/dashboard/genmgmt/promotion-relegation/relegation`
- `/dashboard/genmgmt/promotion-relegation/promote-course`

Who uses it:

- Admin and academic/training authorities managing course lifecycle changes.

What it manages:

- OC promotion, relegation, course transfer, exception handling, module history, and supporting media.

Main workflow:

1. Select OC or course.
2. Review enrollment/module state.
3. Apply relegation, transfer, promotion, exception, or void action.
4. Confirm lifecycle and dossier records remain reachable.

Important business rules:

- Enrollment records are lifecycle-critical and must not be overwritten silently.
- Dossier/training records linked to enrollments must remain reachable after lifecycle changes.
- Conflict or exception handling should preserve audit trail.

Validation checklist:

- OC enrollment history shows the expected sequence.
- Course transfer updates active lifecycle state.
- Existing child records remain visible after promotion/relegation.

Related pages:

- `/dashboard/help/dossier-management`
- `/dashboard/help/software-overview#oc-lifecycle-overview`

## 9. Report Verification {#report-verification}

Route:

- `/dashboard/genmgmt/report-verification`

Who uses it:

- Admin, verification staff, and report consumers.

What it manages:

- Downloaded report version-code verification and optional PDF checksum match.

Main workflow:

1. Enter version code from a downloaded PDF.
2. Optionally upload the PDF.
3. Click verify.
4. Review authenticity result.

Important business rules:

- Version code can validate that the report was generated by the system.
- Uploaded file checksum allows exact file verification.
- Edited or re-exported PDFs may fail exact checksum even if the version code exists.

Validation checklist:

- Valid version code returns an authentic result.
- Wrong code returns not authentic.
- Uploaded mismatched file is reported clearly.

Related pages:

- `/dashboard/help/reports`
- `/dashboard/help/admin-operations#verify-downloaded-report-pdf`

## 10. Detailed General Management Reference {#detailed-general-management-reference}

Use this section when validating General Management with QA or while onboarding a new admin.

### 10.1 Recommended setup order

The safest order for a fresh instance is:

1. Course Management
2. Subject Management
3. Course Offerings
4. Platoon Management
5. User Management
6. Appointment Management
7. Hierarchy Management
8. OC Management
9. Module templates such as PT, OLQ, camps, grading policy
10. Reports and verification

Reasoning:

- OCs need course and platoon context.
- Appointment and hierarchy setup need users, positions, and platoons.
- Dossier and reports need OCs with lifecycle records.
- Bulk uploads need target setup data to resolve values.

### 10.2 Course detail checklist

When creating or editing a course, verify:

- Course code/name is unique enough for operators to identify it.
- Start and end dates reflect the training lifecycle.
- Training model value matches the intended course structure.
- Course remains active when OCs are still enrolled.
- Course appears in OC Management, Reports, Bulk Upload, PT Management, OLQ Management, and academic offering screens.

Do not change:

- Historical course identifiers casually after marks, reports, or enrollments exist.
- Course dates without checking promotion/relegation and report date assumptions.

### 10.3 Subject and offering detail checklist

Subject records should be checked for:

- Subject code.
- Subject name.
- Whether the subject belongs to the intended academic grouping.
- Whether it appears in offerings and marks entry.

Offering records should be checked for:

- Course.
- Semester.
- Subject.
- Instructor assignment where supported.
- Marks/report visibility.

If marks are missing from reports, verify offering setup before editing report logic.

### 10.4 OC Management data detail

OC Management is the operational starting point for cadet records.

Core identity values:

- OC internal ID.
- TES number/OC number.
- Name.
- Course.
- Branch.
- Platoon.
- Arrival date.
- Active/deleted lifecycle state.

Imported personal/profile values may include:

- Email.
- Mobile.
- PAN.
- Aadhaar.
- UPSC roll number.
- Blood group.
- SSB centre.
- Games/hobbies.
- Father, guardian, NOK, address, and related free-form values.

Lifecycle-linked values:

- Active course enrollment.
- Course ID on enrollment.
- Current semester/status where supported.
- Withdrawn/relegated/pass-out related fields where supported.

Zero-loss rules:

- Manual and bulk creation should use the same lifecycle helper.
- If enrollment or pre-commission rows are missing, repair should create them.
- If duplicate compatibility values conflict, audit first and then sync.
- No OC cleanup should delete historical domain records.

### 10.5 Bulk OC edit expectations

When editing an OC after Excel upload:

- The edit surface should expose all supported uploaded fields.
- Unsupported fields should be documented, not silently hidden as if lost.
- Saving should update canonical and profile tables according to ownership.
- OC list and OC detail should refresh after save.
- Dossier pages should display the updated values from the correct source.

For multi-select platoon assignment:

- User selects one or more OCs or all filtered OCs.
- User selects target platoon.
- UI confirms affected count before apply.
- Backend should update only selected active OCs.
- Lifecycle and snapshot compatibility should sync safely.

### 10.6 User, approval, and appointment detail

User Management handles identity and activation; Appointment Management handles operational authority.

Check these separately:

- A user can exist without an active operational appointment.
- An active appointment can grant the session context used after login.
- A signup approval should assign the intended position and scope.
- A disabled user should not retain dashboard access.
- Handover should close the previous holder and activate the new holder.

Appointment scope examples:

| Scope | Expected behavior |
|---|---|
| Global | Can operate across the configured module area, subject to role/permission. |
| Platoon | Should be limited to the assigned platoon where scoped checks are implemented. |
| Course | Should be limited to course workflows where supported. |

### 10.7 Hierarchy detail

Hierarchy Management represents command/reporting structure, not just a visual tree.

Verify:

- Root node represents the top command post for this installation.
- Child nodes follow actual reporting order.
- Platoon commanders appear under the correct parent when configured.
- Functional role mappings are used only when functional responsibility differs from simple parent/child placement.
- Drag/reorder or edit operations do not create cycles or orphan visible nodes.

The hierarchy should be tested with:

- A fresh default template.
- A manual tree edit.
- A user assigned to a position in the tree.
- Return-to-setup navigation if setup is incomplete.

### 10.8 Promotion/relegation detail

Promotion and relegation are lifecycle operations. They should be treated as high-risk data operations.

Before changing lifecycle:

- Confirm source course.
- Confirm target course.
- Confirm OC identity.
- Confirm current active enrollment.
- Confirm existing marks/training records remain reachable.
- Capture reason/date/supporting document where required.

After changing lifecycle:

- Active enrollment should reflect the new lifecycle state.
- History should show the transition.
- Dossier pages should still open.
- Reports should include/exclude the OC according to current filter rules.

### 10.9 General Management QA matrix

| Module | Create | Edit | Delete/disable | Search/filter | Refresh | Cross-module check |
|---|---|---|---|---|---|---|
| Courses | Yes | Yes | Carefully | Yes | Required | OC, reports, offerings |
| Subjects | Yes | Yes | Carefully | Yes | Required | Offerings, academics |
| OCs | Yes | Yes | Soft-delete only where supported | Yes | Required | Dossier, reports |
| Users | Yes | Yes | Disable | Yes | Required | Login, appointment |
| Appointments | Yes | Handover | End/transfer | Yes | Required | Login authority |
| Hierarchy | Yes | Yes | Carefully | Visual review | Required | RBAC/scope |
| Platoons | Yes | Yes | Carefully | Yes | Required | OC, appointments |
| Promotion/relegation | Transactional action | Exception/void | Not casual | Yes | Required | Dossier records |
| Report verification | Not applicable | Not applicable | Not applicable | Version lookup | Required | Downloaded PDFs |
