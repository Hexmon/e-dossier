import { and, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import { db } from '../client';
import { appointments } from '../schema/auth/appointments';
import { permissions, positionPermissions, rolePermissions, roles } from '../schema/auth/rbac';
import { positions } from '../schema/auth/positions';
import { authzPolicyState, permissionFieldRules } from '../schema/auth/rbac-extensions';
import { clearEffectivePermissionsCache, effectivePermissionsCache } from '@/app/lib/acx/cache';
import {
  hasBroadPlatoonCommanderRole,
  hasPlatoonCommanderRole,
} from '@/lib/platoon-commander-access';
import {
  AUTHENTICATED_DASHBOARD_PERMISSION_KEYS,
  getAllMappedActionKeys,
  getOtherUserDefaultPermissionKeys,
  getPlatoonCommanderDefaultPermissionKeys,
  getRbacDefaultProfiles,
  normalizeRbacKey,
  RBAC_WILDCARD_PERMISSION,
} from '@/app/lib/rbac/default-permissions';
import {
  INTERVIEW_DEFAULT_ROLE_PERMISSIONS,
  INTERVIEW_WRITE_PERMISSION_KEYS,
  resolveInterviewFallbackPermissionKeys,
} from '@/lib/interview-access';

type AptClaim = {
  id?: string;
  position?: string;
  scope?: {
    type?: string;
    id?: string | null;
  };
} | null | undefined;

type FieldRuleMode = 'ALLOW' | 'DENY' | 'OMIT' | 'MASK';

export type EffectiveFieldRule = {
  mode: FieldRuleMode;
  fields: string[];
  source: {
    positionId?: string | null;
    roleId?: string | null;
  };
};

export type EffectivePermissionBundle = {
  userId: string;
  roles: string[];
  appointment: {
    appointmentId: string | null;
    positionId: string | null;
    positionKey: string | null;
    scopeType: string | null;
    scopeId: string | null;
  };
  isAdmin: boolean;
  isSuperAdmin: boolean;
  permissions: string[];
  deniedPermissions: string[];
  fieldRulesByAction: Record<string, EffectiveFieldRule[]>;
  policyVersion: number;
};

type PermissionInput = {
  userId: string;
  roles: string[];
  apt?: AptClaim;
};

type AppointmentContext = {
  appointmentId: string | null;
  positionId: string | null;
  positionKey: string | null;
  scopeType: string | null;
  scopeId: string | null;
};

const WRITE_ACTION_SUFFIX = new Set([':create', ':update', ':delete']);

const INTERVIEW_PERMISSION_DESCRIPTIONS: Record<string, string> = {
  'oc:interviews:initial:plcdr:update': 'Allows editing PL CDR initial interview fields.',
  'oc:interviews:initial:dscoord:update': 'Allows editing DS Coord initial interview fields.',
  'oc:interviews:initial:dycdr:update': 'Allows editing DY CDR initial interview fields.',
  'oc:interviews:initial:cdr:update': 'Allows editing CDR initial interview fields.',
  'oc:interviews:term:beginning:shared:update': 'Allows editing shared beginning-of-term interview fields.',
  'oc:interviews:term:beginning:plcdr:update': 'Allows editing PL CDR beginning-of-term interview fields.',
  'oc:interviews:term:beginning:dscoord:update': 'Allows editing DS Coord beginning-of-term interview fields.',
  'oc:interviews:term:beginning:dycdr:update': 'Allows editing DY CDR beginning-of-term interview fields.',
  'oc:interviews:term:beginning:cdr:update': 'Allows editing CDR beginning-of-term interview fields.',
  'oc:interviews:term:postmid:update': 'Allows editing post-mid-term interview fields.',
  'oc:interviews:special:update': 'Allows editing special interview records.',
};

let ensureInterviewRbacDefaultsPromise: Promise<void> | null = null;

function toUpperRole(role: string): string {
  return role.trim().replace(/[-\s]+/g, '_').toUpperCase();
}

export function normalizeRoleSet(rolesInput: string[]): string[] {
  const set = new Set<string>();
  for (const role of rolesInput) {
    if (typeof role !== 'string') continue;
    const normalized = toUpperRole(role);
    if (!normalized) continue;
    set.add(normalized);
  }
  if (set.has('SUPER_ADMIN')) set.add('ADMIN');
  return Array.from(set).sort();
}

function mapPermissionRowsToSet(rows: Array<{ key: string }>): Set<string> {
  const set = new Set<string>();
  for (const row of rows) {
    if (!row.key) continue;
    set.add(row.key);
  }
  return set;
}

async function bumpPolicyVersionAndInvalidate(): Promise<void> {
  const [existing] = await db
    .select({ version: authzPolicyState.version })
    .from(authzPolicyState)
    .where(eq(authzPolicyState.key, 'global'))
    .limit(1);

  if (!existing) {
    await db.insert(authzPolicyState).values({ key: 'global', version: 1 });
  } else {
    await db
      .update(authzPolicyState)
      .set({
        version: existing.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(authzPolicyState.key, 'global'));
  }

  clearEffectivePermissionsCache();
}

async function ensureInterviewRbacDefaultsInner(): Promise<void> {
  let changed = false;

  for (const permissionKey of INTERVIEW_WRITE_PERMISSION_KEYS) {
    const [existingPermission] = await db
      .select({ id: permissions.id })
      .from(permissions)
      .where(eq(permissions.key, permissionKey))
      .limit(1);

    if (!existingPermission) {
      await db
        .insert(permissions)
        .values({
          key: permissionKey,
          description: INTERVIEW_PERMISSION_DESCRIPTIONS[permissionKey] ?? permissionKey,
        })
        .onConflictDoNothing();
      changed = true;
    }
  }

  const permissionRows = await db
    .select({ id: permissions.id, key: permissions.key })
    .from(permissions)
    .where(inArray(permissions.key, INTERVIEW_WRITE_PERMISSION_KEYS));
  const permissionIdByKey = new Map(permissionRows.map((row) => [row.key, row.id]));

  for (const roleKey of Object.keys(INTERVIEW_DEFAULT_ROLE_PERMISSIONS)) {
    const [existingRole] = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.key, roleKey))
      .limit(1);

    if (!existingRole) {
      await db
        .insert(roles)
        .values({
          key: roleKey,
          description: roleKey.toUpperCase(),
        })
        .onConflictDoNothing();
      changed = true;
    }
  }

  const roleRows = await db
    .select({ id: roles.id, key: roles.key })
    .from(roles)
    .where(inArray(roles.key, Object.keys(INTERVIEW_DEFAULT_ROLE_PERMISSIONS)));
  const roleIdByKey = new Map(roleRows.map((row) => [row.key, row.id]));

  for (const [roleKey, permissionKeys] of Object.entries(INTERVIEW_DEFAULT_ROLE_PERMISSIONS)) {
    const roleId = roleIdByKey.get(roleKey);
    if (!roleId) continue;

    for (const permissionKey of permissionKeys) {
      const permissionId = permissionIdByKey.get(permissionKey);
      if (!permissionId) continue;

      const [existingMapping] = await db
        .select({ roleId: rolePermissions.roleId })
        .from(rolePermissions)
        .where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, permissionId)))
        .limit(1);

      if (!existingMapping) {
        await db
          .insert(rolePermissions)
          .values({ roleId, permissionId })
          .onConflictDoNothing();
        changed = true;
      }
    }
  }

  if (changed) {
    await bumpPolicyVersionAndInvalidate();
  }
}

