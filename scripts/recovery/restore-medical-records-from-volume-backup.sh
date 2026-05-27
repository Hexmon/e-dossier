#!/usr/bin/env bash
set -Eeuo pipefail

# Restore dossier medical info and medical category rows from a physical
# PostgreSQL 16 Docker volume backup.
#
# This script:
# - starts the backup as an isolated temporary PostgreSQL container;
# - exports only public.oc_medicals and public.oc_medical_category;
# - loads the exported rows into temporary staging tables in the target DB;
# - validates parent OC references and semester values;
# - upserts only those two tables when --apply is passed;
# - never deletes rows from the target DB;
# - forces oc_medical_category.category to NULL during restore.
#
# Required:
#   docker
#   a postgres:16-alpine image available to Docker
#   TARGET_DATABASE_URL set to the on-prem app database URL, or APP_ENV_FILE
#   pointing at an env file that contains DATABASE_URL.
#   If neither is passed, the script auto-detects legacy /srv/edossier-app/.env
#   and air-gap /opt/edossier/shared/app.env.
#
# Example dry run:
#   BACKUP_TAR=/path/postgres-volume-backup.tar.gz \
#   APP_ENV_FILE=/opt/edossier/shared/app.env \
#   bash scripts/recovery/restore-medical-records-from-volume-backup.sh
#
# Apply:
#   BACKUP_TAR=/path/postgres-volume-backup.tar.gz \
#   APP_ENV_FILE=/opt/edossier/shared/app.env \
#   bash scripts/recovery/restore-medical-records-from-volume-backup.sh --apply

usage() {
  sed -n '1,38p' "$0" >&2
}

APPLY=false
KEEP_WORKDIR=false
BACKUP_TAR="${BACKUP_TAR:-}"
TARGET_DATABASE_URL="${TARGET_DATABASE_URL:-}"
APP_ENV_FILE="${APP_ENV_FILE:-}"
POSTGRES_IMAGE="${POSTGRES_IMAGE:-postgres:16-alpine}"
TEMP_PORT="${TEMP_PORT:-55432}"
BACKUP_DB_NAME="${BACKUP_DB_NAME:-}"
BACKUP_DB_USER="${BACKUP_DB_USER:-edossier}"
TARGET_DOCKER_NETWORK="${TARGET_DOCKER_NETWORK:-host}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --apply)
      APPLY=true
      shift
      ;;
    --backup-tar)
      BACKUP_TAR="${2:-}"
      shift 2
      ;;
    --target-database-url)
      TARGET_DATABASE_URL="${2:-}"
      shift 2
      ;;
    --app-env-file)
      APP_ENV_FILE="${2:-}"
      shift 2
      ;;
    --backup-db-name)
      BACKUP_DB_NAME="${2:-}"
      shift 2
      ;;
    --backup-db-user)
      BACKUP_DB_USER="${2:-}"
      shift 2
      ;;
    --postgres-image)
      POSTGRES_IMAGE="${2:-}"
      shift 2
      ;;
    --temp-port)
      TEMP_PORT="${2:-}"
      shift 2
      ;;
    --target-docker-network)
      TARGET_DOCKER_NETWORK="${2:-}"
      shift 2
      ;;
    --keep-workdir)
      KEEP_WORKDIR=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 2
      ;;
  esac
done

if [[ -z "$BACKUP_TAR" ]]; then
  echo "BACKUP_TAR is required." >&2
  exit 2
fi

if [[ ! -f "$BACKUP_TAR" ]]; then
  echo "Backup archive not found: $BACKUP_TAR" >&2
  exit 2
fi

if [[ -z "$TARGET_DATABASE_URL" && -z "$APP_ENV_FILE" ]]; then
  for candidate in \
    ./.env \
    /srv/edossier-app/.env \
    /opt/edossier/shared/app.env
  do
    if [[ -f "$candidate" ]]; then
      APP_ENV_FILE="$candidate"
      break
    fi
  done
fi

