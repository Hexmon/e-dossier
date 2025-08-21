// src/db/seeds/seedRolesAndPermissions.ts
import { db } from '../client';
import { roles, permissions, rolePermissions } from '../schema/auth/rbac';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export async function seedRolesAndPermissions() {
  const roleKeys = [
    'admin','guest','commandant','deputy_commandant','hoat','deputy_secretary','platoon_commander','clerk'
  ];
  const permKeys = [
    'user.read','user.reset_password','user.deactivate',
    'appointment.create','appointment.end',
    'delegation.grant','delegation.end',
    'clerk.create','clerk.activate','clerk.deactivate'
  ];

  // upsert roles
  for (const key of roleKeys) {
    const [existing] = await db.select().from(roles).where(eq(roles.key, key));
    if (!existing) {
      await db.insert(roles).values({ id: randomUUID(), key, description: key.replace('_', ' ') });
    }
  }

  // upsert permissions
  for (const key of permKeys) {
    const [existing] = await db.select().from(permissions).where(eq(permissions.key, key));
    if (!existing) {
      await db.insert(permissions).values({ id: randomUUID(), key, description: key });
    }
  }

  // map admin -> all permissions
  const allPerms = await db.select().from(permissions);
  const [adminRole] = await db.select().from(roles).where(eq(roles.key, 'admin'));

  for (const p of allPerms) {
    const [link] = await db
      .select()
      .from(rolePermissions)
      .where(and(eq(rolePermissions.roleId, adminRole.id), eq(rolePermissions.permissionId, p.id)));
    if (!link) {
      await db
        .insert(rolePermissions)
        .values({ roleId: adminRole.id, permissionId: p.id })
        .onConflictDoNothing();
    }
  }
}
