import { pgTable, uuid, varchar, text, integer, boolean, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const subjects = pgTable('subjects', {
    id: uuid('id').primaryKey().defaultRandom(),
    code: varchar('code', { length: 32 }).notNull(),            // e.g. 'PHY101'
    name: varchar('name', { length: 160 }).notNull(),
    branch: varchar('branch', { length: 1 }).notNull(),         // 'C' | 'E' | 'M'  (Common / Electrical / Mechanical)
    hasTheory: boolean('has_theory').notNull().default(true),
    hasPractical: boolean('has_practical').notNull().default(false),
    defaultTheoryCredits: integer('default_theory_credits'),
    defaultPracticalCredits: integer('default_practical_credits'),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
    uqSubjectCode: uniqueIndex('uq_subjects_code').on(t.code),
}));
