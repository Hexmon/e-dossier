#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

log() {
  echo "[INFO] $*"
}

warn() {
  echo "[WARN] $*" >&2
}

err() {
  echo "[ERROR] $*" >&2
  exit 1
}

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
}

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    err "Run this script as root (use sudo)."
  fi
}

require_command() {
  local command_name="$1"
  local hint="$2"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    err "$command_name is required. $hint"
  fi
}

node_major_version() {
  "$1" -p "Number(process.versions.node.split('.')[0])" 2>/dev/null
}

is_usable_node() {
  local candidate="$1"
  local major

  [[ -n "$candidate" && -x "$candidate" ]] || return 1
  major="$(node_major_version "$candidate")" || return 1
  [[ "$major" =~ ^[0-9]+$ && "$major" -ge 20 ]]
}

resolve_node_bin() {
  local candidate user_home

  if [[ -n "${NODE_BIN:-}" ]]; then
    if is_usable_node "$NODE_BIN"; then
      printf '%s' "$NODE_BIN"
      return
    fi
    err "NODE_BIN is set to '${NODE_BIN}', but it is not executable Node.js 20+."
  fi

  candidate="$(command -v node 2>/dev/null || true)"
  if is_usable_node "$candidate"; then
    printf '%s' "$candidate"
    return
  fi

  for candidate in /usr/local/bin/node /usr/bin/node /opt/node/bin/node; do
    if is_usable_node "$candidate"; then
      printf '%s' "$candidate"
      return
    fi
  done

  if [[ -n "${SUDO_USER:-}" && "$SUDO_USER" != "root" ]]; then
    user_home="$(getent passwd "$SUDO_USER" 2>/dev/null | cut -d: -f6 || true)"
    if [[ -n "$user_home" && -d "${user_home}/.nvm/versions/node" ]]; then
      while IFS= read -r candidate; do
        if is_usable_node "$candidate"; then
          printf '%s' "$candidate"
          return
        fi
      done < <(find "${user_home}/.nvm/versions/node" -path '*/bin/node' -type f 2>/dev/null | sort -Vr)
    fi
  fi

  err "Node.js 20+ is required but was not found in root's PATH. If Node is installed in a user-local toolchain, rerun with: sudo NODE_BIN=/absolute/path/to/node ./edossier-vm1-bootstrap.sh"
}

escape_sed() {
  printf '%s' "$1" | sed 's/[\/&]/\\&/g'
}

set_env_value() {
  local file="$1"
  local key="$2"
  local value="$3"
  local escaped
  escaped="$(escape_sed "$value")"

  if grep -q "^${key}=" "$file"; then
    sed -i "s/^${key}=.*/${key}=${escaped}/" "$file"
  else
    echo "${key}=${value}" >> "$file"
  fi
}

render_template() {
  local template="$1"
  local destination="$2"
  shift 2

  local rendered
  rendered="$(cat "$template")"
  while [[ "$#" -gt 0 ]]; do
    local key="$1"
    local value="$2"
    rendered="$(printf '%s' "$rendered" | sed "s|${key}|$(escape_sed "$value")|g")"
    shift 2
  done

  printf '%s\n' "$rendered" > "$destination"
}

require_root

prompt_default APP_USER "Application service user" "nextapp"
prompt_default APP_ROOT "Application root directory" "/opt/edossier"
prompt_required PUBLIC_APP_ORIGIN "Public app origin (example: http://172.22.128.57)"
prompt_required MINIO_ORIGIN "Private MinIO origin on VM2 (example: http://172.22.128.56:9000)"

require_command nginx "Install Nginx on VM1 before running bootstrap."
require_command psql "Install the PostgreSQL client on VM1 before running bootstrap."
require_command systemctl "systemd is required on VM1."

