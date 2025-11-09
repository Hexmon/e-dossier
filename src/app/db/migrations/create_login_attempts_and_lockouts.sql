-- Migration: Create login_attempts and account_lockouts tables
-- SECURITY FIX: Track login attempts and implement account lockout mechanism
-- Created: 2025-11-09

-- Create login_attempts table
CREATE TABLE IF NOT EXISTS login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(255) NOT NULL,
    ip_address VARCHAR(64) NOT NULL,
    user_agent VARCHAR(512),
    success BOOLEAN NOT NULL DEFAULT FALSE,
    failure_reason VARCHAR(255),
    attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_login_attempts_user_id ON login_attempts(user_id);

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_login_attempts_username ON login_attempts(username);

-- Create index on attempted_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_login_attempts_attempted_at ON login_attempts(attempted_at);

-- Create index on success for filtering failed attempts
CREATE INDEX IF NOT EXISTS idx_login_attempts_success ON login_attempts(success);

-- Create account_lockouts table
CREATE TABLE IF NOT EXISTS account_lockouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    locked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    locked_until TIMESTAMP WITH TIME ZONE NOT NULL,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    ip_address VARCHAR(64),
    unlocked BOOLEAN NOT NULL DEFAULT FALSE,
    unlocked_at TIMESTAMP WITH TIME ZONE,
    unlocked_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reason VARCHAR(255)
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_account_lockouts_user_id ON account_lockouts(user_id);

-- Create index on locked_until for checking active lockouts
CREATE INDEX IF NOT EXISTS idx_account_lockouts_locked_until ON account_lockouts(locked_until);

-- Create index on unlocked for filtering active lockouts
CREATE INDEX IF NOT EXISTS idx_account_lockouts_unlocked ON account_lockouts(unlocked);

-- Add comment to tables
COMMENT ON TABLE login_attempts IS 'Tracks all login attempts (successful and failed) for security monitoring';
COMMENT ON TABLE account_lockouts IS 'Tracks account lockouts after multiple failed login attempts';

