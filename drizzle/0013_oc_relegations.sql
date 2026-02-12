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
ALTER TABLE "oc_relegations" ADD CONSTRAINT "oc_relegations_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "oc_relegations" ADD CONSTRAINT "oc_relegations_from_course_id_courses_id_fk" FOREIGN KEY ("from_course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "oc_relegations" ADD CONSTRAINT "oc_relegations_to_course_id_courses_id_fk" FOREIGN KEY ("to_course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "oc_relegations" ADD CONSTRAINT "oc_relegations_performed_by_user_id_users_id_fk" FOREIGN KEY ("performed_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_oc_relegations_oc_performed_at" ON "oc_relegations" USING btree ("oc_id","performed_at");
--> statement-breakpoint
CREATE INDEX "idx_oc_relegations_from_course" ON "oc_relegations" USING btree ("from_course_id");
--> statement-breakpoint
CREATE INDEX "idx_oc_relegations_to_course" ON "oc_relegations" USING btree ("to_course_id");
