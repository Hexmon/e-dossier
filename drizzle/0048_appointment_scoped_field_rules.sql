ALTER TABLE "permission_field_rules"
ADD COLUMN IF NOT EXISTS "appointment_id" uuid;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "permission_field_rules"
 ADD CONSTRAINT "permission_field_rules_appointment_id_appointments_id_fk"
 FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DROP INDEX IF EXISTS "ux_permission_field_rules_appointment_scope";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ux_permission_field_rules_appointment_scope"
  ON "permission_field_rules" USING btree ("permission_id", "appointment_id", "mode")
  WHERE "appointment_id" IS NOT NULL;
--> statement-breakpoint

ALTER TABLE "permission_field_rules"
DROP CONSTRAINT IF EXISTS "chk_permission_field_rules_scope";
--> statement-breakpoint
ALTER TABLE "permission_field_rules"
ADD CONSTRAINT "chk_permission_field_rules_scope"
CHECK (
  (
    "appointment_id" IS NOT NULL
    AND "position_id" IS NULL
    AND "role_id" IS NULL
  )
  OR
  (
    "appointment_id" IS NULL
    AND ("position_id" IS NOT NULL OR "role_id" IS NOT NULL)
  )
);
