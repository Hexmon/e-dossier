// src/app/db/schema/auth/platoons.ts
import { pgTable, uuid, varchar, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { DEFAULT_PLATOON_THEME_COLOR } from '@/lib/platoon-theme';

export const platoons = pgTable('platoons', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 64 }).notNull(),
  name: varchar('name', { length: 128 }).notNull(),
  about: text('about'),
  themeColor: varchar('theme_color', { length: 7 }).notNull().default(DEFAULT_PLATOON_THEME_COLOR),
  imageUrl: text('image_url'),
  imageObjectKey: text('image_object_key'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
  uq: uniqueIndex('uq_platoons_key').on(t.key),
}));
