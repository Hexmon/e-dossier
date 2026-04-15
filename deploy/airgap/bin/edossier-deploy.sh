#!/usr/bin/env bash

set -euo pipefail

APP_ROOT="${APP_ROOT:-/opt/edossier}"
RELEASES_DIR="${RELEASES_DIR:-${APP_ROOT}/releases}"
SHARED_DIR="${SHARED_DIR:-${APP_ROOT}/shared}"
CURRENT_LINK="${CURRENT_LINK:-${APP_ROOT}/current}"
ENV_FILE="${ENV_FILE:-${SHARED_DIR}/app.env}"
DEFAULT_SERVICE_NAME="${SERVICE_NAME:-edossier-app.service}"
DEFAULT_KEEP_RELEASES="${KEEP_RELEASES:-3}"

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

usage() {
  cat <<'EOF'
Usage:
  edossier-deploy <artifact.tar.gz>
  edossier-deploy list
  edossier-deploy rollback [release-directory-name]

Environment overrides:
  APP_ROOT       Default: /opt/edossier
  RELEASES_DIR   Default: /opt/edossier/releases
  SHARED_DIR     Default: /opt/edossier/shared
  CURRENT_LINK   Default: /opt/edossier/current
  ENV_FILE       Default: /opt/edossier/shared/app.env
  SERVICE_NAME   Default: edossier-app.service
  KEEP_RELEASES  Default: 3
EOF
}

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    err "Run this command as root or via sudo."
  fi
}

json_value() {
  node -e '
    const fs = require("node:fs");
    const filePath = process.argv[1];
    const keyPath = process.argv[2].split(".");
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    let value = data;
    for (const key of keyPath) value = value?.[key];
    if (value === undefined || value === null) process.exit(1);
    process.stdout.write(String(value));
  ' "$1" "$2"
}

verify_checksum() {
  local artifact="$1"
  local checksum_file="${artifact}.sha256"

  [[ -f "$artifact" ]] || err "Artifact not found: $artifact"
  [[ -f "$checksum_file" ]] || err "Checksum file not found: $checksum_file"

  log "Verifying checksum for $(basename "$artifact")"
  (
    cd "$(dirname "$artifact")"
    sha256sum -c "$(basename "$checksum_file")"
  )
}

list_releases() {
  mkdir -p "$RELEASES_DIR"
  local current_target=""
  current_target="$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)"

  mapfile -t releases < <(find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d | sort -r)
  if [[ "${#releases[@]}" -eq 0 ]]; then
    log "No releases found under $RELEASES_DIR"
    return
  fi

  for release in "${releases[@]}"; do
    local marker=""
    if [[ -n "$current_target" && "$release" == "$current_target" ]]; then
      marker=" (current)"
    fi
    echo "- $(basename "$release")${marker}"
  done
}

resolve_rollback_target() {
  local requested="${1:-}"
  mkdir -p "$RELEASES_DIR"

  if [[ -n "$requested" ]]; then
    local explicit_target="${RELEASES_DIR}/${requested}"
    [[ -d "$explicit_target" ]] || err "Release not found: $requested"
    printf '%s' "$explicit_target"
    return
  fi

  local current_target=""
  current_target="$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)"
  mapfile -t releases < <(find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d | sort -r)

  local saw_current=0
  for release in "${releases[@]}"; do
    if [[ -n "$current_target" && "$release" == "$current_target" ]]; then
      saw_current=1
      continue
    fi
    if [[ -z "$current_target" || "$saw_current" -eq 1 ]]; then
      printf '%s' "$release"
      return
    fi
  done

  err "No previous release is available for rollback."
}

wait_for_healthcheck() {
  local url="$1"
  local attempts="${2:-30}"

  for _ in $(seq 1 "$attempts"); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done

  return 1
}

restart_release() {
  local release_dir="$1"
  local service_name="$2"
  local healthcheck_url="$3"

  ln -sfn "$release_dir" "$CURRENT_LINK"
  systemctl daemon-reload
  systemctl restart "$service_name"
  wait_for_healthcheck "$healthcheck_url"
}

service_owner() {
  local service_name="$1"
  local user group

  user="$(systemctl show -p User --value "$service_name" 2>/dev/null || true)"
  group="$(systemctl show -p Group --value "$service_name" 2>/dev/null || true)"

  if [[ -z "$user" ]]; then
    return 0
  fi
  if [[ -z "$group" ]]; then
    group="$user"
  fi

  printf '%s:%s' "$user" "$group"
}

