#!/usr/bin/env bash
# Hardened PostgreSQL setup for a dedicated DB VM
# - Supports non-interactive mode via env vars
# - Restricts pg_hba to an app CIDR
# - Sets scram-sha-256 auth, basic logging
# - Optional UFW rules and daily pg_dump backups
#
# Required env (or interactive prompts):
#   DB_NAME, DB_USER, DB_PASS, APP_CIDR, BIND_IP
# Optional env:
#   PG_PORT (default 5432)
#   ENABLE_UFW (y/n, default y)
#   ENABLE_BACKUPS (y/n, default y)
#   BACKUP_DIR (default /var/backups/postgresql)

set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root (use sudo)." >&2
  exit 1
fi

prompt() {
  local var="$1" default="$2" text="$3"
  if [[ -n "${!var:-}" ]]; then
    printf "%s=%s (from env)\n" "$var" "${!var}"
    return
  fi
  read -r -p "${text} [${default}]: " val
  export "$var"="${val:-$default}"
}

prompt "DB_NAME" "" "DB name"
prompt "DB_USER" "" "DB user"
prompt "DB_PASS" "" "DB password"
prompt "APP_CIDR" "" "App CIDR (e.g. 192.168.1.210/32)"
prompt "BIND_IP" "0.0.0.0" "Postgres listen IP (LAN IP of this VM)"
prompt "PG_PORT" "5432" "Postgres port"
prompt "ENABLE_UFW" "y" "Configure UFW? (y/n)"
prompt "ENABLE_BACKUPS" "y" "Enable daily pg_dump backups? (y/n)"
prompt "BACKUP_DIR" "/var/backups/postgresql" "Backup directory"

apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql postgresql-contrib ufw cron

PG_VER="$(ls /etc/postgresql | sort -V | tail -1)"
PG_CONF="/etc/postgresql/${PG_VER}/main/postgresql.conf"
HBA_CONF="/etc/postgresql/${PG_VER}/main/pg_hba.conf"

cp -n "${PG_CONF}" "${PG_CONF}.bak.$(date +%s)"
cp -n "${HBA_CONF}" "${HBA_CONF}.bak.$(date +%s)"

apply_conf() {
  local key="$1" val="$2"
  if grep -qE "^[#\s]*${key}\b" "${PG_CONF}"; then
    sed -i "s|^[#\s]*${key}\b.*|${key} = ${val}|" "${PG_CONF}"
  else
    echo "${key} = ${val}" >> "${PG_CONF}"
  fi
}

apply_conf "listen_addresses" "'${BIND_IP}'"
apply_conf "port" "${PG_PORT}"
apply_conf "password_encryption" "'scram-sha-256'"
apply_conf "logging_collector" "on"
apply_conf "log_connections" "on"
apply_conf "log_disconnections" "on"
apply_conf "log_statement" "'ddl'"

cat > "${HBA_CONF}" <<EOF
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             postgres                                peer
local   ${DB_NAME}      ${DB_USER}                               scram-sha-256
host    ${DB_NAME}      ${DB_USER}      127.0.0.1/32             scram-sha-256
host    ${DB_NAME}      ${DB_USER}      ${APP_CIDR}              scram-sha-256
# Reject everything else by default
host    all             all             0.0.0.0/0                reject
host    all             all             ::/0                     reject
EOF

systemctl restart postgresql

sudo -u postgres psql <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE "${DB_USER}" LOGIN PASSWORD '${DB_PASS}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END
\$\$;

DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}') THEN
    CREATE DATABASE "${DB_NAME}" OWNER "${DB_USER}";
  END IF;
END
\$\$;

REVOKE ALL ON DATABASE "${DB_NAME}" FROM PUBLIC;
GRANT ALL ON DATABASE "${DB_NAME}" TO "${DB_USER}";
\c "${DB_NAME}"
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO "${DB_USER}";
SQL

if [[ "${ENABLE_BACKUPS,,}" == "y" ]]; then
  install -d -m 750 "${BACKUP_DIR}"
  chown postgres:postgres "${BACKUP_DIR}"
  cat > /usr/local/bin/pg_backup.sh <<EOF
#!/usr/bin/env bash
set -euo pipefail
DB_NAME="${DB_NAME}"
BACKUP_DIR="${BACKUP_DIR}"
TS="\$(date +%Y%m%d%H%M%S)"
pg_dump -Fc "\${DB_NAME}" > "\${BACKUP_DIR}/\${DB_NAME}_\${TS}.dump"
find "\${BACKUP_DIR}" -type f -name "\${DB_NAME}_*.dump" -mtime +7 -delete
EOF
  chmod 750 /usr/local/bin/pg_backup.sh
  chown postgres:postgres /usr/local/bin/pg_backup.sh
  echo "0 2 * * * postgres /usr/local/bin/pg_backup.sh >/var/log/pg_backup.log 2>&1" > /etc/cron.d/pg_backup
fi

if [[ "${ENABLE_UFW,,}" == "y" ]]; then
  ufw --force default deny incoming
  ufw --force default allow outgoing
  ufw allow OpenSSH
  ufw allow from "${APP_CIDR}" to any port "${PG_PORT}" proto tcp
  ufw --force enable
fi

echo "PostgreSQL configured. Test with: psql -h ${BIND_IP} -U ${DB_USER} -d ${DB_NAME} -p ${PG_PORT}"
