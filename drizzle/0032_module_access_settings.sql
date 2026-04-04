CREATE TABLE IF NOT EXISTS "module_access_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "singleton_key" text NOT NULL DEFAULT 'default',
  "admin_can_access_dossier" boolean NOT NULL DEFAULT false,
  "admin_can_access_bulk_upload" boolean NOT NULL DEFAULT false,
  "admin_can_access_reports" boolean NOT NULL DEFAULT false,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "uq_module_access_settings_singleton_key"
  ON "module_access_settings" USING btree ("singleton_key");
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "module_access_settings"
 ADD CONSTRAINT "module_access_settings_updated_by_users_id_fk"
 FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
