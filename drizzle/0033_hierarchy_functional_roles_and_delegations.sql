DO $$ BEGIN
 CREATE TYPE "public"."org_hierarchy_node_type" AS ENUM('ROOT', 'GROUP', 'PLATOON');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "org_hierarchy_nodes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" varchar(128) NOT NULL,
  "name" varchar(256) NOT NULL,
  "node_type" "public"."org_hierarchy_node_type" NOT NULL,
  "parent_id" uuid,
  "platoon_id" uuid,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "functional_role_mappings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "capability_key" text NOT NULL,
  "position_id" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "org_hierarchy_nodes"
 ADD CONSTRAINT "org_hierarchy_nodes_parent_id_org_hierarchy_nodes_id_fk"
 FOREIGN KEY ("parent_id") REFERENCES "public"."org_hierarchy_nodes"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "org_hierarchy_nodes"
 ADD CONSTRAINT "org_hierarchy_nodes_platoon_id_platoons_id_fk"
 FOREIGN KEY ("platoon_id") REFERENCES "public"."platoons"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "org_hierarchy_nodes"
 ADD CONSTRAINT "org_hierarchy_nodes_created_by_users_id_fk"
 FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "org_hierarchy_nodes"
 ADD CONSTRAINT "org_hierarchy_nodes_updated_by_users_id_fk"
 FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "functional_role_mappings"
 ADD CONSTRAINT "functional_role_mappings_position_id_positions_id_fk"
 FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "functional_role_mappings"
 ADD CONSTRAINT "functional_role_mappings_updated_by_users_id_fk"
 FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "uq_org_hierarchy_nodes_key"
  ON "org_hierarchy_nodes" USING btree ("key");
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "uq_org_hierarchy_nodes_platoon_id"
  ON "org_hierarchy_nodes" USING btree ("platoon_id")
  WHERE "platoon_id" IS NOT NULL;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "uq_org_hierarchy_nodes_single_root"
  ON "org_hierarchy_nodes" USING btree ("node_type")
  WHERE "node_type" = 'ROOT' AND "deleted_at" IS NULL;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "uq_functional_role_mappings_capability_key"
  ON "functional_role_mappings" USING btree ("capability_key");
--> statement-breakpoint

ALTER TABLE "delegations"
  ADD COLUMN IF NOT EXISTS "grantor_appointment_id" uuid;
--> statement-breakpoint

ALTER TABLE "delegations"
  ADD COLUMN IF NOT EXISTS "created_by" uuid;
--> statement-breakpoint

ALTER TABLE "delegations"
  ADD COLUMN IF NOT EXISTS "terminated_at" timestamp with time zone;
--> statement-breakpoint

ALTER TABLE "delegations"
  ADD COLUMN IF NOT EXISTS "termination_reason" text;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "delegations"
 ADD CONSTRAINT "delegations_grantor_appointment_id_appointments_id_fk"
 FOREIGN KEY ("grantor_appointment_id") REFERENCES "public"."appointments"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "delegations"
 ADD CONSTRAINT "delegations_created_by_users_id_fk"
 FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

WITH root_node AS (
  INSERT INTO "org_hierarchy_nodes" ("key", "name", "node_type", "parent_id", "platoon_id", "sort_order")
  SELECT 'ROOT', 'Organization Root', 'ROOT', NULL, NULL, 0
  WHERE NOT EXISTS (
    SELECT 1
    FROM "org_hierarchy_nodes"
    WHERE "node_type" = 'ROOT' AND "deleted_at" IS NULL
  )
  RETURNING "id"
),
resolved_root AS (
  SELECT "id" FROM root_node
  UNION ALL
  SELECT "id"
  FROM "org_hierarchy_nodes"
  WHERE "node_type" = 'ROOT' AND "deleted_at" IS NULL
  LIMIT 1
)
INSERT INTO "org_hierarchy_nodes" ("key", "name", "node_type", "parent_id", "platoon_id", "sort_order")
SELECT
  'PLATOON_' || upper(replace(p."key", '-', '_')),
  p."name",
  'PLATOON',
  r."id",
  p."id",
  0
FROM "platoons" p
CROSS JOIN resolved_root r
WHERE p."deleted_at" IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "org_hierarchy_nodes" h
    WHERE h."platoon_id" = p."id"
  );
--> statement-breakpoint

INSERT INTO "functional_role_mappings" ("capability_key", "position_id")
SELECT 'PLATOON_COMMANDER_EQUIVALENT', p."id"
FROM "positions" p
WHERE p."key" = 'PLATOON_COMMANDER'
ON CONFLICT ("capability_key") DO NOTHING;
--> statement-breakpoint

INSERT INTO "functional_role_mappings" ("capability_key", "position_id")
SELECT 'PLATOON_COMMANDER_EQUIVALENT', NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM "functional_role_mappings"
  WHERE "capability_key" = 'PLATOON_COMMANDER_EQUIVALENT'
);
