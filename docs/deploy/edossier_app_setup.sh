#!/usr/bin/env bash
# Provision e-dossier Next.js app VM (Ubuntu 24.04)

set -euo pipefail

APP_USER="nextapp"
APP_DIR="/srv/edossier-app"
GIT_REPO_DEFAULT="https://github.com/Hexmon/e-dossier.git"
GIT_BRANCH_DEFAULT="main"

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

log "=== e-dossier App VM setup starting ==="

# --- Basic config ---

prompt_default GIT_REPO   "Git repo URL" "$GIT_REPO_DEFAULT"
prompt_default GIT_BRANCH "Git branch"   "$GIT_BRANCH_DEFAULT"
prompt_default APP_PORT   "App port"     "3000"

log "DB connection details (must match DB VM setup):"
prompt_required DB_HOST "DB host/IP (e.g. 172.22.128.56)"
prompt_default  DB_PORT "DB port" "5432"
prompt_default  DB_NAME "DB name" "e_dossier_v2"
prompt_default  DB_USER "DB user" "edossier_app"
prompt_secret   DB_PASS "DB password (same as on DB VM)"

prompt_default ENABLE_UFW       "Configure UFW? (y/n)" "y"
prompt_default RESET_DRIZZLE    "Reset drizzle/ folder & generate migrations for FRESH DB? (y/n)" "y"

# --- Install system deps + Node + pnpm ---

log "Installing system dependencies, Node.js, pnpm, and psql client..."
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get install -y \
  ca-certificates curl git build-essential python3 postgresql-client ufw

if ! command -v node >/dev/null 2>&1; then
  log "Installing Node.js 22.x from NodeSource..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
else
  log "Node.js already installed: $(node -v)"
fi

log "Enabling corepack + pnpm..."
corepack enable
corepack prepare pnpm@9 --activate

PNPM_BIN="$(command -v pnpm || echo '/usr/local/bin/pnpm')"
log "Using pnpm at: ${PNPM_BIN}"

# --- Create app user & directory ---

if ! id "$APP_USER" &>/dev/null; then
  log "Creating system user $APP_USER..."
  useradd --system --home-dir "$APP_DIR" --shell /usr/sbin/nologin "$APP_USER"
else
  log "User $APP_USER already exists."
fi

mkdir -p "$APP_DIR"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# --- Clone / update repo ---

if [[ ! -d "$APP_DIR/.git" ]]; then
  log "Cloning repo $GIT_REPO into $APP_DIR ..."
  sudo -u "$APP_USER" git clone "$GIT_REPO" "$APP_DIR"
else
  log "Repo already present, pulling latest $GIT_BRANCH ..."
  sudo -u "$APP_USER" bash -lc "cd '$APP_DIR' && git fetch && git checkout '$GIT_BRANCH' && git pull --ff-only"
fi

chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# --- Build DATABASE_URL with URL-encoded password ---

ENCODED_DB_PASS=$(
  DB_PASS="$DB_PASS" python3 - <<'PY'
import os, urllib.parse
pwd = os.environ["DB_PASS"]
print(urllib.parse.quote(pwd, safe=""))
PY
)

DATABASE_URL="postgresql://${DB_USER}:${ENCODED_DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=disable"
log "Constructed DATABASE_URL with URL-encoded password."

# --- Connectivity check to DB before migrations ---

log "Testing DB connectivity from App VM..."
if ! PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" >/dev/null 2>&1; then
  err "Cannot connect to PostgreSQL at ${DB_HOST}:${DB_PORT} as ${DB_USER}. Check DB VM, firewall, and credentials."
  exit 1
fi
log "DB connectivity OK."

# --- Write .env file ---

log "Writing .env to $APP_DIR/.env ..."
cat > "$APP_DIR/.env" <<EOF
DATABASE_URL=${DATABASE_URL}
NODE_ENV=production
PORT=${APP_PORT}

ACCESS_TOKEN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEIKsoxAMJEZLV+A9pJF/1+A0vkGdjaKTQGVSlKHn7LBXw\n-----END PRIVATE KEY-----"
ACCESS_TOKEN_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAX/+LJjlZfaHoN38xoH2VrDSmzcKUmySLHLrtI6nw7a4=\n-----END PUBLIC KEY-----"
ACCESS_TOKEN_TTL_SECONDS=1000
EXPOSE_TOKENS_IN_DEV=true

SUPERADMIN_USERNAME=superadmin
SUPERADMIN_PASSWORD=ChangeMe!123
SUPERADMIN_EMAIL=superadmin@example.com
SUPERADMIN_PHONE=+910000000000
SUPERADMIN_NAME=Super Admin
SUPERADMIN_RANK=SUPER

ADMIN_USERNAME=admin
ADMIN_PASSWORD=ChangeMe!123
ADMIN_EMAIL=admin@example.com
ADMIN_PHONE=+910000000001
ADMIN_NAME=Admin
ADMIN_RANK=ADMIN
EOF

chown "$APP_USER:$APP_USER" "$APP_DIR/.env"
chmod 640 "$APP_DIR/.env"

# --- Install dependencies, generate + migrate DB, build app ---

log "Installing pnpm dependencies..."
sudo -u "$APP_USER" bash -lc "cd '$APP_DIR' && ${PNPM_BIN} install --frozen-lockfile"

if [[ "${RESET_DRIZZLE,,}" == "y" ]]; then
  log "Resetting Drizzle migrations folder (drizzle/) for a FRESH DB..."
  sudo -u "$APP_USER" bash -lc "cd '$APP_DIR' && rm -rf drizzle"
else
  warn "Skipping Drizzle folder reset; will use existing migrations."
fi

log "Generating Drizzle migrations..."
sudo -u "$APP_USER" bash -lc "cd '$APP_DIR' && ${PNPM_BIN} run db:generate"

log "Running DB migrations with DATABASE_URL..."
sudo -u "$APP_USER" bash -lc "cd '$APP_DIR' && export DATABASE_URL='${DATABASE_URL}' && ${PNPM_BIN} run db:migrate"

log "Building Next.js app..."
sudo -u "$APP_USER" bash -lc "cd '$APP_DIR' && ${PNPM_BIN} run build"

# --- systemd unit ---

SERVICE_FILE="/etc/systemd/system/edossier.service"
log "Writing systemd service to ${SERVICE_FILE} ..."

cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=E-Dossier Next.js Application
After=network.target

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
ExecStart=${PNPM_BIN} start --hostname 0.0.0.0 --port ${APP_PORT}
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

log "Reloading systemd and starting edossier.service ..."
systemctl daemon-reload
systemctl enable --now edossier.service

sleep 3
systemctl --no-pager --full status edossier.service || true

# --- UFW on App VM ---

if [[ "${ENABLE_UFW,,}" == "y" ]]; then
  log "Configuring UFW on App VM..."

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
    warn "UFW already active; will only add app port rule."
  fi

  ufw allow "${APP_PORT}"/tcp
  ufw --force enable

  log "UFW enabled. Allowed TCP port ${APP_PORT}."
else
  warn "UFW configuration skipped on App VM (ENABLE_UFW=${ENABLE_UFW})."
fi

log "=== e-dossier App VM setup completed ==="
echo
echo "If everything is OK, you should reach the app at:"
echo "  http://$(hostname -I | awk '{print $1}'):${APP_PORT}"
echo
echo "If localhost works but remote IP shows only HTML without CSS/JS:"
echo "  - Make sure you're hitting the same host:port from another VM."
echo "  - Confirm UFW / any external firewall allows port ${APP_PORT}."
echo "  - Confirm Next is running in 'next start' (not dev) and CSP in next.config.ts is the version we fixed."
