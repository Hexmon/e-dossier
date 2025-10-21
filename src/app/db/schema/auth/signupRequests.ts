// src\app\db\schema\auth\signupRequests.ts
import { pgTable, uuid, text, timestamp, jsonb, varchar, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { positions } from './positions';
import { scopeTypeEnum } from './enums';

export const signupRequests = pgTable('signup_requests', {
    id: uuid('id').primaryKey().defaultRandom(),

    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),

    desiredPositionId: uuid('desired_position_id')
        .references(() => positions.id, { onDelete: 'set null' }),

    desiredScopeType: scopeTypeEnum('desired_scope_type').notNull().default('GLOBAL'),
    desiredScopeId: uuid('desired_scope_id'),

    note: text('note'),
    status: varchar('status', { length: 16 }).notNull().default('pending'), // pending|approved|rejected|cancelled

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolvedBy: uuid('resolved_by').references(() => users.id, { onDelete: 'set null' }),
    adminReason: text('admin_reason'),
    payload: jsonb('payload'),
}, (t) => ({
    ixStatus: index('ix_signup_requests_status').on(t.status),
    ixCreated: index('ix_signup_requests_created_at').on(t.createdAt),
}));
