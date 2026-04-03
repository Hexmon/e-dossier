DO $$ BEGIN
  CREATE TYPE "public"."marks_workflow_module" AS ENUM('ACADEMICS_BULK', 'PT_BULK');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."marks_workflow_status" AS ENUM('DRAFT', 'PENDING_VERIFICATION', 'CHANGES_REQUESTED', 'VERIFIED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."marks_workflow_event_type" AS ENUM('SAVE_DRAFT', 'SUBMIT_FOR_VERIFICATION', 'REQUEST_CHANGES', 'VERIFY_AND_PUBLISH', 'OVERRIDE_PUBLISH');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."marks_workflow_override_mode" AS ENUM('SUPER_ADMIN_ONLY', 'ADMIN_AND_SUPER_ADMIN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "marks_workflow_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "module" "marks_workflow_module" NOT NULL,
  "data_entry_user_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "verification_user_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "post_verification_override_mode" "marks_workflow_override_mode" DEFAULT 'SUPER_ADMIN_ONLY' NOT NULL,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "marks_workflow_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "marks_workflow_tickets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "module" "marks_workflow_module" NOT NULL,
  "workflow_key" text NOT NULL,
  "course_id" uuid NOT NULL,
  "semester" integer NOT NULL,
  "subject_id" uuid,
  "subject_label" text,
  "course_label" text,
  "selection_label" text,
  "status" "marks_workflow_status" DEFAULT 'DRAFT' NOT NULL,
  "draft_payload" jsonb NOT NULL,
  "current_revision" integer DEFAULT 1 NOT NULL,
  "submitted_by_user_id" uuid,
  "submitted_at" timestamp with time zone,
  "verified_by_user_id" uuid,
  "verified_at" timestamp with time zone,
  "last_actor_user_id" uuid,
  "last_actor_message" text,
  "draft_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "marks_workflow_tickets_submitted_by_user_id_users_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action,
  CONSTRAINT "marks_workflow_tickets_verified_by_user_id_users_id_fk" FOREIGN KEY ("verified_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action,
  CONSTRAINT "marks_workflow_tickets_last_actor_user_id_users_id_fk" FOREIGN KEY ("last_actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "marks_workflow_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ticket_id" uuid NOT NULL,
  "event_type" "marks_workflow_event_type" NOT NULL,
  "actor_user_id" uuid,
  "from_status" "marks_workflow_status",
  "to_status" "marks_workflow_status",
  "message" text,
  "payload" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "marks_workflow_events_ticket_id_marks_workflow_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."marks_workflow_tickets"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "marks_workflow_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "marks_workflow_notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "ticket_id" uuid NOT NULL,
  "module" "marks_workflow_module" NOT NULL,
  "actor_user_id" uuid,
  "workflow_status" "marks_workflow_status" NOT NULL,
  "selection_label" text NOT NULL,
  "message" text,
  "deep_link" text NOT NULL,
  "read_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "marks_workflow_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "marks_workflow_notifications_ticket_id_marks_workflow_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."marks_workflow_tickets"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "marks_workflow_notifications_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "uq_marks_workflow_settings_module" ON "marks_workflow_settings" USING btree ("module");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_marks_workflow_tickets_module_key" ON "marks_workflow_tickets" USING btree ("module", "workflow_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_marks_workflow_tickets_module_course_semester" ON "marks_workflow_tickets" USING btree ("module", "course_id", "semester");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_marks_workflow_events_ticket_created_at" ON "marks_workflow_events" USING btree ("ticket_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_marks_workflow_notifications_user_read_created_at" ON "marks_workflow_notifications" USING btree ("user_id", "read_at", "created_at");--> statement-breakpoint
