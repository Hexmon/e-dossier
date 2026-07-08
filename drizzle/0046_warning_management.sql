CREATE TABLE IF NOT EXISTS "warning_management_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "criterion_key" text NOT NULL,
  "position_key" text NOT NULL,
  "position_name" text NOT NULL,
  "trigger_type" text NOT NULL,
  "restriction_points" integer NOT NULL,
  "is_enabled" boolean DEFAULT true NOT NULL,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "warning_notification_reads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "notification_key" text NOT NULL,
  "read_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "warning_management_settings" ADD CONSTRAINT "warning_management_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "warning_notification_reads" ADD CONSTRAINT "warning_notification_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_warning_management_settings_criterion" ON "warning_management_settings" USING btree ("criterion_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_warning_management_settings_position_key" ON "warning_management_settings" USING btree ("position_key");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_warning_notification_reads_user_key" ON "warning_notification_reads" USING btree ("user_id","notification_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_warning_notification_reads_user_read_at" ON "warning_notification_reads" USING btree ("user_id","read_at");
