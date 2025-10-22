-- 0010_schema_upgrade_rbacpp.sql
-- RBAC++ catalog + appointments/delegations hardening
-- Run on Postgres 13+ (citext, btree_gist, pgcrypto)

-- ===== Extensions ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;     -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS btree_gist;   -- EXCLUDE constraints on ranges
CREATE EXTENSION IF NOT EXISTS citext;       -- case-insensitive text for usernames/emails

-- ===== Helper functions & triggers ==========================================
CREATE OR REPLACE FUNCTION zero_uuid() RETURNS uuid LANGUAGE sql IMMUTABLE
AS $$ SELECT '00000000-0000-0000-0000-000000000000'::uuid $$;

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END$$;

-- (Re)attach generic updated_at triggers where relevant (idempotent)
DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
    CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  IF to_regclass('public.appointments') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_appt_updated_at ON appointments;
    CREATE TRIGGER trg_appt_updated_at
    BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  IF to_regclass('public.delegations') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_del_updated_at ON delegations;
    CREATE TRIGGER trg_del_updated_at
    BEFORE UPDATE ON delegations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  IF to_regclass('public.platoons') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_platoons_updated_at ON platoons;
    CREATE TRIGGER trg_platoons_updated_at
    BEFORE UPDATE ON platoons FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END$$;

-- ===== Remove refresh tokens feature (per new design) =======================
DO $$
BEGIN
  IF to_regclass('public.refresh_tokens') IS NOT NULL THEN
    DROP TABLE refresh_tokens CASCADE;
  END IF;
END$$;

-- ===== Enums used by the model =============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assignment_kind') THEN
    CREATE TYPE assignment_kind AS ENUM ('PRIMARY','OFFICIATING');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scope_type') THEN
    CREATE TYPE scope_type AS ENUM ('GLOBAL','PLATOON');
  END IF;
END$$;

-- ===== Catalog: positions (list of appointments/posts) ======================
DO $$
BEGIN
  IF to_regclass('public.positions') IS NULL THEN
    CREATE TABLE positions (
      id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      key           varchar(64) NOT NULL UNIQUE,
      display_name  varchar(128),
      default_scope scope_type NOT NULL,
      singleton     boolean NOT NULL DEFAULT true, -- one active holder per slot (per scope)
      description   text,
      created_at    timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END$$;

-- If positions.default_scope exists but is not scope_type, convert
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='positions' AND column_name='default_scope'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='positions' AND column_name='default_scope'
      AND udt_name <> 'scope_type'
  ) THEN
    ALTER TABLE positions
      ALTER COLUMN default_scope TYPE scope_type
      USING default_scope::scope_type;
  END IF;
END$$;

-- Seed positions (idempotent; covers all you listed)
INSERT INTO positions (key, display_name, default_scope, singleton, description)
VALUES
  ('SUPER_ADMIN',       'Super Admin',         'GLOBAL',  true, 'System superuser (unique)'),
  ('ADMIN',             'Admin',               'GLOBAL',  true, 'System administrator (unique)'),
  ('CCO',               'CCO',                 'GLOBAL',  true, 'Chief Compliance Officer'),
  ('COMMANDANT',        'Commandant (CDR)',    'GLOBAL',  true, 'Overall commander'),
  ('DEPUTY_COMMANDANT', 'Deputy Commandant',   'GLOBAL',  true, 'Deputy to Commandant'),
  ('DEPUTY_SECRETARY',  'Deputy Secretary',    'GLOBAL',  true, 'DS Cord'),
  ('HOAT',              'HoAT',                'GLOBAL',  true, 'Head of Admin/Training'),
  ('PLATOON_COMMANDER', 'Platoon Commander',   'PLATOON', true, 'Exactly one active per platoon'),
  ('COMMANDER',         'Commander',           'GLOBAL',  true, 'Commander (org-specific)'),
  ('DCCI',              'DCCI',                'GLOBAL',  true, 'Custom org post')
ON CONFLICT (key) DO NOTHING;

-- ===== Catalog: platoons ====================================================
DO $$
BEGIN
  IF to_regclass('public.platoons') IS NULL THEN
    CREATE TABLE platoons (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      key        varchar(64) NOT NULL UNIQUE,
      name       varchar(128) NOT NULL,
      about      text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      deleted_at timestamptz
    );
  END IF;
END$$;

INSERT INTO platoons (key, name) VALUES
  ('ARJUN','Arjun Platoon'),
  ('CHANDRAGUPT','Chandragupt Platoon'),
  ('RANAPRATAP','Ranapratap Platoon'),
  ('SHIVAJI','Shivaji Platoon'),
  ('KARNA','Karna Platoon'),
  ('PRITHVIRAJ','Prithviraj Platoon')
ON CONFLICT (key) DO NOTHING;

-- ===== users table: match target spec ======================================
-- - username/email -> CITEXT (case-insensitive)
-- - drop legacy columns: usertype, appoint_id
-- - add current_appointment_id (nullable FK to appointments.id)
-- - keep partial-unique indexes (ignore soft-deleted rows)