export async function ensureInterviewRbacDefaults(): Promise<void> {
  if (!ensureInterviewRbacDefaultsPromise) {
    ensureInterviewRbacDefaultsPromise = ensureInterviewRbacDefaultsInner().finally(() => {
      ensureInterviewRbacDefaultsPromise = null;
    });
  }

  await ensureInterviewRbacDefaultsPromise;
}

const RBAC_CODE_DEFAULTS_STATE_KEY = 'rbac_code_defaults_v1';
const RBAC_DASHBOARD_SESSION_DEFAULTS_STATE_KEY = 'rbac_code_defaults_v2_dashboard_session';
const RBAC_OTHER_USER_DEFAULTS_STATE_KEY = 'rbac_code_defaults_v3_other_user_defaults';
const RBAC_ROLE_GROUP_DEFAULTS_STATE_KEY = 'rbac_code_defaults_v6_warning_notifications';
let ensureCodeRbacDefaultsPromise: Promise<void> | null = null;

async function upsertPermissionKeys(permissionKeys: string[]): Promise<Map<string, string>> {
  const keys = Array.from(new Set(permissionKeys)).filter(Boolean);
  if (keys.length === 0) return new Map();

  const existingRows = await db
    .select({ id: permissions.id, key: permissions.key })
    .from(permissions)
    .where(inArray(permissions.key, keys));
  const permissionIdByKey = new Map<string, string>();
  for (const row of existingRows) {
    if (!permissionIdByKey.has(row.key)) {
      permissionIdByKey.set(row.key, row.id);
    }
  }

  const missingKeys = keys.filter((key) => !permissionIdByKey.has(key));
  for (const key of missingKeys) {
    await db
      .insert(permissions)
      .values({
        key,
        description: key,
      })
      .onConflictDoNothing();
  }

  if (missingKeys.length > 0) {
    const insertedRows = await db
      .select({ id: permissions.id, key: permissions.key })
      .from(permissions)
      .where(inArray(permissions.key, missingKeys));

    for (const row of insertedRows) {
      if (!permissionIdByKey.has(row.key)) {
        permissionIdByKey.set(row.key, row.id);
      }
    }
  }

  return permissionIdByKey;
}

