CREATE TABLE IF NOT EXISTS "device_site_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "device_id" varchar(128) NOT NULL,
  "theme" varchar(16) DEFAULT 'system' NOT NULL,
  "language" varchar(16) DEFAULT 'en' NOT NULL,
  "timezone" varchar(64) DEFAULT 'UTC' NOT NULL,
  "refresh_interval" integer DEFAULT 60 NOT NULL,
  "layout_density" varchar(16) DEFAULT 'comfortable' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "ux_device_site_settings_device_id"
  ON "device_site_settings" USING btree ("device_id");
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "device_site_settings"
 ADD CONSTRAINT "device_site_settings_updated_by_users_id_fk"
 FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
