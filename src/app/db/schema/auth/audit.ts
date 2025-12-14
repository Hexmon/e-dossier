import { pgTable, uuid, varchar, text, jsonb, timestamp, integer } from 'drizzle-orm/pg-core';
import { users } from './users';

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  tenantId: uuid('tenant_id'),
  eventType: varchar('event_type', { length: 96 }).notNull(),
  resourceType: varchar('resource_type', { length: 96 }).notNull(),
  resourceId: uuid('resource_id'),
  method: varchar('method', { length: 16 }),
  path: varchar('path', { length: 512 }),
  statusCode: integer('status_code'),
  outcome: varchar('outcome', { length: 32 }),
  requestId: uuid('request_id'),
  description: text('description'),
  metadata: jsonb('metadata'),
  changedFields: text('changed_fields').array(),
  diff: jsonb('diff'),
  ipAddr: varchar('ip_addr', { length: 64 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
