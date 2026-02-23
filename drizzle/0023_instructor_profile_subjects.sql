ALTER TABLE "instructors" ADD COLUMN "experience" text;--> statement-breakpoint
ALTER TABLE "instructors" ADD COLUMN "qualification" text;--> statement-breakpoint
ALTER TABLE "instructors" ADD COLUMN "subject_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL;
