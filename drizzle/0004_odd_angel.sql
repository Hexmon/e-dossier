CREATE TYPE "public"."camp_review_role_kind" AS ENUM('OIC', 'PLATOON_COMMANDER', 'HOAT');--> statement-breakpoint
CREATE TYPE "public"."camp_semester_kind" AS ENUM('SEM5', 'SEM6A', 'SEM6B');--> statement-breakpoint
CREATE TYPE "public"."counselling_warning_kind" AS ENUM('RELEGATION', 'WITHDRAWAL', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."leave_record_kind" AS ENUM('HIKE', 'LEAVE', 'DETENTION');--> statement-breakpoint
CREATE TABLE "oc_camp_activity_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oc_camp_id" uuid NOT NULL,
	"training_camp_activity_id" uuid NOT NULL,
	"max_marks" integer NOT NULL,
	"marks_scored" integer NOT NULL,
	"remark" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oc_camp_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oc_camp_id" uuid NOT NULL,
	"role" "camp_review_role_kind" NOT NULL,
	"section_title" varchar(200) NOT NULL,
	"review_text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oc_camps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oc_id" uuid NOT NULL,
	"training_camp_id" uuid NOT NULL,
	"year" integer,
	"total_marks_scored" numeric,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "oc_clubs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oc_id" uuid NOT NULL,
	"semester" integer NOT NULL,
	"club_name" varchar(160) NOT NULL,
	"special_achievement" text,
	"remark" text,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "oc_counselling" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oc_id" uuid NOT NULL,
	"semester" integer NOT NULL,
	"reason" text NOT NULL,
	"nature_of_warning" "counselling_warning_kind" NOT NULL,
	"date" date NOT NULL,
	"warned_by" varchar(160) NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "oc_credit_for_excellence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oc_id" uuid NOT NULL,
	"semester" integer NOT NULL,
	"data" jsonb NOT NULL,
	"remark" text,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "oc_drill" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oc_id" uuid NOT NULL,
	"semester" integer NOT NULL,
	"max_marks" numeric NOT NULL,
	"m1_marks" numeric,
	"m2_marks" numeric,
	"a1c1_marks" numeric,
	"a2c2_marks" numeric,
	"remark" text,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "oc_recording_leave_hike_detention" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oc_id" uuid NOT NULL,
	"semester" integer NOT NULL,
	"reason" text NOT NULL,
	"type" "leave_record_kind" NOT NULL,
	"date_from" date NOT NULL,
	"date_to" date NOT NULL,
	"remark" text,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "oc_special_achievement_in_clubs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oc_id" uuid NOT NULL,
	"achievement" text NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "training_camp_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"training_camp_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"default_max_marks" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_camps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"semester" "camp_semester_kind" NOT NULL,
	"max_total_marks" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "oc_weapon_training" DROP CONSTRAINT "oc_weapon_training_subject_id_subjects_id_fk";
--> statement-breakpoint
ALTER TABLE "oc_sports_and_games" ALTER COLUMN "term" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."term_kind";--> statement-breakpoint
CREATE TYPE "public"."term_kind" AS ENUM('spring', 'autumn');--> statement-breakpoint
ALTER TABLE "oc_sports_and_games" ALTER COLUMN "term" SET DATA TYPE "public"."term_kind" USING "term"::"public"."term_kind";--> statement-breakpoint
ALTER TABLE "oc_weapon_training" ADD COLUMN "subject" varchar(200) NOT NULL;--> statement-breakpoint
ALTER TABLE "oc_camp_activity_scores" ADD CONSTRAINT "oc_camp_activity_scores_oc_camp_id_oc_camps_id_fk" FOREIGN KEY ("oc_camp_id") REFERENCES "public"."oc_camps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_camp_activity_scores" ADD CONSTRAINT "oc_camp_activity_scores_training_camp_activity_id_training_camp_activities_id_fk" FOREIGN KEY ("training_camp_activity_id") REFERENCES "public"."training_camp_activities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_camp_reviews" ADD CONSTRAINT "oc_camp_reviews_oc_camp_id_oc_camps_id_fk" FOREIGN KEY ("oc_camp_id") REFERENCES "public"."oc_camps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_camps" ADD CONSTRAINT "oc_camps_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_camps" ADD CONSTRAINT "oc_camps_training_camp_id_training_camps_id_fk" FOREIGN KEY ("training_camp_id") REFERENCES "public"."training_camps"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_clubs" ADD CONSTRAINT "oc_clubs_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_counselling" ADD CONSTRAINT "oc_counselling_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_credit_for_excellence" ADD CONSTRAINT "oc_credit_for_excellence_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_drill" ADD CONSTRAINT "oc_drill_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_recording_leave_hike_detention" ADD CONSTRAINT "oc_recording_leave_hike_detention_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_special_achievement_in_clubs" ADD CONSTRAINT "oc_special_achievement_in_clubs_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_camp_activities" ADD CONSTRAINT "training_camp_activities_training_camp_id_training_camps_id_fk" FOREIGN KEY ("training_camp_id") REFERENCES "public"."training_camps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_oc_camp_activity" ON "oc_camp_activity_scores" USING btree ("oc_camp_id","training_camp_activity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_oc_camp_review_role" ON "oc_camp_reviews" USING btree ("oc_camp_id","role");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_oc_camp_per_template" ON "oc_camps" USING btree ("oc_id","training_camp_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_oc_cfe_per_semester" ON "oc_credit_for_excellence" USING btree ("oc_id","semester");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_training_camp_name_semester" ON "training_camps" USING btree ("name","semester");--> statement-breakpoint
ALTER TABLE "oc_weapon_training" DROP COLUMN "subject_id";