#!/usr/bin/env bash
# Hardened PostgreSQL setup for e-dossier on a dedicated DB VM (Ubuntu 24.04)

set -euo pipefail

LOG_FILE="/var/log/edossier_db_setup.log"
mkdir -p "$(dirname "$LOG_FILE")"
exec > >(tee -a "$LOG_FILE") 2>&1

log()  { echo -e "\e[32m[INFO]\e[0m $*"; }
warn() { echo -e "\e[33m[WARN]\e[0m $*"; }
err()  { echo -e "\e[31m[ERROR]\e[0m $*" >&2; }

if [[ "${EUID}" -ne 0 ]]; then
  err "Run this script as root (use sudo)."
  exit 1
fi

prompt_required() {
  local var="$1"
  local label="$2"
  local current="${!var:-}"

  if [[ -n "$current" ]]; then
    log "$label: using from env -> $var=$current"
    return
  fi

  while true; do
    read -r -p "$label: " val
    if [[ -z "$val" ]]; then
      warn "$var cannot be empty."
    else
      printf -v "$var" '%s' "$val"
      export "$var"
      log "$var=$val"
      return
    fi
  done
}

prompt_secret() {
  local var="$1"
  local label="$2"
  local current="${!var:-}"

  if [[ -n "$current" ]]; then
    log "$label: using password from env -> $var=<hidden>"
    return
  fi

  while true; do
    read -s -p "$label: " val
    echo
    if [[ -z "$val" ]]; then
      warn "$var cannot be empty."
    else
      printf -v "$var" '%s' "$val"
      export "$var"
      log "$var set (hidden)"
      return
    fi
  done
}

prompt_default() {
  local var="$1"
  local label="$2"
  local default="$3"
  local current="${!var:-}"

  if [[ -n "$current" ]]; then
    log "$label: using from env -> $var=$current"
    return
  fi

  read -r -p "$label [$default]: " val
  val="${val:-$default}"
  printf -v "$var" '%s' "$val"
  export "$var"
  log "$var=$val"
}

validate_cidr() {
  local cidr="$1"
  if [[ ! "$cidr" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/[0-9]+$ ]]; then
    err "CIDR '$cidr' does not look like a valid IPv4 CIDR (example: 172.22.128.57/32)."
    exit 1
  fi
}

log "=== Secure PostgreSQL setup for e-dossier starting ==="

# --- Collect inputs (defaults tuned for your project) ---

prompt_default DB_NAME "DB name" "e_dossier_v2"
prompt_default DB_USER "DB user" "edossier_app"
prompt_secret   DB_PASS "DB password"

# Allow override via APP_CIDR env, otherwise derive from IP
if [[ -n "${APP_CIDR:-}" ]]; then
  log "Using APP_CIDR from env: $APP_CIDR"
else
  prompt_required APP_IP "Application VM IP (e.g. 172.22.128.57)"
  APP_CIDR="${APP_IP}/32"
  export APP_CIDR
  log "APP_CIDR=${APP_CIDR}"
fi
validate_cidr "$APP_CIDR"

DEFAULT_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
DEFAULT_IP="${DEFAULT_IP:-0.0.0.0}"

prompt_default BIND_IP "Postgres listen IP (LAN IP of this DB VM)" "$DEFAULT_IP"
prompt_default PG_PORT "Postgres port" "5432"
prompt_default ENABLE_UFW "Configure UFW? (y/n)" "y"
prompt_default ENABLE_BACKUPS "Enable daily pg_dump backups? (y/n)" "y"
prompt_default BACKUP_DIR "Backup directory" "/var/backups/postgresql"

# --- Install packages ---

log "Installing PostgreSQL and dependencies..."
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get install -y \
  postgresql postgresql-contrib postgresql-client ufw cron python3

if [[ ! -d /etc/postgresql ]]; then
  err "/etc/postgresql not found. PostgreSQL install seems broken."
  exit 1
fi