if [[ -z "$TARGET_DATABASE_URL" && -n "$APP_ENV_FILE" ]]; then
  if [[ ! -f "$APP_ENV_FILE" ]]; then
    echo "App env file not found: $APP_ENV_FILE" >&2
    exit 2
  fi
  TARGET_DATABASE_URL="$(
    sed -nE 's/^[[:space:]]*DATABASE_URL[[:space:]]*=[[:space:]]*(.*)[[:space:]]*$/\1/p' "$APP_ENV_FILE" \
      | tail -n 1 \
      | tr -d '\r'
  )"
  TARGET_DATABASE_URL="${TARGET_DATABASE_URL%\"}"
  TARGET_DATABASE_URL="${TARGET_DATABASE_URL#\"}"
  TARGET_DATABASE_URL="${TARGET_DATABASE_URL%\'}"
  TARGET_DATABASE_URL="${TARGET_DATABASE_URL#\'}"
fi

if [[ -z "$TARGET_DATABASE_URL" ]]; then
  echo "TARGET_DATABASE_URL is required, or pass APP_ENV_FILE/--app-env-file with DATABASE_URL." >&2
  exit 2
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required." >&2
  exit 2
fi

if ! command -v tar >/dev/null 2>&1; then
  echo "tar is required." >&2
  exit 2
fi

WORKDIR="$(mktemp -d "${TMPDIR:-/tmp}/edossier-medical-restore.XXXXXX")"
BACKUP_CONTAINER="edossier-medical-restore-$$"

cleanup() {
  docker rm -f "$BACKUP_CONTAINER" >/dev/null 2>&1 || true
  if [[ "$KEEP_WORKDIR" == "true" ]]; then
    echo "Keeping workdir: $WORKDIR" >&2
  else
    rm -rf "$WORKDIR"
  fi
}
trap cleanup EXIT

echo "Backup archive: $BACKUP_TAR"
echo "Working directory: $WORKDIR"
if [[ -n "$APP_ENV_FILE" ]]; then
  echo "App env file: $APP_ENV_FILE"
fi
if [[ "$APPLY" == "true" ]]; then
  echo "Mode: APPLY. The target DB will be updated inside one transaction."
else
  echo "Mode: DRY RUN. The target DB will not be modified. Pass --apply to restore."
fi

PG_VERSION_ENTRY="$(tar -tzf "$BACKUP_TAR" | grep '/pgdata/PG_VERSION$' | head -n 1 || true)"
if [[ -z "$PG_VERSION_ENTRY" ]]; then
  echo "Could not find pgdata/PG_VERSION in the archive." >&2
  exit 1
fi

PGDATA_DIR="${PG_VERSION_ENTRY%/PG_VERSION}"
STRIP_COMPONENTS="$(awk -F/ '{print NF-2}' <<<"$PG_VERSION_ENTRY")"
BACKUP_PG_VERSION="$(tar -xOzf "$BACKUP_TAR" "$PG_VERSION_ENTRY" | tr -d '\r\n')"

if [[ "$BACKUP_PG_VERSION" != "16" ]]; then
  echo "The backup is PostgreSQL $BACKUP_PG_VERSION, but this script expects PostgreSQL 16." >&2
  echo "Set POSTGRES_IMAGE to a matching image only after confirming binary compatibility." >&2
  exit 1
fi

echo "Extracting PostgreSQL data directory from: $PGDATA_DIR"
tar -xzf "$BACKUP_TAR" -C "$WORKDIR" --strip-components="$STRIP_COMPONENTS" "$PGDATA_DIR"
rm -f "$WORKDIR/pgdata/postmaster.pid"

echo "Normalizing backup data directory permissions for the temporary container"
docker run --rm \
  -v "$WORKDIR:/var/lib/postgresql/data" \
  "$POSTGRES_IMAGE" \
  sh -c "chown -R postgres:postgres /var/lib/postgresql/data/pgdata && chmod 700 /var/lib/postgresql/data/pgdata" >/dev/null

