# Deployment And Environment

This guide covers runtime environment, Docker services, migrations, storage, security checks, and deployment verification.

## 1. Environment Files {#environment-files}

Route:

- `.env`
- `.env.development.example`

Who uses it:

- Developers, deployment operators, and QA.

What it manages:

- Database connection, app secrets, storage configuration, security toggles, and runtime URLs.

Main workflow:

1. Copy the development example for local work.
2. Fill real secrets locally or in deployment secret storage.
3. Keep production secrets out of committed files.
4. Validate startup with the target environment.

Important business rules:

- Production must not use placeholder secrets.
- Auth and CSRF secrets must be strong and environment-specific.
- Development-only token exposure must not be enabled in production.

Validation checklist:

- App boots with expected env file.
- Production env rejects missing/default security secrets.
- No private key or password is committed.

Related pages:

- `/dashboard/help/setup-guide#environment-files`

## 2. Docker Services {#docker-services}

Route:

- `deploy/docker-compose.data.yml`

Who uses it:

- Developers and QA running local/staging data services.

What it manages:

- PostgreSQL and MinIO service startup for local development and verification.

Main workflow:

1. Start data services with Docker Compose.
2. Check container health.
3. Run migrations.
4. Start the app.

Important business rules:

- DB commands require a reachable `DATABASE_URL`.
- MinIO/S3 env must match bucket and endpoint settings.
- Docker data services should be running before upload/report tests.

Validation checklist:

- `docker compose ... ps` shows services healthy.
- `pnpm db:migrate` succeeds.
- App can read/write DB and storage-backed flows.

Related pages:

- `/dashboard/help/setup-guide#start-data-services`

## 3. Database Migrations {#database-migrations}

Route:

- `drizzle/`
- `src/app/db/drizzle.config.ts`

Who uses it:

- Developers and deployment operators.

What it manages:

- Schema migration history and database alignment.

Main workflow:

1. Generate migrations only after intentional schema changes.
2. Review generated SQL.
3. Apply migrations with `pnpm run db:migrate`.
4. Verify DB invariants after data-sensitive changes.

Important business rules:

- Do not run generate/migrate as a guess after a successful migrate without reviewing generated SQL.
- Zero-loss data cleanup must not drop/truncate/delete OC data.
- Existing row counts and lifecycle invariants should be checked before and after sensitive migrations.

Validation checklist:

- Migration applies cleanly.
- No unexpected migration file is generated.
- OC zero-loss verification passes when OC tables are affected.

Related pages:

- `/dashboard/help/software-overview#oc-lifecycle-overview`

## 4. MinIO And Storage {#minio-and-storage}

Route:

- Storage-backed upload/presign APIs.

Who uses it:

- Operators managing logos, hero images, OC images, report media, and relegation media.

What it manages:

- S3-compatible file storage and signed upload/download behavior.

Main workflow:

1. Configure endpoint, credentials, and bucket.
2. Start MinIO or connect to production S3.
3. Use presign/upload flows from the UI.
4. Verify image/report/media retrieval.

Important business rules:

- Storage failures can break image upload, site settings asset upload, and media-backed features.
- Bucket/env mismatch should be fixed at deployment level, not hidden by UI.
- Signed URLs should be time-limited.

Validation checklist:

- Presign route returns success.
- Uploaded asset is visible after save.
- Missing bucket/config errors are clear.

Related pages:

- `/dashboard/help/settings-controls#device-site-settings`

## 5. Security Scan Commands {#security-scan-commands}

Route:

- `package.json`

Who uses it:

- Developers and release owners.

What it manages:

- Dependency audit, Semgrep, secret scanning, and ZAP checks.

Main workflow:

1. Run dependency audit.
2. Run Semgrep/security rules.
3. Run secret scan.
4. Run ZAP against a real running target when configured.

Important business rules:

- Report-only audit commands should not be used as the release gate.
- Secret scan allowlists should be narrow.
- ZAP requires a correct target URL and running app.

Validation checklist:

- `pnpm audit --audit-level=high`
- `pnpm security`
- Security CI does not silently skip required scans.
- Production cookies/secrets use hardened settings.

Related pages:

- `/dashboard/help/rbac-permissions#verification-commands`

## 6. Production Environment Hardening {#production-environment-hardening}

Route:

- Deployment environment.

Who uses it:

- Deployment operators and security reviewers.

What it manages:

- Production-only security and operational requirements.

Main workflow:

1. Use real secrets from secret storage.
2. Enable secure cookie behavior in production.
3. Configure reverse proxy headers safely.
4. Run full validation before handoff.

Important business rules:

- Missing/default CSRF or auth secrets should block production usage.
- Host and upgrade headers should not blindly trust attacker-controlled values.
- Production should not expose development tokens.

Validation checklist:

