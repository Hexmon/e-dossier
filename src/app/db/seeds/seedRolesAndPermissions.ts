// src/app/db/seeds/seedRolesAndPermissions.ts
import { db } from '../client';
import { roles, permissions, rolePermissions, positionPermissions } from '../schema/auth/rbac';
import { positions } from '../schema/auth/positions';
import { eq, and } from 'drizzle-orm';

/**
 * Seeds roles, permissions (CRUD across modules + legacy keys), and links:
 * - admin + super_admin roles get all permissions
 * - SUPER_ADMIN position gets all permissions via position_permissions
 */
export async function seedRolesAndPermissions() {
  const roleKeys = ['super_admin', 'admin', 'guest'] as const;

  // CRUD perms for core modules
  const crudModules = [
    'users',
    'positions',
    'platoons',
    'appointments',
    'delegations',
    'signup_requests',
    'roles',
    'permissions',
    'courses',
    'subjects',
    'instructors',
    'course_offerings',
    'oc_cadets',
    'oc_personal',
    'oc_education',
    'oc_achievements',
    'oc_autobiography',
    'oc_ssb',
    'oc_medicals',
    'oc_discipline',
    'oc_parent_comms',
    'oc_motivation',
    'oc_sports',
    'oc_weapon_training',
    'oc_camps',
    'training_camp_activities',
    'oc_olq',
    'oc_credit_for_excellence',
    'oc_clubs',
    'oc_counselling',
  ];
  const actions = ['create', 'read', 'update', 'delete'] as const;

  const permSet = new Set<string>();
  crudModules.forEach((mod) => actions.forEach((act) => permSet.add(`${mod}:${act}`)));

  // Legacy/specific perms kept for compatibility
  [
    'users:account:create',
    'users:account:read',
    'users:account:update',
    'users:account:deactivate',
    'users:credential:reset',
    'catalog:positions:read',
    'catalog:platoons:read',
    'appointments:appointment:create',
    'appointments:appointment:end',
    'appointments:appointment:read',
    'delegations:grant:create',
    'delegations:grant:end',
    'delegations:grant:read',
    'rbac:role:read',
    'rbac:role:update',
    'rbac:permission:read',
    'rbac:permission:update',
    'signup:request:read',
    'signup:request:approve',
    'signup:request:reject',
    'signup:request:delete',
  ].forEach((p) => permSet.add(p));

  const permKeys = Array.from(permSet);

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

  const allPerms = await db.select().from(permissions);
  const roleRecords = await db.select().from(roles);
  const adminRole = roleRecords.find((r) => r.key === 'admin');
  const superAdminRole = roleRecords.find((r) => r.key === 'super_admin');

  // Link roles -> permissions
  for (const p of allPerms) {
    if (adminRole) {
      const [link] = await db
        .select()
        .from(rolePermissions)
        .where(and(eq(rolePermissions.roleId, adminRole.id), eq(rolePermissions.permissionId, p.id)))
        .limit(1);
      if (!link) {
        await db.insert(rolePermissions).values({ roleId: adminRole.id, permissionId: p.id }).onConflictDoNothing();
      }
    }

    if (superAdminRole) {
      const [linkSA] = await db
        .select()
        .from(rolePermissions)
        .where(and(eq(rolePermissions.roleId, superAdminRole.id), eq(rolePermissions.permissionId, p.id)))
        .limit(1);
      if (!linkSA) {
        await db
          .insert(rolePermissions)
          .values({ roleId: superAdminRole.id, permissionId: p.id })
          .onConflictDoNothing();
      }
    }
  }

  // Ensure SUPER_ADMIN position exists
  let [superAdminPos] = await db.select().from(positions).where(eq(positions.key, 'SUPER_ADMIN')).limit(1);
  if (!superAdminPos) {
    [superAdminPos] = await db
      .insert(positions)
      .values({
        key: 'SUPER_ADMIN',
        displayName: 'Super Admin',
        defaultScope: 'GLOBAL',
        singleton: true,
        description: 'Position with full permissions',
      })
      .returning();
  }

  // Link SUPER_ADMIN position -> all permissions
  for (const p of allPerms) {
    const [pl] = await db
      .select()
      .from(positionPermissions)
      .where(and(eq(positionPermissions.positionId, superAdminPos.id), eq(positionPermissions.permissionId, p.id)))
      .limit(1);
    if (!pl) {
      await db
        .insert(positionPermissions)
        .values({ positionId: superAdminPos.id, permissionId: p.id })
        .onConflictDoNothing();
    }
  }

  console.log('バ. Roles & permissions seeded (admin + super_admin have all; SUPER_ADMIN position linked).');
}
