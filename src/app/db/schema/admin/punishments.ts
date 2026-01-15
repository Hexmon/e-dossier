import { pgTable, uuid, varchar, integer, timestamp } from 'drizzle-orm/pg-core';

export const punishments = pgTable('punishments', {
    id: uuid('id').primaryKey().defaultRandom(),
    title: varchar('title', { length: 160 }).notNull(),
    marksDeduction: integer('marks_deduction'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
