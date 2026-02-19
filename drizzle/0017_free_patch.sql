DROP INDEX "uq_olq_category_code";--> statement-breakpoint
ALTER TABLE "site_history" ALTER COLUMN "incident_date" SET DATA TYPE date;--> statement-breakpoint
ALTER TABLE "oc_olq_category" ADD COLUMN "course_id" uuid;--> statement-breakpoint
ALTER TABLE "oc_olq_category" ADD CONSTRAINT "oc_olq_category_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_olq_category_course_code_active" ON "oc_olq_category" USING btree ("course_id","code") WHERE "oc_olq_category"."is_active" = true;--> statement-breakpoint
CREATE INDEX "idx_olq_category_course_active_order" ON "oc_olq_category" USING btree ("course_id","is_active","display_order");