CREATE TABLE IF NOT EXISTS "oc_reconciliation_audit" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "oc_id" uuid NOT NULL,
  "source_table" varchar(96) NOT NULL,
  "target_table" varchar(96) NOT NULL,
  "conflict_type" varchar(96) NOT NULL,
  "field_name" varchar(128) NOT NULL,
  "source_value" jsonb,
  "target_value" jsonb,
  "resolution" text NOT NULL,
  "actor_user_id" uuid,
  "resolved_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "oc_reconciliation_audit"
    ADD CONSTRAINT "oc_reconciliation_audit_oc_id_oc_cadets_id_fk"
    FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "oc_reconciliation_audit"
    ADD CONSTRAINT "oc_reconciliation_audit_actor_user_id_users_id_fk"
    FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_oc_reconciliation_audit_oc_created"
  ON "oc_reconciliation_audit" USING btree ("oc_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_oc_reconciliation_audit_conflict_type"
  ON "oc_reconciliation_audit" USING btree ("conflict_type");
--> statement-breakpoint
INSERT INTO "oc_reconciliation_audit" (
  "oc_id",
  "source_table",
  "target_table",
  "conflict_type",
  "field_name",
  "source_value",
  "target_value",
  "resolution"
)
SELECT
  c."id",
  'oc_cadets',
  'oc_pre_commission',
  'PRE_COMMISSION_SNAPSHOT_MISMATCH',
  diff."field_name",
  to_jsonb(diff."source_value"),
  to_jsonb(diff."target_value"),
  'migration_0039_oc_cadets_canonical_sync'
FROM "oc_cadets" c
JOIN "oc_pre_commission" pc ON pc."oc_id" = c."id"
CROSS JOIN LATERAL (
  VALUES
    ('course_id', c."course_id"::text, pc."course_id"::text),
    ('branch', c."branch"::text, pc."branch"::text),
    ('platoon_id', c."platoon_id"::text, pc."platoon_id"::text),
    ('relegated_to_course_id', c."relegated_to_course_id"::text, pc."relegated_to_course_id"::text),
    ('relegated_on', c."relegated_on"::text, pc."relegated_on"::text),
    ('withdrawn_on', c."withdrawn_on"::text, pc."withdrawn_on"::text)
) AS diff("field_name", "source_value", "target_value")
WHERE c."deleted_at" IS NULL
  AND diff."source_value" IS DISTINCT FROM diff."target_value";
--> statement-breakpoint
INSERT INTO "oc_reconciliation_audit" (
  "oc_id",
  "source_table",
  "target_table",
  "conflict_type",
  "field_name",
  "source_value",
  "target_value",
  "resolution"
)
SELECT
  c."id",
  'oc_cadets',
  'oc_course_enrollments',
  'ACTIVE_ENROLLMENT_COURSE_MISMATCH',
  'course_id',
  to_jsonb(c."course_id"::text),
  to_jsonb(e."course_id"::text),
  'migration_0039_oc_cadets_canonical_sync'
FROM "oc_cadets" c
JOIN "oc_course_enrollments" e
  ON e."oc_id" = c."id" AND e."status" = 'ACTIVE'
WHERE c."deleted_at" IS NULL
  AND c."course_id" IS DISTINCT FROM e."course_id";
--> statement-breakpoint
INSERT INTO "oc_course_enrollments" (
  "oc_id",
  "course_id",
  "status",
  "origin",
  "current_semester",
  "started_on",
  "created_at",
  "updated_at"
)
SELECT
  c."id",
  c."course_id",
  'ACTIVE',
  'BASELINE',
  1,
  COALESCE(c."created_at", now()),
  now(),
  now()
FROM "oc_cadets" c
LEFT JOIN "oc_course_enrollments" e
  ON e."oc_id" = c."id" AND e."status" = 'ACTIVE'
WHERE c."deleted_at" IS NULL
  AND e."id" IS NULL;
--> statement-breakpoint
INSERT INTO "oc_pre_commission" (
  "oc_id",
  "course_id",
  "branch",
  "platoon_id",
  "relegated_to_course_id",
  "relegated_on",
  "withdrawn_on"
)
SELECT
  c."id",
  c."course_id",
  c."branch",
  c."platoon_id",
  c."relegated_to_course_id",
  c."relegated_on",
  c."withdrawn_on"
FROM "oc_cadets" c
LEFT JOIN "oc_pre_commission" pc ON pc."oc_id" = c."id"
WHERE c."deleted_at" IS NULL
  AND pc."oc_id" IS NULL;
--> statement-breakpoint
UPDATE "oc_pre_commission" pc
SET
  "course_id" = c."course_id",
  "branch" = c."branch",
  "platoon_id" = c."platoon_id",
  "relegated_to_course_id" = c."relegated_to_course_id",
  "relegated_on" = c."relegated_on",
  "withdrawn_on" = c."withdrawn_on"
FROM "oc_cadets" c
WHERE pc."oc_id" = c."id"
  AND c."deleted_at" IS NULL
  AND (
    pc."course_id" IS DISTINCT FROM c."course_id"
    OR pc."branch" IS DISTINCT FROM c."branch"
    OR pc."platoon_id" IS DISTINCT FROM c."platoon_id"
    OR pc."relegated_to_course_id" IS DISTINCT FROM c."relegated_to_course_id"
    OR pc."relegated_on" IS DISTINCT FROM c."relegated_on"
    OR pc."withdrawn_on" IS DISTINCT FROM c."withdrawn_on"
  );
--> statement-breakpoint
UPDATE "oc_course_enrollments" e
SET
  "course_id" = c."course_id",
  "updated_at" = now()
FROM "oc_cadets" c
WHERE e."oc_id" = c."id"
  AND e."status" = 'ACTIVE'
  AND c."deleted_at" IS NULL
  AND e."course_id" IS DISTINCT FROM c."course_id";
--> statement-breakpoint
DO $$
DECLARE
  backfill_target record;
BEGIN
  FOR backfill_target IN
    SELECT *
    FROM (
      VALUES
        ('oc_semester_marks', 'semester', 'DUPLICATE_SEMESTER_MARKS_BACKFILL'),
        ('oc_spr_records', 'semester', 'DUPLICATE_SPR_RECORD_BACKFILL'),
        ('oc_camps', 'training_camp_id', 'DUPLICATE_CAMP_BACKFILL'),
        ('oc_olq', 'semester', 'DUPLICATE_OLQ_BACKFILL'),
        ('oc_credit_for_excellence', 'semester', 'DUPLICATE_CFE_BACKFILL'),
        ('oc_pt_task_scores', 'pt_task_score_id', 'DUPLICATE_PT_TASK_SCORE_BACKFILL'),
        ('oc_pt_motivation_awards', 'pt_motivation_field_id', 'DUPLICATE_PT_MOTIVATION_BACKFILL')
    ) AS targets("table_name", "key_column", "conflict_type")
  LOOP
    EXECUTE format($audit$
      WITH "active_enrollment" AS (
        SELECT "oc_id", "id" AS "enrollment_id"
        FROM "oc_course_enrollments"
        WHERE "status" = 'ACTIVE'
      ),
      "candidate_null_rows" AS (
        SELECT
          t."id",
          t."oc_id",
          a."enrollment_id",
          t.%1$I::text AS "key_value",
          row_number() OVER (
            PARTITION BY a."enrollment_id", t.%1$I::text
            ORDER BY t."id"
          ) AS "row_rank"
        FROM %2$I t
        JOIN "active_enrollment" a
          ON a."oc_id" = t."oc_id"
        WHERE t."enrollment_id" IS NULL
      ),
      "duplicate_rows" AS (
        SELECT
          t."id" AS "duplicate_id",
          t."oc_id",
          to_jsonb(t) AS "source_value",
          COALESCE(to_jsonb(existing_row), to_jsonb(kept_row)) AS "target_value"
        FROM "candidate_null_rows" candidate
        JOIN %2$I t
          ON t."id" = candidate."id"
        LEFT JOIN %2$I existing_row
          ON existing_row."enrollment_id" = candidate."enrollment_id"
         AND existing_row.%1$I::text = candidate."key_value"
        LEFT JOIN "candidate_null_rows" kept_candidate
          ON kept_candidate."enrollment_id" = candidate."enrollment_id"
         AND kept_candidate."key_value" = candidate."key_value"
         AND kept_candidate."row_rank" = 1
        LEFT JOIN %2$I kept_row
          ON kept_row."id" = kept_candidate."id"
        WHERE existing_row."id" IS NOT NULL
           OR candidate."row_rank" > 1
      )
      INSERT INTO "oc_reconciliation_audit" (
        "oc_id",
        "source_table",
        "target_table",
        "conflict_type",
        "field_name",
        "source_value",
        "target_value",
        "resolution"
      )
      SELECT
        "oc_id",
        %3$L,
        %3$L,
        %4$L,
        'enrollment_id',
        "source_value",
        "target_value",
        'migration_0039_left_duplicate_null_enrollment_unmodified'
      FROM "duplicate_rows"
    $audit$, backfill_target."key_column", backfill_target."table_name", backfill_target."table_name", backfill_target."conflict_type");
  END LOOP;
END $$;
--> statement-breakpoint
WITH "active_enrollment" AS (
  SELECT "oc_id", "id" AS "enrollment_id"
  FROM "oc_course_enrollments"
  WHERE "status" = 'ACTIVE'
),
"candidate_null_rows" AS (
  SELECT
    t."id",
    a."enrollment_id",
    row_number() OVER (
      PARTITION BY a."enrollment_id", t."semester"
      ORDER BY t."id"
    ) AS "row_rank"
  FROM "oc_semester_marks" t
  JOIN "active_enrollment" a
    ON a."oc_id" = t."oc_id"
  WHERE t."enrollment_id" IS NULL
)
UPDATE "oc_semester_marks" t SET "enrollment_id" = candidate."enrollment_id"
FROM "candidate_null_rows" candidate
WHERE t."id" = candidate."id"
  AND candidate."row_rank" = 1
  AND NOT EXISTS (
    SELECT 1
    FROM "oc_semester_marks" existing_row
    WHERE existing_row."enrollment_id" = candidate."enrollment_id"
      AND existing_row."semester" = t."semester"
      AND existing_row."id" <> t."id"
  );
--> statement-breakpoint
WITH "active_enrollment" AS (
  SELECT "oc_id", "id" AS "enrollment_id"
  FROM "oc_course_enrollments"
  WHERE "status" = 'ACTIVE'
),
"candidate_null_rows" AS (
  SELECT
    t."id",
    a."enrollment_id",
    row_number() OVER (
      PARTITION BY a."enrollment_id", t."semester"
      ORDER BY t."id"
    ) AS "row_rank"
  FROM "oc_spr_records" t
  JOIN "active_enrollment" a
    ON a."oc_id" = t."oc_id"
  WHERE t."enrollment_id" IS NULL
)
UPDATE "oc_spr_records" t SET "enrollment_id" = candidate."enrollment_id"
FROM "candidate_null_rows" candidate
WHERE t."id" = candidate."id"
  AND candidate."row_rank" = 1
  AND NOT EXISTS (
    SELECT 1
    FROM "oc_spr_records" existing_row
    WHERE existing_row."enrollment_id" = candidate."enrollment_id"
      AND existing_row."semester" = t."semester"
      AND existing_row."id" <> t."id"
  );
--> statement-breakpoint
WITH "active_enrollment" AS (
  SELECT "oc_id", "id" AS "enrollment_id"
  FROM "oc_course_enrollments"
  WHERE "status" = 'ACTIVE'
)
UPDATE "oc_discipline" t SET "enrollment_id" = a."enrollment_id"
FROM "active_enrollment" a
WHERE t."oc_id" = a."oc_id" AND t."enrollment_id" IS NULL;
--> statement-breakpoint
WITH "active_enrollment" AS (
  SELECT "oc_id", "id" AS "enrollment_id"
  FROM "oc_course_enrollments"
  WHERE "status" = 'ACTIVE'
)
UPDATE "oc_motivation_awards" t SET "enrollment_id" = a."enrollment_id"
FROM "active_enrollment" a
WHERE t."oc_id" = a."oc_id" AND t."enrollment_id" IS NULL;
--> statement-breakpoint
WITH "active_enrollment" AS (
  SELECT "oc_id", "id" AS "enrollment_id"
  FROM "oc_course_enrollments"
  WHERE "status" = 'ACTIVE'
)
UPDATE "oc_sports_and_games" t SET "enrollment_id" = a."enrollment_id"
FROM "active_enrollment" a
WHERE t."oc_id" = a."oc_id" AND t."enrollment_id" IS NULL;
--> statement-breakpoint
WITH "active_enrollment" AS (
  SELECT "oc_id", "id" AS "enrollment_id"
  FROM "oc_course_enrollments"
  WHERE "status" = 'ACTIVE'
)
UPDATE "oc_weapon_training" t SET "enrollment_id" = a."enrollment_id"
FROM "active_enrollment" a
WHERE t."oc_id" = a."oc_id" AND t."enrollment_id" IS NULL;
--> statement-breakpoint
WITH "active_enrollment" AS (
  SELECT "oc_id", "id" AS "enrollment_id"
  FROM "oc_course_enrollments"
  WHERE "status" = 'ACTIVE'
),
"candidate_null_rows" AS (
  SELECT
    t."id",
    a."enrollment_id",
    row_number() OVER (
      PARTITION BY a."enrollment_id", t."training_camp_id"
      ORDER BY t."id"
    ) AS "row_rank"
  FROM "oc_camps" t
  JOIN "active_enrollment" a
    ON a."oc_id" = t."oc_id"
  WHERE t."enrollment_id" IS NULL
)
UPDATE "oc_camps" t SET "enrollment_id" = candidate."enrollment_id"
FROM "candidate_null_rows" candidate
WHERE t."id" = candidate."id"
  AND candidate."row_rank" = 1
  AND NOT EXISTS (
    SELECT 1
    FROM "oc_camps" existing_row
    WHERE existing_row."enrollment_id" = candidate."enrollment_id"
      AND existing_row."training_camp_id" = t."training_camp_id"
      AND existing_row."id" <> t."id"
  );
--> statement-breakpoint
WITH "active_enrollment" AS (
  SELECT "oc_id", "id" AS "enrollment_id"
  FROM "oc_course_enrollments"
  WHERE "status" = 'ACTIVE'
)
UPDATE "oc_obstacle_training" t SET "enrollment_id" = a."enrollment_id"
FROM "active_enrollment" a
WHERE t."oc_id" = a."oc_id" AND t."enrollment_id" IS NULL;
--> statement-breakpoint
WITH "active_enrollment" AS (
  SELECT "oc_id", "id" AS "enrollment_id"
  FROM "oc_course_enrollments"
  WHERE "status" = 'ACTIVE'
)
UPDATE "oc_speed_march" t SET "enrollment_id" = a."enrollment_id"
FROM "active_enrollment" a
WHERE t."oc_id" = a."oc_id" AND t."enrollment_id" IS NULL;
--> statement-breakpoint
WITH "active_enrollment" AS (
  SELECT "oc_id", "id" AS "enrollment_id"
  FROM "oc_course_enrollments"
  WHERE "status" = 'ACTIVE'
)
UPDATE "oc_drill" t SET "enrollment_id" = a."enrollment_id"
FROM "active_enrollment" a
WHERE t."oc_id" = a."oc_id" AND t."enrollment_id" IS NULL;
--> statement-breakpoint
WITH "active_enrollment" AS (
  SELECT "oc_id", "id" AS "enrollment_id"
  FROM "oc_course_enrollments"
  WHERE "status" = 'ACTIVE'
),
"candidate_null_rows" AS (
  SELECT
    t."id",
    a."enrollment_id",
    row_number() OVER (
      PARTITION BY a."enrollment_id", t."semester"
      ORDER BY t."id"
    ) AS "row_rank"
  FROM "oc_olq" t
  JOIN "active_enrollment" a
    ON a."oc_id" = t."oc_id"
  WHERE t."enrollment_id" IS NULL
)
UPDATE "oc_olq" t SET "enrollment_id" = candidate."enrollment_id"
FROM "candidate_null_rows" candidate
WHERE t."id" = candidate."id"
  AND candidate."row_rank" = 1
  AND NOT EXISTS (
    SELECT 1
    FROM "oc_olq" existing_row
    WHERE existing_row."enrollment_id" = candidate."enrollment_id"
      AND existing_row."semester" = t."semester"
      AND existing_row."id" <> t."id"
  );
--> statement-breakpoint
WITH "active_enrollment" AS (
  SELECT "oc_id", "id" AS "enrollment_id"
  FROM "oc_course_enrollments"
  WHERE "status" = 'ACTIVE'
),
"candidate_null_rows" AS (
  SELECT
    t."id",
    a."enrollment_id",
    row_number() OVER (
      PARTITION BY a."enrollment_id", t."semester"
      ORDER BY t."id"
    ) AS "row_rank"
  FROM "oc_credit_for_excellence" t
  JOIN "active_enrollment" a
    ON a."oc_id" = t."oc_id"
  WHERE t."enrollment_id" IS NULL
)
UPDATE "oc_credit_for_excellence" t SET "enrollment_id" = candidate."enrollment_id"
FROM "candidate_null_rows" candidate
WHERE t."id" = candidate."id"
  AND candidate."row_rank" = 1
  AND NOT EXISTS (
    SELECT 1
    FROM "oc_credit_for_excellence" existing_row
    WHERE existing_row."enrollment_id" = candidate."enrollment_id"
      AND existing_row."semester" = t."semester"
      AND existing_row."id" <> t."id"
  );
--> statement-breakpoint
WITH "active_enrollment" AS (
  SELECT "oc_id", "id" AS "enrollment_id"
  FROM "oc_course_enrollments"
  WHERE "status" = 'ACTIVE'
)
UPDATE "oc_clubs" t SET "enrollment_id" = a."enrollment_id"
FROM "active_enrollment" a
WHERE t."oc_id" = a."oc_id" AND t."enrollment_id" IS NULL;
--> statement-breakpoint
WITH "active_enrollment" AS (
  SELECT "oc_id", "id" AS "enrollment_id"
  FROM "oc_course_enrollments"
  WHERE "status" = 'ACTIVE'
)
UPDATE "oc_special_achievement_in_clubs" t SET "enrollment_id" = a."enrollment_id"
FROM "active_enrollment" a
WHERE t."oc_id" = a."oc_id" AND t."enrollment_id" IS NULL;
--> statement-breakpoint
WITH "active_enrollment" AS (
  SELECT "oc_id", "id" AS "enrollment_id"
  FROM "oc_course_enrollments"
  WHERE "status" = 'ACTIVE'
)
UPDATE "oc_recording_leave_hike_detention" t SET "enrollment_id" = a."enrollment_id"
FROM "active_enrollment" a
WHERE t."oc_id" = a."oc_id" AND t."enrollment_id" IS NULL;
--> statement-breakpoint
WITH "active_enrollment" AS (
  SELECT "oc_id", "id" AS "enrollment_id"
  FROM "oc_course_enrollments"
  WHERE "status" = 'ACTIVE'
)
UPDATE "oc_counselling" t SET "enrollment_id" = a."enrollment_id"
FROM "active_enrollment" a
WHERE t."oc_id" = a."oc_id" AND t."enrollment_id" IS NULL;
--> statement-breakpoint
WITH "active_enrollment" AS (
  SELECT "oc_id", "id" AS "enrollment_id"
  FROM "oc_course_enrollments"
  WHERE "status" = 'ACTIVE'
)
UPDATE "oc_interviews" t SET "enrollment_id" = a."enrollment_id"
FROM "active_enrollment" a
WHERE t."oc_id" = a."oc_id" AND t."enrollment_id" IS NULL;
--> statement-breakpoint
WITH "active_enrollment" AS (
  SELECT "oc_id", "id" AS "enrollment_id"
  FROM "oc_course_enrollments"
  WHERE "status" = 'ACTIVE'
),
"candidate_null_rows" AS (
  SELECT
    t."id",
    a."enrollment_id",
    row_number() OVER (
      PARTITION BY a."enrollment_id", t."pt_task_score_id"
      ORDER BY t."id"
    ) AS "row_rank"
  FROM "oc_pt_task_scores" t
  JOIN "active_enrollment" a
    ON a."oc_id" = t."oc_id"
  WHERE t."enrollment_id" IS NULL
)
UPDATE "oc_pt_task_scores" t SET "enrollment_id" = candidate."enrollment_id"
FROM "candidate_null_rows" candidate
WHERE t."id" = candidate."id"
  AND candidate."row_rank" = 1
  AND NOT EXISTS (
    SELECT 1
    FROM "oc_pt_task_scores" existing_row
    WHERE existing_row."enrollment_id" = candidate."enrollment_id"
      AND existing_row."pt_task_score_id" = t."pt_task_score_id"
      AND existing_row."id" <> t."id"
  );
--> statement-breakpoint
WITH "active_enrollment" AS (
  SELECT "oc_id", "id" AS "enrollment_id"
  FROM "oc_course_enrollments"
  WHERE "status" = 'ACTIVE'
),
"candidate_null_rows" AS (
  SELECT
    t."id",
    a."enrollment_id",
    row_number() OVER (
      PARTITION BY a."enrollment_id", t."pt_motivation_field_id"
      ORDER BY t."id"
    ) AS "row_rank"
  FROM "oc_pt_motivation_awards" t
  JOIN "active_enrollment" a
    ON a."oc_id" = t."oc_id"
  WHERE t."enrollment_id" IS NULL
)
UPDATE "oc_pt_motivation_awards" t SET "enrollment_id" = candidate."enrollment_id"
FROM "candidate_null_rows" candidate
WHERE t."id" = candidate."id"
  AND candidate."row_rank" = 1
  AND NOT EXISTS (
    SELECT 1
    FROM "oc_pt_motivation_awards" existing_row
    WHERE existing_row."enrollment_id" = candidate."enrollment_id"
      AND existing_row."pt_motivation_field_id" = t."pt_motivation_field_id"
      AND existing_row."id" <> t."id"
  );
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_oc_personal_oc_id" ON "oc_personal" USING btree ("oc_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_oc_family_members_oc_id" ON "oc_family_members" USING btree ("oc_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_oc_education_oc_id" ON "oc_education" USING btree ("oc_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_oc_achievements_oc_id" ON "oc_achievements" USING btree ("oc_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_oc_autobiography_oc_id" ON "oc_autobiography" USING btree ("oc_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_oc_pre_commission_oc_id" ON "oc_pre_commission" USING btree ("oc_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_oc_commissioning_oc_id" ON "oc_commissioning" USING btree ("oc_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_oc_ssb_reports_oc_active" ON "oc_ssb_reports" USING btree ("oc_id") WHERE "deleted_at" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_oc_medicals_oc_active" ON "oc_medicals" USING btree ("oc_id", "semester") WHERE "deleted_at" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_oc_medical_category_oc_active" ON "oc_medical_category" USING btree ("oc_id", "semester") WHERE "deleted_at" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_oc_discipline_oc_active" ON "oc_discipline" USING btree ("oc_id", "enrollment_id", "semester") WHERE "deleted_at" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_oc_parent_comms_oc_active" ON "oc_parent_comms" USING btree ("oc_id", "semester") WHERE "deleted_at" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_oc_delegations_oc_id" ON "oc_delegations" USING btree ("oc_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_oc_motivation_awards_oc_active" ON "oc_motivation_awards" USING btree ("oc_id", "enrollment_id", "semester") WHERE "deleted_at" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_oc_sports_and_games_oc_active" ON "oc_sports_and_games" USING btree ("oc_id", "enrollment_id", "semester") WHERE "deleted_at" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_oc_weapon_training_oc_active" ON "oc_weapon_training" USING btree ("oc_id", "enrollment_id", "semester") WHERE "deleted_at" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_oc_camps_oc_active" ON "oc_camps" USING btree ("oc_id", "enrollment_id") WHERE "deleted_at" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_oc_obstacle_training_oc_active" ON "oc_obstacle_training" USING btree ("oc_id", "enrollment_id", "semester") WHERE "deleted_at" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_oc_speed_march_oc_active" ON "oc_speed_march" USING btree ("oc_id", "enrollment_id", "semester") WHERE "deleted_at" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_oc_drill_oc_active" ON "oc_drill" USING btree ("oc_id", "enrollment_id", "semester") WHERE "deleted_at" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_oc_olq_oc_active" ON "oc_olq" USING btree ("oc_id", "enrollment_id", "semester");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_oc_credit_for_excellence_oc_active" ON "oc_credit_for_excellence" USING btree ("oc_id", "enrollment_id", "semester") WHERE "deleted_at" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_oc_clubs_oc_active" ON "oc_clubs" USING btree ("oc_id", "enrollment_id", "semester") WHERE "deleted_at" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_oc_special_achievement_in_clubs_oc_active" ON "oc_special_achievement_in_clubs" USING btree ("oc_id", "enrollment_id") WHERE "deleted_at" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_oc_recording_lhd_oc_active" ON "oc_recording_leave_hike_detention" USING btree ("oc_id", "enrollment_id", "semester") WHERE "deleted_at" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_oc_counselling_oc_active" ON "oc_counselling" USING btree ("oc_id", "enrollment_id", "semester") WHERE "deleted_at" IS NULL;
