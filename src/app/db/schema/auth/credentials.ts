// src\app\db\schema\auth\credentials.ts
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';

export const credentialsLocal = pgTable('credentials_local', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'restrict' }),
  passwordHash: text('password_hash').notNull(),
  passwordAlgo: text('password_algo').notNull().default('argon2id'),
  passwordUpdatedAt: timestamp('password_updated_at', { withTimezone: true }).notNull().defaultNow(),
});