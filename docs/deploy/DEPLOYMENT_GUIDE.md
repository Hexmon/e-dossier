# Deployment Guide

## Current Recommended Production Model

Use the air-gapped tar-based release flow:

- [AIRGAP_RUNTIME_DEPLOYMENT.md](AIRGAP_RUNTIME_DEPLOYMENT.md)
- [AIRGAP_VM1_BOOTSTRAP.md](AIRGAP_VM1_BOOTSTRAP.md)
- [AIRGAP_SCHEMA_RELEASE.md](AIRGAP_SCHEMA_RELEASE.md)

That flow standardizes production as:

- `VM1`: app runtime + `systemd` + Nginx
- `VM2`: Postgres + MinIO

It avoids:

- cloning the full repo on the production app VM
- running `pnpm install` and `pnpm build` on VM1
- replacing the whole app VM for each release

## Legacy Source-Checkout Automation

The older helper scripts below are still present for reference and internet-connected environments, but they are no longer the primary production path for air-gapped installs:

- `docs/deploy/edossier_db_setup.sh`
- `docs/deploy/edossier_app_setup.sh`

Those scripts assume a source checkout and package installation workflow on the target host.
