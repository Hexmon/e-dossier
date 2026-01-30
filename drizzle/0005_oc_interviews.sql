CREATE TABLE "oc_interviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oc_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"semester" integer,
	"course" varchar(160),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oc_interview_field_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interview_id" uuid NOT NULL,
	"field_id" uuid NOT NULL,
	"value_text" text,
	"value_date" date,
	"value_number" integer,
	"value_bool" boolean,
	"value_json" jsonb,
	"filed_at" date,
	"filed_by_name" varchar(160),
	"filed_by_rank" varchar(64),
	"filed_by_appointment" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oc_interview_group_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interview_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"row_index" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oc_interview_group_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"row_id" uuid NOT NULL,
	"field_id" uuid NOT NULL,
	"value_text" text,
	"value_date" date,
	"value_number" integer,
	"value_bool" boolean,
	"value_json" jsonb,
	"filed_at" date,
	"filed_by_name" varchar(160),
	"filed_by_rank" varchar(64),
	"filed_by_appointment" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "oc_interviews" ADD CONSTRAINT "oc_interviews_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_interviews" ADD CONSTRAINT "oc_interviews_template_id_interview_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."interview_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_interview_field_values" ADD CONSTRAINT "oc_interview_field_values_interview_id_oc_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."oc_interviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_interview_field_values" ADD CONSTRAINT "oc_interview_field_values_field_id_interview_template_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."interview_template_fields"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_interview_group_rows" ADD CONSTRAINT "oc_interview_group_rows_interview_id_oc_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."oc_interviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_interview_group_rows" ADD CONSTRAINT "oc_interview_group_rows_group_id_interview_template_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."interview_template_groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_interview_group_values" ADD CONSTRAINT "oc_interview_group_values_row_id_oc_interview_group_rows_id_fk" FOREIGN KEY ("row_id") REFERENCES "public"."oc_interview_group_rows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_interview_group_values" ADD CONSTRAINT "oc_interview_group_values_field_id_interview_template_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."interview_template_fields"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_oc_interview_field" ON "oc_interview_field_values" USING btree ("interview_id","field_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_oc_interview_group_row" ON "oc_interview_group_rows" USING btree ("interview_id","group_id","row_index");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_oc_interview_group_value" ON "oc_interview_group_values" USING btree ("row_id","field_id");