-- Ensure CITEXT types for username/email
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='username') THEN
    ALTER TABLE users
      ALTER COLUMN username TYPE citext USING username::citext;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='email') THEN
    ALTER TABLE users
      ALTER COLUMN email TYPE citext USING email::citext;
  END IF;
END$$;

-- Drop legacy columns no longer in the spec
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='usertype') THEN
    ALTER TABLE users DROP COLUMN usertype;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='appoint_id') THEN
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_appoint_fk;
    ALTER TABLE users DROP COLUMN appoint_id;
  END IF;
END$$;

-- Add current_appointment_id (nullable). FK added later after appointments section.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='current_appointment_id') THEN
    ALTER TABLE users ADD COLUMN current_appointment_id uuid;
  END IF;
END$$;

-- Soft-delete-aware unique indexes (username/email/phone)
DROP INDEX IF EXISTS uq_users_username;
DROP INDEX IF EXISTS uq_users_email;
DROP INDEX IF EXISTS uq_users_phone;
DROP INDEX IF EXISTS ux_users_username_active;
DROP INDEX IF EXISTS ux_users_email_active;
DROP INDEX IF EXISTS ux_users_phone_active;

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_username_active
  ON users (username)
  WHERE deleted_at IS NULL AND username IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email_active
  ON users (email)
  WHERE deleted_at IS NULL AND email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_phone_active
  ON users (phone)
  WHERE deleted_at IS NULL AND phone IS NOT NULL;

-- Basic email sanity
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_email_shape,
  ADD  CONSTRAINT users_email_shape CHECK (email IS NULL OR position('@' IN email) > 1);

-- ===== credentials_local (ensure exists) ====================================
DO $$
BEGIN
  IF to_regclass('public.credentials_local') IS NULL THEN
    CREATE TABLE credentials_local (
      user_id             uuid PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT,
      password_hash       text NOT NULL,
      password_algo       text NOT NULL DEFAULT 'argon2id',
      password_updated_at timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END$$;

-- ===== password_reset_admin_actions (ensure exists) =========================
DO $$
BEGIN
  IF to_regclass('public.password_reset_admin_actions') IS NULL THEN
    CREATE TABLE password_reset_admin_actions (
      id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      admin_user_id  uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      target_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      reason         text,
      requested_at   timestamptz NOT NULL DEFAULT now(),
      executed_at    timestamptz,
      status         text NOT NULL DEFAULT 'requested' -- requested|completed|cancelled
    );
  END IF;
END$$;

-- ===== roles / permissions / bridges (ensure exists) ========================
DO $$
BEGIN
  IF to_regclass('public.roles') IS NULL THEN
    CREATE TABLE roles (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      key         varchar NOT NULL UNIQUE,
      description text
    );
  END IF;

  IF to_regclass('public.permissions') IS NULL THEN
    CREATE TABLE permissions (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      key         varchar NOT NULL UNIQUE, -- module:resource:action
      description text
    );
  END IF;

  IF to_regclass('public.role_permissions') IS NULL THEN
    CREATE TABLE role_permissions (
      role_id       uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
      PRIMARY KEY (role_id, permission_id)
    );
  END IF;

  IF to_regclass('public.user_roles') IS NULL THEN
    CREATE TABLE user_roles (
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, role_id)
    );
  END IF;
END$$;

-- ===== user_guest_access (ensure exists) ====================================
DO $$
BEGIN
  IF to_regclass('public.user_guest_access') IS NULL THEN
    CREATE TABLE user_guest_access (
      user_id    uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      expires_at timestamptz NOT NULL
    );
  END IF;
END$$;

-- ===== appointments (generated range + constraints) =========================
DO $$
BEGIN
  IF to_regclass('public.appointments') IS NULL THEN
    RAISE EXCEPTION 'appointments table is required by this migration.';
  END IF;

  -- Ensure valid_during exists (generated)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='appointments' AND column_name='valid_during'
  ) THEN
    ALTER TABLE appointments
      ADD COLUMN valid_during tstzrange
      GENERATED ALWAYS AS (tstzrange(starts_at, ends_at)) STORED;
  END IF;

  -- Ensure position_id column and FK to positions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='appointments' AND column_name='position_id'
  ) THEN
    ALTER TABLE appointments
      ADD COLUMN position_id uuid;
    ALTER TABLE appointments
      ADD CONSTRAINT appointments_position_fk
      FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE RESTRICT;
  END IF;
END$$;

-- Backfill from legacy "position" (enum/text) -> position_id (optional)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='appointments' AND column_name='position')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='appointments' AND column_name='position_id')
  THEN
    UPDATE appointments a
    SET position_id = p.id
    FROM positions p
    WHERE p.key = a.position::text AND a.position_id IS NULL;
  END IF;
END$$;

ALTER TABLE appointments
  ALTER COLUMN position_id SET NOT NULL;

-- Time/scoping sanity
ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appt_time_order,
  ADD  CONSTRAINT appt_time_order CHECK (ends_at IS NULL OR starts_at < ends_at);

ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appt_scope_consistency,
  ADD  CONSTRAINT appt_scope_consistency CHECK (
    (scope_type = 'GLOBAL'  AND scope_id IS NULL) OR
    (scope_type = 'PLATOON' AND scope_id IS NOT NULL)
  );

