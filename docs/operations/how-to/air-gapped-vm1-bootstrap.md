# VM1 Bootstrap Runbook

Use this once per application VM before the first offline release.

## Purpose

Bootstrap prepares VM1 to accept versioned app tar deployments without cloning the repository on the production host.

It installs the stable runtime scaffolding:

- `/usr/local/bin/edossier-deploy`
- `/usr/local/bin/edossier-migrate`
- `/etc/systemd/system/edossier-app.service`
- `/etc/nginx/sites-available/edossier.conf`
- `/opt/edossier/releases`
- `/opt/edossier/shared/app.env`

## Prerequisites

Install these on VM1 through your approved offline package process before running the bootstrap script:

- `Node.js 20+`
- `nginx`
- `postgresql-client` (`psql`)
- `systemd`

## Script Location

The bootstrap script lives at:

```bash
deploy/airgap/edossier-vm1-bootstrap.sh
```

Copy the entire `deploy/airgap/` folder to VM1 so the script can read the bundled templates and helper commands.

## Run The Bootstrap

```bash
sudo ./edossier-vm1-bootstrap.sh
```

The script prompts for:

- application service user
- application root directory
- public app origin, for example `http://172.22.128.57`
- private MinIO origin on VM2, for example `http://172.22.128.56:9000`

## Resulting Runtime Model

- `systemd` runs the app from `/opt/edossier/current`
- app binds to `127.0.0.1:3000`
- Nginx serves users on port `80`
- Nginx proxies `/media/` to MinIO on VM2
- `/opt/edossier/shared/app.env` remains stable across releases

## Required Env Values After Bootstrap

Edit `/opt/edossier/shared/app.env` and set real production values before the first deploy.

Important values:

- `DATABASE_URL`
- `NEXT_PUBLIC_API_BASE_URL=http://<VM1-IP>`
- `MINIO_ENDPOINT=http://<VM1-IP>/media`
- `MINIO_PUBLIC_URL=http://<VM1-IP>/media`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `CSRF_SECRET`
- admin/superadmin credentials

## First Release

After bootstrap and env configuration:

```bash
sudo edossier-deploy /path/to/e-dossier-app-<version>.tar.gz
```
