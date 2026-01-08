# On-Prem Data VM (Postgres + MinIO)

## Overview
- VM-1: Next.js app + reverse proxy (public entrypoint)
- VM-2: Postgres + MinIO on a private network (not public)

## Compose Files
- `deploy/docker-compose.data.yml`
- `deploy/.env.data.dev.example`
- `deploy/.env.data.qa.example`
- `deploy/.env.data.production.example`

## Setup Steps
1. Choose the env file for your environment:
   - Dev: `deploy/.env.data.dev.example`
   - QA: `deploy/.env.data.qa.example`
   - Production: `deploy/.env.data.production.example`
2. Copy and edit: `cp <env-file> deploy/.env.data`.
3. Start services: `docker compose -f deploy/docker-compose.data.yml --env-file deploy/.env.data up -d`.
4. Confirm health:
   - Postgres: `docker ps` + `pg_isready`
   - MinIO: `curl http://<VM-2-IP>:9000/minio/health/ready`
5. Restrict network access:
   - Allow only VM-1 to reach `POSTGRES_PORT` and `MINIO_PORT`.
   - Do not expose MinIO console port publicly.

## Best Practices
- Use a private network/VLAN for VM-1 <-> VM-2 traffic.
- Use strong passwords for Postgres and MinIO root user.
- Enable backups:
  - Postgres: nightly `pg_dump` + WAL archiving.
  - MinIO: `mc mirror` to a separate disk or off-site target.
- Use bucket versioning (enabled in `minio-init`).

## CDN/Proxy Recommendation
Expose images through VM-1 (reverse proxy) instead of public MinIO:
- Configure Nginx on VM-1 to proxy `/media/` to `http://<VM-2-IP>:9000`.
- Set `MINIO_PUBLIC_URL=https://your-domain/media` in the app.
- CDN can cache `https://your-domain/media/<bucket>/<key>`.

## CSP Note
If images are served from a different domain than the app, update `next.config.ts` CSP `img-src` to include that domain.
