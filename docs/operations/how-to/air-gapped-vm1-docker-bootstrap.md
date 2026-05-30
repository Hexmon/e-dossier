# VM1 Docker Bootstrap Runbook

Use this path when the application VM should run E-Dossier through Docker
containers instead of host Nginx, host Node.js, and a host systemd app service.

VM1 still needs Docker Engine and the Docker Compose v2 plugin installed on the
host. The app runtime and reverse proxy run in containers.

## Runtime Model

- `edossier-app`: `node:20-bookworm-slim`, runs the extracted standalone app.
- `edossier-nginx`: `nginx:1.27-alpine`, exposes port `80`.
- `/opt/edossier/current`: active release symlink.
- `/opt/edossier/shared/app.env`: stable production env file.
- `/opt/edossier/nginx/edossier.conf`: rendered Nginx config.

## Required Images

Connected VM1:

```bash
docker pull node:20-bookworm-slim
docker pull nginx:1.27-alpine
docker build -t edossier-tools:node20-pg16 -f deploy/airgap/docker/Dockerfile.tools deploy/airgap/docker
```

Air-gapped VM1:

```bash
docker load -i node-20-bookworm-slim.tar
docker load -i nginx-1.27-alpine.tar
docker load -i edossier-tools-node20-pg16.tar
```

The tools image is needed only for schema migrations. It contains Node.js and
`psql` so the host does not need `postgresql-client`.

## Bootstrap VM1

Copy the entire `deploy/airgap/` folder to VM1, then run:

```bash
sudo ./edossier-vm1-docker-bootstrap.sh
```

The script prompts for:

- application root directory, default `/opt/edossier`
- public app origin, for example `http://172.22.128.57`
- private MinIO origin on VM2, for example `http://172.22.128.56:9000`

## Configure Env

Edit:

```bash
sudo nano /opt/edossier/shared/app.env
```

Set at least:

- `DATABASE_URL=postgresql://<user>:<password>@<VM2-IP>:5432/<db>`
- `NEXT_PUBLIC_API_BASE_URL=http://<VM1-IP>`
- `MINIO_ENDPOINT=http://<VM2-IP>:9000`
- `MINIO_PUBLIC_URL=http://<VM1-IP>/media`
- `MINIO_BROWSER_ORIGINS=http://<VM1-IP>`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `CSRF_SECRET`
- admin/superadmin credentials

## Deploy App Bundle

Build on a trusted build machine:

```bash
pnpm install --frozen-lockfile
pnpm run release:airgap:app
```

Transfer the app tarball and `.sha256` to VM1, then run:

```bash
sudo edossier-docker-deploy /path/to/e-dossier-app-<version>.tar.gz
```

## Apply Schema Bundle

For schema releases only:

```bash
pnpm run release:airgap:migrations
sudo edossier-docker-migrate --backup-id <backup-reference> /path/to/e-dossier-migrations-<version>.tar.gz
```

## Verify

```bash
docker ps
docker compose -f /opt/edossier/docker-compose.yml ps
docker compose -f /opt/edossier/docker-compose.yml exec -T edossier-app node -e "fetch('http://127.0.0.1:3000/api/v1/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
```

You can also verify from a browser at `http://<VM1-IP>/api/v1/health`.

## Rollback

```bash
sudo edossier-docker-deploy list
sudo edossier-docker-deploy rollback
```
