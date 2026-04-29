#!/usr/bin/env bash

set -euo pipefail

APP_ROOT="${APP_ROOT:-/opt/edossier}"
ENV_FILE_DEFAULT="${ENV_FILE:-${APP_ROOT}/shared/app.env}"

log() {
  echo "[INFO] $*"
}

err() {
  echo "[ERROR] $*" >&2
  exit 1
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

  err "Node.js 20+ is required but was not found in root's PATH. Set NODE_BIN to an absolute Node.js 20+ binary path."
}

usage() {
  cat <<'EOF'
Usage:
  edossier-migrate --backup-id <identifier> <migration-bundle.tar.gz>
  edossier-migrate --backup-id <identifier> --env-file /path/to/app.env <migration-bundle.tar.gz>

The backup identifier is mandatory so the operator records the DB backup or checkpoint
that was taken before the schema release was applied.
EOF
}

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    err "Run this command as root or via sudo."
  fi
}

verify_checksum() {
  local artifact="$1"
  local checksum_file="${artifact}.sha256"

  [[ -f "$artifact" ]] || err "Migration artifact not found: $artifact"
  [[ -f "$checksum_file" ]] || err "Checksum file not found: $checksum_file"

  log "Verifying checksum for $(basename "$artifact")"
  (
    cd "$(dirname "$artifact")"
    sha256sum -c "$(basename "$checksum_file")"
  )
}

json_value() {
  "$NODE_BIN_RESOLVED" -e '
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

main() {
  require_root
  NODE_BIN_RESOLVED="$(resolve_node_bin)"

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

  verify_checksum "$artifact"

  local tmp_dir bundle_dir manifest_path artifact_type
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' EXIT

  tar -xzf "$artifact" -C "$tmp_dir"
  bundle_dir="$(find "$tmp_dir" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
  [[ -n "$bundle_dir" ]] || err "Migration artifact did not extract a bundle directory."

  manifest_path="${bundle_dir}/release-manifest.json"
  [[ -f "$manifest_path" ]] || err "Missing release manifest in migration artifact."
  artifact_type="$(json_value "$manifest_path" artifactType 2>/dev/null || true)"
  [[ "$artifact_type" == "migrations" ]] || err "Artifact type must be 'migrations', got '${artifact_type:-unknown}'."
  [[ -f "${bundle_dir}/migrate.js" ]] || err "Missing offline migration runner in the bundle."

  log "Running schema release with backup confirmation: ${backup_id}"
  set -a
  # shellcheck disable=SC1090
  source "$env_file"
  set +a

  [[ -n "${DATABASE_URL:-}" ]] || err "DATABASE_URL is missing from ${env_file}"

  "$NODE_BIN_RESOLVED" "${bundle_dir}/migrate.js" --bundle-dir "$bundle_dir"
  log "Migration bundle completed successfully."
}

main "$@"
