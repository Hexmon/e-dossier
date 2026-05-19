import { and, asc, eq, ilike, inArray, sql } from 'drizzle-orm';
import { db } from '../client';
import { authzPolicyState, permissionFieldRules } from '../schema/auth/rbac-extensions';
import { permissions, positionPermissions, rolePermissions, roles } from '../schema/auth/rbac';
import { positions } from '../schema/auth/positions';
import { clearEffectivePermissionsCache } from '@/app/lib/acx/cache';
import { ensureCodeRbacDefaults, ensureInterviewRbacDefaults } from './authz-permissions';
import {
  getPermissionSystemMeta,
  getRbacDefaultProfiles,
  isSystemPermissionKey,
  normalizeRbacKey,
} from '@/app/lib/rbac/default-permissions';
import { getRbacDefaultFieldRules } from '@/app/lib/rbac/default-field-rules';
import { getPermissionDisplayMeta } from '@/app/lib/rbac/permission-display';
import { ApiError } from '@/app/lib/http';

type Paging = {
  q?: string;
  limit?: number;
  offset?: number;
};

export async function listRbacPermissions(input: Paging = {}) {
  await ensureInterviewRbacDefaults();
  await ensureCodeRbacDefaults();
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const q = input.q?.trim();
  const whereClause = q ? ilike(permissions.key, `%${q}%`) : undefined;

  const [totalRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(permissions)
    .where(whereClause);
  const total = Number(totalRow?.total ?? 0);

  const rows = await db
    .select({
      id: permissions.id,
      key: permissions.key,
      description: permissions.description,
    })
    .from(permissions)
    .where(whereClause)
    .orderBy(asc(permissions.key))
    .limit(limit)
    .offset(offset);

  const items = rows.map((row) => ({
    ...row,
    ...getPermissionSystemMeta(row.key),
    display: getPermissionDisplayMeta(row.key, row.description),
  }));

  return {
    items,
    count: items.length,
    total,
    limit,
    offset,
    hasMore: offset + items.length < total,
  };
}

export async function createRbacPermission(input: { key: string; description?: string | null }) {
  const key = input.key.trim();
  if (isSystemPermissionKey(key)) {
    throw new ApiError(
      403,
      'System permissions are managed by the action map and cannot be created manually.',
      'system_permission_immutable'
    );
  }

  const [created] = await db
    .insert(permissions)
    .values({
      key,
      description: input.description ?? null,
    })
    .returning({
      id: permissions.id,
      key: permissions.key,
      description: permissions.description,
    });

  await bumpPolicyVersionAndInvalidate();
  return {
    ...created,
    ...getPermissionSystemMeta(created.key),
    display: getPermissionDisplayMeta(created.key, created.description),
  };
}

export async function updateRbacPermission(
  permissionId: string,
  input: { key?: string; description?: string | null }
) {
  const [existing] = await db
    .select({ id: permissions.id, key: permissions.key, description: permissions.description })
    .from(permissions)
    .where(eq(permissions.id, permissionId))
    .limit(1);

  if (!existing) return undefined;

  if (isSystemPermissionKey(existing.key)) {
    throw new ApiError(
      403,
      'System permissions are managed by the action map and cannot be edited.',
      'system_permission_immutable'
    );
  }

  if (input.key !== undefined && isSystemPermissionKey(input.key.trim())) {
    throw new ApiError(
      403,
      'System permission keys are reserved by the action map.',
      'system_permission_immutable'
    );
  }

  const [updated] = await db
    .update(permissions)
    .set({
      ...(input.key !== undefined ? { key: input.key.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description ?? null } : {}),
    })
    .where(eq(permissions.id, permissionId))
    .returning({
      id: permissions.id,
      key: permissions.key,
      description: permissions.description,
    });

  await bumpPolicyVersionAndInvalidate();
  if (!updated) return updated;
  return {
    ...updated,
    ...getPermissionSystemMeta(updated.key),
    display: getPermissionDisplayMeta(updated.key, updated.description),
  };
}

export async function deleteRbacPermission(permissionId: string) {
  const [existing] = await db
    .select({ id: permissions.id, key: permissions.key })
    .from(permissions)
    .where(eq(permissions.id, permissionId))
    .limit(1);

  if (!existing) return undefined;

  if (isSystemPermissionKey(existing.key)) {
    throw new ApiError(
      403,
      'System permissions are managed by the action map and cannot be deleted.',
      'system_permission_immutable'
    );
  }

  const [deleted] = await db
    .delete(permissions)
    .where(eq(permissions.id, permissionId))
    .returning({ id: permissions.id, key: permissions.key });
  await bumpPolicyVersionAndInvalidate();
  return deleted;
}

export async function listRbacRoles() {
  await ensureInterviewRbacDefaults();
  await ensureCodeRbacDefaults();
  return db
    .select({ id: roles.id, key: roles.key, description: roles.description })
    .from(roles)
    .orderBy(asc(roles.key));
}

export async function getRbacRoleById(roleId: string) {
  const [row] = await db
    .select({ id: roles.id, key: roles.key, description: roles.description })
    .from(roles)
    .where(eq(roles.id, roleId))
    .limit(1);
  return row;
}

export async function createRbacRole(input: { key: string; description?: string | null }) {
  const [created] = await db
    .insert(roles)
    .values({
      key: input.key.trim().toLowerCase(),
      description: input.description ?? null,
    })
    .returning({
      id: roles.id,
      key: roles.key,
      description: roles.description,
    });

  await bumpPolicyVersionAndInvalidate();
  return created;
}

export async function updateRbacRole(
  roleId: string,
  input: { key?: string; description?: string | null }
) {
  const [updated] = await db
    .update(roles)
    .set({
      ...(input.key !== undefined ? { key: input.key.trim().toLowerCase() } : {}),
      ...(input.description !== undefined ? { description: input.description ?? null } : {}),
    })
    .where(eq(roles.id, roleId))
    .returning({
      id: roles.id,
      key: roles.key,
      description: roles.description,
    });

  await bumpPolicyVersionAndInvalidate();
  return updated;
}

export async function deleteRbacRole(roleId: string) {
  const [deleted] = await db
    .delete(roles)
    .where(eq(roles.id, roleId))
    .returning({
      id: roles.id,
      key: roles.key,
    });

  await bumpPolicyVersionAndInvalidate();
  return deleted;
}

export async function listRbacPositions() {
  await ensureInterviewRbacDefaults();
  await ensureCodeRbacDefaults();
  return db
    .select({ id: positions.id, key: positions.key, displayName: positions.displayName })
    .from(positions)
    .orderBy(asc(positions.key));
}

export async function listRolePermissionMappings(roleId?: string) {
  await ensureInterviewRbacDefaults();
  await ensureCodeRbacDefaults();
  const rows = await db
    .select({
      roleId: rolePermissions.roleId,
      roleKey: roles.key,
      permissionId: rolePermissions.permissionId,
      permissionKey: permissions.key,
    })
    .from(rolePermissions)
    .innerJoin(roles, eq(roles.id, rolePermissions.roleId))
    .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
    .where(roleId ? eq(rolePermissions.roleId, roleId) : undefined);

  return rows;
}

export async function listPositionPermissionMappings(positionId?: string) {
  await ensureInterviewRbacDefaults();
  await ensureCodeRbacDefaults();
  const rows = await db
    .select({
      positionId: positionPermissions.positionId,
      positionKey: positions.key,
      permissionId: positionPermissions.permissionId,
      permissionKey: permissions.key,
    })
    .from(positionPermissions)
    .innerJoin(positions, eq(positions.id, positionPermissions.positionId))
    .innerJoin(permissions, eq(permissions.id, positionPermissions.permissionId))
    .where(positionId ? eq(positionPermissions.positionId, positionId) : undefined);

  return rows;
}

export async function getRbacDefaultMappingMetadata() {
  await ensureCodeRbacDefaults();

  const [permissionRows, roleRows, positionRows] = await Promise.all([
    db.select({ id: permissions.id, key: permissions.key, description: permissions.description }).from(permissions),
    db.select({ id: roles.id, key: roles.key }).from(roles),
    db.select({ id: positions.id, key: positions.key }).from(positions),
  ]);

  const permissionByKey = new Map(permissionRows.map((row) => [row.key, row]));
  const roleByNormalizedKey = new Map(roleRows.map((row) => [normalizeRbacKey(row.key), row]));
  const positionByNormalizedKey = new Map(positionRows.map((row) => [normalizeRbacKey(row.key), row]));
  const defaultProfiles = getRbacDefaultProfiles();

  const defaultRoleMappings = defaultProfiles.flatMap((profile) =>
    profile.roleKeys.flatMap((roleKey) => {
      const role = roleByNormalizedKey.get(normalizeRbacKey(roleKey));
      if (!role) return [];
      return profile.permissionKeys
        .map((permissionKey) => {
          const permission = permissionByKey.get(permissionKey);
          if (!permission) return null;
          return {
            profileKey: profile.key,
            roleId: role.id,
            roleKey: role.key,
            permissionId: permission.id,
            permissionKey,
          };
        })
        .filter((row): row is NonNullable<typeof row> => Boolean(row));
    })
  );

  const defaultPositionMappings = defaultProfiles.flatMap((profile) =>
    profile.positionKeys.flatMap((positionKey) => {
      const position = positionByNormalizedKey.get(normalizeRbacKey(positionKey));
      if (!position) return [];
      return profile.permissionKeys
        .map((permissionKey) => {
          const permission = permissionByKey.get(permissionKey);
          if (!permission) return null;
          return {
            profileKey: profile.key,
            positionId: position.id,
            positionKey: position.key,
            permissionId: permission.id,
            permissionKey,
          };
        })
        .filter((row): row is NonNullable<typeof row> => Boolean(row));
    })
  );

  return {
    defaultProfiles,
    defaultRoleMappings,
    defaultPositionMappings,
    permissionMeta: permissionRows.map((permission) => ({
      permissionId: permission.id,
      permissionKey: permission.key,
      ...getPermissionDisplayMeta(permission.key, permission.description),
    })),
  };
}

export async function setRolePermissionMappings(roleId: string, permissionIds: string[]) {
  await db.transaction(async (tx) => {
    const existing = await tx
      .select({ permissionId: rolePermissions.permissionId })
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, roleId));

    const existingIds = existing.map((row) => row.permissionId);
    const desiredIds = Array.from(new Set(permissionIds));
    const toInsert = desiredIds.filter((id) => !existingIds.includes(id));
    const toDelete = existingIds.filter((id) => !desiredIds.includes(id));

    if (toInsert.length > 0) {
      await tx
        .insert(rolePermissions)
        .values(toInsert.map((permissionId) => ({ roleId, permissionId })))
        .onConflictDoNothing();
    }
    if (toDelete.length > 0) {
      await tx.delete(rolePermissions).where(and(eq(rolePermissions.roleId, roleId), inArray(rolePermissions.permissionId, toDelete)));
    }
  });

  await bumpPolicyVersionAndInvalidate();
}

