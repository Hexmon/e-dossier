CREATE TYPE "public"."assignment_kind" AS ENUM('PRIMARY', 'OFFICIATING');--> statement-breakpoint
CREATE TYPE "public"."position_type" AS ENUM('COMMANDANT', 'DEPUTY_COMMANDANT', 'HOAT', 'DEPUTY_SECRETARY', 'PLATOON_COMMANDER', 'CCO', 'ADMIN', 'SUPER_ADMIN');--> statement-breakpoint
CREATE TYPE "public"."scope_type" AS ENUM('GLOBAL', 'PLATOON');--> statement-breakpoint
CREATE TYPE "public"."branch_kind" AS ENUM('O', 'E', 'M');--> statement-breakpoint
CREATE TYPE "public"."comm_mode_kind" AS ENUM('LETTER', 'PHONE', 'EMAIL', 'IN_PERSON', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."delegation_kind" AS ENUM('MEDICAL', 'DISCIPLINARY', 'ACADEMIC', 'ADMIN', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."oc_status_kind" AS ENUM('ACTIVE', 'DELEGATED', 'WITHDRAWN', 'PASSED_OUT');--> statement-breakpoint
CREATE TYPE "public"."ssb_point_kind" AS ENUM('POSITIVE', 'NEGATIVE');--> statement-breakpoint
CREATE TABLE "appointment_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_appointment_id" uuid NOT NULL,
	"to_appointment_id" uuid NOT NULL,
	"from_user_id" uuid NOT NULL,
	"to_user_id" uuid NOT NULL,
	"position_id" uuid NOT NULL,
	"scope_type" text NOT NULL,
	"scope_id" uuid,
	"prev_starts_at" timestamp with time zone NOT NULL,
	"prev_ends_at" timestamp with time zone NOT NULL,
	"new_starts_at" timestamp with time zone NOT NULL,
	"reason" text,
	"transferred_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"position_id" uuid NOT NULL,
	"assignment" "assignment_kind" DEFAULT 'PRIMARY' NOT NULL,
	"scope_type" "scope_type" DEFAULT 'GLOBAL' NOT NULL,
	"scope_id" uuid,
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
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"event_type" varchar(96) NOT NULL,
	"resource_type" varchar(96) NOT NULL,
	"resource_id" uuid,
	"description" text,
	"metadata" jsonb,
	"ip_addr" varchar(64),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credentials_local" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"password_hash" text NOT NULL,
	"password_algo" text DEFAULT 'argon2id' NOT NULL,
	"password_updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delegations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grantor_user_id" uuid NOT NULL,
	"grantee_user_id" uuid NOT NULL,
	"act_as_position_id" uuid,
	"scope_type" "scope_type" DEFAULT 'GLOBAL' NOT NULL,
	"scope_id" uuid,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"reason" text,
	"terminated_by" uuid,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platoons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(64) NOT NULL,
	"name" varchar(128) NOT NULL,
	"about" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(64) NOT NULL,
	"display_name" varchar(128),
	"default_scope" varchar(16) NOT NULL,
	"singleton" boolean DEFAULT true NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "positions_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(128) NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "position_permissions" (
	"position_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	CONSTRAINT "position_permissions_position_id_permission_id_pk" PRIMARY KEY("position_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "signup_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"note" text,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" uuid,
	"admin_reason" text,
	"payload" jsonb
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(64) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(32) NOT NULL,
	"name" varchar(120) NOT NULL,
	"rank" varchar(64) NOT NULL,
	"appoint_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"deactivated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "course_offering_instructors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offering_id" uuid NOT NULL,
	"instructor_id" uuid NOT NULL,
	"role" varchar(24) DEFAULT 'PRIMARY' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_offerings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"semester" smallint NOT NULL,
	"include_theory" boolean DEFAULT true NOT NULL,
	"include_practical" boolean DEFAULT false NOT NULL,
	"theory_credits" integer,
	"practical_credits" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(32) NOT NULL,
	"title" varchar(160) NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "instructors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" varchar(160) NOT NULL,
	"email" varchar(255),
	"phone" varchar(32),
	"affiliation" varchar(160),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "oc_achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oc_id" uuid NOT NULL,
	"event" varchar(160) NOT NULL,
	"year" integer,
	"level" varchar(64),
	"prize" varchar(128)
);
--> statement-breakpoint
CREATE TABLE "oc_autobiography" (
	"oc_id" uuid PRIMARY KEY NOT NULL,
	"general_self" text,
	"proficiency_sports" text,
	"achievements_note" text,
	"areas_to_work" text,
	"additional_info" text,
	"filled_on" timestamp with time zone,
	"platoon_commander_name" varchar(160)
);
--> statement-breakpoint
CREATE TABLE "oc_cadets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oc_no" varchar(32) NOT NULL,
	"uid" varchar(64) NOT NULL,
	"name" varchar(160) NOT NULL,
	"course_id" uuid NOT NULL,
	"branch" "branch_kind" DEFAULT 'O',
	"platoon_id" uuid,
	"arrival_at_university" timestamp with time zone NOT NULL,
	"status" "oc_status_kind" DEFAULT 'ACTIVE' NOT NULL,
	"manager_user_id" uuid,
	"relegated_to_course_id" uuid,
	"relegated_on" timestamp with time zone,
	"withdrawn_on" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oc_commissioning" (
	"oc_id" uuid PRIMARY KEY NOT NULL,
	"pass_out_date" timestamp with time zone,
	"ic_no" varchar(48),
	"order_of_merit" integer,
	"regiment_or_arm" varchar(128),
	"posted_unit" text
);
--> statement-breakpoint
CREATE TABLE "oc_delegations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oc_id" uuid NOT NULL,
	"from_course_id" uuid NOT NULL,
	"to_course_id" uuid NOT NULL,
	"reason" text,
	"kind" "delegation_kind" DEFAULT 'OTHER' NOT NULL,
	"decided_on" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_by_user_id" uuid
);
--> statement-breakpoint
CREATE TABLE "oc_discipline" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oc_id" uuid NOT NULL,
	"semester" integer NOT NULL,
	"date_of_offence" timestamp with time zone NOT NULL,
	"offence" text NOT NULL,
	"punishment_awarded" varchar(160),
	"awarded_on" timestamp with time zone,
	"awarded_by" varchar(160),
	"points_delta" integer DEFAULT 0,
	"points_cumulative" integer
);
--> statement-breakpoint
CREATE TABLE "oc_education" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oc_id" uuid NOT NULL,
	"level" varchar(64) NOT NULL,
	"school_or_college" varchar(160) NOT NULL,
	"board_or_univ" varchar(160),
	"subjects" text,
	"total_percent" integer,
	"per_subject" text
);
--> statement-breakpoint
CREATE TABLE "oc_family_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oc_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"relation" varchar(64) NOT NULL,
	"age" integer,
	"occupation" varchar(128),
	"education" varchar(128),
	"mobile_no" varchar(32)
);
--> statement-breakpoint
CREATE TABLE "oc_medical_category" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oc_id" uuid NOT NULL,
	"semester" integer NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"mos_and_diagnostics" text,
	"cat_from" timestamp with time zone,
	"cat_to" timestamp with time zone,
	"mh_from" timestamp with time zone,
	"mh_to" timestamp with time zone,
	"absence" text,
	"platoon_commander_name" varchar(160)
);
--> statement-breakpoint
CREATE TABLE "oc_medicals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oc_id" uuid NOT NULL,
	"semester" integer NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"age" integer,
	"height_cm" integer,
	"ibw_kg" integer,
	"abw_kg" integer,
	"overwt_pct" integer,
	"bmi" integer,
	"chest_cm" integer,
	"medical_history" text,
	"hereditary_issues" text,
	"allergies" text
);
--> statement-breakpoint
CREATE TABLE "oc_parent_comms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oc_id" uuid NOT NULL,
	"semester" integer NOT NULL,
	"mode" "comm_mode_kind" NOT NULL,
	"letter_no" varchar(64),
	"date" timestamp with time zone NOT NULL,
	"brief" text NOT NULL,
	"platoon_commander_name" varchar(160)
);
--> statement-breakpoint
CREATE TABLE "oc_personal" (
	"oc_id" uuid PRIMARY KEY NOT NULL,
	"visible_ident_marks" text,
	"pi" varchar(64),
	"dob" timestamp with time zone,
	"place_of_birth" varchar(128),
	"domicile" varchar(128),
	"religion" varchar(64),
	"nationality" varchar(64),
	"blood_group" varchar(8),
	"ident_marks" text,
	"mobile_no" varchar(32),
	"email" varchar(255),
	"passport_no" varchar(64),
	"pan_no" varchar(20),
	"aadhaar_no" varchar(16),
	"father_name" varchar(160),
	"father_mobile" varchar(32),
	"father_addr_permanent" text,
	"father_addr_present" text,
	"father_profession" varchar(128),
	"guardian_name" varchar(160),
	"guardian_address" text,
	"monthly_income" integer,
	"nok_details" text,
	"nok_addr_perm" text,
	"nok_addr_present" text,
	"nearest_railway_station" varchar(128),
	"family_in_secunderabad" text,
	"relative_in_armed_forces" text,
	"govt_financial_assistance" boolean DEFAULT false,
	"bank_details" text,
	"iden_card_no" varchar(64),
	"upsc_roll_no" varchar(32),
	"ssb_centre" varchar(64),
	"games" text,
	"hobbies" text,
	"is_swimmer" boolean,
	"languages" text,
	"ds_pi_ss_ic_no" varchar(64),
	"ds_pi_rank" varchar(64),
	"ds_pi_name" varchar(160),
	"ds_pi_unit_arm" varchar(160),
	"ds_pi_mobile" varchar(32),
	"ds_dy_ic_no" varchar(64),
	"ds_dy_rank" varchar(64),
	"ds_dy_name" varchar(160),
	"ds_dy_unit_arm" varchar(160),
	"ds_dy_mobile" varchar(32),
	"ds_cdr_ic_no" varchar(64),
	"ds_cdr_rank" varchar(64),
	"ds_cdr_name" varchar(160),
	"ds_cdr_unit_arm" varchar(160),
	"ds_cdr_mobile" varchar(32)
);
--> statement-breakpoint
CREATE TABLE "oc_pre_commission" (
	"oc_id" uuid PRIMARY KEY NOT NULL,
	"course_id" uuid NOT NULL,
	"branch" "branch_kind" DEFAULT 'O',
	"platoon_id" uuid,
	"relegated_to_course_id" uuid,
	"relegated_on" timestamp with time zone,
	"withdrawn_on" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "oc_ssb_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"kind" "ssb_point_kind" NOT NULL,
	"remark" text NOT NULL,
	"author_user_id" uuid,
	"author_name" varchar(160)
);
--> statement-breakpoint
CREATE TABLE "oc_ssb_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oc_id" uuid NOT NULL,
	"overall_predictive_rating" integer,
	"scope_of_improvement" text
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(32) NOT NULL,
	"name" varchar(160) NOT NULL,
	"branch" varchar(1) NOT NULL,
	"has_theory" boolean DEFAULT true NOT NULL,
	"has_practical" boolean DEFAULT false NOT NULL,
	"default_theory_credits" integer,
	"default_practical_credits" integer,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "appointment_transfers" ADD CONSTRAINT "appointment_transfers_from_appointment_id_appointments_id_fk" FOREIGN KEY ("from_appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_transfers" ADD CONSTRAINT "appointment_transfers_to_appointment_id_appointments_id_fk" FOREIGN KEY ("to_appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_transfers" ADD CONSTRAINT "appointment_transfers_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_transfers" ADD CONSTRAINT "appointment_transfers_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_transfers" ADD CONSTRAINT "appointment_transfers_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_transfers" ADD CONSTRAINT "appointment_transfers_transferred_by_users_id_fk" FOREIGN KEY ("transferred_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_appointed_by_users_id_fk" FOREIGN KEY ("appointed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_ended_by_users_id_fk" FOREIGN KEY ("ended_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credentials_local" ADD CONSTRAINT "credentials_local_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_grantor_user_id_users_id_fk" FOREIGN KEY ("grantor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_grantee_user_id_users_id_fk" FOREIGN KEY ("grantee_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_act_as_position_id_positions_id_fk" FOREIGN KEY ("act_as_position_id") REFERENCES "public"."positions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_scope_id_platoons_id_fk" FOREIGN KEY ("scope_id") REFERENCES "public"."platoons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_terminated_by_users_id_fk" FOREIGN KEY ("terminated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "position_permissions" ADD CONSTRAINT "position_permissions_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "position_permissions" ADD CONSTRAINT "position_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signup_requests" ADD CONSTRAINT "signup_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signup_requests" ADD CONSTRAINT "signup_requests_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_appoint_id_positions_id_fk" FOREIGN KEY ("appoint_id") REFERENCES "public"."positions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_offering_instructors" ADD CONSTRAINT "course_offering_instructors_offering_id_course_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."course_offerings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_offering_instructors" ADD CONSTRAINT "course_offering_instructors_instructor_id_instructors_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."instructors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instructors" ADD CONSTRAINT "instructors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_achievements" ADD CONSTRAINT "oc_achievements_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_autobiography" ADD CONSTRAINT "oc_autobiography_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_cadets" ADD CONSTRAINT "oc_cadets_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_cadets" ADD CONSTRAINT "oc_cadets_platoon_id_platoons_id_fk" FOREIGN KEY ("platoon_id") REFERENCES "public"."platoons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_cadets" ADD CONSTRAINT "oc_cadets_manager_user_id_users_id_fk" FOREIGN KEY ("manager_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_cadets" ADD CONSTRAINT "oc_cadets_relegated_to_course_id_courses_id_fk" FOREIGN KEY ("relegated_to_course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_commissioning" ADD CONSTRAINT "oc_commissioning_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_delegations" ADD CONSTRAINT "oc_delegations_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_delegations" ADD CONSTRAINT "oc_delegations_from_course_id_courses_id_fk" FOREIGN KEY ("from_course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_delegations" ADD CONSTRAINT "oc_delegations_to_course_id_courses_id_fk" FOREIGN KEY ("to_course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_delegations" ADD CONSTRAINT "oc_delegations_decided_by_user_id_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_discipline" ADD CONSTRAINT "oc_discipline_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_education" ADD CONSTRAINT "oc_education_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_family_members" ADD CONSTRAINT "oc_family_members_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_medical_category" ADD CONSTRAINT "oc_medical_category_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_medicals" ADD CONSTRAINT "oc_medicals_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_parent_comms" ADD CONSTRAINT "oc_parent_comms_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_personal" ADD CONSTRAINT "oc_personal_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_pre_commission" ADD CONSTRAINT "oc_pre_commission_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_pre_commission" ADD CONSTRAINT "oc_pre_commission_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_pre_commission" ADD CONSTRAINT "oc_pre_commission_platoon_id_platoons_id_fk" FOREIGN KEY ("platoon_id") REFERENCES "public"."platoons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_pre_commission" ADD CONSTRAINT "oc_pre_commission_relegated_to_course_id_courses_id_fk" FOREIGN KEY ("relegated_to_course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_ssb_points" ADD CONSTRAINT "oc_ssb_points_report_id_oc_ssb_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."oc_ssb_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_ssb_points" ADD CONSTRAINT "oc_ssb_points_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_ssb_reports" ADD CONSTRAINT "oc_ssb_reports_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_platoons_key" ON "platoons" USING btree ("key");--> statement-breakpoint
CREATE INDEX "ix_signup_requests_status" ON "signup_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ix_signup_requests_created_at" ON "signup_requests" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_offering_instructor" ON "course_offering_instructors" USING btree ("offering_id","instructor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_course_offering" ON "course_offerings" USING btree ("course_id","subject_id","semester");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_courses_code_active" ON "courses" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_subjects_code" ON "subjects" USING btree ("code");