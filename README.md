# e-dossier-v2

## Project Details
- Next.js 15 app (App Router) written in TypeScript
- PostgreSQL database accessed via Drizzle ORM
- OC images stored in MinIO (S3-compatible)
- Backend APIs live under `/api/v1`

## Prerequisites
- Node.js ≥ 20 (check with `node -v`)
- pnpm ≥ 9 (check with `pnpm -v`)
- Docker (for Postgres/MinIO)

## Getting Started (New Developers)

### Step 1: Clone the Repository

**macOS/Linux:**
```bash
git clone https://github.com/your-org/e-dossier.git
cd e-dossier
```

**Windows (PowerShell):**
```powershell
git clone https://github.com/your-org/e-dossier.git
cd e-dossier
```

> ⚠️ Git hooks may not be configured automatically on every machine after clone.
> After cloning, run `pnpm install` (this repository runs a `postinstall` that configures hooks), or run `pnpm run setup:git-hooks` manually to enable the hooks.

### Step 2: Install Dependencies

```bash
pnpm install
```

### Step 3: Verify Setup

**macOS/Linux/Windows (All Terminals):**
```bash
# Verify hooks are configured (if not, run the setup command below)
git config core.hooksPath
# If configured, output should be: .githooks

# List the hooks
ls -la .githooks/
# Should show: pre-push, post-checkout, .gitkeep
```

**Windows (PowerShell alternative):**
```powershell
git config core.hooksPath
# Should output: .githooks

dir .\.githooks\
# Should show: pre-push, post-checkout, .gitkeep
```

### Step 4: Start Developing

```bash
git checkout -b feature/my-feature
# Make your changes...
git add .
git commit -m "feat: add something"
git push origin feature/my-feature

# ✅ Hooks automatically run: lint → typecheck → build
# If any checks fail, fix errors and push again
```

### Existing Developers: Pull Master

If you're already working on this project, pull master to get the updated hooks:

```bash
git pull origin master
# → post-checkout hook runs
# → Hooks are ready for your next push

git checkout -b feature/whatever
git push origin feature/whatever
# ✅ Hooks automatically enforce quality
```

### Troubleshooting: Hooks Not Running

If hooks don't trigger on push, the quickest fixes are:

- Run the setup script installed by `postinstall`:

```bash
pnpm install
# or run the setup directly:
pnpm run setup:git-hooks
```

- Manual commands (if you prefer not to run the script):

```bash
# macOS / Linux
git config core.hooksPath .githooks
chmod +x .githooks/pre-push .githooks/post-checkout || true

# Windows (PowerShell)
git config core.hooksPath .githooks
git update-index --add --chmod=+x .githooks/pre-push .githooks/post-checkout
```

For more details, see [contributing.md](docs/governance/how-to/contributing.md).
For token-based UI color rules, see [theming-guide.md](docs/engineering/how-to/theming-guide.md).


## Code Quality & Git Hooks (Auto-Setup)

This repository enforces automatic quality checks on **every `git push`** to ensure code quality across all branches.

### What Happens

When you run `git push`, the pre-push hook automatically:
1. ✓ Verifies dependencies are locked (`pnpm-lock.yaml` exists)
2. ✓ Checks Node.js and pnpm versions meet requirements
3. ✓ Runs `pnpm run lint` (ESLint)
4. ✓ Runs `pnpm run typecheck` (TypeScript type checking)
5. ✓ Runs `pnpm run build` (production build validation)

**If any check fails**, the push is blocked and errors are shown. Fix issues locally and push again.

### Zero Setup Required

Git hooks **auto-configure automatically**:
- After `git clone` (via `post-checkout` hook)
- Before first `git push` (via `pre-push` hook auto-setup)

Just clone and push—no manual setup needed!

```bash
git clone https://github.com/your-org/e-dossier.git
cd e-dossier
pnpm install
git checkout -b feature/my-feature
git push origin feature/my-feature  # Hook auto-configures and runs verification
```

### Troubleshooting

If hooks don't run:
```bash
# macOS/Linux
bash scripts/setup-git-hooks.sh

# Windows (PowerShell)
powershell -ExecutionPolicy Bypass -File scripts/setup-git-hooks.ps1
```

For detailed setup and troubleshooting, see [contributing.md](docs/governance/how-to/contributing.md).