async function upsertRoleByKey(roleKey: string): Promise<{ id: string; key: string }> {
  const dbKey = roleKey.trim().toLowerCase();
  const [existing] = await db
    .select({ id: roles.id, key: roles.key })
    .from(roles)
    .where(eq(roles.key, dbKey))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(roles)
    .values({
      key: dbKey,
      description: normalizeRbacKey(roleKey).replace(/_/g, ' '),
    })
    .returning({ id: roles.id, key: roles.key });
  return created;
}

async function upsertPositionByKey(positionKey: string): Promise<{ id: string; key: string }> {
  const dbKey = normalizeRbacKey(positionKey);
  const [existing] = await db
    .select({ id: positions.id, key: positions.key })
    .from(positions)
    .where(eq(positions.key, dbKey))
    .limit(1);
  if (existing) return existing;

  const isPlatoonScoped =
    dbKey.includes('PLATOON') ||
    dbKey === 'PTN_CDR' ||
    dbKey === 'PL_CDR' ||
    dbKey.endsWith('_PTN_CDR') ||
    dbKey.endsWith('_PL_CDR');

  const [created] = await db
    .insert(positions)
    .values({
      key: dbKey,
      displayName: dbKey.replace(/_/g, ' '),
      defaultScope: isPlatoonScoped ? 'PLATOON' : 'GLOBAL',
      singleton: !isPlatoonScoped,
      description: `RBAC default position for ${dbKey}`,
    })
    .returning({ id: positions.id, key: positions.key });
  return created;
}

async function addRolePermissions(roleId: string, permissionIds: string[]) {
  const ids = Array.from(new Set(permissionIds));
  if (ids.length === 0) return;
  await db
    .insert(rolePermissions)
    .values(ids.map((permissionId) => ({ roleId, permissionId })))
    .onConflictDoNothing();
}

async function addPositionPermissions(positionId: string, permissionIds: string[]) {
  const ids = Array.from(new Set(permissionIds));
  if (ids.length === 0) return;
  await db
    .insert(positionPermissions)
    .values(ids.map((permissionId) => ({ positionId, permissionId })))
    .onConflictDoNothing();
}

function getPermissionIds(
  permissionIdByKey: Map<string, string>,
  permissionKeys: readonly string[]
): string[] {
  return permissionKeys
    .map((key) => permissionIdByKey.get(key))
    .filter((id): id is string => Boolean(id));
}

async function applyPermissionsToRolesAndPositions(args: {
  roleKeys: readonly string[];
  positionKeys: readonly string[];
  permissionIds: string[];
}) {
  for (const roleKey of args.roleKeys) {
    const role = await upsertRoleByKey(roleKey);
    await addRolePermissions(role.id, args.permissionIds);
  }

  for (const positionKey of args.positionKeys) {
    const position = await upsertPositionByKey(positionKey);
    await addPositionPermissions(position.id, args.permissionIds);
  }
}

async function hasRbacDefaultsState(key: string): Promise<boolean> {
  const [existingState] = await db
    .select({ key: authzPolicyState.key })
    .from(authzPolicyState)
    .where(eq(authzPolicyState.key, key))
    .limit(1);
  return Boolean(existingState);
}

async function markRbacDefaultsState(key: string): Promise<void> {
  await db
    .insert(authzPolicyState)
    .values({ key, version: 1 })
    .onConflictDoNothing();
}

