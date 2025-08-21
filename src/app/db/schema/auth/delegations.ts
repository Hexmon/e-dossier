// src/app/db/schema/auth/delegations.ts
import { pgTable, uuid, timestamp, text } from 'drizzle-orm/pg-core';
import { users } from './users';
import { platoons } from './platoons';
import { positionType, scopeTypeEnum } from './enums';

export const delegations = pgTable('delegations', {
  id: uuid('id').primaryKey().defaultRandom(),

  grantorUserId: uuid('grantor_user_id').notNull()
    .references(() => users.id, { onDelete: 'restrict' }),

  granteeUserId: uuid('grantee_user_id').notNull()
    .references(() => users.id, { onDelete: 'restrict' }),

  // FIX: column name aligned to SQL
  actAsPosition: positionType('act_as').notNull(),

  scopeType: scopeTypeEnum('scope_type').notNull().default('GLOBAL'),   // FIX: notNull + default
  scopeId: uuid('scope_id').references(() => platoons.id),

  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }),

  reason: text('reason'),
  terminatedBy: uuid('terminated_by').references(() => users.id, { onDelete: 'set null' }),

  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
// NOTE: valid_during + EXCLUDE + grantor!=grantee added in SQL migration.