## Environment Files
- App env:
  - `.env.development.example`
  - `.env.qa.example`
  - `.env.production.example`
- Data VM env:
  - `deploy/.env.data.example`
  - `deploy/.env.data` (local copy used by Docker Compose)
- Base template: `.env.example`

## Environment Overview
- **Dev**: Next app + Postgres + MinIO on one machine
- **QA**: Next app on VM-1, Postgres + MinIO on VM-2 (private network)
- **Production**: Same as QA with production secrets, backups, and monitoring

## Development Setup (single machine)
1. Install dependencies: `pnpm install`.
2. Configure app env: `cp .env.development.example .env` and update secrets.
3. Start Postgres + MinIO:
   - `cp deploy/.env.data.dev.example deploy/.env.data`
   - `docker compose -f deploy/docker-compose.data.yml --env-file deploy/.env.data up -d`
4. Run migrations: `pnpm db:migrate`.
5. (Optional) Seed admins: `pnpm seed:admins`.
6. Verify services: `pnpm run check`.
7. Start dev server: `pnpm dev` and open `http://localhost:3000`.

Note: If you want to use a hosted DB in dev, update `DATABASE_URL` in `.env`.

## QA Setup (two VMs)
VM-2 (Data: Postgres + MinIO)
1. `cp deploy/.env.data.example deploy/.env.data` and set strong credentials.
2. Set `MINIO_API_CORS_ALLOW_ORIGIN=http://<VM1-IP>` so browser upload preflights through VM-1 are allowed.
3. Start services: `docker compose -f deploy/docker-compose.data.yml --env-file deploy/.env.data up -d`.
4. Firewall: allow only VM-1 to reach ports 5432/9000. Do not expose MinIO console (9001).

VM-1 (App)
1. `pnpm install`.
2. `cp .env.qa.example .env` and set:
   - `DATABASE_URL=postgresql://...@<VM-2-IP>:5432/...`
   - `MINIO_ENDPOINT=http://<VM2-IP>:9000`
   - `MINIO_PUBLIC_URL=http://<VM1-IP>/media` (or QA domain/CDN URL)
   - `MINIO_BROWSER_ORIGINS=http://<VM1-IP>`
   - `MINIO_ACCESS_KEY=<same as VM2 MINIO_ROOT_USER>`
   - `MINIO_SECRET_KEY=<same as VM2 MINIO_ROOT_PASSWORD>`
   - `MINIO_BUCKET=<same as VM2 MINIO_BUCKET>`
3. `pnpm db:migrate`.
4. Start app: `pnpm start` (or your QA process manager).

## Production Deployment (two VMs)
VM-2 (Data: Postgres + MinIO)
1. `cp deploy/.env.data.example deploy/.env.data` and set production secrets.
2. Set `MINIO_API_CORS_ALLOW_ORIGIN=http://<VM1-IP>` or the production app origin.
3. Start services: `docker compose -f deploy/docker-compose.data.yml --env-file deploy/.env.data up -d`.
4. Backups:
   - Postgres: nightly `pg_dump` + WAL archiving.
   - MinIO: `mc mirror` to a separate disk or off-site target.
5. Firewall: allow only VM-1 to reach ports 5432/9000. Do not expose MinIO console (9001).

VM-1 (App)
Recommended for air-gapped / customer-hosted installs:
1. Bootstrap VM-1 once with the assets in `deploy/airgap/`:
   - install `Node.js 20+`, `nginx`, and `psql` through your approved offline package process
   - run `sudo ./deploy/airgap/edossier-vm1-bootstrap.sh`
2. Build the offline app artifact on your trusted build machine:
   - `pnpm install --frozen-lockfile`
   - `pnpm run release:airgap:app`
3. Transfer `.artifacts/airgap/app/e-dossier-app-<version>.tar.gz` and its `.sha256` file to VM-1.
4. Deploy on VM-1:
   - `sudo edossier-deploy /path/to/e-dossier-app-<version>.tar.gz`
5. For schema releases only:
   - `pnpm run release:airgap:migrations`
   - transfer `.artifacts/airgap/migrations/e-dossier-migrations-<version>.tar.gz` and its `.sha256`
   - `sudo edossier-migrate --backup-id <backup-reference> /path/to/e-dossier-migrations-<version>.tar.gz`