async function applyInitialCodeDefaults(permissionIdByKey: Map<string, string>): Promise<void> {
  for (const profile of getRbacDefaultProfiles()) {
    await applyPermissionsToRolesAndPositions({
      roleKeys: profile.roleKeys,
      positionKeys: profile.positionKeys,
      permissionIds: getPermissionIds(permissionIdByKey, profile.permissionKeys),
    });
  }
}

async function applyDashboardSessionDefaults(permissionIdByKey: Map<string, string>): Promise<void> {
  const dashboardPermissionIds = getPermissionIds(
    permissionIdByKey,
    AUTHENTICATED_DASHBOARD_PERMISSION_KEYS
  );
  const profiles = getRbacDefaultProfiles();

  for (const profile of profiles.filter((item) => item.key !== 'super_admin')) {
    await applyPermissionsToRolesAndPositions({
      roleKeys: profile.roleKeys,
      positionKeys: profile.positionKeys,
      permissionIds: dashboardPermissionIds,
    });
  }

  const platoonProfile = profiles.find((profile) => profile.key === 'platoon_commander');
  if (platoonProfile) {
    await applyPermissionsToRolesAndPositions({
      roleKeys: ['ptn_cdr'],
      positionKeys: ['PTN_CDR'],
      permissionIds: getPermissionIds(permissionIdByKey, platoonProfile.permissionKeys),
    });
  }
}

function isProtectedDefaultSubjectKey(key: string | null | undefined): boolean {
  const normalizedKey = normalizeRbacKey(key);
  if (!normalizedKey) return false;
  return normalizedKey === 'SUPER_ADMIN' || normalizedKey === 'ADMIN' || normalizedKey === 'COMMANDANT';
}

function isOtherUserDefaultKey(key: string | null | undefined, kind: 'role' | 'position'): boolean {
  const normalizedKey = normalizeRbacKey(key);
  if (!normalizedKey || isProtectedDefaultSubjectKey(normalizedKey)) return false;
  return !hasBroadPlatoonCommanderRole({
    roles: kind === 'role' ? [normalizedKey] : [],
    position: kind === 'position' ? normalizedKey : null,
  });
}

function resolveDefaultPermissionKeysForSubject(
  key: string | null | undefined,
  kind: 'role' | 'position'
): string[] {
  const normalizedKey = normalizeRbacKey(key);
  if (!normalizedKey || isProtectedDefaultSubjectKey(normalizedKey)) return [];

  if (
    hasBroadPlatoonCommanderRole({
      roles: kind === 'role' ? [normalizedKey] : [],
      position: kind === 'position' ? normalizedKey : null,
    })
  ) {
    return getPlatoonCommanderDefaultPermissionKeys();
  }

  return getOtherUserDefaultPermissionKeys();
}

export function resolveDefaultPermissionKeysForPosition(positionKey: string | null | undefined): string[] {
  return resolveDefaultPermissionKeysForSubject(positionKey, 'position');
}

async function applyOtherUserDefaultsToExistingSubjects(
  permissionIdByKey: Map<string, string>
): Promise<void> {
  const permissionIds = getPermissionIds(
    permissionIdByKey,
    getOtherUserDefaultPermissionKeys()
  );
  if (permissionIds.length === 0) return;

  const [roleRows, positionRows] = await Promise.all([
    db.select({ id: roles.id, key: roles.key }).from(roles),
    db.select({ id: positions.id, key: positions.key }).from(positions),
  ]);

  for (const role of roleRows) {
    if (isOtherUserDefaultKey(role.key, 'role')) {
      await addRolePermissions(role.id, permissionIds);
    }
  }

  for (const position of positionRows) {
    if (isOtherUserDefaultKey(position.key, 'position')) {
      await addPositionPermissions(position.id, permissionIds);
    }
  }
}

async function applyRoleGroupDefaultsToExistingSubjects(
  permissionIdByKey: Map<string, string>
): Promise<void> {
  const [roleRows, positionRows] = await Promise.all([
    db.select({ id: roles.id, key: roles.key }).from(roles),
    db.select({ id: positions.id, key: positions.key }).from(positions),
  ]);

  for (const role of roleRows) {
    const permissionIds = getPermissionIds(
      permissionIdByKey,
      resolveDefaultPermissionKeysForSubject(role.key, 'role')
    );
    await addRolePermissions(role.id, permissionIds);
  }

  for (const position of positionRows) {
    const permissionIds = getPermissionIds(
      permissionIdByKey,
      resolveDefaultPermissionKeysForSubject(position.key, 'position')
    );
    await addPositionPermissions(position.id, permissionIds);
  }
}

