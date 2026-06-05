ALTER TYPE "public"."oc_movement_kind" ADD VALUE IF NOT EXISTS 'SEMESTER_RELEGATION';--> statement-breakpoint
ALTER TYPE "public"."oc_movement_kind" ADD VALUE IF NOT EXISTS 'SEMESTER_REPEAT';--> statement-breakpoint
ALTER TABLE "punishments" ALTER COLUMN "marks_deduction" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "dossier_inspections" ALTER COLUMN "inspector_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "oc_discipline" ALTER COLUMN "points_delta" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "oc_discipline" ALTER COLUMN "points_cumulative" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "dossier_inspections" ADD COLUMN IF NOT EXISTS "inspector_name" text;--> statement-breakpoint
ALTER TABLE "dossier_inspections" ADD COLUMN IF NOT EXISTS "inspector_rank" text;--> statement-breakpoint
ALTER TABLE "dossier_inspections" ADD COLUMN IF NOT EXISTS "inspector_appointment" text;--> statement-breakpoint
ALTER TABLE "oc_medical_category" ADD COLUMN IF NOT EXISTS "enrollment_id" uuid;--> statement-breakpoint
ALTER TABLE "oc_medical_category" ADD COLUMN IF NOT EXISTS "category" varchar(160);--> statement-breakpoint
ALTER TABLE "oc_medicals" ADD COLUMN IF NOT EXISTS "enrollment_id" uuid;--> statement-breakpoint
ALTER TABLE "oc_parent_comms" ADD COLUMN IF NOT EXISTS "enrollment_id" uuid;--> statement-breakpoint
ALTER TABLE "oc_ssb_reports" ADD COLUMN IF NOT EXISTS "ssb_pdf_object_key" varchar(512);--> statement-breakpoint
ALTER TABLE "oc_ssb_reports" ADD COLUMN IF NOT EXISTS "ssb_pdf_file_name" varchar(255);--> statement-breakpoint
ALTER TABLE "oc_ssb_reports" ADD COLUMN IF NOT EXISTS "ssb_pdf_content_type" varchar(128);--> statement-breakpoint
ALTER TABLE "oc_ssb_reports" ADD COLUMN IF NOT EXISTS "ssb_pdf_size_bytes" integer;--> statement-breakpoint
ALTER TABLE "oc_ssb_reports" ADD COLUMN IF NOT EXISTS "ssb_pdf_password_hash" text;--> statement-breakpoint
ALTER TABLE "oc_ssb_reports" ADD COLUMN IF NOT EXISTS "ssb_pdf_password_ciphertext" text;--> statement-breakpoint
ALTER TABLE "oc_ssb_reports" ADD COLUMN IF NOT EXISTS "ssb_pdf_password_algo" varchar(32);--> statement-breakpoint
ALTER TABLE "oc_ssb_reports" ADD COLUMN IF NOT EXISTS "ssb_pdf_salt" varchar(64);--> statement-breakpoint
ALTER TABLE "oc_ssb_reports" ADD COLUMN IF NOT EXISTS "ssb_pdf_iv" varchar(32);--> statement-breakpoint
ALTER TABLE "oc_ssb_reports" ADD COLUMN IF NOT EXISTS "ssb_pdf_auth_tag" varchar(32);--> statement-breakpoint
ALTER TABLE "oc_ssb_reports" ADD COLUMN IF NOT EXISTS "ssb_pdf_uploaded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "oc_ssb_reports" ADD COLUMN IF NOT EXISTS "ssb_pdf_uploaded_by_user_id" uuid;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oc_medical_category_enrollment_id_oc_course_enrollments_id_fk') THEN
    ALTER TABLE "oc_medical_category" ADD CONSTRAINT "oc_medical_category_enrollment_id_oc_course_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."oc_course_enrollments"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oc_medicals_enrollment_id_oc_course_enrollments_id_fk') THEN
    ALTER TABLE "oc_medicals" ADD CONSTRAINT "oc_medicals_enrollment_id_oc_course_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."oc_course_enrollments"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oc_parent_comms_enrollment_id_oc_course_enrollments_id_fk') THEN
    ALTER TABLE "oc_parent_comms" ADD CONSTRAINT "oc_parent_comms_enrollment_id_oc_course_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."oc_course_enrollments"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oc_ssb_reports_ssb_pdf_uploaded_by_user_id_users_id_fk') THEN
    ALTER TABLE "oc_ssb_reports" ADD CONSTRAINT "oc_ssb_reports_ssb_pdf_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("ssb_pdf_uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ux_permissions_key" ON "permissions" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ux_roles_key" ON "roles" USING btree ("key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_oc_medical_category_enrollment_sem" ON "oc_medical_category" USING btree ("enrollment_id","semester");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_oc_medicals_enrollment_sem" ON "oc_medicals" USING btree ("enrollment_id","semester");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_oc_parent_comms_enrollment_sem" ON "oc_parent_comms" USING btree ("enrollment_id","semester");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_oc_ssb_reports_pdf_oc" ON "oc_ssb_reports" USING btree ("oc_id") WHERE "oc_ssb_reports"."deleted_at" is null and "oc_ssb_reports"."ssb_pdf_object_key" is not null;
