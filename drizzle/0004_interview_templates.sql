CREATE TABLE "interview_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(32) NOT NULL,
	"title" varchar(160) NOT NULL,
	"description" text,
	"allow_multiple" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "interview_template_semesters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"semester" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interview_template_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"title" varchar(160) NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "interview_template_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"section_id" uuid,
	"title" varchar(160) NOT NULL,
	"min_rows" integer DEFAULT 0 NOT NULL,
	"max_rows" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "interview_template_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"section_id" uuid,
	"group_id" uuid,
	"key" varchar(64) NOT NULL,
	"label" varchar(160) NOT NULL,
	"field_type" varchar(32) NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"help_text" text,
	"max_length" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"capture_filed_at" boolean DEFAULT true NOT NULL,
	"capture_signature" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "interview_template_field_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"field_id" uuid NOT NULL,
	"code" varchar(32) NOT NULL,
	"label" varchar(160) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "interview_template_semesters" ADD CONSTRAINT "interview_template_semesters_template_id_interview_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."interview_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_template_sections" ADD CONSTRAINT "interview_template_sections_template_id_interview_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."interview_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_template_groups" ADD CONSTRAINT "interview_template_groups_template_id_interview_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."interview_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_template_groups" ADD CONSTRAINT "interview_template_groups_section_id_interview_template_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."interview_template_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_template_fields" ADD CONSTRAINT "interview_template_fields_template_id_interview_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."interview_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_template_fields" ADD CONSTRAINT "interview_template_fields_section_id_interview_template_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."interview_template_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_template_fields" ADD CONSTRAINT "interview_template_fields_group_id_interview_template_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."interview_template_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_template_field_options" ADD CONSTRAINT "interview_template_field_options_field_id_interview_template_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."interview_template_fields"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_interview_template_code" ON "interview_templates" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_interview_template_semester" ON "interview_template_semesters" USING btree ("template_id","semester");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_interview_template_field_key" ON "interview_template_fields" USING btree ("template_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_interview_field_option_code" ON "interview_template_field_options" USING btree ("field_id","code");
