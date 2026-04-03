# Air-Gapped Runtime Deployment

This project does not need to be deployed by cloning the full source repository onto the customer VM.

The recommended on-prem deployment model is:

1. Build the runtime bundle on a trusted internal build machine.
2. Transfer the generated `.tar.gz` file to the air-gapped application VM.
3. Run the compiled standalone server with the production `.env` file.

## What The Runtime Bundle Contains

- compiled Next.js standalone server
- traced production `node_modules`
- `.next/static`
- `public/`
- `docs/help/`
- `.env.production.example`
- this deployment guide

It does **not** include the full repository source tree, tests, git history, or dev tooling.

## Build The Runtime Bundle

Run this on your internal build machine:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm run package:runtime
```

Artifacts are written to:

```bash
.artifacts/runtime/e-dossier-runtime.tar.gz
.artifacts/runtime/e-dossier-runtime.tar.gz.sha256
```

## Transfer To The App VM

Copy the archive and checksum to the application VM over your approved internal transfer method.

Example:

```bash
scp .artifacts/runtime/e-dossier-runtime.tar.gz* ops@app-vm:/opt/edossier/
```

## Install On The App VM

Install Node.js 20+ on the target VM, then:

```bash
sudo mkdir -p /srv/edossier-app
cd /srv/edossier-app
sudo tar -xzf /opt/edossier/e-dossier-runtime.tar.gz
cd e-dossier-runtime
sudo cp .env.production.example .env
sudo chown -R "$USER":"$USER" /srv/edossier-app/e-dossier-runtime
```

Edit `.env` and set at least:

- `DATABASE_URL`
- `NEXT_PUBLIC_API_BASE_URL`
- `MINIO_ENDPOINT`
- `MINIO_PUBLIC_URL`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `CSRF_SECRET`
- admin/superadmin credentials

## Start The App

For a manual start:

```bash
HOSTNAME=0.0.0.0 PORT=3000 NODE_ENV=production node server.js
```

Or with `systemd`:

```ini
[Unit]
Description=E-Dossier Runtime
After=network.target

[Service]
Type=simple
User=nextapp
WorkingDirectory=/srv/edossier-app/e-dossier-runtime
EnvironmentFile=/srv/edossier-app/e-dossier-runtime/.env
Environment=HOSTNAME=0.0.0.0
Environment=PORT=3000
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

## Important Notes

- This runtime bundle is for running the app, not for development.
- `pnpm install`, `pnpm build`, and Git checkout are **not** required on the customer VM.
- Database migrations should be executed as a controlled release step from your trusted environment. Do not rely on the customer VM having the full development toolchain.
- If you regenerate the bundle, replace the extracted `e-dossier-runtime` directory atomically during deployment.

## Why This Works

Next.js standalone output copies the production server and traced runtime dependencies into `.next/standalone`. Static assets still need to be copied alongside it. The runtime packaging script automates that step for this project.

Reference:
- Next.js self-hosting / standalone output: https://nextjs.org/docs/15/app/api-reference/config/next-config-js/output