export async function applyDefaultPermissionsToPosition(
  positionId: string,
  positionKey: string
): Promise<void> {
  const permissionKeys = resolveDefaultPermissionKeysForPosition(positionKey);
  if (permissionKeys.length === 0) return;

  const permissionIdByKey = await upsertPermissionKeys(getAllMappedActionKeys());
  const permissionIds = getPermissionIds(permissionIdByKey, permissionKeys);
  await addPositionPermissions(positionId, permissionIds);
  await bumpPolicyVersionAndInvalidate();
}

async function ensureCodeRbacDefaultsInner(): Promise<void> {
  const permissionIdByKey = await upsertPermissionKeys(getAllMappedActionKeys());
  let changed = false;

  if (!(await hasRbacDefaultsState(RBAC_CODE_DEFAULTS_STATE_KEY))) {
    await applyInitialCodeDefaults(permissionIdByKey);
    await markRbacDefaultsState(RBAC_CODE_DEFAULTS_STATE_KEY);
    changed = true;
  }

  if (!(await hasRbacDefaultsState(RBAC_DASHBOARD_SESSION_DEFAULTS_STATE_KEY))) {
    await applyDashboardSessionDefaults(permissionIdByKey);
    await markRbacDefaultsState(RBAC_DASHBOARD_SESSION_DEFAULTS_STATE_KEY);
    changed = true;
  }

  if (!(await hasRbacDefaultsState(RBAC_OTHER_USER_DEFAULTS_STATE_KEY))) {
    await applyOtherUserDefaultsToExistingSubjects(permissionIdByKey);
    await markRbacDefaultsState(RBAC_OTHER_USER_DEFAULTS_STATE_KEY);
    changed = true;
  }

  if (!(await hasRbacDefaultsState(RBAC_ROLE_GROUP_DEFAULTS_STATE_KEY))) {
    await applyRoleGroupDefaultsToExistingSubjects(permissionIdByKey);
    await markRbacDefaultsState(RBAC_ROLE_GROUP_DEFAULTS_STATE_KEY);
    changed = true;
  }

  if (changed) {
    await bumpPolicyVersionAndInvalidate();
  }
}

export async function ensureCodeRbacDefaults(): Promise<void> {
  if (!ensureCodeRbacDefaultsPromise) {
    ensureCodeRbacDefaultsPromise = ensureCodeRbacDefaultsInner().finally(() => {
      ensureCodeRbacDefaultsPromise = null;
    });
  }

  await ensureCodeRbacDefaultsPromise;
}

function buildPermissionCacheKey(input: PermissionInput, policyVersion: number): string {
  const roles = normalizeRoleSet(input.roles);
  const aptId = input.apt?.id ?? 'none';
  const position = input.apt?.position ?? 'none';
  const scopeType = input.apt?.scope?.type ?? 'none';
  const scopeId = input.apt?.scope?.id ?? 'none';
  return `authz:v2|user:${input.userId}|apt:${aptId}|pos:${position}|scope:${scopeType}:${scopeId}|roles:${roles.join(
    ','
  )}|v:${policyVersion}`;
}

async function getAuthzPolicyVersion(): Promise<number> {
  const [row] = await db
    .select({
      version: authzPolicyState.version,
    })
    .from(authzPolicyState)
    .where(eq(authzPolicyState.key, 'global'))
    .limit(1);
  return row?.version ?? 1;
}

