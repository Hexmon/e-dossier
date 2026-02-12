import { and, asc, eq, ilike, inArray } from 'drizzle-orm';
import { db } from '../client';
import { authzPolicyState, permissionFieldRules } from '../schema/auth/rbac-extensions';
import { permissions, positionPermissions, rolePermissions, roles } from '../schema/auth/rbac';
import { positions } from '../schema/auth/positions';
import { clearEffectivePermissionsCache } from '@/app/lib/acx/cache';

type Paging = {
  q?: string;
  limit?: number;
  offset?: number;
};

export async function listRbacPermissions(input: Paging = {}) {
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const q = input.q?.trim();

  const rows = await db
    .select({
      id: permissions.id,
      key: permissions.key,
      description: permissions.description,
    })
    .from(permissions)
    .where(q ? ilike(permissions.key, `%${q}%`) : undefined)
    .orderBy(asc(permissions.key))
    .limit(limit)
    .offset(offset);

  return rows;
}

export async function createRbacPermission(input: { key: string; description?: string | null }) {
  const [created] = await db
    .insert(permissions)
    .values({
      key: input.key.trim(),
      description: input.description ?? null,
    })
    .returning({
      id: permissions.id,
      key: permissions.key,
      description: permissions.description,
    });

  await bumpPolicyVersionAndInvalidate();
  return created;
}

export async function updateRbacPermission(
  permissionId: string,
  input: { key?: string; description?: string | null }
) {
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
  return updated;
}

export async function deleteRbacPermission(permissionId: string) {
  const [deleted] = await db
    .delete(permissions)
    .where(eq(permissions.id, permissionId))
    .returning({ id: permissions.id, key: permissions.key });
  await bumpPolicyVersionAndInvalidate();
  return deleted;
}

export async function listRbacRoles() {
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
  return db
    .select({ id: positions.id, key: positions.key, displayName: positions.displayName })
    .from(positions)
    .orderBy(asc(positions.key));
}

export async function listRolePermissionMappings(roleId?: string) {
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

  return rows;
}

export async function createFieldRule(input: {
  permissionId: string;
  positionId?: string | null;
  roleId?: string | null;
  mode: 'ALLOW' | 'DENY' | 'OMIT' | 'MASK';
  fields?: string[];
  note?: string | null;
}) {
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
