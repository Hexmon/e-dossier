import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../client';
import { positions } from '../schema/auth/positions';
import { authzPolicyState } from '../schema/auth/rbac-extensions';
import { permissions, positionPermissions, rolePermissions, roles } from '../schema/auth/rbac';
import { API_ACTION_MAP, PAGE_ACTION_MAP } from '@/app/lib/acx/action-map';

type ParsedPermissionMatrix = {
  roles: Array<{
    roleKey: string;
    displayName: string;
  }>;
  entries: Array<{
    moduleName: string | null;
    subModuleName: string | null;
    fieldName: string | null;
    permissions: Record<
      string,
      {
        displayName: string;
        read: boolean | null;
        write: boolean | null;
      }
    >;
  }>;
};

type RolePermissionAccumulator = Record<string, Set<string>>;

const EXTRA_RBAC_ACTIONS = [
  'admin:rbac:permissions:read',
  'admin:rbac:permissions:create',
  'admin:rbac:permissions:update',
  'admin:rbac:permissions:delete',
  'admin:rbac:mappings:read',
  'admin:rbac:mappings:update',
  'admin:rbac:field-rules:read',
  'admin:rbac:field-rules:create',
  'admin:rbac:field-rules:update',
  'admin:rbac:field-rules:delete',
  'admin:rbac:roles:read',
  'admin:rbac:roles:create',
  'admin:rbac:roles:update',
  'admin:rbac:roles:delete',
  'page:dashboard:genmgmt:rbac:view',
];

const MANAGE_MARKS_ACTION_ALLOWLIST = new Set(
  API_ACTION_MAP.filter(
    (entry) =>
      entry.path === '/api/v1/oc/academics/bulk' ||
      entry.path === '/api/v1/admin/courses' ||
      entry.path === '/api/v1/admin/courses/:courseId/offerings' ||
      entry.path === '/api/v1/oc'
  ).map((entry) => entry.action)
);

const ADMIN_BASELINE_ACTIONS = new Set([
  ...API_ACTION_MAP.filter((entry) => entry.adminBaseline).map((entry) => entry.action),
  ...PAGE_ACTION_MAP.filter((entry) => entry.adminBaseline).map((entry) => entry.action),
  ...MANAGE_MARKS_ACTION_ALLOWLIST,
  ...EXTRA_RBAC_ACTIONS,
]);