async function resolveAppointmentContext(userId: string, apt?: AptClaim): Promise<AppointmentContext> {
  if (apt?.id) {
    const [rowById] = await db
      .select({
        appointmentId: appointments.id,
        positionId: appointments.positionId,
        positionKey: positions.key,
        scopeType: appointments.scopeType,
        scopeId: appointments.scopeId,
      })
      .from(appointments)
      .innerJoin(positions, eq(positions.id, appointments.positionId))
      .where(
        and(
          eq(appointments.id, apt.id),
          eq(appointments.userId, userId),
          isNull(appointments.deletedAt),
          sql`${appointments.startsAt} <= now()`,
          sql`(${appointments.endsAt} IS NULL OR ${appointments.endsAt} > now())`
        )
      )
      .limit(1);

    if (rowById) return rowById;
  }

  const [activeAppointment] = await db
    .select({
      appointmentId: appointments.id,
      positionId: appointments.positionId,
      positionKey: positions.key,
      scopeType: appointments.scopeType,
      scopeId: appointments.scopeId,
    })
    .from(appointments)
    .innerJoin(positions, eq(positions.id, appointments.positionId))
    .where(
      and(
        eq(appointments.userId, userId),
        isNull(appointments.deletedAt),
        sql`${appointments.startsAt} <= now()`,
        sql`(${appointments.endsAt} IS NULL OR ${appointments.endsAt} > now())`
      )
    )
    .orderBy(desc(appointments.startsAt))
    .limit(1);

  if (activeAppointment) return activeAppointment;

  if (apt?.position) {
    const [pos] = await db
      .select({ id: positions.id, key: positions.key })
      .from(positions)
      .where(eq(positions.key, apt.position))
      .limit(1);
    if (pos) {
      return {
        appointmentId: apt.id ?? null,
        positionId: pos.id,
        positionKey: pos.key,
        scopeType: apt.scope?.type ?? null,
        scopeId: apt.scope?.id ?? null,
      };
    }
  }

  return {
    appointmentId: apt?.id ?? null,
    positionId: null,
    positionKey: apt?.position ?? null,
    scopeType: apt?.scope?.type ?? null,
    scopeId: apt?.scope?.id ?? null,
  };
}

async function getRoleIdsForNormalizedKeys(normalizedRoles: string[]): Promise<Array<{ id: string; key: string }>> {
  if (normalizedRoles.length === 0) return [];
  const variants = Array.from(
    new Set([
      ...normalizedRoles,
      ...normalizedRoles.map((role) => role.toLowerCase()),
      ...normalizedRoles.map((role) => role.replace(/_/g, ' ')),
      ...normalizedRoles.map((role) => role.replace(/_/g, '-')),
    ])
  );

  return await db
    .select({ id: roles.id, key: roles.key })
    .from(roles)
    .where(inArray(roles.key, variants));
}

async function loadPositionPermissionKeys(positionId: string | null): Promise<Set<string>> {
  if (!positionId) return new Set<string>();
  const rows = await db
    .select({ key: permissions.key })
    .from(positionPermissions)
    .innerJoin(permissions, eq(permissions.id, positionPermissions.permissionId))
    .where(eq(positionPermissions.positionId, positionId));
  return mapPermissionRowsToSet(rows);
}

async function loadRolePermissionKeys(roleIds: string[]): Promise<Set<string>> {
  if (roleIds.length === 0) return new Set<string>();
  const rows = await db
    .select({ key: permissions.key })
    .from(rolePermissions)
    .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
    .where(inArray(rolePermissions.roleId, roleIds));
  return mapPermissionRowsToSet(rows);
}

async function loadFieldRules(
  permissionKeys: string[],
  positionId: string | null,
  roleIds: string[]
): Promise<Record<string, EffectiveFieldRule[]>> {
  if (permissionKeys.length === 0) return {};

  const scopeFilters: any[] = [];
  if (positionId) {
    scopeFilters.push(eq(permissionFieldRules.positionId, positionId));
  }
  if (roleIds.length > 0) {
    scopeFilters.push(inArray(permissionFieldRules.roleId, roleIds));
  }
  if (scopeFilters.length === 0) return {};

  const rows = await db
    .select({
      permissionKey: permissions.key,
      mode: permissionFieldRules.mode,
      fields: permissionFieldRules.fields,
      positionId: permissionFieldRules.positionId,
      roleId: permissionFieldRules.roleId,
    })
    .from(permissionFieldRules)
    .innerJoin(permissions, eq(permissions.id, permissionFieldRules.permissionId))
    .where(and(inArray(permissions.key, permissionKeys), or(...scopeFilters)));

  const byAction: Record<string, EffectiveFieldRule[]> = {};
  for (const row of rows) {
    if (!byAction[row.permissionKey]) byAction[row.permissionKey] = [];
    byAction[row.permissionKey].push({
      mode: row.mode,
      fields: row.fields ?? [],
      source: {
        positionId: row.positionId,
        roleId: row.roleId,
      },
    });
  }
  return byAction;
}

export function applyAdminAndSuperAdminOverrides(
  normalizedRoles: string[],
  permissionSet: Set<string>
): { isAdmin: boolean; isSuperAdmin: boolean } {
  const isSuperAdmin = normalizedRoles.includes('SUPER_ADMIN');
  const isAdmin = isSuperAdmin || normalizedRoles.includes('ADMIN');

  if (isSuperAdmin) {
    permissionSet.add(RBAC_WILDCARD_PERMISSION);
    return { isAdmin: true, isSuperAdmin: true };
  }

  return { isAdmin, isSuperAdmin: false };
}

