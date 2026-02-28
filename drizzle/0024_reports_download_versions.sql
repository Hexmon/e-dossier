CREATE TABLE IF NOT EXISTS "report_download_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "version_id" varchar(32) NOT NULL,
  "report_type" varchar(80) NOT NULL,
  "requested_by_user_id" uuid,
  "generated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "filters" jsonb NOT NULL,
  "prepared_by" varchar(160) NOT NULL,
  "checked_by" varchar(160) NOT NULL,
  "file_name" varchar(255) NOT NULL,
  "encrypted" boolean DEFAULT true NOT NULL,
  "checksum_sha256" varchar(64),
  "batch_id" uuid,
  CONSTRAINT "report_download_versions_version_id_unique" UNIQUE("version_id")
);

DO $$ BEGIN
 ALTER TABLE "report_download_versions"
  ADD CONSTRAINT "report_download_versions_requested_by_user_id_users_id_fk"
  FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id")
  ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "idx_report_download_versions_generated_at" ON "report_download_versions" ("generated_at");
CREATE INDEX IF NOT EXISTS "idx_report_download_versions_report_type" ON "report_download_versions" ("report_type");
CREATE INDEX IF NOT EXISTS "idx_report_download_versions_requested_by" ON "report_download_versions" ("requested_by_user_id");
CREATE INDEX IF NOT EXISTS "idx_report_download_versions_batch" ON "report_download_versions" ("batch_id");