6. Detailed runbooks:
   - [air-gapped-app-runtime-deployment.md](docs/operations/how-to/air-gapped-app-runtime-deployment.md)
   - [air-gapped-vm1-bootstrap.md](docs/operations/how-to/air-gapped-vm1-bootstrap.md)
   - [air-gapped-schema-release.md](docs/operations/how-to/air-gapped-schema-release.md)

Legacy source-checkout flow:
1. `pnpm install`.
2. `cp .env.production.example .env` and set:
   - `DATABASE_URL=postgresql://...@<VM-2-IP>:5432/...`
   - `MINIO_ENDPOINT=http://<VM-2-IP>:9000`
   - `MINIO_PUBLIC_URL=http://<VM-1-IP>/media`
   - `MINIO_BROWSER_ORIGINS=http://<VM-1-IP>`
   - `MINIO_ACCESS_KEY=<same as VM2 MINIO_ROOT_USER>`
   - `MINIO_SECRET_KEY=<same as VM2 MINIO_ROOT_PASSWORD>`
   - `MINIO_BUCKET=<same as VM2 MINIO_BUCKET>`
3. `pnpm db:migrate`.
4. Build and run:
   - `pnpm build`
   - `pnpm start` (or run via systemd/pm2)

## Reverse Proxy / CDN
- Proxy `/media/` on VM-1 to `http://<VM-2-IP>:9000/`.
- In VM-1 app env, set `MINIO_ENDPOINT=http://<VM2-IP>:9000` for server-side signing and storage checks.
- In VM-1 app env, set `MINIO_PUBLIC_URL=http://<VM1-IP>/media` so presigned browser upload/display URLs use the VM-1 proxy.
- In VM-1 app env, set `MINIO_BROWSER_ORIGINS=http://<VM1-IP>` so the production CSP allows image display and browser PUT uploads.
- In VM-2 data env, set `MINIO_API_CORS_ALLOW_ORIGIN=http://<VM1-IP>` so MinIO allows browser upload preflights.
- Do not set `MINIO_ENDPOINT` to the VM-1 `/media` URL in proxy mode; that signs the wrong S3 path.
- If deploying without the VM-1 proxy, set both `MINIO_ENDPOINT` and `MINIO_PUBLIC_URL` to `http://<VM2-IP>:9000`, set `MINIO_BROWSER_ORIGINS=http://<VM2-IP>:9000`, and configure MinIO CORS for the browser app origin.

## Production MinIO Readiness
MinIO image upload should work on the production two-VM topology when these setup points are true:

- VM-2 runs Postgres + MinIO from `deploy/docker-compose.data.yml` with `deploy/.env.data`.
- VM-2 `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, and `MINIO_BUCKET` match VM-1 app `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, and `MINIO_BUCKET`.
- VM-2 `MINIO_API_CORS_ALLOW_ORIGIN` is the browser app origin exactly, including scheme and port when present, for example `https://app.example` or `http://<VM1-IP>`.
- After changing `MINIO_API_CORS_ALLOW_ORIGIN`, recreate the MinIO container:
  ```bash
  docker compose -f deploy/docker-compose.data.yml --env-file deploy/.env.data up -d --force-recreate minio
  ```
- VM-1 nginx proxies `/media/` to `http://<VM2-IP>:9000/` and keeps the trailing slash in `proxy_pass` so `/media/<bucket>/<key>` forwards to `/<bucket>/<key>`.
- VM-1 app env uses `MINIO_ENDPOINT=http://<VM2-IP>:9000` and `MINIO_PUBLIC_URL=http://<VM1-IP>/media`; do not use `/media` in `MINIO_ENDPOINT`.
- VM-1 app env `MINIO_BROWSER_ORIGINS` contains the public app origin used by the browser. Rebuild/redeploy the app after changing this value because production CSP is generated from env.
- Firewall allows VM-1 to reach VM-2 `5432/tcp` and `9000/tcp`; MinIO console `9001/tcp` should not be public.
- Browser users can reach VM-1 `/media/...`; they do not need direct access to VM-2 MinIO in proxy mode.