const MODULE_PREFIX_HINTS: Array<{ pattern: RegExp; prefixes: string[] }> = [
  { pattern: /DOSSIER FILLING/, prefixes: ['oc:dossier-filling', 'page:dashboard:milmgmt:dossier-filling'] },
  { pattern: /DOSSIER INSP/, prefixes: ['oc:dossier-inspection', 'page:dashboard:milmgmt:dossier-insp'] },
  { pattern: /PERS PARTICULARS/, prefixes: ['oc:personal', 'page:dashboard:milmgmt:pers-particulars'] },
  { pattern: /FAMILY BACKGROUND/, prefixes: ['oc:family', 'page:dashboard:milmgmt:background-detls'] },
  { pattern: /EDN QUALIFICATION/, prefixes: ['oc:education', 'page:dashboard:milmgmt:background-detls'] },
  { pattern: /ACHIEVEMENTS/, prefixes: ['oc:achievements', 'page:dashboard:milmgmt:background-detls'] },
  { pattern: /AUTOBIOGRAPHY/, prefixes: ['oc:autobiography', 'page:dashboard:milmgmt:background-detls'] },
  { pattern: /SSB REPORT/, prefixes: ['oc:ssb', 'page:dashboard:milmgmt:ssb-reports'] },
  { pattern: /MED INFO/, prefixes: ['oc:medical', 'page:dashboard:milmgmt:med-record'] },
  { pattern: /MED CAT/, prefixes: ['oc:medical-category', 'page:dashboard:milmgmt:med-record'] },
  { pattern: /DISCP|DISCIP/, prefixes: ['oc:discipline', 'page:dashboard:milmgmt:discip-records'] },
  { pattern: /PARENTS|GUARDIAN|COMN/, prefixes: ['oc:parent-comms', 'page:dashboard:milmgmt:comn-parents'] },
  { pattern: /ACADEMICS|TECH SEMINAR|MINI PROJ/, prefixes: ['oc:academics', 'page:dashboard:milmgmt:academics'] },
  { pattern: /PHY TRG|SWIMMING|PT/, prefixes: ['oc:physical-training', 'page:dashboard:milmgmt:physical-training'] },
  { pattern: /SPORTS\/GAMES/, prefixes: ['oc:sports-and-games', 'page:dashboard:milmgmt:sports-awards'] },
  { pattern: /WPN TRG/, prefixes: ['oc:weapon-training', 'page:dashboard:milmgmt:wpn-trg'] },
  { pattern: /OBSTACLE TRG/, prefixes: ['oc:obstacle-training', 'page:dashboard:milmgmt:obstacle-trg'] },
  { pattern: /SPEED MARCH|RUN BACK/, prefixes: ['oc:speed-march', 'page:dashboard:milmgmt:speed-march'] },
  { pattern: /CAMPS/, prefixes: ['oc:camps', 'admin:training-camps', 'page:dashboard:milmgmt:camps'] },
  { pattern: /CLUB DETLS/, prefixes: ['oc:clubs', 'oc:club-achievements', 'page:dashboard:milmgmt:club-detls'] },
  { pattern: /DRILL/, prefixes: ['oc:drill', 'page:dashboard:milmgmt:club-detls'] },
  { pattern: /CREDIT FOR EXCELLENCE|CFE/, prefixes: ['oc:credit-for-excellence', 'page:dashboard:milmgmt:credit-excellence'] },
  { pattern: /OLQ/, prefixes: ['oc:olq', 'page:dashboard:milmgmt:olq-assessment'] },
  { pattern: /SEMESTER PERFORMANCE/, prefixes: ['page:dashboard:milmgmt:semester-record'] },
  { pattern: /FINAL PERFORMANCE/, prefixes: ['page:dashboard:milmgmt:final-performance', 'oc:fpr'] },
  { pattern: /OVERALL ASSESSMENT|OVERALL PERFORMANCE/, prefixes: ['page:dashboard:milmgmt:overall-assessment'] },
  { pattern: /LVE\/HIKE\/DETENTION|LEAVE\/HIKE\/DETENTION/, prefixes: ['oc:recording-leave-hike-detention', 'page:dashboard:milmgmt:leave-record'] },
  { pattern: /INITIAL INTERVIEW|INTERVIEW SHEET/, prefixes: ['oc:interviews', 'page:dashboard:milmgmt:interview-term'] },
  { pattern: /COUNSELLING/, prefixes: ['oc:counselling', 'page:dashboard:milmgmt:counselling'] },
  { pattern: /PERFORMANCE GRAPH/, prefixes: ['page:dashboard:milmgmt:performance-graph'] },
];

function normalizeRoleKey(value: string): string {
  return value.trim().replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').toUpperCase();
}

function normalizeModuleText(moduleName: string | null, subModuleName: string | null): string {
  return `${moduleName ?? ''} ${subModuleName ?? ''}`.trim().toUpperCase();
}

function isReadLikeAction(action: string): boolean {
  return action.endsWith(':read') || action.endsWith(':view');
}

function isWriteLikeAction(action: string): boolean {
  return action.endsWith(':create') || action.endsWith(':update') || action.endsWith(':delete');
}

function deriveCandidateActions(moduleText: string, allActions: string[]): string[] {
  const prefixes = MODULE_PREFIX_HINTS.filter((rule) => rule.pattern.test(moduleText)).flatMap((rule) => rule.prefixes);
  if (prefixes.length === 0) return [];
  const uniqPrefixes = Array.from(new Set(prefixes));
  return allActions.filter((action) => uniqPrefixes.some((prefix) => action.startsWith(prefix)));
}

