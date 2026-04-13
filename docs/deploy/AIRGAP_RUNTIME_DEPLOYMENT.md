# Air-Gapped App Runtime Deployment

This is the primary production deployment path for on-prem and air-gapped installs.

The target topology is:

- `VM1`: Next.js runtime + `systemd` + Nginx
- `VM2`: PostgreSQL + MinIO

The app VM no longer needs:

- a full Git checkout
- `pnpm install`
- `pnpm build`
- repo-local source code for normal releases

## Release Model

1. Build a versioned app bundle on a trusted build machine.
2. Transfer the `.tar.gz` and `.sha256` files to VM1 by your approved offline method.
3. Deploy on VM1 with `edossier-deploy`.
4. Keep the shared production env outside release folders.
5. Roll back by switching the active release symlink instead of replacing the VM.

## Build The App Bundle

Run this on the build machine:

```bash
pnpm install --frozen-lockfile
pnpm run release:airgap:app
```

Artifacts are written to:

```bash
.artifacts/airgap/app/e-dossier-app-<version>.tar.gz
.artifacts/airgap/app/e-dossier-app-<version>.tar.gz.sha256
```

## What The App Bundle Contains

- compiled Next.js standalone server
- traced production runtime dependencies
- `.next/static`
- `public/`
- `docs/help/`
- `.env.production.example`
- `release-manifest.json`
- `deploy-metadata.json`
- this deployment guide

It does **not** include the full repo, tests, git history, or development tooling.

## One-Time VM1 Bootstrap

Before the first release, prepare VM1 once:

1. Install `Node.js 20+`, `nginx`, and `psql` using your approved offline package process.
2. Copy the bootstrap assets from `deploy/airgap/` to VM1.
3. Run:

```bash
sudo ./edossier-vm1-bootstrap.sh
```

The bootstrap step:

- installs `edossier-deploy` and `edossier-migrate` to `/usr/local/bin`
- renders the `systemd` service
- renders the Nginx site
- creates:
  - `/opt/edossier/releases`
  - `/opt/edossier/shared`
  - `/opt/edossier/shared/app.env`
- configures the app to proxy MinIO through VM1

Detailed bootstrap notes are in [AIRGAP_VM1_BOOTSTRAP.md](AIRGAP_VM1_BOOTSTRAP.md).

## Shared Production Env

The stable env file on VM1 is:

```bash
/opt/edossier/shared/app.env
```

Set at least:

- `DATABASE_URL`
- `NEXT_PUBLIC_API_BASE_URL=http://<VM1-IP>`
- `MINIO_ENDPOINT=http://<VM1-IP>/media`
- `MINIO_PUBLIC_URL=http://<VM1-IP>/media`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `CSRF_SECRET`
- admin/superadmin credentials

Using the VM1 `/media` proxy for both `MINIO_ENDPOINT` and `MINIO_PUBLIC_URL` keeps browser uploads and downloads on the same origin, which matches the production CSP.

## Deploy On VM1

Transfer the app bundle and checksum to VM1, then run:

```bash
sudo edossier-deploy /path/to/e-dossier-app-<version>.tar.gz
```

The deploy command will:

- verify `SHA256`
- extract the bundle into a timestamped release directory
- link the shared env into the release
- update `/opt/edossier/current`
- restart `edossier-app.service`
- call the local health endpoint
- keep the newest 3 releases

## Rollback

List available releases:

```bash
sudo edossier-deploy list
```

Rollback to the previous release:

```bash
sudo edossier-deploy rollback
```

Rollback to a specific release:

```bash
sudo edossier-deploy rollback 20260413T123000Z-e-dossier-app-0.1.0
```

## Schema Releases

Schema changes are handled separately from normal app tar deployment.

Build the migration bundle on the trusted build machine:

```bash
pnpm run release:airgap:migrations
```

Then on VM1:

```bash
sudo edossier-migrate --backup-id <backup-reference> /path/to/e-dossier-migrations-<version>.tar.gz
```

The migration bundle runbook is documented in [AIRGAP_SCHEMA_RELEASE.md](AIRGAP_SCHEMA_RELEASE.md).

## Operational Notes

- `systemd` runs the app from `/opt/edossier/current`.
- Nginx listens on port `80`.
- Nginx proxies `/` to `127.0.0.1:3000`.
- Nginx proxies `/media/` to MinIO on VM2.
- App-to-DB traffic must be allowed from VM1 to VM2 on `5432/tcp`.
- App-to-MinIO traffic must be allowed from VM1 to VM2 on `9000/tcp`.

## Legacy Flow

The older source-checkout deployment path remains documented only for reference. It is no longer the recommended production model for air-gapped installs.