export function getAdminBaselineActions(): string[] {
  return getRbacDefaultProfiles().find((profile) => profile.key === 'admin')?.permissionKeys ?? [];
}

export function applyPlatoonCommanderMarksEntryOverrides(
  normalizedRoles: string[],
  _permissionSet: Set<string>
): { isPlatoonCommander: boolean } {
  const isPlatoonCommander = hasPlatoonCommanderRole({ roles: normalizedRoles });

  return { isPlatoonCommander };
}

export function applyInterviewPermissionFallbackOverrides(
  input: {
    roles?: string[];
    position?: string | null;
    scopeType?: string | null;
  },
  permissionSet: Set<string>
) {
  const fallbackPermissions = resolveInterviewFallbackPermissionKeys({
    roles: input.roles ?? [],
    position: input.position ?? null,
    scopeType: input.scopeType ?? null,
  });

  for (const permission of fallbackPermissions) {
    permissionSet.add(permission);
  }

  return { grantedPermissions: fallbackPermissions };
}

export async function getEffectivePermissionBundle(input: PermissionInput): Promise<EffectivePermissionBundle> {
  await ensureInterviewRbacDefaults();
  await ensureCodeRbacDefaults();
  const normalizedRoles = normalizeRoleSet(input.roles);
  const appointment = await resolveAppointmentContext(input.userId, input.apt);

  if (appointment.positionKey) {
    normalizedRoles.push(toUpperRole(appointment.positionKey));
  }
  const uniqueRoles = Array.from(new Set(normalizedRoles)).sort();

  const matchedRoles = await getRoleIdsForNormalizedKeys(uniqueRoles);
  const roleIds = matchedRoles.map((r) => r.id);

  const positionPerms = await loadPositionPermissionKeys(appointment.positionId);
  const rolePerms = await loadRolePermissionKeys(roleIds);

  const permissionSet = new Set<string>([...positionPerms, ...rolePerms]);
  const { isAdmin, isSuperAdmin } = applyAdminAndSuperAdminOverrides(uniqueRoles, permissionSet);
  applyPlatoonCommanderMarksEntryOverrides(uniqueRoles, permissionSet);
  applyInterviewPermissionFallbackOverrides(
    {
      roles: uniqueRoles,
      position: appointment.positionKey,
      scopeType: appointment.scopeType,
    },
    permissionSet
  );

  const sortedPermissions = Array.from(permissionSet).sort();
  const fieldRulesByAction = await loadFieldRules(
    sortedPermissions.filter((perm) => perm !== '*'),
    appointment.positionId,
    roleIds
  );

  const deniedPermissions = new Set<string>();
  for (const [action, rules] of Object.entries(fieldRulesByAction)) {
    for (const rule of rules) {
      if (rule.mode === 'DENY' && (!rule.fields || rule.fields.length === 0)) {
        deniedPermissions.add(action);
      }
    }
  }

  return {
    userId: input.userId,
    roles: uniqueRoles,
    appointment,
    isAdmin,
    isSuperAdmin,
    permissions: sortedPermissions,
    deniedPermissions: Array.from(deniedPermissions).sort(),
    fieldRulesByAction,
    policyVersion: 1,
  };
}

export async function getEffectivePermissionBundleCached(input: PermissionInput): Promise<EffectivePermissionBundle> {
  const policyVersion = await getAuthzPolicyVersion();
  const cacheKey = buildPermissionCacheKey(input, policyVersion);

  const cached = effectivePermissionsCache.get(cacheKey) as EffectivePermissionBundle | null;
  if (cached) {
    return cached;
  }

  const loaded = await getEffectivePermissionBundle(input);
  const enriched: EffectivePermissionBundle = {
    ...loaded,
    policyVersion,
  };
  effectivePermissionsCache.set(cacheKey, enriched);
  return enriched;
}

export function isWriteAction(action: string): boolean {
  for (const suffix of WRITE_ACTION_SUFFIX) {
    if (action.endsWith(suffix)) return true;
  }
  return false;
}

export function isWildcardPermissionGranted(permissionsInput: string[]): boolean {
  return permissionsInput.includes('*');
}