PG_VER="$(ls /etc/postgresql | sort -V | tail -1)"
PG_CONF_DIR="/etc/postgresql/${PG_VER}/main"
PG_CONF="${PG_CONF_DIR}/postgresql.conf"
HBA_CONF="${PG_CONF_DIR}/pg_hba.conf"

if [[ ! -f "$PG_CONF" ]] || [[ ! -f "$HBA_CONF" ]]; then
  err "postgresql.conf or pg_hba.conf not found under $PG_CONF_DIR"
  exit 1
fi

log "Detected PostgreSQL version: $PG_VER"
log "Using config:   $PG_CONF"
log "Using pg_hba:   $HBA_CONF"

TS="$(date +%Y%m%d_%H%M%S)"
cp "$PG_CONF" "${PG_CONF}.bak.${TS}"
cp "$HBA_CONF" "${HBA_CONF}.bak.${TS}"
log "Backed up configs to *.bak.${TS}"

apply_conf() {
  local key="$1"
  local val="$2"
  if grep -qE "^[#\s]*${key}\b" "$PG_CONF"; then
    sed -i "s|^[#\s]*${key}\b.*|${key} = ${val}|" "$PG_CONF"
  else
    echo "${key} = ${val}" >> "$PG_CONF"
  fi
}

log "Applying PostgreSQL configuration..."
apply_conf "listen_addresses" "'${BIND_IP}'"
apply_conf "port" "${PG_PORT}"
apply_conf "password_encryption" "'scram-sha-256'"
apply_conf "logging_collector" "on"
apply_conf "log_connections" "on"
apply_conf "log_disconnections" "on"
apply_conf "log_statement" "'ddl'"

log "Writing hardened pg_hba.conf ..."
cat > "$HBA_CONF" <<EOF
# Hardened pg_hba.conf for e-dossier

# TYPE  DATABASE        USER            ADDRESS                 METHOD

# Local postgres superuser (via Unix socket)
local   all             postgres                                peer

# Local access for the application DB/user (Unix socket)
local   ${DB_NAME}      ${DB_USER}                               scram-sha-256

# TCP access from localhost (DB VM itself)
host    ${DB_NAME}      ${DB_USER}      127.0.0.1/32             scram-sha-256

# TCP access from application server only
host    ${DB_NAME}      ${DB_USER}      ${APP_CIDR}              scram-sha-256

# Reject everything else by default
host    all             all             0.0.0.0/0                reject
host    all             all             ::/0                     reject
EOF

log "Restarting PostgreSQL..."
systemctl restart postgresql

log "Waiting for PostgreSQL to become ready (via local socket)..."
for i in {1..30}; do
  if sudo -u postgres pg_isready -q; then
    log "PostgreSQL is up."
    break
  fi
  sleep 1
done

if ! sudo -u postgres pg_isready -q; then
  err "PostgreSQL failed to start. Check logs under /var/log/postgresql/ or journalctl -u postgresql@${PG_VER}-main"
  exit 1
fi

log "Creating role and database (if not present)..."

if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname = '${DB_USER}'" | grep -q 1; then
  log "Role ${DB_USER} already exists, updating password."
  sudo -u postgres psql -c "ALTER ROLE \"${DB_USER}\" WITH LOGIN PASSWORD '${DB_PASS}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;"
else
  log "Creating role ${DB_USER}..."
  sudo -u postgres psql -c "CREATE ROLE \"${DB_USER}\" LOGIN PASSWORD '${DB_PASS}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;"
fi

if sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'" | grep -q 1; then
  log "Database ${DB_NAME} already exists, skipping creation."
else
  log "Creating database ${DB_NAME} owned by ${DB_USER}..."
  sudo -u postgres createdb -O "${DB_USER}" "${DB_NAME}"
fi

log "Hardening privileges on database and public schema..."
sudo -u postgres psql -c "REVOKE ALL ON DATABASE \"${DB_NAME}\" FROM PUBLIC;"
sudo -u postgres psql -c "GRANT ALL ON DATABASE \"${DB_NAME}\" TO \"${DB_USER}\";"
sudo -u postgres psql -d "${DB_NAME}" -c "REVOKE ALL ON SCHEMA public FROM PUBLIC;"
sudo -u postgres psql -d "${DB_NAME}" -c "GRANT ALL ON SCHEMA public TO \"${DB_USER}\";"