echo "Starting isolated backup PostgreSQL container: $BACKUP_CONTAINER"
docker run -d \
  --name "$BACKUP_CONTAINER" \
  -e PGDATA=/var/lib/postgresql/data/pgdata \
  -v "$WORKDIR:/var/lib/postgresql/data" \
  -p "127.0.0.1:${TEMP_PORT}:5432" \
  "$POSTGRES_IMAGE" \
  -c listen_addresses='*' >/dev/null

for _ in $(seq 1 60); do
  if docker exec "$BACKUP_CONTAINER" pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

if ! docker exec "$BACKUP_CONTAINER" pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
  echo "Backup PostgreSQL did not become ready. Container logs:" >&2
  docker logs "$BACKUP_CONTAINER" >&2 || true
  exit 1
fi

if [[ -z "$BACKUP_DB_NAME" ]]; then
  BACKUP_DB_NAME="$(
    docker exec "$BACKUP_CONTAINER" psql -U "$BACKUP_DB_USER" -d postgres -Atqc "
      select datname
      from pg_database
      where datallowconn and not datistemplate
      order by
        case
          when datname = 'e_dossier_v2' then 0
          when datname <> 'postgres' then 1
          else 2
        end,
        datname
      limit 1;
    "
  )"
fi

if [[ -z "$BACKUP_DB_NAME" ]]; then
  echo "Could not determine the database name inside the backup." >&2
  exit 1
fi

echo "Backup database: $BACKUP_DB_NAME"
echo "Backup database user: $BACKUP_DB_USER"

export_csv() {
  local table="$1"
  local sql="$2"
  local csv="$3"

  echo "Exporting public.${table} from backup"
  docker exec -i "$BACKUP_CONTAINER" psql -U "$BACKUP_DB_USER" -d "$BACKUP_DB_NAME" -X -v ON_ERROR_STOP=1 >"$csv" <<SQL
\set QUIET on
SELECT CASE WHEN to_regclass('public.${table}') IS NOT NULL THEN 'true' ELSE 'false' END AS table_exists
\gset
\if :table_exists
${sql}
\else
\warn 'Source table public.${table} does not exist in the backup.'
\quit 3
\endif
SQL
}

export_csv "oc_medicals" "
WITH required(ord, name, type_name) AS (
  VALUES
    (1, 'id', 'uuid'),
    (2, 'oc_id', 'uuid'),
    (3, 'enrollment_id', 'uuid'),
    (4, 'semester', 'integer'),
    (5, 'date', 'timestamp with time zone'),
    (6, 'age', 'numeric'),
    (7, 'height_cm', 'numeric'),
    (8, 'ibw_kg', 'numeric'),
    (9, 'abw_kg', 'numeric'),
    (10, 'overwt_pct', 'numeric'),
    (11, 'bmi', 'numeric'),
    (12, 'chest_cm', 'numeric'),
    (13, 'medical_history', 'text'),
    (14, 'hereditary_issues', 'text'),
    (15, 'allergies', 'text'),
    (16, 'deleted_at', 'timestamp with time zone')
)
SELECT format(
  'COPY (SELECT %s FROM public.oc_medicals ORDER BY id) TO STDOUT WITH (FORMAT csv, HEADER true, FORCE_QUOTE *);',
  string_agg(
    CASE
      WHEN c.column_name IS NULL THEN format('NULL::%s AS %I', r.type_name, r.name)
      ELSE format('%I', r.name)
    END,
    ', ' ORDER BY r.ord
  )
)
FROM required r
LEFT JOIN information_schema.columns c
  ON c.table_schema = 'public'
 AND c.table_name = 'oc_medicals'
 AND c.column_name = r.name;
\gexec
" "$WORKDIR/oc_medicals.csv"

