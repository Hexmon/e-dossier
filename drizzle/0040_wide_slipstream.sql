CREATE TYPE "public"."org_hierarchy_node_type" AS ENUM('ROOT', 'GROUP', 'PLATOON');--> statement-breakpoint
CREATE TYPE "public"."marks_workflow_event_type" AS ENUM('SAVE_DRAFT', 'SUBMIT_FOR_VERIFICATION', 'REQUEST_CHANGES', 'VERIFY_AND_PUBLISH', 'OVERRIDE_PUBLISH');--> statement-breakpoint
CREATE TYPE "public"."marks_workflow_module" AS ENUM('ACADEMICS_BULK', 'PT_BULK');--> statement-breakpoint
CREATE TYPE "public"."marks_workflow_override_mode" AS ENUM('SUPER_ADMIN_ONLY', 'ADMIN_AND_SUPER_ADMIN');--> statement-breakpoint
CREATE TYPE "public"."marks_workflow_status" AS ENUM('DRAFT', 'PENDING_VERIFICATION', 'CHANGES_REQUESTED', 'VERIFIED');--> statement-breakpoint
CREATE TABLE "dossier_lock_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"singleton_key" text DEFAULT 'default' NOT NULL,
	"lock_policy" text DEFAULT 'DEFAULT' NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "functional_role_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"capability_key" text NOT NULL,
	"position_id" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interview_pending_ticker_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"days" integer NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "module_access_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"singleton_key" text DEFAULT 'default' NOT NULL,
	"admin_can_access_dossier" boolean DEFAULT false NOT NULL,
	"admin_can_access_bulk_upload" boolean DEFAULT false NOT NULL,
	"admin_can_access_reports" boolean DEFAULT false NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_hierarchy_nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(128) NOT NULL,
	"name" varchar(256) NOT NULL,
	"node_type" "org_hierarchy_node_type" NOT NULL,
	"parent_id" uuid,
	"platoon_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "site_events_news" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"location" text NOT NULL,
	"type" text NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "footer" (
	"footer" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "academic_grading_policy_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"singleton_key" text DEFAULT 'default' NOT NULL,
	"letter_grade_bands" jsonb NOT NULL,
	"grade_point_bands" jsonb NOT NULL,
	"sgpa_formula_template" text DEFAULT 'CREDIT_WEIGHTED' NOT NULL,
	"cgpa_formula_template" text DEFAULT 'CREDIT_WEIGHTED' NOT NULL,
	"rounding_scale" integer DEFAULT 2 NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "academic_grading_policy_rounding_scale_check" CHECK ("academic_grading_policy_settings"."rounding_scale" BETWEEN 0 AND 6),
	CONSTRAINT "academic_grading_policy_sgpa_formula_check" CHECK ("academic_grading_policy_settings"."sgpa_formula_template" IN ('CREDIT_WEIGHTED', 'SEMESTER_AVG')),
	CONSTRAINT "academic_grading_policy_cgpa_formula_check" CHECK ("academic_grading_policy_settings"."cgpa_formula_template" IN ('CREDIT_WEIGHTED', 'SEMESTER_AVG'))
);
--> statement-breakpoint
CREATE TABLE "cadet_appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cadet_id" uuid NOT NULL,
	"platoon_id" uuid NOT NULL,
	"appointment_name" varchar(128) NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"appointed_by" uuid,
	"ended_by" uuid,
	"reason" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marks_workflow_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"event_type" "marks_workflow_event_type" NOT NULL,
	"actor_user_id" uuid,
	"from_status" "marks_workflow_status",
	"to_status" "marks_workflow_status",
	"message" text,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marks_workflow_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"ticket_id" uuid NOT NULL,
	"module" "marks_workflow_module" NOT NULL,
	"actor_user_id" uuid,
	"workflow_status" "marks_workflow_status" NOT NULL,
	"selection_label" text NOT NULL,
	"message" text,
	"deep_link" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marks_workflow_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module" "marks_workflow_module" NOT NULL,
	"data_entry_user_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"verification_user_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"post_verification_override_mode" "marks_workflow_override_mode" DEFAULT 'SUPER_ADMIN_ONLY' NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marks_workflow_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module" "marks_workflow_module" NOT NULL,
	"workflow_key" text NOT NULL,
	"course_id" uuid NOT NULL,
	"semester" integer NOT NULL,
	"subject_id" uuid,
	"subject_label" text,
	"course_label" text,
	"selection_label" text,
	"status" "marks_workflow_status" DEFAULT 'DRAFT' NOT NULL,
	"draft_payload" jsonb NOT NULL,
	"current_revision" integer DEFAULT 1 NOT NULL,
	"submitted_by_user_id" uuid,
	"submitted_at" timestamp with time zone,
	"verified_by_user_id" uuid,
	"verified_at" timestamp with time zone,
	"last_actor_user_id" uuid,
	"last_actor_message" text,
	"draft_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oc_reconciliation_audit" (
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
CREATE TABLE "training_camp_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"singleton_key" varchar(32) DEFAULT 'default' NOT NULL,
	"max_camps_per_semester" integer DEFAULT 2 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_download_versions" (
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
--> statement-breakpoint
ALTER TABLE "dossier_inspections" DROP CONSTRAINT "dossier_inspections_oc_id_oc_cadets_id_fk";
--> statement-breakpoint
ALTER TABLE "oc_interviews" DROP CONSTRAINT "oc_interviews_oc_id_oc_cadets_id_fk";
--> statement-breakpoint
ALTER TABLE "oc_achievements" DROP CONSTRAINT "oc_achievements_oc_id_oc_cadets_id_fk";
--> statement-breakpoint
ALTER TABLE "oc_autobiography" DROP CONSTRAINT "oc_autobiography_oc_id_oc_cadets_id_fk";
--> statement-breakpoint
ALTER TABLE "oc_camps" DROP CONSTRAINT "oc_camps_oc_id_oc_cadets_id_fk";
--> statement-breakpoint
ALTER TABLE "oc_clubs" DROP CONSTRAINT "oc_clubs_oc_id_oc_cadets_id_fk";
--> statement-breakpoint
ALTER TABLE "oc_commissioning" DROP CONSTRAINT "oc_commissioning_oc_id_oc_cadets_id_fk";
--> statement-breakpoint
ALTER TABLE "oc_counselling" DROP CONSTRAINT "oc_counselling_oc_id_oc_cadets_id_fk";
--> statement-breakpoint
ALTER TABLE "oc_course_enrollments" DROP CONSTRAINT "oc_course_enrollments_oc_id_oc_cadets_id_fk";
--> statement-breakpoint
ALTER TABLE "oc_credit_for_excellence" DROP CONSTRAINT "oc_credit_for_excellence_oc_id_oc_cadets_id_fk";
--> statement-breakpoint
ALTER TABLE "oc_delegations" DROP CONSTRAINT "oc_delegations_oc_id_oc_cadets_id_fk";
--> statement-breakpoint
ALTER TABLE "oc_discipline" DROP CONSTRAINT "oc_discipline_oc_id_oc_cadets_id_fk";
--> statement-breakpoint
ALTER TABLE "oc_dossier_filling" DROP CONSTRAINT "oc_dossier_filling_oc_id_oc_cadets_id_fk";
--> statement-breakpoint
ALTER TABLE "oc_drill" DROP CONSTRAINT "oc_drill_oc_id_oc_cadets_id_fk";
--> statement-breakpoint
ALTER TABLE "oc_education" DROP CONSTRAINT "oc_education_oc_id_oc_cadets_id_fk";
--> statement-breakpoint
ALTER TABLE "oc_family_members" DROP CONSTRAINT "oc_family_members_oc_id_oc_cadets_id_fk";
--> statement-breakpoint
ALTER TABLE "oc_images" DROP CONSTRAINT "oc_images_oc_id_oc_cadets_id_fk";
--> statement-breakpoint
ALTER TABLE "oc_medical_category" DROP CONSTRAINT "oc_medical_category_oc_id_oc_cadets_id_fk";
--> statement-breakpoint
ALTER TABLE "oc_medicals" DROP CONSTRAINT "oc_medicals_oc_id_oc_cadets_id_fk";
--> statement-breakpoint
ALTER TABLE "oc_motivation_awards" DROP CONSTRAINT "oc_motivation_awards_oc_id_oc_cadets_id_fk";
--> statement-breakpoint
ALTER TABLE "oc_obstacle_training" DROP CONSTRAINT "oc_obstacle_training_oc_id_oc_cadets_id_fk";
--> statement-breakpoint
ALTER TABLE "oc_olq" DROP CONSTRAINT "oc_olq_oc_id_oc_cadets_id_fk";
--> statement-breakpoint
ALTER TABLE "oc_parent_comms" DROP CONSTRAINT "oc_parent_comms_oc_id_oc_cadets_id_fk";
--> statement-breakpoint
ALTER TABLE "oc_personal" DROP CONSTRAINT "oc_personal_oc_id_oc_cadets_id_fk";
--> statement-breakpoint
ALTER TABLE "oc_pre_commission" DROP CONSTRAINT "oc_pre_commission_oc_id_oc_cadets_id_fk";
--> statement-breakpoint
ALTER TABLE "oc_recording_leave_hike_detention" DROP CONSTRAINT "oc_recording_leave_hike_detention_oc_id_oc_cadets_id_fk";
--> statement-breakpoint
ALTER TABLE "oc_semester_marks" DROP CONSTRAINT "oc_semester_marks_oc_id_oc_cadets_id_fk";
--> statement-breakpoint
ALTER TABLE "oc_special_achievement_in_clubs" DROP CONSTRAINT "oc_special_achievement_in_clubs_oc_id_oc_cadets_id_fk";
--> statement-breakpoint
ALTER TABLE "oc_special_achievement_in_firing" DROP CONSTRAINT "oc_special_achievement_in_firing_oc_id_oc_cadets_id_fk";
--> statement-breakpoint
ALTER TABLE "oc_speed_march" DROP CONSTRAINT "oc_speed_march_oc_id_oc_cadets_id_fk";
--> statement-breakpoint
ALTER TABLE "oc_sports_and_games" DROP CONSTRAINT "oc_sports_and_games_oc_id_oc_cadets_id_fk";
--> statement-breakpoint
ALTER TABLE "oc_spr_records" DROP CONSTRAINT "oc_spr_records_oc_id_oc_cadets_id_fk";
--> statement-breakpoint
ALTER TABLE "oc_ssb_reports" DROP CONSTRAINT "oc_ssb_reports_oc_id_oc_cadets_id_fk";
--> statement-breakpoint
ALTER TABLE "oc_weapon_training" DROP CONSTRAINT "oc_weapon_training_oc_id_oc_cadets_id_fk";
--> statement-breakpoint
ALTER TABLE "oc_relegations" DROP CONSTRAINT "oc_relegations_oc_id_oc_cadets_id_fk";
--> statement-breakpoint
ALTER TABLE "oc_pt_motivation_awards" DROP CONSTRAINT "oc_pt_motivation_awards_oc_id_oc_cadets_id_fk";
--> statement-breakpoint
ALTER TABLE "oc_pt_task_scores" DROP CONSTRAINT "oc_pt_task_scores_oc_id_oc_cadets_id_fk";
--> statement-breakpoint
DROP INDEX "uq_interview_template_code";--> statement-breakpoint
DROP INDEX "uq_training_camp_name_semester";--> statement-breakpoint
DROP INDEX "uq_pt_motivation_field_semester";--> statement-breakpoint
DROP INDEX "uq_pt_type_semester_code";--> statement-breakpoint
ALTER TABLE "training_camps" ALTER COLUMN "semester" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "delegations" ADD COLUMN "grantor_appointment_id" uuid;--> statement-breakpoint
ALTER TABLE "delegations" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "delegations" ADD COLUMN "terminated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "delegations" ADD COLUMN "termination_reason" text;--> statement-breakpoint
ALTER TABLE "dossier_inspections" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "instructors" ADD COLUMN "experience" text;--> statement-breakpoint
ALTER TABLE "instructors" ADD COLUMN "qualification" text;--> statement-breakpoint
ALTER TABLE "instructors" ADD COLUMN "subject_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL;--> statement-breakpoint
ALTER TABLE "oc_interviews" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "interview_templates" ADD COLUMN "course_id" uuid;--> statement-breakpoint
ALTER TABLE "oc_cadets" ADD COLUMN "jnu_enrollment_no" varchar(64);--> statement-breakpoint
ALTER TABLE "oc_cadets" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "oc_course_enrollments" ADD COLUMN "current_semester" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "oc_discipline" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "oc_medical_category" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "oc_medicals" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "oc_parent_comms" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "oc_ssb_reports" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "training_camps" ADD COLUMN "course_id" uuid;--> statement-breakpoint
ALTER TABLE "training_camps" ADD COLUMN "sort_order" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "training_camps" ADD COLUMN "performance_title" text;--> statement-breakpoint
ALTER TABLE "training_camps" ADD COLUMN "performance_guidance" text;--> statement-breakpoint
ALTER TABLE "training_camps" ADD COLUMN "signature_primary_label" varchar(120);--> statement-breakpoint
ALTER TABLE "training_camps" ADD COLUMN "signature_secondary_label" varchar(120);--> statement-breakpoint
ALTER TABLE "training_camps" ADD COLUMN "note_line_1" text;--> statement-breakpoint
ALTER TABLE "training_camps" ADD COLUMN "note_line_2" text;--> statement-breakpoint
ALTER TABLE "training_camps" ADD COLUMN "show_aggregate_summary" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "oc_relegations" ADD COLUMN "from_semester" integer;--> statement-breakpoint
ALTER TABLE "oc_relegations" ADD COLUMN "to_semester" integer;--> statement-breakpoint
ALTER TABLE "pt_motivation_award_fields" ADD COLUMN "course_id" uuid;--> statement-breakpoint
ALTER TABLE "pt_types" ADD COLUMN "course_id" uuid;--> statement-breakpoint
ALTER TABLE "dossier_lock_settings" ADD CONSTRAINT "dossier_lock_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "functional_role_mappings" ADD CONSTRAINT "functional_role_mappings_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "functional_role_mappings" ADD CONSTRAINT "functional_role_mappings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_pending_ticker_settings" ADD CONSTRAINT "interview_pending_ticker_settings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_access_settings" ADD CONSTRAINT "module_access_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_hierarchy_nodes" ADD CONSTRAINT "org_hierarchy_nodes_parent_id_org_hierarchy_nodes_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."org_hierarchy_nodes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_hierarchy_nodes" ADD CONSTRAINT "org_hierarchy_nodes_platoon_id_platoons_id_fk" FOREIGN KEY ("platoon_id") REFERENCES "public"."platoons"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_hierarchy_nodes" ADD CONSTRAINT "org_hierarchy_nodes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_hierarchy_nodes" ADD CONSTRAINT "org_hierarchy_nodes_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_grading_policy_settings" ADD CONSTRAINT "academic_grading_policy_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cadet_appointments" ADD CONSTRAINT "cadet_appointments_cadet_id_oc_cadets_id_fk" FOREIGN KEY ("cadet_id") REFERENCES "public"."oc_cadets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cadet_appointments" ADD CONSTRAINT "cadet_appointments_platoon_id_platoons_id_fk" FOREIGN KEY ("platoon_id") REFERENCES "public"."platoons"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cadet_appointments" ADD CONSTRAINT "cadet_appointments_appointed_by_users_id_fk" FOREIGN KEY ("appointed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cadet_appointments" ADD CONSTRAINT "cadet_appointments_ended_by_users_id_fk" FOREIGN KEY ("ended_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marks_workflow_events" ADD CONSTRAINT "marks_workflow_events_ticket_id_marks_workflow_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."marks_workflow_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marks_workflow_events" ADD CONSTRAINT "marks_workflow_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marks_workflow_notifications" ADD CONSTRAINT "marks_workflow_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marks_workflow_notifications" ADD CONSTRAINT "marks_workflow_notifications_ticket_id_marks_workflow_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."marks_workflow_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marks_workflow_notifications" ADD CONSTRAINT "marks_workflow_notifications_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marks_workflow_settings" ADD CONSTRAINT "marks_workflow_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marks_workflow_tickets" ADD CONSTRAINT "marks_workflow_tickets_submitted_by_user_id_users_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marks_workflow_tickets" ADD CONSTRAINT "marks_workflow_tickets_verified_by_user_id_users_id_fk" FOREIGN KEY ("verified_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marks_workflow_tickets" ADD CONSTRAINT "marks_workflow_tickets_last_actor_user_id_users_id_fk" FOREIGN KEY ("last_actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_reconciliation_audit" ADD CONSTRAINT "oc_reconciliation_audit_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_reconciliation_audit" ADD CONSTRAINT "oc_reconciliation_audit_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_download_versions" ADD CONSTRAINT "report_download_versions_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_dossier_lock_settings_singleton_key" ON "dossier_lock_settings" USING btree ("singleton_key");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_functional_role_mappings_capability_key" ON "functional_role_mappings" USING btree ("capability_key");--> statement-breakpoint
CREATE INDEX "ix_interview_pending_ticker_settings_created_at" ON "interview_pending_ticker_settings" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ix_interview_pending_ticker_settings_created_by" ON "interview_pending_ticker_settings" USING btree ("created_by");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_module_access_settings_singleton_key" ON "module_access_settings" USING btree ("singleton_key");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_org_hierarchy_nodes_key" ON "org_hierarchy_nodes" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_org_hierarchy_nodes_platoon_id" ON "org_hierarchy_nodes" USING btree ("platoon_id");--> statement-breakpoint
CREATE INDEX "ix_site_events_news_active_date" ON "site_events_news" USING btree ("is_deleted","date","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_academic_grading_policy_settings_singleton" ON "academic_grading_policy_settings" USING btree ("singleton_key");--> statement-breakpoint
CREATE INDEX "idx_cadet_appointments_platoon" ON "cadet_appointments" USING btree ("platoon_id","starts_at");--> statement-breakpoint
CREATE INDEX "idx_cadet_appointments_cadet" ON "cadet_appointments" USING btree ("cadet_id","starts_at");--> statement-breakpoint
CREATE INDEX "ix_marks_workflow_events_ticket_created_at" ON "marks_workflow_events" USING btree ("ticket_id","created_at");--> statement-breakpoint
CREATE INDEX "ix_marks_workflow_notifications_user_read_created_at" ON "marks_workflow_notifications" USING btree ("user_id","read_at","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_marks_workflow_settings_module" ON "marks_workflow_settings" USING btree ("module");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_marks_workflow_tickets_module_key" ON "marks_workflow_tickets" USING btree ("module","workflow_key");--> statement-breakpoint
CREATE INDEX "ix_marks_workflow_tickets_module_course_semester" ON "marks_workflow_tickets" USING btree ("module","course_id","semester");--> statement-breakpoint
CREATE INDEX "idx_oc_reconciliation_audit_oc_created" ON "oc_reconciliation_audit" USING btree ("oc_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_oc_reconciliation_audit_conflict_type" ON "oc_reconciliation_audit" USING btree ("conflict_type");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_training_camp_settings_singleton" ON "training_camp_settings" USING btree ("singleton_key");--> statement-breakpoint
CREATE INDEX "idx_report_download_versions_generated_at" ON "report_download_versions" USING btree ("generated_at");--> statement-breakpoint
CREATE INDEX "idx_report_download_versions_report_type" ON "report_download_versions" USING btree ("report_type");--> statement-breakpoint
CREATE INDEX "idx_report_download_versions_requested_by" ON "report_download_versions" USING btree ("requested_by_user_id");--> statement-breakpoint
CREATE INDEX "idx_report_download_versions_batch" ON "report_download_versions" USING btree ("batch_id");--> statement-breakpoint
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_grantor_appointment_id_appointments_id_fk" FOREIGN KEY ("grantor_appointment_id") REFERENCES "public"."appointments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dossier_inspections" ADD CONSTRAINT "dossier_inspections_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_interviews" ADD CONSTRAINT "oc_interviews_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_templates" ADD CONSTRAINT "interview_templates_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_achievements" ADD CONSTRAINT "oc_achievements_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_autobiography" ADD CONSTRAINT "oc_autobiography_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_camps" ADD CONSTRAINT "oc_camps_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_clubs" ADD CONSTRAINT "oc_clubs_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_commissioning" ADD CONSTRAINT "oc_commissioning_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_counselling" ADD CONSTRAINT "oc_counselling_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_course_enrollments" ADD CONSTRAINT "oc_course_enrollments_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_credit_for_excellence" ADD CONSTRAINT "oc_credit_for_excellence_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_delegations" ADD CONSTRAINT "oc_delegations_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_discipline" ADD CONSTRAINT "oc_discipline_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_dossier_filling" ADD CONSTRAINT "oc_dossier_filling_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_drill" ADD CONSTRAINT "oc_drill_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_education" ADD CONSTRAINT "oc_education_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_family_members" ADD CONSTRAINT "oc_family_members_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_images" ADD CONSTRAINT "oc_images_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_medical_category" ADD CONSTRAINT "oc_medical_category_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_medicals" ADD CONSTRAINT "oc_medicals_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_motivation_awards" ADD CONSTRAINT "oc_motivation_awards_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_obstacle_training" ADD CONSTRAINT "oc_obstacle_training_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_olq" ADD CONSTRAINT "oc_olq_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_parent_comms" ADD CONSTRAINT "oc_parent_comms_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_personal" ADD CONSTRAINT "oc_personal_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_pre_commission" ADD CONSTRAINT "oc_pre_commission_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_recording_leave_hike_detention" ADD CONSTRAINT "oc_recording_leave_hike_detention_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_semester_marks" ADD CONSTRAINT "oc_semester_marks_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_special_achievement_in_clubs" ADD CONSTRAINT "oc_special_achievement_in_clubs_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_special_achievement_in_firing" ADD CONSTRAINT "oc_special_achievement_in_firing_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_speed_march" ADD CONSTRAINT "oc_speed_march_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_sports_and_games" ADD CONSTRAINT "oc_sports_and_games_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_spr_records" ADD CONSTRAINT "oc_spr_records_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_ssb_reports" ADD CONSTRAINT "oc_ssb_reports_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_weapon_training" ADD CONSTRAINT "oc_weapon_training_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_camps" ADD CONSTRAINT "training_camps_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_relegations" ADD CONSTRAINT "oc_relegations_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pt_motivation_award_fields" ADD CONSTRAINT "pt_motivation_award_fields_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pt_types" ADD CONSTRAINT "pt_types_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_pt_motivation_awards" ADD CONSTRAINT "oc_pt_motivation_awards_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_pt_task_scores" ADD CONSTRAINT "oc_pt_task_scores_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_interview_template_course_code" ON "interview_templates" USING btree ("course_id","code");--> statement-breakpoint
CREATE INDEX "idx_interview_template_course_sort" ON "interview_templates" USING btree ("course_id","sort_order");--> statement-breakpoint
CREATE INDEX "idx_oc_cadets_active_course_platoon_created" ON "oc_cadets" USING btree ("course_id","platoon_id","created_at") WHERE "oc_cadets"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "idx_oc_course_enrollment_course_status_semester" ON "oc_course_enrollments" USING btree ("course_id","status","current_semester");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_training_camp_name_course_semester" ON "training_camps" USING btree ("course_id","name","semester");--> statement-breakpoint
CREATE INDEX "idx_training_camp_course_semester_sort_name" ON "training_camps" USING btree ("course_id","semester","sort_order","name");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_pt_motivation_field_course_semester" ON "pt_motivation_award_fields" USING btree ("course_id","semester","label");--> statement-breakpoint
CREATE INDEX "idx_pt_motivation_field_course_semester_sort" ON "pt_motivation_award_fields" USING btree ("course_id","semester","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_pt_type_course_semester_code" ON "pt_types" USING btree ("course_id","semester","code");--> statement-breakpoint
CREATE INDEX "idx_pt_type_course_semester_sort" ON "pt_types" USING btree ("course_id","semester","sort_order");--> statement-breakpoint
DROP TYPE "public"."camp_semester_kind";