- Production app starts with secure env only.
- Security scans pass.
- Reverse proxy config avoids unsafe host/upgrade forwarding.

Related pages:

- `/dashboard/help/settings-controls`

## 7. Validation And Release Checks {#validation-and-release-checks}

Route:

- Project root command line.

Who uses it:

- Developers, QA, and release owners.

What it manages:

- Final confidence before handoff or deployment.

Main workflow:

1. Run focused tests for the changed feature.
2. Run full suite and validation scripts.
3. Run build.
4. Perform browser/API smoke for affected user flows.

Important business rules:

- Do not claim a feature works only because tests pass.
- Runtime/browser verification is required for user-visible workflow changes.
- DB-sensitive work needs DB before/after verification.

Validation checklist:

- `pnpm run validate:action-map`
- `pnpm run validate:api-tests`
- `pnpm run test`
- `pnpm run lint`
- `pnpm run typecheck`
- `pnpm run build`
- Relevant live API/browser smoke passes.

Related pages:

- `/dashboard/help/software-overview#using-this-manual`

## 8. Detailed Deployment Runbook {#detailed-deployment-runbook}

This runbook is for local QA, staging, and production-like deployment verification.

### 8.1 Local development baseline

Minimum local sequence:

1. Install Node and pnpm versions matching repo expectations.
2. Install Docker.
3. Copy `.env.development.example` to `.env`.
4. Fill required DB, storage, auth, and CSRF secrets.
5. Start Postgres and MinIO.
6. Run migrations.
7. Start app.
8. Open `/setup` or `/login` depending on database state.

Evidence:

- Docker service status.
- Migration output.
- App health/page load.
- Login/setup result.

### 8.2 Staging verification baseline

Before staging migration:

- Take database backup.
- Restore backup into disposable database.
- Run migration on disposable database.
- Run DB verification scripts for affected data areas.
- Run API smoke.
- Run browser smoke.

After staging migration:

- Compare row counts and invariants.
- Verify no expected page loses visible data.
- Verify module access and setup gate still work.
- Verify reports and upload flows if affected.

### 8.3 Production migration discipline

Production migration should be run only after:

- Staging migration passed.
- Restore procedure was tested.
- Rollback plan exists.
- Maintenance window is scheduled.
- Operators know expected-only data changes.

During production:

1. Put system into maintenance mode if required.
2. Take `pg_dump`.
3. Confirm backup file exists and is readable.
4. Apply migration.
5. Run DB verification.
6. Run smoke API checks.
7. Run critical browser checks.
8. Keep backup until post-checks pass.

### 8.4 Environment variable categories

| Category | Examples | Requirement |
|---|---|---|
| Database | `DATABASE_URL`, SSL flags | Must point to intended DB. |
| Auth/security | JWT keys, CSRF secret | Strong, environment-specific, no placeholders. |
| Storage | S3/MinIO endpoint, bucket, keys | Must match actual storage service. |
| App URLs | public base URL, API base URL | Must match deployed host/proxy. |
| Development toggles | token exposure/debug flags | Must not be enabled in production. |
| Security scans | ZAP target, scan tokens | Must use secrets, not public vars. |

### 8.5 Build and runtime checks

Build checks prove code compiles and routes can be bundled. Runtime checks prove the deployed system actually works.

Build checks:

- TypeScript.
- Lint.
- Next build.
- Static docs validation.
- Action-map/API coverage validation.

Runtime checks:

- Login.
- Setup gate.
- Navigation visibility.
- OC Management.
- Dossier page.
- Bulk upload dry-run.
- Report preview/download.
- Storage upload where configured.
- Security health endpoint where available.

### 8.6 Security hardening checklist

Before production:

- Production cookies are secure.
- CSRF secret is not missing/default.
- JWT keys are production keys.
- Login rate limiting and lockout are enabled.
- Dependency audit has no high blockers.
- Semgrep findings are reviewed/fixed.
- Secret scan is clean or allowlisted narrowly.
- ZAP target is explicitly configured for DAST.
- Reverse proxy does not forward unsafe host/upgrade headers.

### 8.7 Deployment troubleshooting

| Symptom | Likely cause | Check |
|---|---|---|
| `db:migrate` succeeds but `db:generate` creates huge migration | Schema/migration state mismatch | Do not apply blindly; inspect generated SQL and baseline state. |
| App 500 on root | Missing env, DB, or runtime dependency | Server logs, env values, DB connectivity. |
| Upload presign fails | Storage config mismatch | Endpoint, bucket, credentials, network. |
| Build fails only in sandbox | Tool IPC/filesystem restriction | Rerun exact command with approved escalation. |
| Login fails in production | Auth secret/key mismatch or lockout | JWT keys, cookies, lockout tables/logs. |
| Help route missing in build | Page/action-map/help index not wired | Route file and build route list. |
