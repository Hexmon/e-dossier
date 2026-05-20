# Admin Operations

This guide covers day-to-day admin workflows for user, approval, appointment, platoon, and report verification operations.

## 1. User Management {#user-management}

Route:

- `/dashboard/genmgmt/usersmgmt?tab=Gen+Mgmt`

What to check:

- Username and rank are correct.
- Active/disabled status is correct.
- Appointment context is visible from admin listings.

## 2. Approval Management {#approval-management}

Route:

- `/dashboard/genmgmt/approvalmgmt?tab=Gen+Mgmt`

What to check:

- Correct position and scope are selected before approval.
- Platoon-scoped requests include correct platoon context.

## 3. Appointment Management {#appointment-management}

Route:

- `/dashboard/genmgmt/appointmentmgmt?tab=Gen+Mgmt`

What to check:

- Active appointments show in current table.
- Handover/takeover updates move records into history correctly.
- Position and platoon labels match current assignment.
- Use `Preview Changes (Dry Run)` and `Apply Default Appointment Template` to bootstrap default appointment slots/users.

## 4. Platoon Management {#platoon-management}

Route:

- `/dashboard/genmgmt/platoon-management?tab=Gen+Mgmt`

What to check:

- Platoon details are current.
- Commander history reflects latest appointment changes.
- Use `Preview Changes (Dry Run)` and `Apply Default Platoon Template` to bootstrap the six baseline platoons.

## 5. Verify Downloaded Report PDF {#verify-downloaded-report-pdf}

Route:

- `/dashboard/genmgmt/report-verification?tab=Gen+Mgmt`

Steps:

1. Enter the report `Version Code` from the downloaded PDF.
2. (Optional but recommended) upload the same PDF file.
3. Click `Verify`.

Result meanings:

- `AUTHENTIC_EXACT`: code exists and uploaded PDF checksum matches.
- `AUTHENTIC_CODE_ONLY`: code exists but uploaded file not provided or checksum not available.
- `NOT_AUTHENTIC`: code not found or uploaded file does not match stored checksum.

Why mismatch may happen:

- File content was edited.
- PDF was re-exported by another tool (byte content changed).
- Wrong file uploaded against a valid code.

## 6. Detailed Admin Operations Checklist {#detailed-admin-operations-checklist}

Use this checklist for routine admin QA and handoff.

### 6.1 User lifecycle

Create/update user:

- Confirm username is unique and not reserved.
- Confirm rank/name fields are correct.
- Confirm active/disabled status.
- Confirm appointment context separately from user identity.

Approve signup:

- Confirm requested identity.
- Confirm selected position.
- Confirm selected scope.
- Approve only after scope and position are correct.
- Verify user can sign in only after approval and setup completion.

Disable user:

- Confirm user is no longer able to access dashboard.
- Confirm active appointments are handled according to local policy.
- Verify audit/history if available.

### 6.2 Appointment handover/takeover

Before handover:

- Identify current holder.
- Identify incoming holder.
- Confirm position key and display name.
- Confirm scope.
- Confirm handover date.

After handover:

- Current table shows new holder.
- Served history contains previous holder.
- Login/session for previous holder no longer grants the old appointment.
- Commander history updates if the appointment is platoon commander scoped.

### 6.3 Platoon operations

When editing platoons:

- Keep stable keys for existing platoons.
- Update display name/about/theme carefully.
- Verify public platoon page if public display is enabled.
- Verify commander history after appointment changes.
- Verify OC assignment dropdowns.

### 6.4 Report verification operations

When a report is disputed:

1. Ask for the PDF and version code.
2. Verify the version code.
3. Upload the PDF for exact checksum where possible.
4. Compare result.
5. If mismatch, re-download from the system and verify again.

Record:

- Version code.
- Result status.
- Whether file upload was used.
- Operator username.
- Date/time.

### 6.5 Admin smoke checklist

After a deployment or admin feature change:

- User list loads.
- Signup request list loads.
- Appointment current/history lists load.
- Platoon list and commander history load.
- Report verification accepts a known valid code.
- Module access disabled paths are blocked for Admin.
