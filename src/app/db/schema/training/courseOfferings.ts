import { pgTable, uuid, smallint, integer, boolean, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { courses } from './courses';
import { subjects } from './subjects';
import { instructors } from './instructors';

export const courseOfferings = pgTable('course_offerings', {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id').notNull().references(() => subjects.id, { onDelete: 'restrict' }),
    semester: smallint('semester').notNull(),
    includeTheory: boolean('include_theory').notNull().default(true),
    includePractical: boolean('include_practical').notNull().default(false),
    theoryCredits: integer('theory_credits'),
    practicalCredits: integer('practical_credits'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
    uqPerCourse: uniqueIndex('uq_course_offering').on(t.courseId, t.subjectId, t.semester),
}));

export const courseOfferingInstructors = pgTable('course_offering_instructors', {
    id: uuid('id').primaryKey().defaultRandom(),
    offeringId: uuid('offering_id').notNull().references(() => courseOfferings.id, { onDelete: 'cascade' }),
    instructorId: uuid('instructor_id').notNull().references(() => instructors.id, { onDelete: 'restrict' }),
    role: varchar('role', { length: 24 }).notNull().default('PRIMARY'), // 'PRIMARY'|'ASSISTANT'
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
    uqAssign: uniqueIndex('uq_offering_instructor').on(t.offeringId, t.instructorId),
}));
