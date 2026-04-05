ALTER TABLE "oc_cadets"
  ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
--> statement-breakpoint

ALTER TABLE "oc_ssb_reports"
  ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
--> statement-breakpoint

ALTER TABLE "oc_medicals"
  ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
--> statement-breakpoint

ALTER TABLE "oc_medical_category"
  ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
--> statement-breakpoint

ALTER TABLE "oc_discipline"
  ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
--> statement-breakpoint

ALTER TABLE "oc_parent_comms"
  ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
--> statement-breakpoint

ALTER TABLE "dossier_inspections"
  ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
--> statement-breakpoint

ALTER TABLE "oc_interviews"
  ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
--> statement-breakpoint

DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT *
    FROM (
      VALUES
        ('oc_images', 'oc_images_oc_id_oc_cadets_id_fk'),
        ('oc_course_enrollments', 'oc_course_enrollments_oc_id_oc_cadets_id_fk'),
        ('oc_semester_marks', 'oc_semester_marks_oc_id_oc_cadets_id_fk'),
        ('oc_pre_commission', 'oc_pre_commission_oc_id_oc_cadets_id_fk'),
        ('oc_commissioning', 'oc_commissioning_oc_id_oc_cadets_id_fk'),
        ('oc_personal', 'oc_personal_oc_id_oc_cadets_id_fk'),
        ('oc_family_members', 'oc_family_members_oc_id_oc_cadets_id_fk'),
        ('oc_education', 'oc_education_oc_id_oc_cadets_id_fk'),
        ('oc_achievements', 'oc_achievements_oc_id_oc_cadets_id_fk'),
        ('oc_autobiography', 'oc_autobiography_oc_id_oc_cadets_id_fk'),
        ('oc_dossier_filling', 'oc_dossier_filling_oc_id_oc_cadets_id_fk'),
        ('oc_ssb_reports', 'oc_ssb_reports_oc_id_oc_cadets_id_fk'),
        ('oc_medicals', 'oc_medicals_oc_id_oc_cadets_id_fk'),
        ('oc_medical_category', 'oc_medical_category_oc_id_oc_cadets_id_fk'),
        ('oc_discipline', 'oc_discipline_oc_id_oc_cadets_id_fk'),
        ('oc_spr_records', 'oc_spr_records_oc_id_oc_cadets_id_fk'),
        ('oc_parent_comms', 'oc_parent_comms_oc_id_oc_cadets_id_fk'),
        ('oc_delegations', 'oc_delegations_oc_id_oc_cadets_id_fk'),
        ('oc_motivation_awards', 'oc_motivation_awards_oc_id_oc_cadets_id_fk'),
        ('oc_sports_and_games', 'oc_sports_and_games_oc_id_oc_cadets_id_fk'),
        ('oc_weapon_training', 'oc_weapon_training_oc_id_oc_cadets_id_fk'),
        ('oc_special_achievement_in_firing', 'oc_special_achievement_in_firing_oc_id_oc_cadets_id_fk'),
        ('oc_camps', 'oc_camps_oc_id_oc_cadets_id_fk'),
        ('oc_obstacle_training', 'oc_obstacle_training_oc_id_oc_cadets_id_fk'),
        ('oc_speed_march', 'oc_speed_march_oc_id_oc_cadets_id_fk'),
        ('oc_drill', 'oc_drill_oc_id_oc_cadets_id_fk'),
        ('oc_olq', 'oc_olq_oc_id_oc_cadets_id_fk'),
        ('oc_credit_for_excellence', 'oc_credit_for_excellence_oc_id_oc_cadets_id_fk'),
        ('oc_clubs', 'oc_clubs_oc_id_oc_cadets_id_fk'),
        ('oc_special_achievement_in_clubs', 'oc_special_achievement_in_clubs_oc_id_oc_cadets_id_fk'),
        ('oc_recording_leave_hike_detention', 'oc_recording_leave_hike_detention_oc_id_oc_cadets_id_fk'),
        ('oc_counselling', 'oc_counselling_oc_id_oc_cadets_id_fk'),
        ('oc_pt_task_scores', 'oc_pt_task_scores_oc_id_oc_cadets_id_fk'),
        ('oc_pt_motivation_awards', 'oc_pt_motivation_awards_oc_id_oc_cadets_id_fk'),
        ('oc_relegations', 'oc_relegations_oc_id_oc_cadets_id_fk'),
        ('dossier_inspections', 'dossier_inspections_oc_id_oc_cadets_id_fk'),
        ('oc_interviews', 'oc_interviews_oc_id_oc_cadets_id_fk')
    ) AS t(table_name, constraint_name)
  LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', rec.table_name, rec.constraint_name);
    EXECUTE format(
      'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (oc_id) REFERENCES "public"."oc_cadets"("id") ON DELETE restrict ON UPDATE no action',
      rec.table_name,
      rec.constraint_name
    );
  END LOOP;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_oc_cadets_active_course_platoon_created"
  ON "oc_cadets" USING btree ("course_id", "platoon_id", "created_at")
  WHERE "deleted_at" IS NULL;
