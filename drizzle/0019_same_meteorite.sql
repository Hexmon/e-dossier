CREATE TYPE "public"."oc_enrollment_origin" AS ENUM('PROMOTION', 'TRANSFER', 'MANUAL', 'BASELINE');--> statement-breakpoint
CREATE TYPE "public"."oc_enrollment_status" AS ENUM('ACTIVE', 'ARCHIVED', 'VOIDED');--> statement-breakpoint
ALTER TYPE "public"."oc_movement_kind" ADD VALUE 'VOID_PROMOTION';--> statement-breakpoint
CREATE TABLE "oc_course_enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oc_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"status" "oc_enrollment_status" DEFAULT 'ACTIVE' NOT NULL,
	"origin" "oc_enrollment_origin" DEFAULT 'BASELINE' NOT NULL,
	"started_on" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_on" timestamp with time zone,
	"reason" text,
	"note" text,
	"created_by_user_id" uuid,
	"closed_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "uq_oc_camp_per_template";--> statement-breakpoint
DROP INDEX "uq_oc_cfe_per_semester";--> statement-breakpoint
DROP INDEX "uq_oc_olq_semester";--> statement-breakpoint
DROP INDEX "uq_oc_semester_marks";--> statement-breakpoint
DROP INDEX "uq_oc_spr_record";--> statement-breakpoint
DROP INDEX "uq_oc_pt_motivation_field";--> statement-breakpoint
DROP INDEX "uq_oc_pt_task_score";--> statement-breakpoint
ALTER TABLE "oc_interviews" ADD COLUMN "enrollment_id" uuid;--> statement-breakpoint
ALTER TABLE "oc_camps" ADD COLUMN "enrollment_id" uuid;--> statement-breakpoint
ALTER TABLE "oc_clubs" ADD COLUMN "enrollment_id" uuid;--> statement-breakpoint
ALTER TABLE "oc_counselling" ADD COLUMN "enrollment_id" uuid;--> statement-breakpoint
ALTER TABLE "oc_credit_for_excellence" ADD COLUMN "enrollment_id" uuid;--> statement-breakpoint
ALTER TABLE "oc_discipline" ADD COLUMN "enrollment_id" uuid;--> statement-breakpoint
ALTER TABLE "oc_drill" ADD COLUMN "enrollment_id" uuid;--> statement-breakpoint
ALTER TABLE "oc_motivation_awards" ADD COLUMN "enrollment_id" uuid;--> statement-breakpoint
ALTER TABLE "oc_obstacle_training" ADD COLUMN "enrollment_id" uuid;--> statement-breakpoint
ALTER TABLE "oc_olq" ADD COLUMN "enrollment_id" uuid;--> statement-breakpoint
ALTER TABLE "oc_recording_leave_hike_detention" ADD COLUMN "enrollment_id" uuid;--> statement-breakpoint
ALTER TABLE "oc_semester_marks" ADD COLUMN "enrollment_id" uuid;--> statement-breakpoint
ALTER TABLE "oc_special_achievement_in_clubs" ADD COLUMN "enrollment_id" uuid;--> statement-breakpoint
ALTER TABLE "oc_speed_march" ADD COLUMN "enrollment_id" uuid;--> statement-breakpoint
ALTER TABLE "oc_sports_and_games" ADD COLUMN "enrollment_id" uuid;--> statement-breakpoint
ALTER TABLE "oc_spr_records" ADD COLUMN "enrollment_id" uuid;--> statement-breakpoint
ALTER TABLE "oc_weapon_training" ADD COLUMN "enrollment_id" uuid;--> statement-breakpoint
ALTER TABLE "oc_relegations" ADD COLUMN "from_enrollment_id" uuid;--> statement-breakpoint
ALTER TABLE "oc_relegations" ADD COLUMN "to_enrollment_id" uuid;--> statement-breakpoint
ALTER TABLE "oc_relegations" ADD COLUMN "reversal_of_id" uuid;--> statement-breakpoint
ALTER TABLE "oc_pt_motivation_awards" ADD COLUMN "enrollment_id" uuid;--> statement-breakpoint
ALTER TABLE "oc_pt_task_scores" ADD COLUMN "enrollment_id" uuid;--> statement-breakpoint
ALTER TABLE "oc_course_enrollments" ADD CONSTRAINT "oc_course_enrollments_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_course_enrollments" ADD CONSTRAINT "oc_course_enrollments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_course_enrollments" ADD CONSTRAINT "oc_course_enrollments_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_course_enrollments" ADD CONSTRAINT "oc_course_enrollments_closed_by_user_id_users_id_fk" FOREIGN KEY ("closed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_oc_course_enrollment_active" ON "oc_course_enrollments" USING btree ("oc_id") WHERE "oc_course_enrollments"."status" = 'ACTIVE';--> statement-breakpoint
CREATE INDEX "idx_oc_course_enrollment_oc_status_started" ON "oc_course_enrollments" USING btree ("oc_id","status","started_on");--> statement-breakpoint
CREATE INDEX "idx_oc_course_enrollment_course_status_started" ON "oc_course_enrollments" USING btree ("course_id","status","started_on");--> statement-breakpoint
ALTER TABLE "oc_interviews" ADD CONSTRAINT "oc_interviews_enrollment_id_oc_course_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."oc_course_enrollments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_camps" ADD CONSTRAINT "oc_camps_enrollment_id_oc_course_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."oc_course_enrollments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_clubs" ADD CONSTRAINT "oc_clubs_enrollment_id_oc_course_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."oc_course_enrollments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_counselling" ADD CONSTRAINT "oc_counselling_enrollment_id_oc_course_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."oc_course_enrollments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_credit_for_excellence" ADD CONSTRAINT "oc_credit_for_excellence_enrollment_id_oc_course_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."oc_course_enrollments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_discipline" ADD CONSTRAINT "oc_discipline_enrollment_id_oc_course_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."oc_course_enrollments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_drill" ADD CONSTRAINT "oc_drill_enrollment_id_oc_course_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."oc_course_enrollments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_motivation_awards" ADD CONSTRAINT "oc_motivation_awards_enrollment_id_oc_course_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."oc_course_enrollments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_obstacle_training" ADD CONSTRAINT "oc_obstacle_training_enrollment_id_oc_course_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."oc_course_enrollments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_olq" ADD CONSTRAINT "oc_olq_enrollment_id_oc_course_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."oc_course_enrollments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_recording_leave_hike_detention" ADD CONSTRAINT "oc_recording_leave_hike_detention_enrollment_id_oc_course_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."oc_course_enrollments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_semester_marks" ADD CONSTRAINT "oc_semester_marks_enrollment_id_oc_course_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."oc_course_enrollments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_special_achievement_in_clubs" ADD CONSTRAINT "oc_special_achievement_in_clubs_enrollment_id_oc_course_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."oc_course_enrollments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_speed_march" ADD CONSTRAINT "oc_speed_march_enrollment_id_oc_course_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."oc_course_enrollments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_sports_and_games" ADD CONSTRAINT "oc_sports_and_games_enrollment_id_oc_course_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."oc_course_enrollments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_spr_records" ADD CONSTRAINT "oc_spr_records_enrollment_id_oc_course_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."oc_course_enrollments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_weapon_training" ADD CONSTRAINT "oc_weapon_training_enrollment_id_oc_course_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."oc_course_enrollments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_relegations" ADD CONSTRAINT "oc_relegations_from_enrollment_id_oc_course_enrollments_id_fk" FOREIGN KEY ("from_enrollment_id") REFERENCES "public"."oc_course_enrollments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_relegations" ADD CONSTRAINT "oc_relegations_to_enrollment_id_oc_course_enrollments_id_fk" FOREIGN KEY ("to_enrollment_id") REFERENCES "public"."oc_course_enrollments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_pt_motivation_awards" ADD CONSTRAINT "oc_pt_motivation_awards_enrollment_id_oc_course_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."oc_course_enrollments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_pt_task_scores" ADD CONSTRAINT "oc_pt_task_scores_enrollment_id_oc_course_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."oc_course_enrollments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
INSERT INTO "oc_course_enrollments" ("oc_id", "course_id", "status", "origin", "started_on", "created_at", "updated_at")
SELECT c."id", c."course_id", 'ACTIVE', 'BASELINE', COALESCE(c."created_at", now()), now(), now()
FROM "oc_cadets" c
LEFT JOIN "oc_course_enrollments" e
  ON e."oc_id" = c."id" AND e."status" = 'ACTIVE'
WHERE e."id" IS NULL;--> statement-breakpoint
WITH "active_enrollment" AS (
  SELECT "oc_id", "id" AS "enrollment_id"
  FROM "oc_course_enrollments"
  WHERE "status" = 'ACTIVE'
)
UPDATE "oc_semester_marks" t
SET "enrollment_id" = a."enrollment_id"
FROM "active_enrollment" a
WHERE t."oc_id" = a."oc_id" AND t."enrollment_id" IS NULL;--> statement-breakpoint
WITH "active_enrollment" AS (
  SELECT "oc_id", "id" AS "enrollment_id"
  FROM "oc_course_enrollments"
  WHERE "status" = 'ACTIVE'
)
UPDATE "oc_olq" t
SET "enrollment_id" = a."enrollment_id"
FROM "active_enrollment" a
WHERE t."oc_id" = a."oc_id" AND t."enrollment_id" IS NULL;--> statement-breakpoint
WITH "active_enrollment" AS (
  SELECT "oc_id", "id" AS "enrollment_id"
  FROM "oc_course_enrollments"
  WHERE "status" = 'ACTIVE'
)
UPDATE "oc_credit_for_excellence" t
SET "enrollment_id" = a."enrollment_id"
FROM "active_enrollment" a
WHERE t."oc_id" = a."oc_id" AND t."enrollment_id" IS NULL;--> statement-breakpoint
WITH "active_enrollment" AS (
  SELECT "oc_id", "id" AS "enrollment_id"
  FROM "oc_course_enrollments"
  WHERE "status" = 'ACTIVE'
)
UPDATE "oc_spr_records" t
SET "enrollment_id" = a."enrollment_id"
FROM "active_enrollment" a
WHERE t."oc_id" = a."oc_id" AND t."enrollment_id" IS NULL;--> statement-breakpoint
WITH "active_enrollment" AS (
  SELECT "oc_id", "id" AS "enrollment_id"
  FROM "oc_course_enrollments"
  WHERE "status" = 'ACTIVE'
)
UPDATE "oc_interviews" t
SET "enrollment_id" = a."enrollment_id"
FROM "active_enrollment" a
WHERE t."oc_id" = a."oc_id" AND t."enrollment_id" IS NULL;--> statement-breakpoint
WITH "active_enrollment" AS (
  SELECT "oc_id", "id" AS "enrollment_id"
  FROM "oc_course_enrollments"
  WHERE "status" = 'ACTIVE'
)
UPDATE "oc_pt_task_scores" t
SET "enrollment_id" = a."enrollment_id"
FROM "active_enrollment" a
WHERE t."oc_id" = a."oc_id" AND t."enrollment_id" IS NULL;--> statement-breakpoint
WITH "active_enrollment" AS (
  SELECT "oc_id", "id" AS "enrollment_id"
  FROM "oc_course_enrollments"
  WHERE "status" = 'ACTIVE'
)
UPDATE "oc_pt_motivation_awards" t
SET "enrollment_id" = a."enrollment_id"
FROM "active_enrollment" a
WHERE t."oc_id" = a."oc_id" AND t."enrollment_id" IS NULL;--> statement-breakpoint
WITH "active_enrollment" AS (
  SELECT "oc_id", "id" AS "enrollment_id"
  FROM "oc_course_enrollments"
  WHERE "status" = 'ACTIVE'
)
UPDATE "oc_discipline" t
SET "enrollment_id" = a."enrollment_id"
FROM "active_enrollment" a
WHERE t."oc_id" = a."oc_id" AND t."enrollment_id" IS NULL;--> statement-breakpoint
WITH "active_enrollment" AS (
  SELECT "oc_id", "id" AS "enrollment_id"
  FROM "oc_course_enrollments"
  WHERE "status" = 'ACTIVE'
)
UPDATE "oc_motivation_awards" t
SET "enrollment_id" = a."enrollment_id"
FROM "active_enrollment" a
WHERE t."oc_id" = a."oc_id" AND t."enrollment_id" IS NULL;--> statement-breakpoint
WITH "active_enrollment" AS (
  SELECT "oc_id", "id" AS "enrollment_id"
  FROM "oc_course_enrollments"
  WHERE "status" = 'ACTIVE'
)
UPDATE "oc_sports_and_games" t
SET "enrollment_id" = a."enrollment_id"
FROM "active_enrollment" a
WHERE t."oc_id" = a."oc_id" AND t."enrollment_id" IS NULL;--> statement-breakpoint
WITH "active_enrollment" AS (
  SELECT "oc_id", "id" AS "enrollment_id"
  FROM "oc_course_enrollments"
  WHERE "status" = 'ACTIVE'
)
UPDATE "oc_weapon_training" t
SET "enrollment_id" = a."enrollment_id"
FROM "active_enrollment" a
WHERE t."oc_id" = a."oc_id" AND t."enrollment_id" IS NULL;--> statement-breakpoint
WITH "active_enrollment" AS (
  SELECT "oc_id", "id" AS "enrollment_id"
  FROM "oc_course_enrollments"
  WHERE "status" = 'ACTIVE'
)
UPDATE "oc_obstacle_training" t
SET "enrollment_id" = a."enrollment_id"
FROM "active_enrollment" a
WHERE t."oc_id" = a."oc_id" AND t."enrollment_id" IS NULL;--> statement-breakpoint
WITH "active_enrollment" AS (
  SELECT "oc_id", "id" AS "enrollment_id"
  FROM "oc_course_enrollments"
  WHERE "status" = 'ACTIVE'
)
UPDATE "oc_speed_march" t
SET "enrollment_id" = a."enrollment_id"
FROM "active_enrollment" a
WHERE t."oc_id" = a."oc_id" AND t."enrollment_id" IS NULL;--> statement-breakpoint
WITH "active_enrollment" AS (
  SELECT "oc_id", "id" AS "enrollment_id"
  FROM "oc_course_enrollments"
  WHERE "status" = 'ACTIVE'
)
UPDATE "oc_drill" t
SET "enrollment_id" = a."enrollment_id"
FROM "active_enrollment" a
WHERE t."oc_id" = a."oc_id" AND t."enrollment_id" IS NULL;--> statement-breakpoint
WITH "active_enrollment" AS (
  SELECT "oc_id", "id" AS "enrollment_id"
  FROM "oc_course_enrollments"
  WHERE "status" = 'ACTIVE'
)
UPDATE "oc_camps" t
SET "enrollment_id" = a."enrollment_id"
FROM "active_enrollment" a
WHERE t."oc_id" = a."oc_id" AND t."enrollment_id" IS NULL;--> statement-breakpoint
WITH "active_enrollment" AS (
  SELECT "oc_id", "id" AS "enrollment_id"
  FROM "oc_course_enrollments"
  WHERE "status" = 'ACTIVE'
)
UPDATE "oc_clubs" t
SET "enrollment_id" = a."enrollment_id"
FROM "active_enrollment" a
WHERE t."oc_id" = a."oc_id" AND t."enrollment_id" IS NULL;--> statement-breakpoint
WITH "active_enrollment" AS (
  SELECT "oc_id", "id" AS "enrollment_id"
  FROM "oc_course_enrollments"
  WHERE "status" = 'ACTIVE'
)
UPDATE "oc_special_achievement_in_clubs" t
SET "enrollment_id" = a."enrollment_id"
FROM "active_enrollment" a
WHERE t."oc_id" = a."oc_id" AND t."enrollment_id" IS NULL;--> statement-breakpoint
WITH "active_enrollment" AS (
  SELECT "oc_id", "id" AS "enrollment_id"
  FROM "oc_course_enrollments"
  WHERE "status" = 'ACTIVE'
)
UPDATE "oc_recording_leave_hike_detention" t
SET "enrollment_id" = a."enrollment_id"
FROM "active_enrollment" a
WHERE t."oc_id" = a."oc_id" AND t."enrollment_id" IS NULL;--> statement-breakpoint
WITH "active_enrollment" AS (
  SELECT "oc_id", "id" AS "enrollment_id"
  FROM "oc_course_enrollments"
  WHERE "status" = 'ACTIVE'
)
UPDATE "oc_counselling" t
SET "enrollment_id" = a."enrollment_id"
FROM "active_enrollment" a
WHERE t."oc_id" = a."oc_id" AND t."enrollment_id" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_oc_olq_enrollment_sem" ON "oc_olq" USING btree ("enrollment_id","semester");--> statement-breakpoint
CREATE INDEX "idx_oc_semester_marks_enrollment_sem" ON "oc_semester_marks" USING btree ("enrollment_id","semester");--> statement-breakpoint
CREATE INDEX "idx_oc_relegations_from_enrollment" ON "oc_relegations" USING btree ("from_enrollment_id");--> statement-breakpoint
CREATE INDEX "idx_oc_relegations_to_enrollment" ON "oc_relegations" USING btree ("to_enrollment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_oc_camp_per_template" ON "oc_camps" USING btree ("enrollment_id","training_camp_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_oc_cfe_per_semester" ON "oc_credit_for_excellence" USING btree ("enrollment_id","semester");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_oc_olq_semester" ON "oc_olq" USING btree ("enrollment_id","semester");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_oc_semester_marks" ON "oc_semester_marks" USING btree ("enrollment_id","semester");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_oc_spr_record" ON "oc_spr_records" USING btree ("enrollment_id","semester");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_oc_pt_motivation_field" ON "oc_pt_motivation_awards" USING btree ("enrollment_id","pt_motivation_field_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_oc_pt_task_score" ON "oc_pt_task_scores" USING btree ("enrollment_id","pt_task_score_id");
