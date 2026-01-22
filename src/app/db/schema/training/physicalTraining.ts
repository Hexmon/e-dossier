import { pgTable, uuid, varchar, timestamp, integer, boolean, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Physical training templates (admin-managed, global)
// ---------------------------------------------------------------------------
export const ptTypes = pgTable('pt_types', {
    id: uuid('id').primaryKey().defaultRandom(),
    semester: integer('semester').notNull(),
    code: varchar('code', { length: 32 }).notNull(),
    title: varchar('title', { length: 160 }).notNull(),
    description: text('description'),
    maxTotalMarks: integer('max_total_marks').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
    uqSemesterCode: uniqueIndex('uq_pt_type_semester_code').on(t.semester, t.code),
    semCheck: { check: sql`CHECK (${t.semester.name} BETWEEN 1 AND 6)` },
}));

export const ptTypeAttempts = pgTable('pt_type_attempts', {
    id: uuid('id').primaryKey().defaultRandom(),
    ptTypeId: uuid('pt_type_id')
        .notNull()
        .references(() => ptTypes.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 16 }).notNull(),
    label: varchar('label', { length: 64 }).notNull(),
    isCompensatory: boolean('is_compensatory').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
    uqAttemptPerType: uniqueIndex('uq_pt_attempt_per_type').on(t.ptTypeId, t.code),
}));

export const ptAttemptGrades = pgTable('pt_attempt_grades', {
    id: uuid('id').primaryKey().defaultRandom(),
    ptAttemptId: uuid('pt_attempt_id')
        .notNull()
        .references(() => ptTypeAttempts.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 8 }).notNull(),
    label: varchar('label', { length: 64 }).notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
    uqGradePerAttempt: uniqueIndex('uq_pt_grade_per_attempt').on(t.ptAttemptId, t.code),
}));

export const ptTasks = pgTable('pt_tasks', {
    id: uuid('id').primaryKey().defaultRandom(),
    ptTypeId: uuid('pt_type_id')
        .notNull()
        .references(() => ptTypes.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 160 }).notNull(),
    maxMarks: integer('max_marks').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const ptTaskScores = pgTable('pt_task_scores', {
    id: uuid('id').primaryKey().defaultRandom(),
    ptTaskId: uuid('pt_task_id')
        .notNull()
        .references(() => ptTasks.id, { onDelete: 'cascade' }),
    ptAttemptId: uuid('pt_attempt_id')
        .notNull()
        .references(() => ptTypeAttempts.id, { onDelete: 'cascade' }),
    ptAttemptGradeId: uuid('pt_attempt_grade_id')
        .notNull()
        .references(() => ptAttemptGrades.id, { onDelete: 'cascade' }),
    maxMarks: integer('max_marks').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
    uqTaskAttemptGrade: uniqueIndex('uq_pt_task_attempt_grade').on(t.ptTaskId, t.ptAttemptId, t.ptAttemptGradeId),
    maxNonNegative: { check: sql`CHECK (${t.maxMarks.name} >= 0)` },
}));

export const ptMotivationAwardFields = pgTable('pt_motivation_award_fields', {
    id: uuid('id').primaryKey().defaultRandom(),
    semester: integer('semester').notNull(),
    label: varchar('label', { length: 160 }).notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
    uqFieldPerSemester: uniqueIndex('uq_pt_motivation_field_semester').on(t.semester, t.label),
    semCheck: { check: sql`CHECK (${t.semester.name} BETWEEN 1 AND 6)` },
}));