export async function setPositionPermissionMappings(positionId: string, permissionIds: string[]) {
  await db.transaction(async (tx) => {
    const existing = await tx
      .select({ permissionId: positionPermissions.permissionId })
      .from(positionPermissions)
      .where(eq(positionPermissions.positionId, positionId));

    const existingIds = existing.map((row) => row.permissionId);
    const desiredIds = Array.from(new Set(permissionIds));
    const toInsert = desiredIds.filter((id) => !existingIds.includes(id));
    const toDelete = existingIds.filter((id) => !desiredIds.includes(id));

    if (toInsert.length > 0) {
      await tx
        .insert(positionPermissions)
        .values(toInsert.map((permissionId) => ({ positionId, permissionId })))
        .onConflictDoNothing();
    }
    if (toDelete.length > 0) {
      await tx
        .delete(positionPermissions)
        .where(and(eq(positionPermissions.positionId, positionId), inArray(positionPermissions.permissionId, toDelete)));
    }
  });

  await bumpPolicyVersionAndInvalidate();
}

export async function listFieldRules(input: { permissionId?: string; positionId?: string; roleId?: string } = {}) {
  const filters: any[] = [];
  if (input.permissionId) filters.push(eq(permissionFieldRules.permissionId, input.permissionId));
  if (input.positionId) filters.push(eq(permissionFieldRules.positionId, input.positionId));
  if (input.roleId) filters.push(eq(permissionFieldRules.roleId, input.roleId));

  const rows = await db
    .select({
      id: permissionFieldRules.id,
      permissionId: permissionFieldRules.permissionId,
      permissionKey: permissions.key,
      positionId: permissionFieldRules.positionId,
      positionKey: positions.key,
      roleId: permissionFieldRules.roleId,
      roleKey: roles.key,
      mode: permissionFieldRules.mode,
      fields: permissionFieldRules.fields,
      note: permissionFieldRules.note,
      createdAt: permissionFieldRules.createdAt,
      updatedAt: permissionFieldRules.updatedAt,
    })
    .from(permissionFieldRules)
    .innerJoin(permissions, eq(permissions.id, permissionFieldRules.permissionId))
    .leftJoin(positions, eq(positions.id, permissionFieldRules.positionId))
    .leftJoin(roles, eq(roles.id, permissionFieldRules.roleId))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(asc(permissions.key));

  return rows.map((row) => ({
    ...row,
    defaultRule: false,
    customRule: true,
  }));
}

