#!/usr/bin/env bash

set -euo pipefail

APP_ROOT="${APP_ROOT:-/opt/edossier}"
ENV_FILE_DEFAULT="${ENV_FILE:-${APP_ROOT}/shared/app.env}"
TOOLS_IMAGE="${EDOSSIER_TOOLS_IMAGE:-edossier-tools:node20-pg16}"

log() {
  echo "[INFO] $*"
}

err() {
  echo "[ERROR] $*" >&2
  exit 1
}

usage() {
  cat <<'EOF'
Usage:
  edossier-docker-migrate --backup-id <identifier> <migration-bundle.tar.gz>
  edossier-docker-migrate --backup-id <identifier> --env-file /path/to/app.env <migration-bundle.tar.gz>

Required Docker image:
  edossier-tools:node20-pg16

Build it on an internet-connected machine if needed:
  docker build -t edossier-tools:node20-pg16 -f deploy/airgap/docker/Dockerfile.tools deploy/airgap/docker
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

json_value() {
  local file="$1"
  local key="$2"
  sed -nE "s/^[[:space:]]*\"${key}\"[[:space:]]*:[[:space:]]*\"?([^\",]+)\"?,?[[:space:]]*$/\1/p" "$file" | head -n 1
}

verify_checksum() {
  local artifact="$1"
  local checksum_file="${artifact}.sha256"

  [[ -f "$artifact" ]] || err "Migration artifact not found: $artifact"
  [[ -f "$checksum_file" ]] || err "Checksum file not found: $checksum_file"

  require_command sha256sum "Install coreutils or run on a system with sha256sum available."
  log "Verifying checksum for $(basename "$artifact")"
  (
    cd "$(dirname "$artifact")"
    sha256sum -c "$(basename "$checksum_file")"
  )
}

main() {
  require_root
  require_command docker "Install Docker Engine on VM1 before running Docker migrations."

  local backup_id=""
  local env_file="$ENV_FILE_DEFAULT"
  local artifact=""

  while [[ "$#" -gt 0 ]]; do
    case "$1" in
      --backup-id)
        [[ "$#" -ge 2 ]] || err "Missing value for --backup-id"
        backup_id="$2"
        shift 2
        ;;
      --backup-id=*)
        backup_id="${1#*=}"
        shift
        ;;
      --env-file)
        [[ "$#" -ge 2 ]] || err "Missing value for --env-file"
        env_file="$2"
        shift 2
        ;;
      --env-file=*)
        env_file="${1#*=}"
        shift
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        artifact="$1"
        shift
        ;;
    esac
  done

  [[ -n "$backup_id" ]] || err "A backup identifier is required. Example: --backup-id pgdump-2026-04-13"
  [[ -n "$artifact" ]] || err "Provide the migration bundle tarball path."
  [[ -f "$env_file" ]] || err "Shared env file not found: $env_file"

  docker image inspect "$TOOLS_IMAGE" >/dev/null 2>&1 || err "Docker image '$TOOLS_IMAGE' is missing. Build or load it before running migrations."

  verify_checksum "$artifact"

  local tmp_dir bundle_dir manifest_path artifact_type
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' EXIT

  tar -xzf "$artifact" -C "$tmp_dir"
  bundle_dir="$(find "$tmp_dir" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
  [[ -n "$bundle_dir" ]] || err "Migration artifact did not extract a bundle directory."

  manifest_path="${bundle_dir}/release-manifest.json"
  [[ -f "$manifest_path" ]] || err "Missing release manifest in migration artifact."
  artifact_type="$(json_value "$manifest_path" artifactType)"
  [[ "$artifact_type" == "migrations" ]] || err "Artifact type must be 'migrations', got '${artifact_type:-unknown}'."
  [[ -f "${bundle_dir}/migrate.js" ]] || err "Missing offline migration runner in the bundle."

  log "Running schema release with backup confirmation: ${backup_id}"
  docker run --rm \
    --network host \
    --env-file "$env_file" \
    -v "${bundle_dir}:/bundle:ro" \
    "$TOOLS_IMAGE" \
    node /bundle/migrate.js --bundle-dir /bundle

  log "Migration bundle completed successfully."
}

main "$@"
