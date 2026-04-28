CREATE TABLE "dossier_lock_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"singleton_key" text DEFAULT 'default' NOT NULL,
	"lock_policy" text DEFAULT 'DEFAULT' NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dossier_lock_settings" ADD CONSTRAINT "dossier_lock_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_dossier_lock_settings_singleton_key" ON "dossier_lock_settings" USING btree ("singleton_key");
--> statement-breakpoint
ALTER TABLE "oc_course_enrollments" ADD COLUMN "current_semester" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "oc_relegations" ADD COLUMN "from_semester" integer;
--> statement-breakpoint
ALTER TABLE "oc_relegations" ADD COLUMN "to_semester" integer;
--> statement-breakpoint
ALTER TABLE "oc_course_enrollments" ADD CONSTRAINT "oc_course_enrollments_current_semester_check" CHECK ("current_semester" BETWEEN 1 AND 6);
--> statement-breakpoint
CREATE INDEX "idx_oc_course_enrollment_course_status_semester" ON "oc_course_enrollments" USING btree ("course_id","status","current_semester");
--> statement-breakpoint
UPDATE "oc_course_enrollments"
SET "current_semester" = 1
WHERE "status" = 'ACTIVE';
