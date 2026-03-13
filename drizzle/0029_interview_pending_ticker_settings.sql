CREATE TABLE IF NOT EXISTS "interview_pending_ticker_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "start_date" date NOT NULL,
  "end_date" date NOT NULL,
  "days" integer NOT NULL,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "interview_pending_ticker_settings_days_non_negative" CHECK ("days" >= 0),
  CONSTRAINT "interview_pending_ticker_settings_valid_date_range" CHECK ("end_date" >= "start_date")
);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "interview_pending_ticker_settings" ADD CONSTRAINT "interview_pending_ticker_settings_created_by_users_id_fk"
 FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_interview_pending_ticker_settings_created_at" ON "interview_pending_ticker_settings" USING btree ("created_at" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_interview_pending_ticker_settings_created_by" ON "interview_pending_ticker_settings" USING btree ("created_by");
