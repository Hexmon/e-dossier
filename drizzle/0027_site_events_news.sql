CREATE TABLE IF NOT EXISTS "site_events_news" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "date" date NOT NULL,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "location" text NOT NULL,
  "type" text NOT NULL,
  "is_deleted" boolean DEFAULT false NOT NULL,
  "deleted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_site_events_news_active_date" ON "site_events_news" USING btree ("is_deleted","date","created_at");--> statement-breakpoint
