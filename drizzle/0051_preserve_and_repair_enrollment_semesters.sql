-- Repair only the destructive 0037/0038 symptom. Evidence is enrollment-specific:
-- the latest movement wins, otherwise the highest semester in that enrollment's
-- own dossier records is used. Configured course offerings are deliberately not
-- evidence because they can include future semesters or new semester-1 entrants.
WITH latest_movement AS (
  SELECT DISTINCT ON (e."id")
    e."id" AS enrollment_id,
    r."to_semester" AS proven_semester,
    'oc_relegations'::text AS evidence_source
  FROM "oc_course_enrollments" e
  JOIN "oc_relegations" r
    ON r."oc_id" = e."oc_id"
   AND r."to_course_id" = e."course_id"
   AND (r."to_enrollment_id" = e."id" OR r."to_enrollment_id" IS NULL)
  WHERE e."status" = 'ACTIVE'
    AND e."current_semester" = 1
    AND r."to_semester" BETWEEN 1 AND 6
  ORDER BY e."id", r."performed_at" DESC, r."created_at" DESC, r."id" DESC
), record_evidence AS (
  SELECT enrollment_id, max(semester) AS proven_semester
  FROM (
    SELECT "enrollment_id", "semester" FROM "oc_interviews" WHERE "deleted_at" IS NULL
    UNION ALL SELECT "enrollment_id", "semester" FROM "oc_semester_marks" WHERE "deleted_at" IS NULL
    UNION ALL SELECT "enrollment_id", "semester" FROM "oc_spr_records"
    UNION ALL SELECT "enrollment_id", "semester" FROM "oc_medicals" WHERE "deleted_at" IS NULL
    UNION ALL SELECT "enrollment_id", "semester" FROM "oc_medical_category" WHERE "deleted_at" IS NULL
    UNION ALL SELECT "enrollment_id", "semester" FROM "oc_discipline" WHERE "deleted_at" IS NULL
    UNION ALL SELECT "enrollment_id", "semester" FROM "oc_olq"
    UNION ALL SELECT "enrollment_id", "semester" FROM "oc_credit_for_excellence" WHERE "deleted_at" IS NULL
  ) records
  WHERE enrollment_id IS NOT NULL AND semester BETWEEN 2 AND 6
  GROUP BY enrollment_id
), repair AS (
  SELECT
    e."id" AS enrollment_id,
    e."oc_id",
    COALESCE(m.proven_semester, d.proven_semester) AS proven_semester,
    COALESCE(m.evidence_source, 'semester_dossier_records') AS evidence_source
  FROM "oc_course_enrollments" e
  LEFT JOIN latest_movement m ON m.enrollment_id = e."id"
  LEFT JOIN record_evidence d ON d.enrollment_id = e."id"
  WHERE e."status" = 'ACTIVE'
    AND e."current_semester" = 1
    AND COALESCE(m.proven_semester, d.proven_semester) BETWEEN 2 AND 6
)
INSERT INTO "oc_reconciliation_audit" (
  "oc_id", "source_table", "target_table", "conflict_type", "field_name",
  "source_value", "target_value", "resolution"
)
SELECT
  repair.oc_id,
  repair.evidence_source,
  'oc_course_enrollments',
  'ACTIVE_ENROLLMENT_SEMESTER_RESET',
  'current_semester',
  to_jsonb(repair.proven_semester),
  to_jsonb(1),
  'migration_0051_restore_from_enrollment_evidence'
FROM repair
WHERE NOT EXISTS (
  SELECT 1 FROM "oc_reconciliation_audit" audit
  WHERE audit."oc_id" = repair.oc_id
    AND audit."conflict_type" = 'ACTIVE_ENROLLMENT_SEMESTER_RESET'
    AND audit."resolution" = 'migration_0051_restore_from_enrollment_evidence'
);
--> statement-breakpoint
WITH latest_movement AS (
  SELECT DISTINCT ON (e."id")
    e."id" AS enrollment_id,
    r."to_semester" AS proven_semester
  FROM "oc_course_enrollments" e
  JOIN "oc_relegations" r
    ON r."oc_id" = e."oc_id"
   AND r."to_course_id" = e."course_id"
   AND (r."to_enrollment_id" = e."id" OR r."to_enrollment_id" IS NULL)
  WHERE e."status" = 'ACTIVE'
    AND e."current_semester" = 1
    AND r."to_semester" BETWEEN 1 AND 6
  ORDER BY e."id", r."performed_at" DESC, r."created_at" DESC, r."id" DESC
), record_evidence AS (
  SELECT enrollment_id, max(semester) AS proven_semester
  FROM (
    SELECT "enrollment_id", "semester" FROM "oc_interviews" WHERE "deleted_at" IS NULL
    UNION ALL SELECT "enrollment_id", "semester" FROM "oc_semester_marks" WHERE "deleted_at" IS NULL
    UNION ALL SELECT "enrollment_id", "semester" FROM "oc_spr_records"
    UNION ALL SELECT "enrollment_id", "semester" FROM "oc_medicals" WHERE "deleted_at" IS NULL
    UNION ALL SELECT "enrollment_id", "semester" FROM "oc_medical_category" WHERE "deleted_at" IS NULL
    UNION ALL SELECT "enrollment_id", "semester" FROM "oc_discipline" WHERE "deleted_at" IS NULL
    UNION ALL SELECT "enrollment_id", "semester" FROM "oc_olq"
    UNION ALL SELECT "enrollment_id", "semester" FROM "oc_credit_for_excellence" WHERE "deleted_at" IS NULL
  ) records
  WHERE enrollment_id IS NOT NULL AND semester BETWEEN 2 AND 6
  GROUP BY enrollment_id
), repair AS (
  SELECT e."id", COALESCE(m.proven_semester, d.proven_semester) AS proven_semester
  FROM "oc_course_enrollments" e
  LEFT JOIN latest_movement m ON m.enrollment_id = e."id"
  LEFT JOIN record_evidence d ON d.enrollment_id = e."id"
  WHERE e."status" = 'ACTIVE'
    AND e."current_semester" = 1
    AND COALESCE(m.proven_semester, d.proven_semester) BETWEEN 2 AND 6
)
UPDATE "oc_course_enrollments" enrollment
SET "current_semester" = repair.proven_semester,
    "updated_at" = now()
FROM repair
WHERE enrollment."id" = repair."id"
  AND enrollment."current_semester" = 1;