export_csv "oc_medical_category" "
WITH required(ord, name, type_name, force_null) AS (
  VALUES
    (1, 'id', 'uuid', false),
    (2, 'oc_id', 'uuid', false),
    (3, 'enrollment_id', 'uuid', false),
    (4, 'semester', 'integer', false),
    (5, 'date', 'timestamp with time zone', false),
    (6, 'mos_and_diagnostics', 'text', false),
    (7, 'cat_from', 'timestamp with time zone', false),
    (8, 'cat_to', 'timestamp with time zone', false),
    (9, 'category', 'text', true),
    (10, 'mh_from', 'timestamp with time zone', false),
    (11, 'mh_to', 'timestamp with time zone', false),
    (12, 'absence', 'text', false),
    (13, 'platoon_commander_name', 'character varying(160)', false),
    (14, 'deleted_at', 'timestamp with time zone', false)
)
SELECT format(
  'COPY (SELECT %s FROM public.oc_medical_category ORDER BY id) TO STDOUT WITH (FORMAT csv, HEADER true, FORCE_QUOTE *);',
  string_agg(
    CASE
      WHEN r.force_null THEN format('NULL::%s AS %I', r.type_name, r.name)
      WHEN c.column_name IS NULL THEN format('NULL::%s AS %I', r.type_name, r.name)
      ELSE format('%I', r.name)
    END,
    ', ' ORDER BY r.ord
  )
)
FROM required r
LEFT JOIN information_schema.columns c
  ON c.table_schema = 'public'
 AND c.table_name = 'oc_medical_category'
 AND c.column_name = r.name;
\gexec
" "$WORKDIR/oc_medical_category.csv"

echo "Source row counts:"
printf '  oc_medicals: '
tail -n +2 "$WORKDIR/oc_medicals.csv" | wc -l | tr -d ' '
printf '  oc_medical_category: '
tail -n +2 "$WORKDIR/oc_medical_category.csv" | wc -l | tr -d ' '

TARGET_SQL="$WORKDIR/target-import.sql"
cat >"$TARGET_SQL" <<SQL
\\set ON_ERROR_STOP on
\\set apply ${APPLY}

DO \$\$
DECLARE
  missing text;
BEGIN
  WITH required(table_name, column_name) AS (
    VALUES
      ('oc_medicals', 'id'),
      ('oc_medicals', 'oc_id'),
      ('oc_medicals', 'enrollment_id'),
      ('oc_medicals', 'semester'),
      ('oc_medicals', 'date'),
      ('oc_medicals', 'age'),
      ('oc_medicals', 'height_cm'),
      ('oc_medicals', 'ibw_kg'),
      ('oc_medicals', 'abw_kg'),
      ('oc_medicals', 'overwt_pct'),
      ('oc_medicals', 'bmi'),
      ('oc_medicals', 'chest_cm'),
      ('oc_medicals', 'medical_history'),
      ('oc_medicals', 'hereditary_issues'),
      ('oc_medicals', 'allergies'),
      ('oc_medicals', 'deleted_at'),
      ('oc_medical_category', 'id'),
      ('oc_medical_category', 'oc_id'),
      ('oc_medical_category', 'enrollment_id'),
      ('oc_medical_category', 'semester'),
      ('oc_medical_category', 'date'),
      ('oc_medical_category', 'mos_and_diagnostics'),
      ('oc_medical_category', 'cat_from'),
      ('oc_medical_category', 'cat_to'),
      ('oc_medical_category', 'category'),
      ('oc_medical_category', 'mh_from'),
      ('oc_medical_category', 'mh_to'),
      ('oc_medical_category', 'absence'),
      ('oc_medical_category', 'platoon_commander_name'),
      ('oc_medical_category', 'deleted_at')
  )
  SELECT string_agg(format('%I.%I', r.table_name, r.column_name), ', ')
    INTO missing
  FROM required r
  LEFT JOIN information_schema.columns c
    ON c.table_schema = 'public'
   AND c.table_name = r.table_name
   AND c.column_name = r.column_name
  WHERE c.column_name IS NULL;

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Target database is missing expected columns: %', missing;
  END IF;
END
\$\$;

