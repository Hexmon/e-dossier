import { and, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import { db } from '../client';
import { appointments } from '../schema/auth/appointments';
import { permissions, positionPermissions, rolePermissions, roles } from '../schema/auth/rbac';
import { positions } from '../schema/auth/positions';
import { authzPolicyState, permissionFieldRules } from '../schema/auth/rbac-extensions';
import { API_ACTION_MAP, PAGE_ACTION_MAP } from '@/app/lib/acx/action-map';
import { effectivePermissionsCache } from '@/app/lib/acx/cache';

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

const MANAGE_MARKS_API_PATHS = new Set<string>([
  '/api/v1/admin/courses',
  '/api/v1/admin/courses/:courseId/offerings',
  '/api/v1/oc',
  '/api/v1/oc/academics/bulk',
]);

const ADMIN_BASELINE_ACTIONS = new Set<string>([
  ...API_ACTION_MAP.filter((entry) => entry.adminBaseline || MANAGE_MARKS_API_PATHS.has(entry.path)).map(
    (entry) => entry.action
  ),
  ...PAGE_ACTION_MAP.filter((entry) => entry.adminBaseline).map((entry) => entry.action),
]);

const WRITE_ACTION_SUFFIX = new Set([':create', ':update', ':delete']);

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
    permissionSet.add('*');
    return { isAdmin: true, isSuperAdmin: true };
  }

  if (isAdmin) {
    for (const action of ADMIN_BASELINE_ACTIONS) {
      permissionSet.add(action);
    }
  }

  return { isAdmin, isSuperAdmin: false };
}

export function getAdminBaselineActions(): string[] {
  return Array.from(ADMIN_BASELINE_ACTIONS).sort();
}

export async function getEffectivePermissionBundle(input: PermissionInput): Promise<EffectivePermissionBundle> {
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
