// // src/db/queries/authz.ts
// import { db } from '../client';
// import { userRoles, roles, rolePermissions, permissions } from '../schema/auth/rbac';
// import { and, eq, sql, inArray } from 'drizzle-orm';

// class ForbiddenError extends Error {
//   status = 403 as const;
//   constructor(message = 'Forbidden') { super(message); }
// }

// export async function hasPermission(userId: string, permKey: string): Promise<boolean> {
//   const [row] = await db
//     .select({ count: sql<number>`count(*)` })
//     .from(userRoles)
//     .innerJoin(roles, eq(userRoles.roleId, roles.id))
//     .innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
//     .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
//     .where(and(eq(userRoles.userId, userId), eq(permissions.key, permKey)));

//   return !!row && row.count > 0;
// }

// export async function assertPermission(userId: string, permKey: string) {
//   if (!(await hasPermission(userId, permKey))) {
//     throw new ForbiddenError();
//   }
// }

// export async function grantRoles(userId: string, roleKeys: string[]) {
//   const rows = await db.select().from(roles).where(inArray(roles.key, roleKeys));
//   for (const r of rows) {
//     // If you're on drizzle-orm >=0.44, composite target example shown:
//     await db
//       .insert(userRoles)
//       .values({ userId, roleId: r.id })
//       .onConflictDoNothing();
//     // If you prefer strict target:
//     // .onConflictDoNothing({ target: [userRoles.userId, userRoles.roleId] });
//   }
// }

import { db } from '../client';
import { positions } from '../schema/auth/positions';
import { permissions, positionPermissions } from '../schema/auth/rbac';
import { and, eq, inArray } from 'drizzle-orm';

/** jwtRoles = [ positionKey ] in this model */
export async function hasPermissionFromTokenPositions(jwtRoles: string[], permKey: string): Promise<boolean> {
  if (!Array.isArray(jwtRoles) || jwtRoles.length === 0) return false;

  const posRows = await db
    .select({ id: positions.id })
    .from(positions)
    .where(inArray(positions.key, jwtRoles));

  if (posRows.length === 0) return false;

  const posIds = posRows.map(p => p.id);

  const [row] = await db
    .select({ ok: permissions.key })
    .from(positionPermissions)
    .innerJoin(permissions, eq(positionPermissions.permissionId, permissions.id))
    .where(and(inArray(positionPermissions.positionId, posIds), eq(permissions.key, permKey)))
    .limit(1);

  return !!row;
}

export async function assertPermissionFromTokenPositions(jwtRoles: string[], permKey: string) {
  const ok = await hasPermissionFromTokenPositions(jwtRoles, permKey);
  if (!ok) {
    const e: any = new Error('Forbidden');
    e.status = 403;
    throw e;
  }
}
