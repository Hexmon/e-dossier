import { sql } from 'drizzle-orm';
import { check, pgEnum, pgTable, text, timestamp, uuid, varchar, integer, uniqueIndex } from 'drizzle-orm/pg-core';
import { permissions, roles } from './rbac';
import { positions } from './positions';

export const fieldRuleModeEnum = pgEnum('field_rule_mode', ['ALLOW', 'DENY', 'OMIT', 'MASK']);

export const permissionFieldRules = pgTable(
  'permission_field_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
    positionId: uuid('position_id').references(() => positions.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id').references(() => roles.id, { onDelete: 'cascade' }),
    mode: fieldRuleModeEnum('mode').notNull().default('ALLOW'),
    fields: text('fields')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqRulePerScope: uniqueIndex('ux_permission_field_rules_scope').on(
      t.permissionId,
      t.positionId,
      t.roleId,
      t.mode
    ),
    mustBindRoleOrPosition: check(
      'chk_permission_field_rules_scope',
      sql`(${t.positionId} IS NOT NULL OR ${t.roleId} IS NOT NULL)`
    ),
  })
);

export const authzPolicyState = pgTable('authz_policy_state', {
  key: varchar('key', { length: 64 }).primaryKey(),
  version: integer('version').notNull().default(1),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

