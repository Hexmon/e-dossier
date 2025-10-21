// src/app/db/schema/auth/appointmentTransfers.ts
import { pgTable, uuid, timestamp, text } from 'drizzle-orm/pg-core';
import { appointments } from '../auth/appointments';
import { positions } from '../auth/positions';
import { users } from '../auth/users';

export const appointmentTransfers = pgTable('appointment_transfers', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Links to old & new appointment rows for traceability
  fromAppointmentId: uuid('from_appointment_id').notNull().references(() => appointments.id, { onDelete: 'cascade' }),
  toAppointmentId: uuid('to_appointment_id').notNull().references(() => appointments.id, { onDelete: 'cascade' }),

  // Who was replaced and who took over
  fromUserId: uuid('from_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  toUserId: uuid('to_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),

  // Position / scope snapshot at the time of transfer
  positionId: uuid('position_id').notNull().references(() => positions.id, { onDelete: 'restrict' }),
  scopeType: text('scope_type').notNull(), // 'GLOBAL' | 'PLATOON'
  scopeId: uuid('scope_id'),

  // Windows
  prevStartsAt: timestamp('prev_starts_at', { withTimezone: true }).notNull(),
  prevEndsAt: timestamp('prev_ends_at', { withTimezone: true }).notNull(),
  newStartsAt: timestamp('new_starts_at', { withTimezone: true }).notNull(),

  // Meta
  reason: text('reason'),
  transferredBy: uuid('transferred_by').notNull().references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
