ALTER TABLE IF EXISTS "warning_management_settings"
  ADD COLUMN IF NOT EXISTS "module" text;
--> statement-breakpoint
UPDATE "warning_management_settings"
SET "module" = CASE
  WHEN upper(trim("module")) = 'MEDICAL' THEN 'MEDICAL'
  ELSE 'DISCIPLINE'
END
WHERE "module" IS NULL
   OR "module" <> upper(trim("module"))
   OR upper(trim("module")) NOT IN ('DISCIPLINE', 'MEDICAL');
--> statement-breakpoint
ALTER TABLE IF EXISTS "warning_management_settings"
  ALTER COLUMN "module" SET DEFAULT 'DISCIPLINE';
--> statement-breakpoint
ALTER TABLE IF EXISTS "warning_management_settings"
  ALTER COLUMN "module" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE IF EXISTS "warning_management_settings"
  ADD COLUMN IF NOT EXISTS "absence_days" integer;
--> statement-breakpoint
UPDATE "warning_management_settings"
SET "absence_days" = 0
WHERE "absence_days" IS NULL OR "absence_days" < 0;
--> statement-breakpoint
ALTER TABLE IF EXISTS "warning_management_settings"
  ALTER COLUMN "absence_days" SET DEFAULT 0;
--> statement-breakpoint
ALTER TABLE IF EXISTS "warning_management_settings"
  ALTER COLUMN "absence_days" SET NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE IF EXISTS "warning_management_settings" ADD CONSTRAINT "warning_management_settings_module_check" CHECK ("module" IN ('DISCIPLINE', 'MEDICAL'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE IF EXISTS "warning_management_settings" ADD CONSTRAINT "warning_management_settings_absence_days_check" CHECK ("absence_days" >= 0);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_warning_management_settings_module" ON "warning_management_settings" USING btree ("module");
