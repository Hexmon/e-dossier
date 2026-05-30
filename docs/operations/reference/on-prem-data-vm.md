# On-Prem Data VM (Postgres + MinIO)

## Overview
- VM-1: Next.js app + reverse proxy (public entrypoint)
- VM-2: Postgres + MinIO on a private network (not public)

## Compose Files
- `deploy/docker-compose.data.yml`
- `deploy/.env.data.example`

## Setup Steps
1. Copy and edit: `cp deploy/.env.data.example deploy/.env.data`.
2. Set secrets, bucket name, ports, and `MINIO_API_CORS_ALLOW_ORIGIN` for the browser-visible VM-1 app origin.
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
- Set `MINIO_ENDPOINT=http://<VM-2-IP>:9000` in the app so signing and server-side checks use the private MinIO API.
- Set `MINIO_PUBLIC_URL=http://<VM-1-IP>/media` in the app so presigned browser URLs are returned through the VM-1 proxy.
- Set `MINIO_BROWSER_ORIGINS=http://<VM-1-IP>` in the app build/deployment env.
- Set `MINIO_API_CORS_ALLOW_ORIGIN=http://<VM-1-IP>` in the VM-2 data env so browser upload preflights are allowed.
- CDN can cache `https://your-domain/media/<bucket>/<key>`.

## Direct MinIO Without VM-1 Proxy
If VM-1 does not run a reverse proxy, browser uploads go directly to MinIO:
- Set `MINIO_ENDPOINT=<VM-2-IP>`.
- Set `MINIO_PORT=9000`.
- Set `MINIO_PUBLIC_URL=http://<VM-2-IP>:9000`.
- Set `MINIO_BROWSER_ORIGINS=http://<VM-2-IP>:9000`.
- Configure MinIO CORS to allow the browser app origin, for example `http://<VM-1-IP>:3000`.
- Ensure clients can reach `<VM-2-IP>:9000`; otherwise direct browser uploads cannot work.

`MINIO_BROWSER_ORIGINS` is used by the production Content Security Policy for image display and browser PUT uploads. It must be present when building the deployed app bundle if CSP headers are generated during build.
