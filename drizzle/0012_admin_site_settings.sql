CREATE TABLE IF NOT EXISTS "site_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "singleton_key" text NOT NULL DEFAULT 'default',
  "logo_url" text,
  "logo_object_key" text,
  "hero_title" text NOT NULL DEFAULT 'MCEME',
  "hero_description" text NOT NULL DEFAULT 'Training Excellence for Officer Cadets (OCs) at the Military College of Electronics & Mechanical Engineering',
  "commanders_section_title" text NOT NULL DEFAULT 'Commander''s Corner',
  "awards_section_title" text NOT NULL DEFAULT 'Gallantry Awards',
  "history_section_title" text NOT NULL DEFAULT 'Our History',
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "uq_site_settings_singleton_key"
  ON "site_settings" USING btree ("singleton_key");
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "site_settings"
 ADD CONSTRAINT "site_settings_updated_by_users_id_fk"
 FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

INSERT INTO "site_settings" ("singleton_key")
SELECT 'default'
WHERE NOT EXISTS (
  SELECT 1 FROM "site_settings" WHERE "singleton_key" = 'default'
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "site_commanders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "image_url" text,
  "image_object_key" text,
  "tenure" text NOT NULL,
  "description" text NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0,
  "is_deleted" boolean NOT NULL DEFAULT false,
  "deleted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "ix_site_commanders_active_sort"
  ON "site_commanders" USING btree ("is_deleted", "sort_order");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "site_awards" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "image_url" text,
  "image_object_key" text,
  "category" text NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0,
  "is_deleted" boolean NOT NULL DEFAULT false,
  "deleted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "ix_site_awards_active_sort"
  ON "site_awards" USING btree ("is_deleted", "sort_order");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "site_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "year_or_date" text NOT NULL,
  "description" text NOT NULL,
  "is_deleted" boolean NOT NULL DEFAULT false,
  "deleted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "ix_site_history_active_created_at"
  ON "site_history" USING btree ("is_deleted", "created_at");