function buildRoleActionMatrix(parsed: ParsedPermissionMatrix, allActions: string[]): RolePermissionAccumulator {
  const roleMap: RolePermissionAccumulator = {};

  for (const role of parsed.roles) {
    roleMap[normalizeRoleKey(role.roleKey)] = new Set<string>();
  }

  for (const row of parsed.entries) {
    const moduleText = normalizeModuleText(row.moduleName, row.subModuleName);
    const candidates = deriveCandidateActions(moduleText, allActions);
    if (candidates.length === 0) continue;

    for (const [rawRoleKey, permission] of Object.entries(row.permissions ?? {})) {
      const roleKey = normalizeRoleKey(rawRoleKey);
      if (!roleMap[roleKey]) roleMap[roleKey] = new Set<string>();

      if (permission.read === true) {
        for (const action of candidates) {
          if (isReadLikeAction(action)) roleMap[roleKey].add(action);
        }
      }
      if (permission.write === true) {
        for (const action of candidates) {
          if (isReadLikeAction(action) || isWriteLikeAction(action)) {
            roleMap[roleKey].add(action);
          }
        }
      }
    }
  }

  return roleMap;
}

function loadParsedMatrix(matrixPath: string): ParsedPermissionMatrix {
  const raw = fs.readFileSync(matrixPath, 'utf8');
  return JSON.parse(raw) as ParsedPermissionMatrix;
}

async function upsertRole(roleKey: string): Promise<{ id: string; key: string }> {
  const dbKey = roleKey.toLowerCase();
  const [existing] = await db.select({ id: roles.id, key: roles.key }).from(roles).where(eq(roles.key, dbKey)).limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(roles)
    .values({
      key: dbKey,
      description: roleKey,
    })
    .returning({ id: roles.id, key: roles.key });
  return created;
}

async function upsertPosition(roleKey: string): Promise<{ id: string; key: string }> {
  const [existing] = await db.select({ id: positions.id, key: positions.key }).from(positions).where(eq(positions.key, roleKey)).limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(positions)
    .values({
      key: roleKey,
      displayName: roleKey.replace(/_/g, ' '),
      defaultScope: 'GLOBAL',
      singleton: false,
      description: `Imported from Excel matrix: ${roleKey}`,
    })
    .returning({ id: positions.id, key: positions.key });
  return created;
}

async function upsertPermissions(permissionKeys: string[]): Promise<Map<string, string>> {
  for (const key of permissionKeys) {
    const [existing] = await db.select({ id: permissions.id }).from(permissions).where(eq(permissions.key, key)).limit(1);
    if (!existing) {
      await db.insert(permissions).values({ key, description: key }).onConflictDoNothing();
    }
  }

  const rows = await db
    .select({ id: permissions.id, key: permissions.key })
    .from(permissions)
    .where(inArray(permissions.key, permissionKeys));

  const map = new Map<string, string>();
  for (const row of rows) map.set(row.key, row.id);
  return map;
}

async function syncRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
  const desiredIds = Array.from(new Set(permissionIds));
  const existing = await db
    .select({ permissionId: rolePermissions.permissionId })
    .from(rolePermissions)
    .where(eq(rolePermissions.roleId, roleId));

  const existingIds = existing.map((row) => row.permissionId);
  const missing = desiredIds.filter((id) => !existingIds.includes(id));
  const stale = existingIds.filter((id) => !desiredIds.includes(id));

  if (missing.length > 0) {
    await db.insert(rolePermissions).values(missing.map((permissionId) => ({ roleId, permissionId }))).onConflictDoNothing();
  }

  if (stale.length > 0) {
    await db
      .delete(rolePermissions)
      .where(and(eq(rolePermissions.roleId, roleId), inArray(rolePermissions.permissionId, stale)));
  }
}

