CREATE TABLE "oc_pt_motivation_awards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oc_id" uuid NOT NULL,
	"semester" integer NOT NULL,
	"pt_motivation_field_id" uuid NOT NULL,
	"value" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oc_pt_task_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oc_id" uuid NOT NULL,
	"semester" integer NOT NULL,
	"pt_task_score_id" uuid NOT NULL,
	"marks_scored" integer NOT NULL,
	"remark" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "oc_pt_motivation_awards" ADD CONSTRAINT "oc_pt_motivation_awards_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_pt_motivation_awards" ADD CONSTRAINT "oc_pt_motivation_awards_pt_motivation_field_id_pt_motivation_award_fields_id_fk" FOREIGN KEY ("pt_motivation_field_id") REFERENCES "public"."pt_motivation_award_fields"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_pt_task_scores" ADD CONSTRAINT "oc_pt_task_scores_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_pt_task_scores" ADD CONSTRAINT "oc_pt_task_scores_pt_task_score_id_pt_task_scores_id_fk" FOREIGN KEY ("pt_task_score_id") REFERENCES "public"."pt_task_scores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_oc_pt_motivation_field" ON "oc_pt_motivation_awards" USING btree ("oc_id","pt_motivation_field_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_oc_pt_task_score" ON "oc_pt_task_scores" USING btree ("oc_id","pt_task_score_id");