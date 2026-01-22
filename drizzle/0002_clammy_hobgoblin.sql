CREATE TABLE "pt_attempt_grades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pt_attempt_id" uuid NOT NULL,
	"code" varchar(8) NOT NULL,
	"label" varchar(64) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "pt_motivation_award_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"semester" integer NOT NULL,
	"label" varchar(160) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "pt_task_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pt_task_id" uuid NOT NULL,
	"pt_attempt_id" uuid NOT NULL,
	"pt_attempt_grade_id" uuid NOT NULL,
	"max_marks" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pt_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pt_type_id" uuid NOT NULL,
	"title" varchar(160) NOT NULL,
	"max_marks" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "pt_type_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pt_type_id" uuid NOT NULL,
	"code" varchar(16) NOT NULL,
	"label" varchar(64) NOT NULL,
	"is_compensatory" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "pt_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"semester" integer NOT NULL,
	"code" varchar(32) NOT NULL,
	"title" varchar(160) NOT NULL,
	"description" text,
	"max_total_marks" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "pt_attempt_grades" ADD CONSTRAINT "pt_attempt_grades_pt_attempt_id_pt_type_attempts_id_fk" FOREIGN KEY ("pt_attempt_id") REFERENCES "public"."pt_type_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pt_task_scores" ADD CONSTRAINT "pt_task_scores_pt_task_id_pt_tasks_id_fk" FOREIGN KEY ("pt_task_id") REFERENCES "public"."pt_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pt_task_scores" ADD CONSTRAINT "pt_task_scores_pt_attempt_id_pt_type_attempts_id_fk" FOREIGN KEY ("pt_attempt_id") REFERENCES "public"."pt_type_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pt_task_scores" ADD CONSTRAINT "pt_task_scores_pt_attempt_grade_id_pt_attempt_grades_id_fk" FOREIGN KEY ("pt_attempt_grade_id") REFERENCES "public"."pt_attempt_grades"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pt_tasks" ADD CONSTRAINT "pt_tasks_pt_type_id_pt_types_id_fk" FOREIGN KEY ("pt_type_id") REFERENCES "public"."pt_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pt_type_attempts" ADD CONSTRAINT "pt_type_attempts_pt_type_id_pt_types_id_fk" FOREIGN KEY ("pt_type_id") REFERENCES "public"."pt_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_pt_grade_per_attempt" ON "pt_attempt_grades" USING btree ("pt_attempt_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_pt_motivation_field_semester" ON "pt_motivation_award_fields" USING btree ("semester","label");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_pt_task_attempt_grade" ON "pt_task_scores" USING btree ("pt_task_id","pt_attempt_id","pt_attempt_grade_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_pt_attempt_per_type" ON "pt_type_attempts" USING btree ("pt_type_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_pt_type_semester_code" ON "pt_types" USING btree ("semester","code");