CREATE TEMP TABLE restore_oc_medicals (
  id uuid,
  oc_id uuid,
  enrollment_id uuid,
  semester integer,
  date timestamp with time zone,
  age numeric,
  height_cm numeric,
  ibw_kg numeric,
  abw_kg numeric,
  overwt_pct numeric,
  bmi numeric,
  chest_cm numeric,
  medical_history text,
  hereditary_issues text,
  allergies text,
  deleted_at timestamp with time zone
);

CREATE TEMP TABLE restore_oc_medical_category (
  id uuid,
  oc_id uuid,
  enrollment_id uuid,
  semester integer,
  date timestamp with time zone,
  mos_and_diagnostics text,
  cat_from timestamp with time zone,
  cat_to timestamp with time zone,
  category text,
  mh_from timestamp with time zone,
  mh_to timestamp with time zone,
  absence text,
  platoon_commander_name varchar(160),
  deleted_at timestamp with time zone
);

\\copy restore_oc_medicals FROM '/work/oc_medicals.csv' WITH (FORMAT csv, HEADER true)
\\copy restore_oc_medical_category FROM '/work/oc_medical_category.csv' WITH (FORMAT csv, HEADER true)

DO \$\$
DECLARE
  bad_medical_ids integer;
  bad_medical_category_ids integer;
  bad_medical_semesters integer;
  bad_medical_category_semesters integer;
  missing_medical_ocs integer;
  missing_medical_category_ocs integer;
BEGIN
  SELECT count(*) INTO bad_medical_ids FROM restore_oc_medicals WHERE id IS NULL OR oc_id IS NULL OR date IS NULL;
  SELECT count(*) INTO bad_medical_category_ids FROM restore_oc_medical_category WHERE id IS NULL OR oc_id IS NULL OR date IS NULL;
  SELECT count(*) INTO bad_medical_semesters FROM restore_oc_medicals WHERE semester NOT BETWEEN 1 AND 6;
  SELECT count(*) INTO bad_medical_category_semesters FROM restore_oc_medical_category WHERE semester NOT BETWEEN 1 AND 6;
  SELECT count(*) INTO missing_medical_ocs
    FROM restore_oc_medicals s
    LEFT JOIN public.oc_cadets oc ON oc.id = s.oc_id
    WHERE oc.id IS NULL;
  SELECT count(*) INTO missing_medical_category_ocs
    FROM restore_oc_medical_category s
    LEFT JOIN public.oc_cadets oc ON oc.id = s.oc_id
    WHERE oc.id IS NULL;

  IF bad_medical_ids > 0 OR bad_medical_category_ids > 0 THEN
    RAISE EXCEPTION 'Backup has rows missing required id, oc_id, or date. oc_medicals=%, oc_medical_category=%',
      bad_medical_ids, bad_medical_category_ids;
  END IF;

  IF bad_medical_semesters > 0 OR bad_medical_category_semesters > 0 THEN
    RAISE EXCEPTION 'Backup has rows outside semester 1..6. oc_medicals=%, oc_medical_category=%',
      bad_medical_semesters, bad_medical_category_semesters;
  END IF;

  IF missing_medical_ocs > 0 OR missing_medical_category_ocs > 0 THEN
    RAISE EXCEPTION 'Target DB is missing parent OC rows. oc_medicals=%, oc_medical_category=%',
      missing_medical_ocs, missing_medical_category_ocs;
  END IF;
END
\$\$;

