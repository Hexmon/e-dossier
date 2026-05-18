DO $$
BEGIN
  ALTER TYPE "public"."oc_movement_kind" ADD VALUE IF NOT EXISTS 'SEMESTER_RELEGATION';
END $$;
--> statement-breakpoint
ALTER TABLE "oc_medicals" ADD COLUMN IF NOT EXISTS "enrollment_id" uuid;
--> statement-breakpoint
ALTER TABLE "oc_medical_category" ADD COLUMN IF NOT EXISTS "enrollment_id" uuid;
--> statement-breakpoint
ALTER TABLE "oc_parent_comms" ADD COLUMN IF NOT EXISTS "enrollment_id" uuid;
--> statement-breakpoint
UPDATE "oc_medicals" m
SET "enrollment_id" = e."id"
FROM "oc_course_enrollments" e
WHERE m."enrollment_id" IS NULL
  AND e."oc_id" = m."oc_id"
  AND e."status" = 'ACTIVE';
--> statement-breakpoint
UPDATE "oc_medical_category" m
SET "enrollment_id" = e."id"
FROM "oc_course_enrollments" e
WHERE m."enrollment_id" IS NULL
  AND e."oc_id" = m."oc_id"
  AND e."status" = 'ACTIVE';
--> statement-breakpoint
UPDATE "oc_parent_comms" p
SET "enrollment_id" = e."id"
FROM "oc_course_enrollments" e
WHERE p."enrollment_id" IS NULL
  AND e."oc_id" = p."oc_id"
  AND e."status" = 'ACTIVE';
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'oc_medicals_enrollment_id_oc_course_enrollments_id_fk'
  ) THEN
    ALTER TABLE "oc_medicals"
      ADD CONSTRAINT "oc_medicals_enrollment_id_oc_course_enrollments_id_fk"
      FOREIGN KEY ("enrollment_id") REFERENCES "public"."oc_course_enrollments"("id") ON DELETE SET NULL;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'oc_medical_category_enrollment_id_oc_course_enrollments_id_fk'
  ) THEN
    ALTER TABLE "oc_medical_category"
      ADD CONSTRAINT "oc_medical_category_enrollment_id_oc_course_enrollments_id_fk"
      FOREIGN KEY ("enrollment_id") REFERENCES "public"."oc_course_enrollments"("id") ON DELETE SET NULL;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'oc_parent_comms_enrollment_id_oc_course_enrollments_id_fk'
  ) THEN
    ALTER TABLE "oc_parent_comms"
      ADD CONSTRAINT "oc_parent_comms_enrollment_id_oc_course_enrollments_id_fk"
      FOREIGN KEY ("enrollment_id") REFERENCES "public"."oc_course_enrollments"("id") ON DELETE SET NULL;
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_oc_medicals_enrollment_sem" ON "oc_medicals" ("enrollment_id", "semester");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_oc_medical_category_enrollment_sem" ON "oc_medical_category" ("enrollment_id", "semester");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_oc_parent_comms_enrollment_sem" ON "oc_parent_comms" ("enrollment_id", "semester");