async function syncPositionPermissions(positionId: string, permissionIds: string[]): Promise<void> {
  const desiredIds = Array.from(new Set(permissionIds));
  const existing = await db
    .select({ permissionId: positionPermissions.permissionId })
    .from(positionPermissions)
    .where(eq(positionPermissions.positionId, positionId));

  const existingIds = existing.map((row) => row.permissionId);
  const missing = desiredIds.filter((id) => !existingIds.includes(id));
  const stale = existingIds.filter((id) => !desiredIds.includes(id));

  if (missing.length > 0) {
    await db
      .insert(positionPermissions)
      .values(missing.map((permissionId) => ({ positionId, permissionId })))
      .onConflictDoNothing();
  }

  if (stale.length > 0) {
    await db
      .delete(positionPermissions)
      .where(and(eq(positionPermissions.positionId, positionId), inArray(positionPermissions.permissionId, stale)));
  }
}

async function bumpAuthzPolicyVersion(): Promise<void> {
  const [existing] = await db
    .select({ key: authzPolicyState.key, version: authzPolicyState.version })
    .from(authzPolicyState)
    .where(eq(authzPolicyState.key, 'global'))
    .limit(1);

  if (!existing) {
    await db.insert(authzPolicyState).values({ key: 'global', version: 1 });
    return;
  }

  await db
    .update(authzPolicyState)
    .set({
      version: existing.version + 1,
      updatedAt: new Date(),
    })
    .where(eq(authzPolicyState.key, 'global'));
}

export async function seedPermissionsFromExcel(matrixPath?: string): Promise<{
  rolesProcessed: number;
  permissionsProcessed: number;
}> {
  const resolvedMatrixPath = matrixPath
    ? path.resolve(matrixPath)
    : path.resolve(process.cwd(), 'docs/rbac/permission-matrix.parsed.json');

  if (!fs.existsSync(resolvedMatrixPath)) {
    throw new Error(`Parsed permission matrix not found at ${resolvedMatrixPath}`);
  }

  const parsed = loadParsedMatrix(resolvedMatrixPath);
  const roleKeys = Array.from(new Set(parsed.roles.map((role) => normalizeRoleKey(role.roleKey))));
  const allActionKeys = Array.from(
    new Set([
      ...API_ACTION_MAP.map((entry) => entry.action),
      ...PAGE_ACTION_MAP.map((entry) => entry.action),
      ...EXTRA_RBAC_ACTIONS,
    ])
  );

  const roleMatrix = buildRoleActionMatrix(parsed, allActionKeys);
  roleMatrix.ADMIN = new Set([...ADMIN_BASELINE_ACTIONS]);
  roleMatrix.SUPER_ADMIN = new Set([...allActionKeys, '*']);

  const allPermissionKeys = Array.from(
    new Set(
      Object.values(roleMatrix)
        .flatMap((set) => Array.from(set))
        .concat(allActionKeys)
    )
  ).sort();

  const permissionIdMap = await upsertPermissions(allPermissionKeys);

  const managedRoleKeys = Array.from(new Set([...roleKeys, 'ADMIN', 'SUPER_ADMIN']));
  for (const roleKey of managedRoleKeys) {
    const role = await upsertRole(roleKey);
    const position = await upsertPosition(roleKey);

    const actionKeys = Array.from(roleMatrix[roleKey] ?? []);
    const permissionIds = actionKeys.map((action) => permissionIdMap.get(action)).filter((id): id is string => Boolean(id));

    await syncRolePermissions(role.id, permissionIds);
    await syncPositionPermissions(position.id, permissionIds);
  }

  await bumpAuthzPolicyVersion();

  return {
    rolesProcessed: managedRoleKeys.length,
    permissionsProcessed: allPermissionKeys.length,
  };
}

if (require.main === module) {
  seedPermissionsFromExcel(process.argv[2])
    .then((result) => {
      console.log(
        `Permissions import completed. Roles processed: ${result.rolesProcessed}, permissions processed: ${result.permissionsProcessed}.`
      );
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to import permissions from parsed matrix:', error);
      process.exit(1);
    });
}