-- Unique-primary-holder per slot over time (no overlap on same (position,scope))
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

CREATE INDEX IF NOT EXISTS ix_appt_platoon_cmdr_active
  ON appointments (scope_id)
  WHERE scope_type = 'PLATOON' AND deleted_at IS NULL AND ends_at IS NULL;

-- ===== appointment_transfers (ensure exists) ================================
DO $$
BEGIN
  IF to_regclass('public.appointment_transfers') IS NULL THEN
    CREATE TABLE appointment_transfers (
      id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      from_appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE RESTRICT,
      to_appointment_id   uuid NOT NULL REFERENCES appointments(id) ON DELETE RESTRICT,
      from_user_id        uuid NOT NULL REFERENCES users(id)        ON DELETE RESTRICT,
      to_user_id          uuid NOT NULL REFERENCES users(id)        ON DELETE RESTRICT,
      position_id         uuid NOT NULL REFERENCES positions(id)    ON DELETE RESTRICT,
      scope_type          scope_type NOT NULL,       -- match enum used elsewhere
      scope_id            uuid,                      -- null for GLOBAL
      prev_starts_at      timestamptz NOT NULL,
      prev_ends_at        timestamptz NOT NULL,
      new_starts_at       timestamptz NOT NULL,
      reason              text,
      transferred_by      uuid REFERENCES users(id) ON DELETE SET NULL,
      created_at          timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END$$;

-- Helpful indexes for transfers
CREATE INDEX IF NOT EXISTS ix_appt_transfers_slot
  ON appointment_transfers(position_id, scope_type, scope_id);

CREATE INDEX IF NOT EXISTS ix_appt_transfers_times
  ON appointment_transfers(prev_starts_at, prev_ends_at, new_starts_at);

CREATE INDEX IF NOT EXISTS ix_appt_transfers_users
  ON appointment_transfers(from_user_id, to_user_id);

-- ===== Delegations (act-as by position, with time range) ====================
DO $$
BEGIN
  IF to_regclass('public.delegations') IS NULL THEN
    CREATE TABLE delegations (
      id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      grantor_user_id    uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      grantee_user_id    uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      act_as_position_id uuid REFERENCES positions(id) ON DELETE RESTRICT,
      scope_type         scope_type NOT NULL,
      scope_id           uuid,
      starts_at          timestamptz NOT NULL,
      ends_at            timestamptz,
      reason             text,
      deleted_at         timestamptz,
      created_at         timestamptz NOT NULL DEFAULT now(),
      updated_at         timestamptz NOT NULL DEFAULT now()
    );
  END IF;

  -- Add generated range if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='delegations' AND column_name='valid_during'
  ) THEN
    ALTER TABLE delegations
      ADD COLUMN valid_during tstzrange
      GENERATED ALWAYS AS (tstzrange(starts_at, ends_at)) STORED;
  END IF;

  -- Preferred column: act_as_position_id (FK to positions)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='delegations' AND column_name='act_as_position_id'
  ) THEN
    ALTER TABLE delegations
      ADD COLUMN act_as_position_id uuid;
    ALTER TABLE delegations
      ADD CONSTRAINT delegations_act_as_fk
      FOREIGN KEY (act_as_position_id) REFERENCES positions(id) ON DELETE RESTRICT;
  END IF;
END$$;

-- Backfill from legacy "act_as" enum/text, if present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='delegations' AND column_name='act_as')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='delegations' AND column_name='act_as_position_id')
  THEN
    UPDATE delegations d
    SET act_as_position_id = p.id
    FROM positions p
    WHERE p.key = d.act_as::text AND d.act_as_position_id IS NULL;
  END IF;
END$$;

-- Sanity checks
ALTER TABLE delegations
  DROP CONSTRAINT IF EXISTS del_time_order,
  ADD  CONSTRAINT del_time_order CHECK (ends_at IS NULL OR starts_at < ends_at);

ALTER TABLE delegations
  DROP CONSTRAINT IF EXISTS del_grantor_ne_grantee,
  ADD  CONSTRAINT del_grantor_ne_grantee CHECK (grantor_user_id IS DISTINCT FROM grantee_user_id);

-- ===== audit_logs (ensure exists shape) =====================================
DO $$
BEGIN
  IF to_regclass('public.audit_logs') IS NULL THEN
    CREATE TABLE audit_logs (
      id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
      event_type    varchar(96) NOT NULL,
      resource_type varchar(96) NOT NULL,
      resource_id   uuid,
      description   text,
      metadata      jsonb,
      ip_addr       varchar(64),
      user_agent    text,
      created_at    timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END$$;

-- ===== FK: users.current_appointment_id -> appointments.id ==================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='users' AND column_name='current_appointment_id'
  ) THEN
    ALTER TABLE users
      DROP CONSTRAINT IF EXISTS users_current_appt_fk,
      ADD  CONSTRAINT users_current_appt_fk
      FOREIGN KEY (current_appointment_id) REFERENCES appointments(id) ON DELETE SET NULL;
  END IF;
END$$;