WITH medical_enrollment_resolution AS (
  SELECT
    count(*) FILTER (WHERE s.enrollment_id IS NOT NULL AND exact_enrollment.id IS NOT NULL) AS kept_source_enrollment,
    count(*) FILTER (WHERE s.enrollment_id IS NULL AND active_enrollment.id IS NOT NULL) AS filled_active_enrollment,
    count(*) FILTER (WHERE s.enrollment_id IS NOT NULL AND exact_enrollment.id IS NULL AND active_enrollment.id IS NOT NULL) AS replaced_missing_source_enrollment,
    count(*) FILTER (WHERE exact_enrollment.id IS NULL AND active_enrollment.id IS NULL) AS left_null_enrollment
  FROM restore_oc_medicals s
  LEFT JOIN public.oc_course_enrollments exact_enrollment
    ON exact_enrollment.id = s.enrollment_id
   AND exact_enrollment.oc_id = s.oc_id
  LEFT JOIN LATERAL (
    SELECT e.id
    FROM public.oc_course_enrollments e
    WHERE e.oc_id = s.oc_id
      AND e.status = 'ACTIVE'
    ORDER BY e.started_on DESC, e.created_at DESC
    LIMIT 1
  ) active_enrollment ON true
)
SELECT 'oc_medicals enrollment resolution' AS check_name, *
FROM medical_enrollment_resolution;

WITH medcat_enrollment_resolution AS (
  SELECT
    count(*) FILTER (WHERE s.enrollment_id IS NOT NULL AND exact_enrollment.id IS NOT NULL) AS kept_source_enrollment,
    count(*) FILTER (WHERE s.enrollment_id IS NULL AND active_enrollment.id IS NOT NULL) AS filled_active_enrollment,
    count(*) FILTER (WHERE s.enrollment_id IS NOT NULL AND exact_enrollment.id IS NULL AND active_enrollment.id IS NOT NULL) AS replaced_missing_source_enrollment,
    count(*) FILTER (WHERE exact_enrollment.id IS NULL AND active_enrollment.id IS NULL) AS left_null_enrollment
  FROM restore_oc_medical_category s
  LEFT JOIN public.oc_course_enrollments exact_enrollment
    ON exact_enrollment.id = s.enrollment_id
   AND exact_enrollment.oc_id = s.oc_id
  LEFT JOIN LATERAL (
    SELECT e.id
    FROM public.oc_course_enrollments e
    WHERE e.oc_id = s.oc_id
      AND e.status = 'ACTIVE'
    ORDER BY e.started_on DESC, e.created_at DESC
    LIMIT 1
  ) active_enrollment ON true
)
SELECT 'oc_medical_category enrollment resolution' AS check_name, *
FROM medcat_enrollment_resolution;

SELECT 'would_restore_oc_medicals' AS check_name, count(*) AS rows FROM restore_oc_medicals;
SELECT 'would_restore_oc_medical_category' AS check_name, count(*) AS rows FROM restore_oc_medical_category;

\\if :apply
BEGIN;

WITH normalized AS (
  SELECT
    s.id,
    s.oc_id,
    COALESCE(exact_enrollment.id, active_enrollment.id) AS enrollment_id,
    s.semester,
    s.date,
    s.age,
    s.height_cm,
    s.ibw_kg,
    s.abw_kg,
    s.overwt_pct,
    s.bmi,
    s.chest_cm,
    s.medical_history,
    s.hereditary_issues,
    s.allergies,
    s.deleted_at
  FROM restore_oc_medicals s
  LEFT JOIN public.oc_course_enrollments exact_enrollment
    ON exact_enrollment.id = s.enrollment_id
   AND exact_enrollment.oc_id = s.oc_id
  LEFT JOIN LATERAL (
    SELECT e.id
    FROM public.oc_course_enrollments e
    WHERE e.oc_id = s.oc_id
      AND e.status = 'ACTIVE'
    ORDER BY e.started_on DESC, e.created_at DESC
    LIMIT 1
  ) active_enrollment ON true
),
upserted AS (
  INSERT INTO public.oc_medicals (
    id,
    oc_id,
    enrollment_id,
    semester,
    date,
    age,
    height_cm,
    ibw_kg,
    abw_kg,
    overwt_pct,
    bmi,
    chest_cm,
    medical_history,
    hereditary_issues,
    allergies,
    deleted_at
  )
  SELECT
    id,
    oc_id,
    enrollment_id,
    semester,
    date,
    age,
    height_cm,
    ibw_kg,
    abw_kg,
    overwt_pct,
    bmi,
    chest_cm,
    medical_history,
    hereditary_issues,
    allergies,
    deleted_at
  FROM normalized
  ON CONFLICT (id) DO UPDATE SET
    oc_id = EXCLUDED.oc_id,
    enrollment_id = EXCLUDED.enrollment_id,
    semester = EXCLUDED.semester,
    date = EXCLUDED.date,
    age = EXCLUDED.age,
    height_cm = EXCLUDED.height_cm,
    ibw_kg = EXCLUDED.ibw_kg,
    abw_kg = EXCLUDED.abw_kg,
    overwt_pct = EXCLUDED.overwt_pct,
    bmi = EXCLUDED.bmi,
    chest_cm = EXCLUDED.chest_cm,
    medical_history = EXCLUDED.medical_history,
    hereditary_issues = EXCLUDED.hereditary_issues,
    allergies = EXCLUDED.allergies,
    deleted_at = EXCLUDED.deleted_at
  RETURNING id
)
SELECT 'restored_oc_medicals' AS check_name, count(*) AS rows FROM upserted;

