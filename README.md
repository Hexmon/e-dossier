# e-dossier v2

Next.js + Drizzle ORM + PostgreSQL application for managing dossiers. This repo includes schema definitions, migrations, seed scripts, and deployment helpers for a two-VM (App + DB) setup.

## Requirements
- Node.js 20+ and pnpm (corepack recommended)
- PostgreSQL 15+ with `pgcrypto` extension

## Local setup
1. Install deps: `pnpm install`
2. Copy `.env.example` to `.env` and fill values:
   - `DATABASE_URL=postgresql://user:pass@localhost:5432/e_dossier_v2`
   - JWT keys (`ACCESS_TOKEN_PRIVATE_KEY` / `ACCESS_TOKEN_PUBLIC_KEY`)
   - Super Admin/Admin credentials for seeds (see `.env.example`)
3. Run migrations: `pnpm run db:migrate`
4. Seed roles/permissions and admin users (requires env above):
   - `pnpm run seed:rbac`
   - `pnpm run seed:admins`
5. Start dev server: `pnpm dev`

## Database workflows
- Generate migrations from schema: `pnpm run db:generate`
- Apply migrations: `pnpm run db:migrate`
- Open Drizzle Studio: `pnpm run db:studio`

## Deployment (two-VM: DB + App)
Deployment scripts live in `docs/deploy`:
- `secure_postgres_setup.sh`: Hardened Postgres install on the DB VM (scram auth, restricted pg_hba, optional UFW, backups).
- `setup_next_app_vm.sh`: App VM bootstrap (installs deps, clones repo, builds, systemd service, optional UFW).

Usage (Linux targets):
```bash
chmod +x docs/deploy/secure_postgres_setup.sh docs/deploy/setup_next_app_vm.sh
# DB VM
sudo ./docs/deploy/secure_postgres_setup.sh
# App VM
sudo ./docs/deploy/setup_next_app_vm.sh
```
Then run migrations from the app VM: `sudo -u <APP_USER> pnpm run db:migrate`.

See `docs/deploy/DEPLOYMENT.md` for full instructions and variables.

## Seeds
- Roles/permissions: `pnpm run seed:rbac` (creates super_admin/admin/guest roles, CRUD-style permissions, and links all perms to the SUPER_ADMIN position)
- Super/Admin users with appointments: `pnpm run seed:admins` (uses SUPERADMIN_* and ADMIN_* env vars; creates users, credentials, and appointments to the SUPER_ADMIN/ADMIN positions)

## Testing
- Unit/feature tests: `pnpm test`
- Coverage: `pnpm run test:coverage`
