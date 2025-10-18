-- 0012_fix_appointments_active_window.sql
-- Ensure appointments.valid_during exists + keep constraints/indexes consistent

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Helper for EXCLUDE (already used elsewhere)
CREATE OR REPLACE FUNCTION zero_uuid() RETURNS uuid LANGUAGE sql IMMUTABLE
AS $$ SELECT '00000000-0000-0000-0000-000000000000'::uuid $$;

DO $$
BEGIN
  IF to_regclass('public.appointments') IS NULL THEN
    RAISE EXCEPTION 'appointments table is required by this migration.';
  END IF;

  -- Add generated range if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='appointments'
      AND column_name='valid_during'
  ) THEN
    ALTER TABLE appointments
      ADD COLUMN valid_during tstzrange
      GENERATED ALWAYS AS (tstzrange(starts_at, ends_at)) STORED;
  END IF;
END$$;

-- Keep time order sanity
ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appt_time_order,
  ADD  CONSTRAINT appt_time_order CHECK (ends_at IS NULL OR starts_at < ends_at);

-- Keep scope sanity
ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appt_scope_consistency,
  ADD  CONSTRAINT appt_scope_consistency CHECK (
    (scope_type = 'GLOBAL'  AND scope_id IS NULL) OR
    (scope_type = 'PLATOON' AND scope_id IS NOT NULL)
  );

-- Rebuild EXCLUDE (primary slot uniqueness over time) using valid_during
ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appt_slot_unique;

ALTER TABLE appointments
  ADD  CONSTRAINT appt_slot_unique
  EXCLUDE USING gist (
    position_id WITH =,
    scope_type  WITH =,
    (COALESCE(scope_id, zero_uuid())) WITH =,
    valid_during WITH &&
  )
  WHERE (assignment = 'PRIMARY' AND deleted_at IS NULL)
  DEFERRABLE INITIALLY IMMEDIATE;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS ix_appt_user_active
  ON appointments (user_id)
  WHERE ends_at IS NULL AND deleted_at IS NULL;

DROP INDEX IF EXISTS ix_appt_scope;
CREATE INDEX IF NOT EXISTS ix_appt_scope2
  ON appointments (position_id, scope_type, scope_id)
  WHERE deleted_at IS NULL;
