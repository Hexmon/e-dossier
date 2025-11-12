// src/app/db/schema/auth/login_attempts.ts
// SECURITY FIX: Track login attempts for account lockout mechanism
import { pgTable, uuid, varchar, timestamp, boolean, integer } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Login Attempts Table
 * Tracks all login attempts (successful and failed) for security monitoring
 */
export const loginAttempts = pgTable('login_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  username: varchar('username', { length: 255 }).notNull(),
  ipAddress: varchar('ip_address', { length: 64 }).notNull(),
  userAgent: varchar('user_agent', { length: 512 }),
  success: boolean('success').notNull().default(false),
  failureReason: varchar('failure_reason', { length: 255 }),
  attemptedAt: timestamp('attempted_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Account Lockouts Table
 * Tracks account lockouts after multiple failed login attempts
 */
export const accountLockouts = pgTable('account_lockouts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  lockedAt: timestamp('locked_at', { withTimezone: true }).notNull().defaultNow(),
  lockedUntil: timestamp('locked_until', { withTimezone: true }).notNull(),
  failedAttempts: integer('failed_attempts').notNull().default(0),
  ipAddress: varchar('ip_address', { length: 64 }),
  unlocked: boolean('unlocked').notNull().default(false),
  unlockedAt: timestamp('unlocked_at', { withTimezone: true }),
  unlockedBy: uuid('unlocked_by').references(() => users.id, { onDelete: 'set null' }),
  reason: varchar('reason', { length: 255 }),
});

