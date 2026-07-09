WITH cadet_appointment_permissions(key, description) AS (
  VALUES
    ('page:dashboard:settings:device:appointments:view', 'Allows viewing the platoon cadet appointments settings page.'),
    ('pl-cdr:cadet-appointments:read', 'Allows reading platoon cadet appointments.'),
    ('pl-cdr:cadet-appointments:create', 'Allows creating platoon cadet appointments.'),
    ('pl-cdr:cadet-appointments:update', 'Allows updating platoon cadet appointments.'),
    ('pl-cdr:cadet-appointments:delete', 'Allows deleting platoon cadet appointments.'),
    ('pl-cdr:cadet-appointments:transfer:create', 'Allows transferring platoon cadet appointments.')
)
INSERT INTO "permissions" ("key", "description")
SELECT key, description
FROM cadet_appointment_permissions
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint

WITH cadet_appointment_permissions(key) AS (
  VALUES
    ('page:dashboard:settings:device:appointments:view'),
    ('pl-cdr:cadet-appointments:read'),
    ('pl-cdr:cadet-appointments:create'),
    ('pl-cdr:cadet-appointments:update'),
    ('pl-cdr:cadet-appointments:delete'),
    ('pl-cdr:cadet-appointments:transfer:create')
),
platoon_commander_roles AS (
  SELECT id
  FROM "roles"
  WHERE upper(replace(replace("key", '-', '_'), ' ', '_')) IN (
    'PLATOON_COMMANDER',
    'PLATOON_COMMANDER_EQUIVALENT',
    'PLATOON_CDR',
    'PL_CDR',
    'PTN_CDR'
  )
  OR upper(replace(replace("key", '-', '_'), ' ', '_')) LIKE '%PLCDR'
  OR upper(replace(replace("key", '-', '_'), ' ', '_')) LIKE '%PLATOON_CDR'
  OR upper(replace(replace("key", '-', '_'), ' ', '_')) LIKE '%PL_CDR'
  OR upper(replace(replace("key", '-', '_'), ' ', '_')) LIKE '%PTN_CDR'
)
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id
FROM platoon_commander_roles r
CROSS JOIN cadet_appointment_permissions cap
INNER JOIN "permissions" p ON p."key" = cap.key
ON CONFLICT DO NOTHING;
--> statement-breakpoint

WITH cadet_appointment_permissions(key) AS (
  VALUES
    ('page:dashboard:settings:device:appointments:view'),
    ('pl-cdr:cadet-appointments:read'),
    ('pl-cdr:cadet-appointments:create'),
    ('pl-cdr:cadet-appointments:update'),
    ('pl-cdr:cadet-appointments:delete'),
    ('pl-cdr:cadet-appointments:transfer:create')
),
platoon_commander_positions AS (
  SELECT id
  FROM "positions"
  WHERE upper(replace(replace("key", '-', '_'), ' ', '_')) IN (
    'PLATOON_COMMANDER',
    'PLATOON_COMMANDER_EQUIVALENT',
    'PLATOON_CDR',
    'PL_CDR',
    'PTN_CDR'
  )
  OR upper(replace(replace("key", '-', '_'), ' ', '_')) LIKE '%PLCDR'
  OR upper(replace(replace("key", '-', '_'), ' ', '_')) LIKE '%PLATOON_CDR'
  OR upper(replace(replace("key", '-', '_'), ' ', '_')) LIKE '%PL_CDR'
  OR upper(replace(replace("key", '-', '_'), ' ', '_')) LIKE '%PTN_CDR'
)
INSERT INTO "position_permissions" ("position_id", "permission_id")
SELECT pos.id, p.id
FROM platoon_commander_positions pos
CROSS JOIN cadet_appointment_permissions cap
INNER JOIN "permissions" p ON p."key" = cap.key
ON CONFLICT DO NOTHING;
--> statement-breakpoint

INSERT INTO "authz_policy_state" ("key", "version")
VALUES ('rbac_code_defaults_v7_platoon_cadet_appointments', 1)
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint

INSERT INTO "authz_policy_state" ("key", "version")
VALUES ('global', 1)
ON CONFLICT ("key") DO UPDATE
SET "version" = "authz_policy_state"."version" + 1,
    "updated_at" = now();
