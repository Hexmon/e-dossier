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

## Legacy Source-Checkout Automation

The older helper scripts below are still present for reference and internet-connected environments, but they are no longer the primary production path for air-gapped installs:

- `docs/operations/reference/legacy-source-checkout/edossier-db-setup.sh`
- `docs/operations/reference/legacy-source-checkout/edossier-app-setup.sh`

Those scripts assume a source checkout and package installation workflow on the target host.
