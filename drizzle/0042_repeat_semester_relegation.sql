DO $$
BEGIN
  ALTER TYPE "public"."oc_movement_kind" ADD VALUE IF NOT EXISTS 'SEMESTER_REPEAT';
END $$;
--> statement-breakpoint
WITH canonical_courses AS (
  SELECT
    "id",
    "code",
    upper((regexp_match(trim("code"), '^([A-Za-z][A-Za-z0-9]*)[-=]0*([0-9]+)$'))[1])
      || '-'
      || ((regexp_match(trim("code"), '^([A-Za-z][A-Za-z0-9]*)[-=]0*([0-9]+)$'))[2])::int::text AS "canonical_code"
  FROM "courses"
  WHERE trim("code") ~ '^[A-Za-z][A-Za-z0-9]*[-=]0*[0-9]+$'
),
deduplicated AS (
  SELECT candidate.*
  FROM canonical_courses candidate
  WHERE candidate."code" <> candidate."canonical_code"
    AND NOT EXISTS (
      SELECT 1
      FROM "courses" existing
      WHERE existing."id" <> candidate."id"
        AND existing."code" = candidate."canonical_code"
    )
)
UPDATE "courses"
SET
  "code" = deduplicated."canonical_code",
  "title" = CASE
    WHEN "courses"."title" = 'Course ' || deduplicated."code" THEN 'Course ' || deduplicated."canonical_code"
    ELSE "courses"."title"
  END,
  "updated_at" = now()
FROM deduplicated
WHERE "courses"."id" = deduplicated."id";