# --- Backups ---

if [[ "${ENABLE_BACKUPS,,}" == "y" ]]; then
  log "Setting up daily pg_dump backups to ${BACKUP_DIR} ..."
  install -d -m 750 "$BACKUP_DIR"
  chown postgres:postgres "$BACKUP_DIR"

  BACKUP_SCRIPT="/usr/local/bin/pg_backup.sh"

  cat > "$BACKUP_SCRIPT" <<EOF
#!/usr/bin/env bash
set -euo pipefail

DB_NAME="${DB_NAME}"
BACKUP_DIR="${BACKUP_DIR}"
TS="\$(date +%Y%m%d%H%M%S)"

pg_dump -Fc "\${DB_NAME}" > "\${BACKUP_DIR}/\${DB_NAME}_\${TS}.dump"
find "\${BACKUP_DIR}" -type f -name "\${DB_NAME}_*.dump" -mtime +7 -delete
EOF

  chmod 750 "$BACKUP_SCRIPT"
  chown postgres:postgres "$BACKUP_SCRIPT"

  CRON_FILE="/etc/cron.d/pg_backup_${DB_NAME}"
  echo "0 2 * * * postgres ${BACKUP_SCRIPT} >/var/log/pg_backup_${DB_NAME}.log 2>&1" > "$CRON_FILE"
  chmod 644 "$CRON_FILE"

  log "Backup script installed at ${BACKUP_SCRIPT} and cron at ${CRON_FILE}."
else
  warn "Backups disabled (ENABLE_BACKUPS=${ENABLE_BACKUPS})."
fi

# --- UFW firewall ---

if [[ "${ENABLE_UFW,,}" == "y" ]]; then
  log "Configuring UFW firewall..."

  UFW_STATUS=$(ufw status | head -n1 | awk '{print $2}')
  if [[ "$UFW_STATUS" == "inactive" ]]; then
    ufw --force default deny incoming
    ufw --force default allow outgoing

    if ufw app list 2>/dev/null | grep -q "OpenSSH"; then
      ufw allow OpenSSH
    else
      ufw allow 22/tcp
    fi
  else
    warn "UFW already active; will only add Postgres rule."
  fi

  ufw allow from "${APP_CIDR}" to any port "${PG_PORT}" proto tcp
  ufw --force enable

  log "UFW enabled. Allowed ${APP_CIDR} -> port ${PG_PORT}."
else
  warn "UFW configuration skipped (ENABLE_UFW=${ENABLE_UFW})."
fi

# --- Final sanity checks ---

log "Running final connectivity checks..."
if sudo -u postgres psql -tAc "SELECT 1" | grep -q 1; then
  log "PostgreSQL responds to local queries."
else
  warn "Local test query failed; check logs."
fi

if sudo -u postgres psql -d "${DB_NAME}" -tAc "SELECT 1" | grep -q 1; then
  log "Database ${DB_NAME} is accessible."
else
  warn "Database ${DB_NAME} not accessible; check config."
fi

# Compute URL-encoded password for use on App VM
ENCODED_DB_PASS=$(
  DB_PASS="$DB_PASS" python3 - <<'PY'
import os, urllib.parse
pwd = os.environ["DB_PASS"]
print(urllib.parse.quote(pwd, safe=""))
PY
)

log "=== Secure PostgreSQL setup completed successfully ==="
echo
echo "Use this DATABASE_URL on the APP VM:"
echo "  postgresql://${DB_USER}:${ENCODED_DB_PASS}@${BIND_IP}:${PG_PORT}/${DB_NAME}?sslmode=disable"
echo
echo "Example test from APP VM:"
echo "  PGPASSWORD='${DB_PASS}' psql -h ${BIND_IP} -p ${PG_PORT} -U ${DB_USER} -d ${DB_NAME} -c \"SELECT now();\""
echo
echo "Full log: ${LOG_FILE}"
