# Production Deployment – Next.js + PostgreSQL on 2 VMs

This guide deploys the app with:
- **DB VM**: PostgreSQL only, private network, hardened.
- **App VM**: Next.js app, connects to DB over LAN.

Scripts (Linux targets):
- `secure_postgres_setup.sh` (run on DB VM)
- `setup_next_app_vm.sh` (run on App VM)

## Prereqs
- Two Ubuntu 24.x VMs on the same private network.
- Non-root sudo user on each.
- IPs (example): DB `192.168.1.211`, App `192.168.1.210`.
- Node/pnpm are installed by the App script; Postgres by the DB script.

## Files
Location: `docs/deploy/`
- `secure_postgres_setup.sh`: Installs/configures Postgres with scram auth, restricted `pg_hba`, basic logging, optional UFW, optional daily pg_dump backups.
- `setup_next_app_vm.sh`: Installs git/node/pnpm, creates app user, clones repo, writes `.env`, builds, registers systemd service, optional UFW.

## Run order
### 1) DB VM
```bash
chmod +x docs/deploy/secure_postgres_setup.sh
sudo ./docs/deploy/secure_postgres_setup.sh
```
Prompts (or set env vars for non-interactive):
- `DB_NAME`, `DB_USER`, `DB_PASS`
- `APP_CIDR` (e.g., `192.168.1.210/32`)
- `BIND_IP` (DB VM LAN IP), `PG_PORT` (default 5432)
- `ENABLE_UFW` (y/n), `ENABLE_BACKUPS` (y/n), `BACKUP_DIR`

What it does:
- Sets `listen_addresses=BIND_IP`, `password_encryption=scram-sha-256`, basic logging.
- `pg_hba.conf`: allows only DB_USER/DB_NAME from `APP_CIDR` + localhost; rejects others.
- Creates role + database; revokes PUBLIC grants on DB and schema.
- Optional: UFW allow SSH + APP_CIDR→PG_PORT; daily `pg_dump` with 7-day retention.

Validate:
```bash
psql -h <BIND_IP> -U <DB_USER> -d <DB_NAME> -p <PG_PORT>
```

### 2) App VM
```bash
chmod +x docs/deploy/setup_next_app_vm.sh
sudo ./docs/deploy/setup_next_app_vm.sh
```
Prompts (or env):
- `APP_USER`, `APP_DIR`, `GIT_REPO`
- `GIT_BRANCH` (default main), `APP_PORT` (default 3000)
- `DB_HOST`, `DB_PORT` (default 5432), `DB_NAME`, `DB_USER`, `DB_PASS`
- `SSLMODE` (default require), `ENABLE_UFW` (y/n), `ADMIN_CIDR` (SSH allowlist)

What it does:
- Installs git, build tools, nodejs/npm, pnpm (via corepack), postgresql-client, ufw.
- Creates system user, clones repo, writes `.env` with `DATABASE_URL` (sslmode set), `NODE_ENV=production`, `PORT`.
- `pnpm install --prod`, `pnpm run build`.
- systemd unit `nextapp.service` runs `pnpm start -- --port APP_PORT`.
- Optional UFW: default deny, allow SSH from ADMIN_CIDR, allow 80/443, allow APP_PORT.

Validate:
```bash
systemctl status nextapp.service
curl http://<APP_VM_IP>:<APP_PORT>/
```

### 3) Migrations (from App VM)
```bash
sudo -u <APP_USER> pnpm run db:migrate
```
Seeds (optional):
```bash
sudo -u <APP_USER> pnpm run seed:rbac
sudo -u <APP_USER> pnpm run seed:admins
```
Ensure SUPERADMIN_* and ADMIN_* env vars are set before `seed:admins`.

## Security notes
- DB is not internet-exposed; pg_hba restricts to APP_CIDR. UFW can additionally enforce.
- Uses `scram-sha-256` auth; PUBLIC privileges revoked on DB + public schema.
- Set `SSLMODE=require` (default) and provide server TLS on Postgres if needed.
- App runs as non-root system user via systemd with restart-on-failure.
- Backups: pg_dump daily with 7-day retention when enabled.

## Day-2 operations
DB VM:
- Check Postgres: `sudo pg_lsclusters`
- Connect: `psql -h 127.0.0.1 -U <DB_USER> -d <DB_NAME>`
- Backups: `sudo ls -lh /var/backups/postgresql`

App VM:
- Service logs: `sudo journalctl -u nextapp.service -f`
- Update app: `sudo -u <APP_USER> git -C <APP_DIR> pull && sudo -u <APP_USER> pnpm install --prod && sudo -u <APP_USER> pnpm run build && sudo systemctl restart nextapp.service`