WITH normalized AS (
  SELECT
    s.id,
    s.oc_id,
    COALESCE(exact_enrollment.id, active_enrollment.id) AS enrollment_id,
    s.semester,
    s.date,
    s.mos_and_diagnostics,
    s.cat_from,
    s.cat_to,
    NULL::varchar(160) AS category,
    s.mh_from,
    s.mh_to,
    s.absence,
    s.platoon_commander_name,
    s.deleted_at
  FROM restore_oc_medical_category s
  LEFT JOIN public.oc_course_enrollments exact_enrollment
    ON exact_enrollment.id = s.enrollment_id
   AND exact_enrollment.oc_id = s.oc_id
  LEFT JOIN LATERAL (
    SELECT e.id
    FROM public.oc_course_enrollments e
    WHERE e.oc_id = s.oc_id
      AND e.status = 'ACTIVE'
    ORDER BY e.started_on DESC, e.created_at DESC
    LIMIT 1
  ) active_enrollment ON true
),
upserted AS (
  INSERT INTO public.oc_medical_category (
    id,
    oc_id,
    enrollment_id,
    semester,
    date,
    mos_and_diagnostics,
    cat_from,
    cat_to,
    category,
    mh_from,
    mh_to,
    absence,
    platoon_commander_name,
    deleted_at
  )
  SELECT
    id,
    oc_id,
    enrollment_id,
    semester,
    date,
    mos_and_diagnostics,
    cat_from,
    cat_to,
    category,
    mh_from,
    mh_to,
    absence,
    platoon_commander_name,
    deleted_at
  FROM normalized
  ON CONFLICT (id) DO UPDATE SET
    oc_id = EXCLUDED.oc_id,
    enrollment_id = EXCLUDED.enrollment_id,
    semester = EXCLUDED.semester,
    date = EXCLUDED.date,
    mos_and_diagnostics = EXCLUDED.mos_and_diagnostics,
    cat_from = EXCLUDED.cat_from,
    cat_to = EXCLUDED.cat_to,
    category = NULL,
    mh_from = EXCLUDED.mh_from,
    mh_to = EXCLUDED.mh_to,
    absence = EXCLUDED.absence,
    platoon_commander_name = EXCLUDED.platoon_commander_name,
    deleted_at = EXCLUDED.deleted_at
  RETURNING id
)
SELECT 'restored_oc_medical_category' AS check_name, count(*) AS rows FROM upserted;

COMMIT;
\\else
\\echo 'Dry run complete. No production rows were inserted or updated.'
\\endif
SQL

echo "Loading staged rows into target database"
docker run --rm -i \
  --network "$TARGET_DOCKER_NETWORK" \
  -v "$WORKDIR:/work:ro" \
  "$POSTGRES_IMAGE" \
  psql "$TARGET_DATABASE_URL" -X -f /work/target-import.sql

echo "Done."