Production verification:
- On VM-2, check MinIO readiness: `curl http://127.0.0.1:9000/minio/health/ready`.
- On VM-1, verify the app starts with the production env and can reach VM-2.
- From the UI, upload an OC image and confirm the browser PUT request goes to `http(s)://<VM1>/media/<bucket>/...`, not to VM-2 directly.
- If upload fails, first check: app secret mismatch, missing `MINIO_API_CORS_ALLOW_ORIGIN`, wrong `MINIO_PUBLIC_URL`, missing nginx `/media/` proxy, or firewall blocking VM-1 to VM-2 `9000/tcp`.
- Before declaring the two-VM path ready, run the static-IP Docker simulation:
  ```bash
  pnpm run verify:minio-two-vm-proxy
  ```
  This creates a temporary Docker subnet with VM-1 nginx at `172.30.50.10`, VM-2 MinIO at `172.30.50.20`, and a third verifier container. The verifier signs against VM-2, uploads through VM-1 `/media`, checks CORS, and removes the test object.

Extra VM setup required for production uploads:
- VM-1 must run a reverse proxy, normally nginx from the air-gap bootstrap, with `/media/` forwarding to VM-2 MinIO.
- VM-1 must be the only public entrypoint for browser users; users should access images through `http(s)://<VM1>/media/...`.
- VM-2 MinIO should stay private to VM-1 on `9000/tcp`; expose the console only through an admin-only path or not at all.
- DNS/TLS, if used, must point to VM-1. Use the same public origin in `NEXT_PUBLIC_API_BASE_URL`, `MINIO_PUBLIC_URL`, `MINIO_BROWSER_ORIGINS`, and VM-2 `MINIO_API_CORS_ALLOW_ORIGIN`.
- Rebuild/redeploy the app after changing `MINIO_BROWSER_ORIGINS` because the production Content Security Policy is generated from build/runtime env.
- Restart or recreate MinIO after changing `MINIO_API_CORS_ALLOW_ORIGIN` because the value is read by the MinIO server container at startup.

## OC Image Uploads (2 images per OC)
- Kinds: `CIVIL_DRESS`, `UNIFORM`
- Flow: presign -> upload -> complete
- Size limits: 20 KB to 200 KB
- Detailed API notes: `docs/reference/api/oc-image-uploads.md`

## Operational Checks
- `pnpm run check` verifies Postgres and MinIO connectivity.
- If schema changes: `pnpm db:generate` then `pnpm db:migrate`.

Storage proxy validation notes:
- Passed: `pnpm run test tests/lib/storage.test.ts tests/lib/next-config-build-mode.test.ts`
- Passed: local `pnpm run storage:check` with corrected MinIO secret
- Passed: `pnpm run lint`
- Passed: `pnpm run typecheck`
- Passed: `pnpm run build`
- Current known test-suite note: full `pnpm run test` can fail from unrelated existing authz test mock issues; focused storage/proxy tests above cover this MinIO upload configuration.

## Migration Repair Flow (Recommended)
Use this when `db:migrate` fails due to migration-history mismatch (for example, `already exists` errors).

1. List migration tags:
   - `pnpm run db:baseline:list`
2. Run safe auto-repair baseline:
   - `pnpm run db:baseline`
3. Apply pending migrations:
   - `pnpm run db:migrate`

If auto-repair finds nothing, use explicit baseline and rerun migrate:
- `pnpm run db:baseline -- --tag 0019_same_meteorite`
- `pnpm run db:migrate`

## RBAC Permissions Sync & Verification
Use this flow after RBAC/action-map changes and after `pnpm db:push`.

1. Seed permissions from parsed matrix:
   - `pnpm seed:permissions`
2. Optional alternative import command (use if you want explicit parsed-matrix path control):
   - `pnpm import:permissions`
   - Example with explicit path:
     - `pnpm import:permissions docs/reference/rbac/permission-matrix.parsed.json`
3. Seed admins only if this environment needs admin bootstrap:
   - `pnpm seed:admins`
4. Validate action-map coverage:
   - `pnpm run validate:action-map`
5. Full verification:
   - `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

## Org Template Bootstrap (PT + Camp)
Use this to initialize Physical Training and Camp template defaults in a new environment.

Recommended sequence on fresh setup:

1. `pnpm db:migrate`
2. `pnpm seed:rbac`
3. `pnpm seed:permissions`
4. `pnpm seed:admins`
5. `pnpm seed:org-template -- --module=pt`
6. `pnpm seed:org-template -- --module=camp`

Preview without writing:

- `pnpm seed:org-template -- --module=pt --dry-run`
- `pnpm seed:org-template -- --module=camp --dry-run`
