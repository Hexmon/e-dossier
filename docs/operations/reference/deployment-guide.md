# Deployment Guide

## Current Recommended Production Model

Use the air-gapped tar-based release flow:

- [air-gapped-app-runtime-deployment.md](../how-to/air-gapped-app-runtime-deployment.md)
- [air-gapped-vm1-bootstrap.md](../how-to/air-gapped-vm1-bootstrap.md)
- [air-gapped-schema-release.md](../how-to/air-gapped-schema-release.md)

That flow standardizes production as:

- `VM1`: app runtime + `systemd` + Nginx
- `VM2`: Postgres + MinIO

It avoids:

- cloning the full repo on the production app VM
- running `pnpm install` and `pnpm build` on VM1
- replacing the whole app VM for each release

## Docker-Based VM1 Alternative

If the app VM should not install host Nginx, host Node.js, or the PostgreSQL
client, use the Docker VM1 runbook instead:

- [air-gapped-vm1-docker-bootstrap.md](../how-to/air-gapped-vm1-docker-bootstrap.md)

That model still uses the same VM split:

- `VM1`: Docker Engine + Compose, app container, Nginx container
- `VM2`: Postgres + MinIO

VM1 still needs Docker installed on the host. The application runtime, Nginx,
and migration tooling run inside containers.

## Legacy Source-Checkout Automation

The older helper scripts below are still present for reference and internet-connected environments, but they are no longer the primary production path for air-gapped installs:

- `docs/operations/reference/legacy-source-checkout/edossier-db-setup.sh`
- `docs/operations/reference/legacy-source-checkout/edossier-app-setup.sh`

Those scripts assume a source checkout and package installation workflow on the target host.
