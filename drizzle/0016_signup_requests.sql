-- 0016_signup_requests.sql
-- Signup requests ledger: created at signup, later approved/rejected by admin

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF to_regclass('public.signup_requests') IS NULL THEN
    CREATE TABLE signup_requests (
      id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id             uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      desired_position_id uuid REFERENCES positions(id) ON DELETE SET NULL,
      desired_scope_type  scope_type NOT NULL DEFAULT 'GLOBAL', -- 'GLOBAL' | 'PLATOON'
      desired_scope_id    uuid,                                  -- (PLATOON id when PLATOON)
      note                text,
      status              text NOT NULL DEFAULT 'pending',       -- pending|approved|rejected
      created_at          timestamptz NOT NULL DEFAULT now(),
      resolved_at         timestamptz,
      resolved_by         uuid REFERENCES users(id) ON DELETE SET NULL,
      admin_reason        text,
      payload             jsonb
    );
  END IF;
END$$;

-- Optional: keep statuses constrained at DB level
ALTER TABLE signup_requests
  DROP CONSTRAINT IF EXISTS chk_signup_requests_status,
  ADD  CONSTRAINT chk_signup_requests_status
  CHECK (status IN ('pending','approved','rejected'));

-- Helpful indexes
CREATE INDEX IF NOT EXISTS ix_signup_requests_status_created
  ON signup_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS ix_signup_requests_user
  ON signup_requests (user_id);
