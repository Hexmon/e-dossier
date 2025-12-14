ALTER TABLE "audit_logs"
  ADD COLUMN IF NOT EXISTS "tenant_id" uuid,
  ADD COLUMN IF NOT EXISTS "method" varchar(16),
  ADD COLUMN IF NOT EXISTS "path" varchar(512),
  ADD COLUMN IF NOT EXISTS "status_code" integer,
  ADD COLUMN IF NOT EXISTS "outcome" varchar(32),
  ADD COLUMN IF NOT EXISTS "request_id" uuid,
  ADD COLUMN IF NOT EXISTS "changed_fields" text[],
  ADD COLUMN IF NOT EXISTS "diff" jsonb;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs" ("created_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_event_type_created_at_idx" ON "audit_logs" ("event_type", "created_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_actor_created_at_idx" ON "audit_logs" ("actor_user_id", "created_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_resource_created_at_idx" ON "audit_logs" ("resource_type", "resource_id", "created_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_request_id_idx" ON "audit_logs" ("request_id");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_audit_log_mutations()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS audit_logs_immutable ON audit_logs;
--> statement-breakpoint
CREATE TRIGGER audit_logs_immutable
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutations();
