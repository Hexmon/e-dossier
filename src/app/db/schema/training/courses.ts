import { pgTable, uuid, varchar, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const courses = pgTable('courses', {
    id: uuid('id').primaryKey().defaultRandom(),
    code: varchar('code', { length: 32 }).notNull(),         // e.g. 'TES-50' (unique)
    title: varchar('title', { length: 160 }).notNull(),      // human label (e.g., "TES 50 Intake")
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
    uqCode: uniqueIndex('uq_courses_code_active').on(t.code), // keep unique by code
}));
