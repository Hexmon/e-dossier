// src/app/db/schema/auth/users.ts
import { pgTable, uuid, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';
import { positions } from './positions';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username', { length: 64 }).notNull(),  // partial unique via SQL
  email: varchar('email', { length: 255 }).notNull(),                 // partial unique via SQL
  phone: varchar('phone', { length: 32 }).notNull(),                  // partial unique via SQL
  name: varchar('name', { length: 120 }).notNull(),
  // usertype: varchar('usertype', { length: 64 }).notNull(),
  rank: varchar('rank', { length: 64 }).notNull(),
  appointId: uuid('appoint_id').references(() => positions.id, { onDelete: 'set null' }),
  isActive: boolean('is_active').notNull().default(true),
  deactivatedAt: timestamp('deactivated_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
