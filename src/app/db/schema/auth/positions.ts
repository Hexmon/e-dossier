// src\app\db\schema\auth\positions.ts
import { pgTable, uuid, varchar, boolean, text, timestamp } from 'drizzle-orm/pg-core';

export const positions = pgTable('positions', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 64 }).notNull().unique(),  // e.g. 'PLATOON_COMMANDER'
  displayName: varchar('display_name', { length: 128 }),   // e.g. 'Platoon Commander'
  defaultScope: varchar('default_scope', { length: 16 }).notNull(), // 'GLOBAL' | 'PLATOON'
  singleton: boolean('singleton').notNull().default(true), // one active holder per slot
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
