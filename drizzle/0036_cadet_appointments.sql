CREATE TABLE IF NOT EXISTS "cadet_appointments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "cadet_id" uuid NOT NULL,
  "platoon_id" uuid NOT NULL,
  "appointment_name" varchar(128) NOT NULL,
  "starts_at" timestamp with time zone NOT NULL,
  "ends_at" timestamp with time zone,
  "appointed_by" uuid,
  "ended_by" uuid,
  "reason" text,
  "deleted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'cadet_appointments_cadet_id_oc_cadets_id_fk'
          AND conrelid = 'public.cadet_appointments'::regclass
    ) THEN
        ALTER TABLE "cadet_appointments"
        ADD CONSTRAINT "cadet_appointments_cadet_id_oc_cadets_id_fk"
        FOREIGN KEY ("cadet_id") REFERENCES "public"."oc_cadets"("id") ON DELETE restrict ON UPDATE no action;
    END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'cadet_appointments_platoon_id_platoons_id_fk'
          AND conrelid = 'public.cadet_appointments'::regclass
    ) THEN
        ALTER TABLE "cadet_appointments"
        ADD CONSTRAINT "cadet_appointments_platoon_id_platoons_id_fk"
        FOREIGN KEY ("platoon_id") REFERENCES "public"."platoons"("id") ON DELETE restrict ON UPDATE no action;
    END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'cadet_appointments_appointed_by_users_id_fk'
          AND conrelid = 'public.cadet_appointments'::regclass
    ) THEN
        ALTER TABLE "cadet_appointments"
        ADD CONSTRAINT "cadet_appointments_appointed_by_users_id_fk"
        FOREIGN KEY ("appointed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'cadet_appointments_ended_by_users_id_fk'
          AND conrelid = 'public.cadet_appointments'::regclass
    ) THEN
        ALTER TABLE "cadet_appointments"
        ADD CONSTRAINT "cadet_appointments_ended_by_users_id_fk"
        FOREIGN KEY ("ended_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cadet_appointments_platoon"
  ON "cadet_appointments" ("platoon_id", "starts_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cadet_appointments_cadet"
  ON "cadet_appointments" ("cadet_id", "starts_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_cadet_appointments_active_name_per_platoon"
  ON "cadet_appointments" (lower("appointment_name"), "platoon_id")
  WHERE "deleted_at" IS NULL AND "ends_at" IS NULL;
