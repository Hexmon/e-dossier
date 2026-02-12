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

For more details, see [CONTRIBUTING.md](docs/CONTRIBUTING.md).


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

For detailed setup and troubleshooting, see [CONTRIBUTING.md](docs/CONTRIBUTING.md).

## Environment Files
- App env:
  - `.env.development.example`
  - `.env.qa.example`
  - `.env.production.example`
- Data VM env:
  - `deploy/.env.data.dev.example`
  - `deploy/.env.data.qa.example`
  - `deploy/.env.data.production.example`
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
1. `cp deploy/.env.data.qa.example deploy/.env.data` and set strong credentials.
2. Start services: `docker compose -f deploy/docker-compose.data.yml --env-file deploy/.env.data up -d`.
3. Firewall: allow only VM-1 to reach ports 5432/9000. Do not expose MinIO console (9001).

VM-1 (App)
1. `pnpm install`.
2. `cp .env.qa.example .env` and set:
   - `DATABASE_URL=postgresql://...@<VM-2-IP>:5432/...`
   - `MINIO_ENDPOINT=<VM-2-IP>`
   - `MINIO_PUBLIC_URL=https://qa.example.com/media` (or CDN URL)
3. `pnpm db:migrate`.
4. Start app: `pnpm start` (or your QA process manager).

## Production Deployment (two VMs)
VM-2 (Data: Postgres + MinIO)
1. `cp deploy/.env.data.production.example deploy/.env.data` and set production secrets.
2. Start services: `docker compose -f deploy/docker-compose.data.yml --env-file deploy/.env.data up -d`.
3. Backups:
   - Postgres: nightly `pg_dump` + WAL archiving.
   - MinIO: `mc mirror` to a separate disk or off-site target.
4. Firewall: allow only VM-1 to reach ports 5432/9000. Do not expose MinIO console (9001).

VM-1 (App)
1. `pnpm install`.
2. `cp .env.production.example .env` and set:
   - `DATABASE_URL=postgresql://...@<VM-2-IP>:5432/...`
   - `MINIO_ENDPOINT=<VM-2-IP>`
   - `MINIO_PUBLIC_URL=https://your-domain.example/media` (or CDN URL)
3. `pnpm db:migrate`.
4. Build and run:
   - `pnpm build`
   - `pnpm start` (or run via systemd/pm2)

## Reverse Proxy / CDN
- Proxy `/media/` on VM-1 to `http://<VM-2-IP>:9000/`.
- If images are served from a different domain, add it to CSP `img-src` in `next.config.ts`.

## OC Image Uploads (2 images per OC)
- Kinds: `CIVIL_DRESS`, `UNIFORM`
- Flow: presign -> upload -> complete
- Size limits: 20 KB to 200 KB
- Detailed API notes: `docs/oc-images.md`

## Operational Checks
- `pnpm run check` verifies Postgres and MinIO connectivity.
- If schema changes: `pnpm db:generate` then `pnpm db:migrate`.

## RBAC Permissions Sync & Verification
Use this flow after RBAC/action-map changes and after `pnpm db:push`.

1. Seed permissions from parsed matrix:
   - `pnpm seed:permissions`
2. Optional alternative import command (use if you want explicit parsed-matrix path control):
   - `pnpm import:permissions`
   - Example with explicit path:
     - `pnpm import:permissions docs/rbac/permission-matrix.parsed.json`
3. Seed admins only if this environment needs admin bootstrap:
   - `pnpm seed:admins`
4. Validate action-map coverage:
   - `pnpm run validate:action-map`
5. Full verification:
   - `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
