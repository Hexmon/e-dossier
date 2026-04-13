# Delete Policy

This document records the intended delete behavior for the main OC and historical-data entities after Phase 6.

## Policy Matrix

| Entity / domain | Current policy | Notes |
| --- | --- | --- |
| `oc_cadets` | Archive only | `DELETE /api/v1/oc/[ocId]` sets `deleted_at`, marks `status = INACTIVE`, and preserves dependent history. |
| First-level OC-owned tables | `ON DELETE RESTRICT` from `oc_cadets` | Root cadet deletion must not wipe historical business data. |
| `oc_course_enrollments` | Restrict from `oc_cadets`; status lifecycle | Enrollment history remains status-driven (`ACTIVE` / `ARCHIVED` / `VOIDED`). |
| `oc_medicals` | Soft delete | Historical medical root rows use `deleted_at`. |
| `oc_medical_category` | Soft delete | Historical medical-category root rows use `deleted_at`. |
| `oc_discipline` | Soft delete | Historical discipline rows use `deleted_at`. |
| `oc_parent_comms` | Soft delete | Historical parent-communication rows use `deleted_at`. |
| `oc_ssb_reports` | Soft delete | Historical SSB root rows use `deleted_at`; `oc_ssb_points` remain safe-child cascade from the report. |
| `dossier_inspections` | Soft delete | Historical dossier inspection rows use `deleted_at`. |
| `oc_interviews` | Soft delete | Historical interview root rows use `deleted_at`; interview field/group rows remain safe-child cascade from the interview. |
| `oc_personal` | Hard delete / reset | Current snapshot/profile row, not preserved as history in this phase. |
| `oc_family_members` | Hard delete / reset | Profile composition data. |
| `oc_education` | Hard delete / reset | Profile composition data. |
| `oc_achievements` | Hard delete / reset | Profile composition data. |
| `oc_autobiography` | Hard delete / reset | Snapshot/profile row. |
| `oc_dossier_filling` | Hard delete / reset | Snapshot/profile row. |
| Semester/training rows already using `deleted_at` | Keep existing soft delete | Includes semester marks, motivation awards, sports and games, weapon training, special firing, obstacle training, speed march, drill, credit for excellence, clubs, leave/hike/detention, counselling, camps. |
| Safe-child composition rows | Cascade from preserved parent | Includes `oc_ssb_points`, interview field/group rows, camp review/activity rows, OLQ scores. |

## Root OC Rules

- Archived OCs are hidden from normal operational reads and counts.
- Archived OCs return `404` for direct OC detail and child OC routes.
- Archived OCs still reserve identity for duplicate prevention and must not be silently recreated by bulk upload.
- No restore flow exists in Phase 6.

## FK Rules

- Direct foreign keys from `oc_cadets.id` use `RESTRICT`.
- Cascades are allowed only below preserved historical root rows where the child rows are pure composition data.
