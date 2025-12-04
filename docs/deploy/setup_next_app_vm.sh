#!/usr/bin/env bash
# App VM bootstrap for Next.js + pnpm + systemd
# - Installs deps, creates a system user, clones repo, builds, and registers systemd
# - Non-interactive friendly via env vars
# Required env (or prompts):
#   APP_USER, APP_DIR, GIT_REPO, DB_HOST, DB_NAME, DB_USER, DB_PASS
# Optional env:
#   GIT_BRANCH (default main)
#   APP_PORT (default 3000)
#   DB_PORT (default 5432)
#   SSLMODE (default require)
#   ENABLE_UFW (y/n, default y)
#   ADMIN_CIDR (CIDR allowed to SSH; default 0.0.0.0/0)

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

prompt "APP_USER" "" "System user to run the app"
prompt "APP_DIR" "" "App directory (e.g. /srv/next-app)"
prompt "GIT_REPO" "" "Git repo URL"
prompt "GIT_BRANCH" "main" "Git branch"
prompt "APP_PORT" "3000" "App port"
prompt "DB_HOST" "" "DB host/IP"
prompt "DB_PORT" "5432" "DB port"
prompt "DB_NAME" "" "DB name"
prompt "DB_USER" "" "DB user"
prompt "DB_PASS" "" "DB password"
prompt "SSLMODE" "require" "DB sslmode (require/disable)"
prompt "ENABLE_UFW" "y" "Configure UFW? (y/n)"
prompt "ADMIN_CIDR" "0.0.0.0/0" "CIDR allowed to SSH"

apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y git curl build-essential ca-certificates nodejs npm ufw postgresql-client

corepack enable
corepack prepare pnpm@9 --activate

if ! id -u "${APP_USER}" >/dev/null 2>&1; then
  adduser --system --home "${APP_DIR}" --shell /usr/sbin/nologin --group "${APP_USER}"
fi

install -d -o "${APP_USER}" -g "${APP_USER}" "${APP_DIR}"

if [[ ! -d "${APP_DIR}/.git" ]]; then
  sudo -u "${APP_USER}" git clone --branch "${GIT_BRANCH}" "${GIT_REPO}" "${APP_DIR}"
else
  sudo -u "${APP_USER}" git -C "${APP_DIR}" fetch origin
  sudo -u "${APP_USER}" git -C "${APP_DIR}" checkout "${GIT_BRANCH}"
  sudo -u "${APP_USER}" git -C "${APP_DIR}" pull origin "${GIT_BRANCH}"
fi

cat > "${APP_DIR}/.env" <<EOF
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=${SSLMODE}
NODE_ENV=production
PORT=${APP_PORT}
EOF
chown "${APP_USER}:${APP_USER}" "${APP_DIR}/.env"
chmod 640 "${APP_DIR}/.env"

sudo -u "${APP_USER}" bash -c "cd '${APP_DIR}' && pnpm install --frozen-lockfile --prod"
sudo -u "${APP_USER}" bash -c "cd '${APP_DIR}' && pnpm run build"

SERVICE_FILE="/etc/systemd/system/nextapp.service"
cat > "${SERVICE_FILE}" <<EOF
[Unit]
Description=Next.js app
After=network.target

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
ExecStart=$(command -v pnpm) start -- --port ${APP_PORT}
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now nextapp.service

if [[ "${ENABLE_UFW,,}" == "y" ]]; then
  ufw --force default deny incoming
  ufw --force default allow outgoing
  ufw allow from "${ADMIN_CIDR}" to any port 22 proto tcp
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw allow "${APP_PORT}"/tcp
  ufw --force enable
fi

echo "App deployed. Service: systemctl status nextapp.service"
echo "Run migrations (once DB is reachable): sudo -u ${APP_USER} pnpm run db:migrate"
