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

require_docker_compose() {
  require_command docker "Install Docker Engine on VM1 before running Docker bootstrap."
  docker compose version >/dev/null 2>&1 || err "Docker Compose v2 plugin is required. Install the docker compose plugin on VM1."
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

url_host() {
  local url="$1"
  url="${url#*://}"
  url="${url%%/*}"
  printf '%s' "$url"
}

require_root
require_docker_compose

prompt_default APP_ROOT "Application root directory" "/opt/edossier"
prompt_required PUBLIC_APP_ORIGIN "Public app origin (example: http://172.22.128.57)"
prompt_required MINIO_ORIGIN "Private MinIO origin on VM2 (example: http://172.22.128.56:9000)"

APP_RELEASES_DIR="${APP_ROOT}/releases"
APP_SHARED_DIR="${APP_ROOT}/shared"
APP_NGINX_DIR="${APP_ROOT}/nginx"
APP_ENV_FILE="${APP_SHARED_DIR}/app.env"
APP_ENV_EXAMPLE="${APP_SHARED_DIR}/app.env.example"
COMPOSE_FILE="${APP_ROOT}/docker-compose.yml"
NGINX_CONF="${APP_NGINX_DIR}/edossier.conf"
PUBLIC_APP_ORIGIN="${PUBLIC_APP_ORIGIN%/}"
MINIO_ORIGIN="${MINIO_ORIGIN%/}"
MEDIA_PROXY_URL="${PUBLIC_APP_ORIGIN}/media"
PUBLIC_APP_HOST="$(url_host "$PUBLIC_APP_ORIGIN")"
MINIO_HOST="$(url_host "$MINIO_ORIGIN")"

log "Preparing Docker runtime directories"
install -d -m 755 "$APP_ROOT" "$APP_RELEASES_DIR" "$APP_NGINX_DIR"
install -d -m 750 "$APP_SHARED_DIR"

log "Installing Docker deployment commands"
install -m 755 "${SCRIPT_DIR}/bin/edossier-docker-deploy.sh" /usr/local/bin/edossier-docker-deploy
install -m 755 "${SCRIPT_DIR}/bin/edossier-docker-migrate.sh" /usr/local/bin/edossier-docker-migrate

log "Rendering Docker Compose file"
cp "${SCRIPT_DIR}/templates/docker-compose.vm1.yml" "$COMPOSE_FILE"

log "Rendering Docker Nginx site"
render_template \
  "${SCRIPT_DIR}/templates/edossier-nginx.docker.conf" \
  "$NGINX_CONF" \
  "__MINIO_ORIGIN__" "$MINIO_ORIGIN" \
  "__PUBLIC_HOST__" "$PUBLIC_APP_HOST" \
  "__MINIO_HOST__" "$MINIO_HOST"

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

chmod 640 "$APP_ENV_FILE" "$APP_ENV_EXAMPLE"

log "Validating Docker Compose configuration"
(
  cd "$APP_ROOT"
  docker compose -f "$COMPOSE_FILE" config >/dev/null
)

cat <<EOF

[INFO] VM1 Docker bootstrap completed.

Next steps:
1. Edit ${APP_ENV_FILE} and replace placeholder secrets, DATABASE_URL, and admin credentials.
2. Make sure these images are available on VM1:
   - node:20-bookworm-slim
   - nginx:1.27-alpine
   - edossier-tools:node20-pg16 (only needed for schema migrations)
3. Transfer an app bundle built with:
   pnpm run release:airgap:app
4. Deploy it on VM1 with:
   sudo edossier-docker-deploy /path/to/e-dossier-app-<version>.tar.gz
5. For schema releases, transfer the migration bundle and run:
   sudo edossier-docker-migrate --backup-id <backup-reference> /path/to/e-dossier-migrations-<version>.tar.gz

The app will serve traffic on ${PUBLIC_APP_ORIGIN} and proxy MinIO through ${MEDIA_PROXY_URL}.
EOF
