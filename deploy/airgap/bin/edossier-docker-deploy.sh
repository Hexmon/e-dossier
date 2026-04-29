#!/usr/bin/env bash

set -euo pipefail

APP_ROOT="${APP_ROOT:-/opt/edossier}"
RELEASES_DIR="${RELEASES_DIR:-${APP_ROOT}/releases}"
SHARED_DIR="${SHARED_DIR:-${APP_ROOT}/shared}"
CURRENT_LINK="${CURRENT_LINK:-${APP_ROOT}/current}"
ENV_FILE="${ENV_FILE:-${SHARED_DIR}/app.env}"
COMPOSE_FILE="${COMPOSE_FILE:-${APP_ROOT}/docker-compose.yml}"
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
  edossier-docker-deploy <artifact.tar.gz>
  edossier-docker-deploy list
  edossier-docker-deploy rollback [release-directory-name]

Environment overrides:
  APP_ROOT       Default: /opt/edossier
  RELEASES_DIR   Default: /opt/edossier/releases
  SHARED_DIR     Default: /opt/edossier/shared
  CURRENT_LINK   Default: /opt/edossier/current
  ENV_FILE       Default: /opt/edossier/shared/app.env
  COMPOSE_FILE   Default: /opt/edossier/docker-compose.yml
  KEEP_RELEASES  Default: 3
EOF
}

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    err "Run this command as root or via sudo."
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
  require_command docker "Install Docker Engine on VM1 before running Docker deployment."
  docker compose version >/dev/null 2>&1 || err "Docker Compose v2 plugin is required."
}

compose() {
  docker compose -f "$COMPOSE_FILE" "$@"
}

json_value() {
  local file="$1"
  local key="$2"
  sed -nE "s/^[[:space:]]*\"${key}\"[[:space:]]*:[[:space:]]*\"?([^\",]+)\"?,?[[:space:]]*$/\1/p" "$file" | head -n 1
}

verify_checksum() {
  local artifact="$1"
  local checksum_file="${artifact}.sha256"

  [[ -f "$artifact" ]] || err "Artifact not found: $artifact"
  [[ -f "$checksum_file" ]] || err "Checksum file not found: $checksum_file"

  require_command sha256sum "Install coreutils or run on a system with sha256sum available."
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
  local attempts="${1:-30}"

  for _ in $(seq 1 "$attempts"); do
    if compose exec -T edossier-app node -e "fetch('http://127.0.0.1:3000/api/v1/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done

  return 1
}

restart_release() {
  local release_dir="$1"

  ln -sfn "$release_dir" "$CURRENT_LINK"
  compose up -d --force-recreate edossier-app nginx
  wait_for_healthcheck
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
  local target

  target="$(resolve_rollback_target "$requested")"
  [[ -f "${target}/deploy-metadata.json" ]] || err "Missing deploy metadata in $target"

  log "Rolling back to $(basename "$target")"
  restart_release "$target" || err "Rollback health check failed."
  log "Rollback completed successfully."
}

deploy_artifact() {
  local artifact="$1"
  local tmp_dir extracted_dir manifest_path deploy_metadata entrypoint artifact_type
  local keep_releases env_link_name release_name release_dir previous_target

  verify_checksum "$artifact"
  [[ -f "$ENV_FILE" ]] || err "Shared env file not found: $ENV_FILE"
  [[ -f "$COMPOSE_FILE" ]] || err "Docker Compose file not found: $COMPOSE_FILE. Run edossier-vm1-docker-bootstrap.sh first."

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

  artifact_type="$(json_value "$manifest_path" artifactType)"
  [[ "$artifact_type" == "app" ]] || err "Artifact type must be 'app', got '${artifact_type:-unknown}'."

  entrypoint="$(json_value "$manifest_path" entrypoint)"
  entrypoint="${entrypoint:-server.js}"
  [[ -f "${extracted_dir}/${entrypoint}" ]] || err "Artifact is missing runtime entrypoint ${entrypoint}."

  keep_releases="$(json_value "$deploy_metadata" releaseRetention)"
  keep_releases="${keep_releases:-$DEFAULT_KEEP_RELEASES}"
  env_link_name="$(json_value "$deploy_metadata" envLinkName)"
  env_link_name="${env_link_name:-.env}"

  ln -sfn "$ENV_FILE" "${extracted_dir}/${env_link_name}"

  release_name="$(basename "$extracted_dir")"
  release_dir="${RELEASES_DIR}/$(date -u +%Y%m%dT%H%M%SZ)-${release_name}"
  mv "$extracted_dir" "$release_dir"

  log "Activating release $(basename "$release_dir")"
  if ! restart_release "$release_dir"; then
    warn "New release failed health checks. Attempting automatic rollback."
    if [[ -n "$previous_target" && -d "$previous_target" ]]; then
      restart_release "$previous_target" || true
      err "Deployment failed and rollback was attempted. Inspect $(basename "$release_dir") before retrying."
    fi
    err "Deployment failed before a rollback target was available."
  fi

  prune_releases "$keep_releases"
  log "Deployment completed successfully."
}

main() {
  require_root
  require_docker_compose

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
