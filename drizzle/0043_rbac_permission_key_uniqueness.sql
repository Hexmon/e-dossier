CREATE TEMP TABLE tmp_rbac_permission_map ON COMMIT DROP AS
SELECT
  p."id" AS old_id,
  first_value(p."id") OVER (PARTITION BY p."key" ORDER BY p."id"::text) AS keep_id
FROM "permissions" p;
--> statement-breakpoint
CREATE INDEX tmp_rbac_permission_map_old_id_idx ON tmp_rbac_permission_map (old_id);
--> statement-breakpoint
CREATE TEMP TABLE tmp_rbac_role_map ON COMMIT DROP AS
SELECT
  r."id" AS old_id,
  first_value(r."id") OVER (PARTITION BY r."key" ORDER BY r."id"::text) AS keep_id
FROM "roles" r;
--> statement-breakpoint
CREATE INDEX tmp_rbac_role_map_old_id_idx ON tmp_rbac_role_map (old_id);
--> statement-breakpoint
CREATE TEMP TABLE tmp_rbac_role_permissions ON COMMIT DROP AS
SELECT DISTINCT
  rm.keep_id AS role_id,
  pm.keep_id AS permission_id
FROM "role_permissions" rp
INNER JOIN tmp_rbac_role_map rm ON rm.old_id = rp."role_id"
INNER JOIN tmp_rbac_permission_map pm ON pm.old_id = rp."permission_id";
--> statement-breakpoint
CREATE TEMP TABLE tmp_rbac_position_permissions ON COMMIT DROP AS
SELECT DISTINCT
  pp."position_id" AS position_id,
  pm.keep_id AS permission_id
FROM "position_permissions" pp
INNER JOIN tmp_rbac_permission_map pm ON pm.old_id = pp."permission_id";
--> statement-breakpoint
CREATE TEMP TABLE tmp_rbac_permission_field_rules ON COMMIT DROP AS
SELECT DISTINCT ON (
  pm.keep_id,
  pfr."position_id",
  rm.keep_id,
  pfr."mode"
)
  pm.keep_id AS permission_id,
  pfr."position_id" AS position_id,
  rm.keep_id AS role_id,
  pfr."mode" AS mode,
  pfr."fields" AS fields,
  pfr."note" AS note,
  pfr."created_at" AS created_at,
  pfr."updated_at" AS updated_at
FROM "permission_field_rules" pfr
INNER JOIN tmp_rbac_permission_map pm ON pm.old_id = pfr."permission_id"
LEFT JOIN tmp_rbac_role_map rm ON rm.old_id = pfr."role_id"
ORDER BY
  pm.keep_id,
  pfr."position_id",
  rm.keep_id,
  pfr."mode",
  pfr."created_at";
--> statement-breakpoint
TRUNCATE TABLE "permission_field_rules", "role_permissions", "position_permissions";
--> statement-breakpoint
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT role_id, permission_id
FROM tmp_rbac_role_permissions
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "position_permissions" ("position_id", "permission_id")
SELECT position_id, permission_id
FROM tmp_rbac_position_permissions
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "permission_field_rules" (
  "permission_id",
  "position_id",
  "role_id",
  "mode",
  "fields",
  "note",
  "created_at",
  "updated_at"
)
SELECT
  permission_id,
  position_id,
  role_id,
  mode,
  fields,
  note,
  created_at,
  updated_at
FROM tmp_rbac_permission_field_rules;
--> statement-breakpoint
DELETE FROM "roles" r
USING tmp_rbac_role_map rm
WHERE r."id" = rm.old_id
  AND rm.old_id <> rm.keep_id;
--> statement-breakpoint
DELETE FROM "permissions" p
USING tmp_rbac_permission_map pm
WHERE p."id" = pm.old_id
  AND pm.old_id <> pm.keep_id;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ux_permissions_key" ON "permissions" ("key");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ux_roles_key" ON "roles" ("key");
