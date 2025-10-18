// src/app/db/seeds/seedRolesAndPermissions.ts
import { db } from '../client';
import { roles, permissions, rolePermissions } from '../schema/auth/rbac';
import { eq, and } from 'drizzle-orm';

/**
 * Seed *roles* (RBAC buckets) and *permissions* (module:resource:action).
 * NOTE: Positions (COMMANDANT, etc.) come from the positions table and are enforced via appointments.
 */
export async function seedRolesAndPermissions() {
  // Keep roles small & meaningful. Positions are NOT roles.
  const roleKeys = ['admin', 'guest'] as const;

  // Suggested permission taxonomy
  const permKeys = [
    // users/accounts
    'users:account:create',
    'users:account:read',
    'users:account:update',
    'users:account:deactivate',
    'users:credential:reset',

    // positions catalog (readable for UI)
    'catalog:positions:read',
    'catalog:platoons:read',

    // appointments (the ledger of authority)
    'appointments:appointment:create',
    'appointments:appointment:end',
    'appointments:appointment:read',

    // delegations
    'delegations:grant:create',
    'delegations:grant:end',
    'delegations:grant:read',

    // RBAC graph
    'rbac:role:read',
    'rbac:role:update',
    'rbac:permission:read',
    'rbac:permission:update',

    // signup requests
    'signup:request:read',
    'signup:request:approve',
    'signup:request:reject',
    'signup:request:delete',
  ];

  // Upsert roles
  for (const key of roleKeys) {
    const [existing] = await db.select().from(roles).where(eq(roles.key, key)).limit(1);
    if (!existing) {
      await db.insert(roles).values({ key, description: key.toUpperCase() }).returning();
    }
  }

  // Upsert permissions
  for (const key of permKeys) {
    const [existing] = await db.select().from(permissions).where(eq(permissions.key, key)).limit(1);
    if (!existing) {
      await db.insert(permissions).values({ key, description: key }).returning();
    }
  }

  // Map admin -> all permissions
  const allPerms = await db.select().from(permissions);
  const [adminRole] = await db.select().from(roles).where(eq(roles.key, 'admin')).limit(1);

  for (const p of allPerms) {
    const [link] = await db
      .select()
      .from(rolePermissions)
      .where(and(eq(rolePermissions.roleId, adminRole.id), eq(rolePermissions.permissionId, p.id)))
      .limit(1);

    if (!link) {
      await db
        .insert(rolePermissions)
        .values({ roleId: adminRole.id, permissionId: p.id })
        .onConflictDoNothing();
    }
  }

  console.log('✅ Roles & permissions seeded (admin has all).');
}
