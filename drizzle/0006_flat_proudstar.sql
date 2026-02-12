CREATE TABLE "audit_events" (
	"event_id" text PRIMARY KEY NOT NULL,
	"schema_version" integer NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"action" text NOT NULL,
	"outcome" text NOT NULL,
	"actor_id" text NOT NULL,
	"actor_type" text NOT NULL,
	"actor_display_name" text,
	"actor_roles" text[],
	"actor_ip" text,
	"actor_user_agent" text,
	"target_id" text,
	"target_type" text,
	"target_display_name" text,
	"tenant_id" text,
	"org_id" text,
	"target" jsonb,
	"context" jsonb,
	"metadata" jsonb,
	"diff" jsonb,
	"integrity" jsonb,
	"retention_tag" text,
	"metadata_truncated" boolean DEFAULT false,
	"diff_truncated" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "oc_spr_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oc_id" uuid NOT NULL,
	"semester" integer NOT NULL,
	"cdr_marks" numeric DEFAULT 0 NOT NULL,
	"subject_remarks" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"platoon_commander_remarks" text,
	"deputy_commander_remarks" text,
	"commander_remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "oc_education" ALTER COLUMN "total_percent" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "oc_credit_for_excellence" ADD COLUMN "sub_category" varchar(160);--> statement-breakpoint
ALTER TABLE "oc_discipline" ADD COLUMN "number_of_punishments" integer;--> statement-breakpoint
ALTER TABLE "oc_spr_records" ADD CONSTRAINT "oc_spr_records_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_oc_spr_record" ON "oc_spr_records" USING btree ("oc_id","semester");