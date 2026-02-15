CREATE TYPE "public"."field_rule_mode" AS ENUM('ALLOW', 'DENY', 'OMIT', 'MASK');--> statement-breakpoint
CREATE TABLE "device_site_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" varchar(128) NOT NULL,
	"theme" varchar(16) DEFAULT 'system' NOT NULL,
	"theme_preset" varchar(32) DEFAULT 'navy-steel' NOT NULL,
	"accent_palette" varchar(16) DEFAULT 'blue' NOT NULL,
	"language" varchar(16) DEFAULT 'en' NOT NULL,
	"timezone" varchar(64) DEFAULT 'Asia/Kolkata' NOT NULL,
	"refresh_interval" integer DEFAULT 60 NOT NULL,
	"layout_density" varchar(16) DEFAULT 'comfortable' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "authz_policy_state" (
	"key" varchar(64) PRIMARY KEY NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permission_field_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"permission_id" uuid NOT NULL,
	"position_id" uuid,
	"role_id" uuid,
	"mode" "field_rule_mode" DEFAULT 'ALLOW' NOT NULL,
	"fields" text[] DEFAULT '{}'::text[] NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_permission_field_rules_scope" CHECK (("permission_field_rules"."position_id" IS NOT NULL OR "permission_field_rules"."role_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "site_awards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"image_url" text,
	"image_object_key" text,
	"category" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_commanders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"designation" text DEFAULT '' NOT NULL,
	"image_url" text,
	"image_object_key" text,
	"tenure" text NOT NULL,
	"description" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year_or_date" text NOT NULL,
	"description" text NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"singleton_key" text DEFAULT 'default' NOT NULL,
	"logo_url" text,
	"logo_object_key" text,
	"hero_title" text DEFAULT 'MCEME' NOT NULL,
	"hero_description" text DEFAULT 'Training Excellence for Officer Cadets (OCs) at the Military College of Electronics & Mechanical Engineering' NOT NULL,
	"commanders_section_title" text DEFAULT 'Commander''s Corner' NOT NULL,
	"awards_section_title" text DEFAULT 'Gallantry Awards' NOT NULL,
	"history_section_title" text DEFAULT 'Our History' NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oc_relegations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oc_id" uuid NOT NULL,
	"from_course_id" uuid NOT NULL,
	"from_course_code" varchar(32) NOT NULL,
	"to_course_id" uuid NOT NULL,
	"to_course_code" varchar(32) NOT NULL,
	"reason" text NOT NULL,
	"remark" text,
	"pdf_object_key" varchar(512),
	"pdf_url" text,
	"performed_by_user_id" uuid NOT NULL,
	"performed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "oc_medicals" ALTER COLUMN "age" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "oc_medicals" ALTER COLUMN "height_cm" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "oc_medicals" ALTER COLUMN "ibw_kg" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "oc_medicals" ALTER COLUMN "abw_kg" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "oc_medicals" ALTER COLUMN "overwt_pct" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "oc_medicals" ALTER COLUMN "bmi" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "oc_medicals" ALTER COLUMN "chest_cm" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "oc_education" ADD COLUMN "grade" varchar(32);--> statement-breakpoint
ALTER TABLE "device_site_settings" ADD CONSTRAINT "device_site_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_field_rules" ADD CONSTRAINT "permission_field_rules_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_field_rules" ADD CONSTRAINT "permission_field_rules_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_field_rules" ADD CONSTRAINT "permission_field_rules_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_relegations" ADD CONSTRAINT "oc_relegations_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_relegations" ADD CONSTRAINT "oc_relegations_from_course_id_courses_id_fk" FOREIGN KEY ("from_course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_relegations" ADD CONSTRAINT "oc_relegations_to_course_id_courses_id_fk" FOREIGN KEY ("to_course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_relegations" ADD CONSTRAINT "oc_relegations_performed_by_user_id_users_id_fk" FOREIGN KEY ("performed_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_device_site_settings_device_id" ON "device_site_settings" USING btree ("device_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_permission_field_rules_scope" ON "permission_field_rules" USING btree ("permission_id","position_id","role_id","mode");--> statement-breakpoint
CREATE INDEX "ix_site_awards_active_sort" ON "site_awards" USING btree ("is_deleted","sort_order");--> statement-breakpoint
CREATE INDEX "ix_site_commanders_active_sort" ON "site_commanders" USING btree ("is_deleted","sort_order");--> statement-breakpoint
CREATE INDEX "ix_site_history_active_created_at" ON "site_history" USING btree ("is_deleted","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_site_settings_singleton_key" ON "site_settings" USING btree ("singleton_key");--> statement-breakpoint
CREATE INDEX "idx_oc_relegations_oc_performed_at" ON "oc_relegations" USING btree ("oc_id","performed_at");--> statement-breakpoint
CREATE INDEX "idx_oc_relegations_from_course" ON "oc_relegations" USING btree ("from_course_id");--> statement-breakpoint
CREATE INDEX "idx_oc_relegations_to_course" ON "oc_relegations" USING btree ("to_course_id");