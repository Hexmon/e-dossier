# e-dossier-v2

## Project Details
- Next.js 15 app (App Router) written in TypeScript
- PostgreSQL database accessed via Drizzle ORM
- OC images stored in MinIO (S3-compatible)
- Backend APIs live under `/api/v1`

## Prerequisites
- Node.js LTS (18+ recommended)
- pnpm
- Docker (for Postgres/MinIO)

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