prune_releases() {
  local keep_releases="$1"
  mapfile -t releases < <(find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d | sort -r)

  local index=0
  for release in "${releases[@]}"; do
    index=$((index + 1))
    if [[ "$index" -le "$keep_releases" ]]; then
      continue
    fi

    log "Pruning old release $(basename "$release")"
    rm -rf "$release"
  done
}

rollback_release() {
  local requested="${1:-}"
  local target service_name healthcheck_url deploy_metadata

  target="$(resolve_rollback_target "$requested")"
  deploy_metadata="${target}/deploy-metadata.json"
  [[ -f "$deploy_metadata" ]] || err "Missing deploy metadata in $target"

  service_name="$(json_value "$deploy_metadata" serviceName 2>/dev/null || printf '%s' "$DEFAULT_SERVICE_NAME")"
  healthcheck_url="$(json_value "$deploy_metadata" healthcheckUrl 2>/dev/null || printf '%s' 'http://127.0.0.1:3000/api/v1/health')"

  log "Rolling back to $(basename "$target")"
  restart_release "$target" "$service_name" "$healthcheck_url" || err "Rollback health check failed."
  log "Rollback completed successfully."
}

deploy_artifact() {
  local artifact="$1"
  local tmp_dir extracted_dir manifest_path deploy_metadata entrypoint artifact_type
  local service_name keep_releases healthcheck_url env_link_name release_name release_dir
  local previous_target ownership

  verify_checksum "$artifact"
  [[ -f "$ENV_FILE" ]] || err "Shared env file not found: $ENV_FILE"

  mkdir -p "$RELEASES_DIR" "$SHARED_DIR"
  tmp_dir="$(mktemp -d)"
  previous_target="$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)"
  trap 'rm -rf "$tmp_dir"' EXIT

  tar -xzf "$artifact" -C "$tmp_dir"
  extracted_dir="$(find "$tmp_dir" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
  [[ -n "$extracted_dir" ]] || err "Artifact did not extract a release directory."

  manifest_path="${extracted_dir}/release-manifest.json"
  deploy_metadata="${extracted_dir}/deploy-metadata.json"
  [[ -f "$manifest_path" ]] || err "Missing release manifest in artifact."
  [[ -f "$deploy_metadata" ]] || err "Missing deploy metadata in artifact."

  artifact_type="$(json_value "$manifest_path" artifactType 2>/dev/null || true)"
  [[ "$artifact_type" == "app" ]] || err "Artifact type must be 'app', got '${artifact_type:-unknown}'."

  entrypoint="$(json_value "$manifest_path" entrypoint 2>/dev/null || printf '%s' 'server.js')"
  [[ -f "${extracted_dir}/${entrypoint}" ]] || err "Artifact is missing runtime entrypoint ${entrypoint}."

  service_name="$(json_value "$deploy_metadata" serviceName 2>/dev/null || printf '%s' "$DEFAULT_SERVICE_NAME")"
  keep_releases="$(json_value "$deploy_metadata" releaseRetention 2>/dev/null || printf '%s' "$DEFAULT_KEEP_RELEASES")"
  healthcheck_url="$(json_value "$deploy_metadata" healthcheckUrl 2>/dev/null || printf '%s' 'http://127.0.0.1:3000/api/v1/health')"
  env_link_name="$(json_value "$deploy_metadata" envLinkName 2>/dev/null || printf '%s' '.env')"

  ln -sfn "$ENV_FILE" "${extracted_dir}/${env_link_name}"

  release_name="$(basename "$extracted_dir")"
  release_dir="${RELEASES_DIR}/$(date -u +%Y%m%dT%H%M%SZ)-${release_name}"
  mv "$extracted_dir" "$release_dir"

  ownership="$(service_owner "$service_name" || true)"
  if [[ -n "$ownership" ]]; then
    chown -R "$ownership" "$release_dir"
  fi

  log "Activating release $(basename "$release_dir")"
  if ! restart_release "$release_dir" "$service_name" "$healthcheck_url"; then
    warn "New release failed health checks. Attempting automatic rollback."
    if [[ -n "$previous_target" && -d "$previous_target" ]]; then
      restart_release "$previous_target" "$service_name" "$healthcheck_url" || true
      err "Deployment failed and rollback was attempted. Inspect $(basename "$release_dir") before retrying."
    fi
    err "Deployment failed before a rollback target was available."
  fi

  prune_releases "$keep_releases"
  log "Deployment completed successfully."
}

main() {
  require_root

  local command="${1:-}"
  case "$command" in
    ""|-h|--help)
      usage
      ;;
    list)
      list_releases
      ;;
    rollback)
      rollback_release "${2:-}"
      ;;
    *)
      deploy_artifact "$command"
      ;;
  esac
}

main "$@"
