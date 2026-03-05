ALTER TABLE "training_camps" ADD COLUMN IF NOT EXISTS "sort_order" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
UPDATE "training_camps"
SET "sort_order" = CASE
  WHEN "semester"::text = 'SEM6B' THEN 2
  ELSE 1
END;--> statement-breakpoint
ALTER TABLE "training_camps"
  ALTER COLUMN "semester" TYPE integer
  USING CASE
    WHEN "semester"::text = 'SEM5' THEN 5
    WHEN "semester"::text = 'SEM6A' THEN 6
    WHEN "semester"::text = 'SEM6B' THEN 6
    ELSE NULL
  END;--> statement-breakpoint
ALTER TABLE "training_camps" DROP CONSTRAINT IF EXISTS "training_camps_semester_check";--> statement-breakpoint
ALTER TABLE "training_camps" ADD CONSTRAINT "training_camps_semester_check" CHECK ("semester" BETWEEN 1 AND 6);--> statement-breakpoint
ALTER TABLE "training_camps" ADD COLUMN IF NOT EXISTS "performance_title" text;--> statement-breakpoint
ALTER TABLE "training_camps" ADD COLUMN IF NOT EXISTS "performance_guidance" text;--> statement-breakpoint
ALTER TABLE "training_camps" ADD COLUMN IF NOT EXISTS "signature_primary_label" varchar(120);--> statement-breakpoint
ALTER TABLE "training_camps" ADD COLUMN IF NOT EXISTS "signature_secondary_label" varchar(120);--> statement-breakpoint
ALTER TABLE "training_camps" ADD COLUMN IF NOT EXISTS "note_line_1" text;--> statement-breakpoint
ALTER TABLE "training_camps" ADD COLUMN IF NOT EXISTS "note_line_2" text;--> statement-breakpoint
ALTER TABLE "training_camps" ADD COLUMN IF NOT EXISTS "show_aggregate_summary" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_training_camp_semester_sort_name" ON "training_camps" USING btree ("semester", "sort_order", "name");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "training_camp_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "singleton_key" varchar(32) DEFAULT 'default' NOT NULL,
  "max_camps_per_semester" integer DEFAULT 2 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "training_camp_settings_max_camps_per_semester_check" CHECK ("max_camps_per_semester" BETWEEN 1 AND 6)
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_training_camp_settings_singleton" ON "training_camp_settings" USING btree ("singleton_key");--> statement-breakpoint
INSERT INTO "training_camp_settings" ("singleton_key", "max_camps_per_semester")
VALUES ('default', 2)
ON CONFLICT ("singleton_key") DO NOTHING;--> statement-breakpoint

DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    WHERE t.typname = 'camp_semester_kind'
      AND NOT EXISTS (
        SELECT 1
        FROM pg_depend d
        WHERE d.refobjid = t.oid
          AND d.deptype = 'n'
      )
  ) THEN
    DROP TYPE "public"."camp_semester_kind";
  END IF;
END $$;--> statement-breakpoint
