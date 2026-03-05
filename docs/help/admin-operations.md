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
