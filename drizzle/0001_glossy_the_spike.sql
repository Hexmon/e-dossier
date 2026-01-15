CREATE TABLE "dossier_inspections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oc_id" uuid NOT NULL,
	"inspector_user_id" uuid NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "oc_dossier_filling" (
	"oc_id" uuid PRIMARY KEY NOT NULL,
	"initiated_by" varchar(160),
	"opened_on" timestamp with time zone,
	"initial_interview" text,
	"closed_by" varchar(160),
	"closed_on" timestamp with time zone,
	"final_interview" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dossier_inspections" ADD CONSTRAINT "dossier_inspections_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dossier_inspections" ADD CONSTRAINT "dossier_inspections_inspector_user_id_users_id_fk" FOREIGN KEY ("inspector_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oc_dossier_filling" ADD CONSTRAINT "oc_dossier_filling_oc_id_oc_cadets_id_fk" FOREIGN KEY ("oc_id") REFERENCES "public"."oc_cadets"("id") ON DELETE cascade ON UPDATE no action;