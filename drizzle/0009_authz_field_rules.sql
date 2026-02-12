DO $$ BEGIN
 CREATE TYPE "public"."field_rule_mode" AS ENUM('ALLOW', 'DENY', 'OMIT', 'MASK');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "permission_field_rules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "permission_id" uuid NOT NULL,
  "position_id" uuid,
  "role_id" uuid,
  "mode" "field_rule_mode" DEFAULT 'ALLOW' NOT NULL,
  "fields" text[] DEFAULT '{}'::text[] NOT NULL,
  "note" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "authz_policy_state" (
  "key" varchar(64) PRIMARY KEY NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "ux_roles_key" ON "roles" USING btree ("key");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ux_permissions_key" ON "permissions" USING btree ("key");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ux_permission_field_rules_scope"
  ON "permission_field_rules" USING btree ("permission_id", "position_id", "role_id", "mode");
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "permission_field_rules"
 ADD CONSTRAINT "permission_field_rules_permission_id_permissions_id_fk"
 FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "permission_field_rules"
 ADD CONSTRAINT "permission_field_rules_position_id_positions_id_fk"
 FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "permission_field_rules"
 ADD CONSTRAINT "permission_field_rules_role_id_roles_id_fk"
 FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "permission_field_rules"
 ADD CONSTRAINT "chk_permission_field_rules_scope"
 CHECK ("permission_field_rules"."position_id" IS NOT NULL OR "permission_field_rules"."role_id" IS NOT NULL);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

INSERT INTO "authz_policy_state" ("key", "version")
VALUES ('global', 1)
ON CONFLICT ("key") DO NOTHING;