export function getRbacDefaultFieldRuleMetadata() {
  return {
    defaultFieldRules: getRbacDefaultFieldRules(),
    missingDefaultFieldRules: [],
  };
}

export async function createFieldRule(input: {
  permissionId: string;
  positionId?: string | null;
  roleId?: string | null;
  mode: 'ALLOW' | 'DENY' | 'OMIT' | 'MASK';
  fields?: string[];
  note?: string | null;
}) {
  const hasPosition = Boolean(input.positionId);
  const hasRole = Boolean(input.roleId);
  if (hasPosition === hasRole) {
    throw new ApiError(
      400,
      'Exactly one of positionId or roleId is required for a field rule.',
      'bad_request'
    );
  }

  const [created] = await db
    .insert(permissionFieldRules)
    .values({
      permissionId: input.permissionId,
      positionId: input.positionId ?? null,
      roleId: input.roleId ?? null,
      mode: input.mode,
      fields: input.fields ?? [],
      note: input.note ?? null,
    })
    .returning({
      id: permissionFieldRules.id,
      permissionId: permissionFieldRules.permissionId,
      positionId: permissionFieldRules.positionId,
      roleId: permissionFieldRules.roleId,
      mode: permissionFieldRules.mode,
      fields: permissionFieldRules.fields,
      note: permissionFieldRules.note,
    });

  await bumpPolicyVersionAndInvalidate();
  return created;
}

