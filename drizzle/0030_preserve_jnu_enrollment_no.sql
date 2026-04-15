ALTER TABLE "oc_cadets"
ADD COLUMN IF NOT EXISTS "jnu_enrollment_no" varchar(64);
--> statement-breakpoint

ALTER TABLE "oc_cadets"
ALTER COLUMN "jnu_enrollment_no" TYPE varchar(64)
USING CASE
  WHEN "jnu_enrollment_no" IS NULL THEN NULL
  ELSE "jnu_enrollment_no"::text
END;
