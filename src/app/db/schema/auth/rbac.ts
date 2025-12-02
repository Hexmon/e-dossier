// src\app\db\schema\auth\rbac.ts
import { pgTable, uuid, varchar, text, primaryKey } from 'drizzle-orm/pg-core';
import { positions } from './positions';

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 64 }).notNull(),          // 'admin','guest','commandant',...
  description: text('description'),
});

export const permissions = pgTable('permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 128 }).notNull(),         // 'user.reset_password','delegation.grant',...
  description: text('description'),
});

export const positionPermissions = pgTable('position_permissions', {
  positionId: uuid('position_id').notNull().references(() => positions.id, { onDelete: 'cascade' }),
  permissionId: uuid('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
}, (t) => ({
  pk: primaryKey({ columns: [t.positionId, t.permissionId] }),
}));

export const rolePermissions = pgTable('role_permissions', {
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: uuid('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
}, (t) => ({
  pk: primaryKey({ columns: [t.roleId, t.permissionId] }),
}));

// export const userRoles = pgTable('user_roles', {
//   userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
//   roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
// }, (t) => ({
//   pk: primaryKey({ columns: [t.userId, t.roleId] }),
// }));

// export const userGuestAccess = pgTable('user_guest_access', {
//   userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
//   expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
// });
