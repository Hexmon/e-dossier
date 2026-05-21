# OC Zero-Loss Verification

This runbook verifies the OC cleanup without deleting or dropping OC data.

## Canonical Ownership

- `oc_cadets`: OC identity and current placement.
- `oc_course_enrollments`: lifecycle and current semester.
- `oc_pre_commission`: compatibility snapshot only.
- `oc_personal`: imported/profile/contact data.
- Domain tables: detailed dossier and training records.

## Required Local Gate

Run against Docker Postgres with the app environment loaded:

```bash
pnpm run db:verify:oc-reconciliation
pnpm run db:verify:zero-loss
pnpm run verify:oc-db-integration
pnpm run verify:oc-live-api-smoke
pnpm run verify:oc-frontend-smoke
```

Generated DB evidence is written to `.artifacts/oc-zero-loss/<timestamp>/` and stays out of git.

## Pre/Post Migration Gate

```bash
pnpm run db:verify:zero-loss -- --phase pre --out .artifacts/oc-zero-loss/pre
pnpm run db:migrate
pnpm run db:verify:zero-loss -- --phase post --out .artifacts/oc-zero-loss/post --compare-to .artifacts/oc-zero-loss/pre
```

The post run fails if any OC-related row count decreases, if active OCs lack exactly one active enrollment, if snapshots are missing, if conflicts remain, or if unexpected tables changed.

## Health Endpoint

Admins can call:

```text
GET /api/v1/admin/oc-data-health
```

It returns the same zero-loss counts used by the DB gate: active OC count, enrollment cardinality failures, missing snapshots, conflict counts, orphan counts, audit rows, and `gatePassed`.