NODE_BIN="$(resolve_node_bin)"
log "Using Node.js $("${NODE_BIN}" -v) at ${NODE_BIN}"
APP_PORT="3000"
APP_RELEASES_DIR="${APP_ROOT}/releases"
APP_SHARED_DIR="${APP_ROOT}/shared"
APP_ENV_FILE="${APP_SHARED_DIR}/app.env"
APP_ENV_EXAMPLE="${APP_SHARED_DIR}/app.env.example"
SERVICE_FILE="/etc/systemd/system/edossier-app.service"
NGINX_SITE_AVAILABLE="/etc/nginx/sites-available/edossier.conf"
NGINX_SITE_ENABLED="/etc/nginx/sites-enabled/edossier.conf"
PUBLIC_APP_ORIGIN="${PUBLIC_APP_ORIGIN%/}"
MINIO_ORIGIN="${MINIO_ORIGIN%/}"
MEDIA_PROXY_URL="${PUBLIC_APP_ORIGIN}/media"

if ! id "$APP_USER" >/dev/null 2>&1; then
  log "Creating service user ${APP_USER}"
  useradd --system --home-dir "$APP_ROOT" --shell /usr/sbin/nologin "$APP_USER"
fi

log "Preparing application directories"
install -d -m 755 "$APP_ROOT" "$APP_RELEASES_DIR"
install -d -m 750 "$APP_SHARED_DIR"
chown -R root:"$APP_USER" "$APP_ROOT"

log "Installing offline deployment commands"
install -m 755 "${SCRIPT_DIR}/bin/edossier-deploy.sh" /usr/local/bin/edossier-deploy
install -m 755 "${SCRIPT_DIR}/bin/edossier-migrate.sh" /usr/local/bin/edossier-migrate

log "Rendering systemd unit"
render_template \
  "${SCRIPT_DIR}/templates/edossier-app.service" \
  "$SERVICE_FILE" \
  "__APP_ROOT__" "$APP_ROOT" \
  "__APP_USER__" "$APP_USER" \
  "__NODE_BIN__" "$NODE_BIN" \
  "__APP_PORT__" "$APP_PORT"

log "Rendering Nginx site"
render_template \
  "${SCRIPT_DIR}/templates/edossier-nginx.conf" \
  "$NGINX_SITE_AVAILABLE" \
  "__APP_PORT__" "$APP_PORT" \
  "__MINIO_ORIGIN__" "$MINIO_ORIGIN"

ln -sfn "$NGINX_SITE_AVAILABLE" "$NGINX_SITE_ENABLED"
if [[ -L /etc/nginx/sites-enabled/default ]]; then
  rm -f /etc/nginx/sites-enabled/default
fi

log "Preparing shared application environment"
cp "${REPO_ROOT}/.env.production.example" "$APP_ENV_EXAMPLE"
if [[ ! -f "$APP_ENV_FILE" ]]; then
  cp "${REPO_ROOT}/.env.production.example" "$APP_ENV_FILE"
fi

for env_file in "$APP_ENV_EXAMPLE" "$APP_ENV_FILE"; do
  set_env_value "$env_file" "NEXT_PUBLIC_API_BASE_URL" "$PUBLIC_APP_ORIGIN"
  set_env_value "$env_file" "MINIO_ENDPOINT" "$MEDIA_PROXY_URL"
  set_env_value "$env_file" "MINIO_PUBLIC_URL" "$MEDIA_PROXY_URL"
  set_env_value "$env_file" "NODE_ENV" "production"
done

chown root:"$APP_USER" "$APP_ENV_FILE" "$APP_ENV_EXAMPLE"
chmod 640 "$APP_ENV_FILE" "$APP_ENV_EXAMPLE"

log "Validating Nginx configuration"
nginx -t

log "Enabling services"
systemctl daemon-reload
systemctl enable edossier-app.service
systemctl enable --now nginx

cat <<EOF

[INFO] VM1 bootstrap completed.

Next steps:
1. Edit ${APP_ENV_FILE} and replace placeholder secrets, DATABASE_URL, and admin credentials.
2. Transfer an app bundle built with:
   pnpm run release:airgap:app
3. Deploy it on VM1 with:
   sudo edossier-deploy /path/to/e-dossier-app-<version>.tar.gz
4. For schema releases, transfer the migration bundle and run:
   sudo edossier-migrate --backup-id <backup-reference> /path/to/e-dossier-migrations-<version>.tar.gz

The app will serve traffic on ${PUBLIC_APP_ORIGIN} and proxy MinIO through ${MEDIA_PROXY_URL}.
EOF
