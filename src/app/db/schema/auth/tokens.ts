// src/app/db/schema/auth/tokens.ts
import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const refreshTokens = pgTable('refresh_tokens', {
  jti: uuid('jti').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  replacedByJti: uuid('replaced_by_jti'),
}, (t) => ({
  ixUser: index('ix_refresh_user').on(t.userId),
  ixExp: index('ix_refresh_expires').on(t.expiresAt),
  ixReplacedBy: index('ix_refresh_replaced_by').on(t.replacedByJti),
}));