export async function updateFieldRule(
  ruleId: string,
  input: {
    mode?: 'ALLOW' | 'DENY' | 'OMIT' | 'MASK';
    fields?: string[];
    note?: string | null;
    positionId?: string | null;
    roleId?: string | null;
  }
) {
  const [existing] = await db
    .select({
      positionId: permissionFieldRules.positionId,
      roleId: permissionFieldRules.roleId,
    })
    .from(permissionFieldRules)
    .where(eq(permissionFieldRules.id, ruleId))
    .limit(1);

  if (!existing) return undefined;

  const nextPositionId = input.positionId !== undefined ? input.positionId : existing.positionId;
  const nextRoleId = input.roleId !== undefined ? input.roleId : existing.roleId;
  if (Boolean(nextPositionId) === Boolean(nextRoleId)) {
    throw new ApiError(
      400,
      'Exactly one of positionId or roleId is required for a field rule.',
      'bad_request'
    );
  }

  const [updated] = await db
    .update(permissionFieldRules)
    .set({
      ...(input.mode !== undefined ? { mode: input.mode } : {}),
      ...(input.fields !== undefined ? { fields: input.fields } : {}),
      ...(input.note !== undefined ? { note: input.note ?? null } : {}),
      ...(input.positionId !== undefined ? { positionId: input.positionId ?? null } : {}),
      ...(input.roleId !== undefined ? { roleId: input.roleId ?? null } : {}),
      updatedAt: new Date(),
    })
    .where(eq(permissionFieldRules.id, ruleId))
    .returning({
      id: permissionFieldRules.id,
      permissionId: permissionFieldRules.permissionId,
      positionId: permissionFieldRules.positionId,
      roleId: permissionFieldRules.roleId,
      mode: permissionFieldRules.mode,
      fields: permissionFieldRules.fields,
      note: permissionFieldRules.note,
    });

  await bumpPolicyVersionAndInvalidate();
  return updated;
}

export async function deleteFieldRule(ruleId: string) {
  const [deleted] = await db
    .delete(permissionFieldRules)
    .where(eq(permissionFieldRules.id, ruleId))
    .returning({
      id: permissionFieldRules.id,
      permissionId: permissionFieldRules.permissionId,
    });

  await bumpPolicyVersionAndInvalidate();
  return deleted;
}

async function bumpPolicyVersionAndInvalidate() {
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
