# Air-Gapped Schema Release Runbook

Use this only when a release includes database schema changes.

Normal app-only releases do **not** require this step.

## Build The Migration Bundle

On the trusted build machine:

```bash
pnpm install --frozen-lockfile
pnpm run release:airgap:migrations
```

Artifacts are written to:

```bash
.artifacts/airgap/migrations/e-dossier-migrations-<version>.tar.gz
.artifacts/airgap/migrations/e-dossier-migrations-<version>.tar.gz.sha256
```

## Bundle Contents

- `drizzle/*.sql`
- `drizzle/meta/_journal.json`
- `migrate.js`
- `release-manifest.json`
- this runbook

## Pre-Release Safety Requirement

Take a database backup or checkpoint before applying the migration bundle.

The operator must pass a backup identifier when running the offline migration command.

## Apply On VM1

Transfer the bundle and checksum to VM1, then run:

```bash
sudo edossier-migrate --backup-id <backup-reference> /path/to/e-dossier-migrations-<version>.tar.gz
```

The command will:

- verify `SHA256`
- load the shared app env from `/opt/edossier/shared/app.env`
- read `DATABASE_URL`
- apply only pending migrations from the Drizzle journal
- update `drizzle.__drizzle_migrations`

## Release Order

For schema releases, use this order:

1. Take DB backup/checkpoint.
2. Run `edossier-migrate`.
3. Deploy the paired app tar with `edossier-deploy`.
4. Verify `http://127.0.0.1/api/v1/health` on VM1.

## Failure Handling

- If the migration command fails, do **not** deploy the new app tar.
- Keep the current app release active.
- Investigate the failing migration against the backup/checkpoint you recorded.
