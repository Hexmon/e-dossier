import { pgTable, uuid, varchar, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  eventType: varchar('event_type', { length: 96 }).notNull(),
  resourceType: varchar('resource_type', { length: 96 }).notNull(),
  resourceId: uuid('resource_id'),
  description: text('description'),
  metadata: jsonb('metadata'),
  ipAddr: varchar('ip_addr', { length: 64 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
