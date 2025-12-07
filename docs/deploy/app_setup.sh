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

prompt_default GIT_REPO  "Git repo URL" "$GIT_REPO_DEFAULT"
prompt_default GIT_BRANCH "Git branch"  "$GIT_BRANCH_DEFAULT"
prompt_default APP_PORT   "App port"    "3000"

log "DB connection details (must match DB VM setup):"
prompt_required DB_HOST "DB host/IP (e.g. 172.22.128.56)"
prompt_default  DB_PORT "DB port" "5432"
prompt_required DB_NAME "DB name (e.g. e_dossier_v2)"
prompt_required DB_USER "DB user (e.g. edossier_app)"
prompt_secret   DB_PASS "DB password (same as on DB VM)"

# --- Install system deps + Node + pnpm ---

log "Installing system dependencies, Node.js, and pnpm..."
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get install -y \
  ca-certificates curl git build-essential

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
log "Constructed DATABASE_URL (password URL-encoded)."

# --- Write .env file (using same keys you used earlier) ---

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

# --- Install dependencies, generate + migrate DB, build app ---

log "Installing pnpm dependencies..."
sudo -u "$APP_USER" bash -lc "cd '$APP_DIR' && pnpm install --frozen-lockfile"

log "Resetting drizzle migration folder and generating fresh migrations..."
sudo -u "$APP_USER" bash -lc "cd '$APP_DIR' && rm -rf drizzle && pnpm run db:generate"

log "Running DB migrations with DATABASE_URL..."
sudo -u "$APP_USER" bash -lc "cd '$APP_DIR' && export DATABASE_URL='${DATABASE_URL}' && pnpm run db:migrate"

log "Building Next.js app..."
sudo -u "$APP_USER" bash -lc "cd '$APP_DIR' && pnpm run build"

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
ExecStart=/usr/local/bin/pnpm start --hostname 0.0.0.0 --port ${APP_PORT}
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

log "=== e-dossier App VM setup completed ==="
echo
echo "If everything is OK, you should reach the app at:"
echo "  http://$(hostname -I | awk '{print $1}'):${APP_PORT}"
echo
echo "If you see CSS/JS loading fine on localhost but not from outside,"
echo "ensure your firewall / security group allows port ${APP_PORT},"
echo "or front this with Nginx on port 80/443."
