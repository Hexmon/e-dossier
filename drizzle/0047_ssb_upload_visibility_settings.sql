CREATE TABLE IF NOT EXISTS "ssb_upload_visibility_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "course_id" uuid NOT NULL,
  "position_id" uuid NOT NULL,
  "hidden_days" integer DEFAULT 0 NOT NULL,
  "visible_until" date NOT NULL,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "ssb_upload_visibility_settings_hidden_days_non_negative" CHECK ("hidden_days" >= 0)
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ssb_upload_visibility_settings" ADD CONSTRAINT "ssb_upload_visibility_settings_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ssb_upload_visibility_settings" ADD CONSTRAINT "ssb_upload_visibility_settings_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ssb_upload_visibility_settings" ADD CONSTRAINT "ssb_upload_visibility_settings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ssb_upload_visibility_settings" ADD CONSTRAINT "ssb_upload_visibility_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_ssb_upload_visibility_course_position" ON "ssb_upload_visibility_settings" USING btree ("course_id","position_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_ssb_upload_visibility_course" ON "ssb_upload_visibility_settings" USING btree ("course_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_ssb_upload_visibility_position" ON "ssb_upload_visibility_settings" USING btree ("position_id");
