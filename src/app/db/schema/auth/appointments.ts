// src/app/db/schema/auth/appointments.ts
import { pgTable, uuid, timestamp, text } from 'drizzle-orm/pg-core';
import { users } from './users';
import { positions } from './positions';
import { assignmentKind, scopeTypeEnum } from './enums';

export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  positionId: uuid('position_id').notNull().references(() => positions.id, { onDelete: 'restrict' }),
  assignment: assignmentKind('assignment').notNull().default('PRIMARY'),
  scopeType: scopeTypeEnum('scope_type').notNull().default('GLOBAL'),
  scopeId: uuid('scope_id'),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  appointedBy: uuid('appointed_by').references(() => users.id, { onDelete: 'set null' }),
  endedBy: uuid('ended_by').references(() => users.id, { onDelete: 'set null' }),
  reason: text('reason'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
