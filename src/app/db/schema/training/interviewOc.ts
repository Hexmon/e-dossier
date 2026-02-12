import { pgTable, uuid, varchar, timestamp, integer, text, boolean, date, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';
import { ocCadets } from './oc';
import { interviewTemplates, interviewTemplateFields, interviewTemplateGroups } from './interviewTemplates';

// ---------------------------------------------------------------------------
// OC interview records (values captured from templates)
// ---------------------------------------------------------------------------
export const ocInterviews = pgTable('oc_interviews', {
    id: uuid('id').primaryKey().defaultRandom(),
    ocId: uuid('oc_id').notNull().references(() => ocCadets.id, { onDelete: 'cascade' }),
    templateId: uuid('template_id').notNull().references(() => interviewTemplates.id, { onDelete: 'restrict' }),
    semester: integer('semester'),
    course: varchar('course', { length: 160 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const ocInterviewFieldValues = pgTable('oc_interview_field_values', {
    id: uuid('id').primaryKey().defaultRandom(),
    interviewId: uuid('interview_id').notNull().references(() => ocInterviews.id, { onDelete: 'cascade' }),
    fieldId: uuid('field_id').notNull().references(() => interviewTemplateFields.id, { onDelete: 'restrict' }),
    valueText: text('value_text'),
    valueDate: date('value_date', { mode: 'date' }),
    valueNumber: integer('value_number'),
    valueBool: boolean('value_bool'),
    valueJson: jsonb('value_json'),
    filedAt: date('filed_at', { mode: 'date' }),
    filedByName: varchar('filed_by_name', { length: 160 }),
    filedByRank: varchar('filed_by_rank', { length: 64 }),
    filedByAppointment: varchar('filed_by_appointment', { length: 128 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
    uqInterviewField: uniqueIndex('uq_oc_interview_field').on(t.interviewId, t.fieldId),
}));

export const ocInterviewGroupRows = pgTable('oc_interview_group_rows', {
    id: uuid('id').primaryKey().defaultRandom(),
    interviewId: uuid('interview_id').notNull().references(() => ocInterviews.id, { onDelete: 'cascade' }),
    groupId: uuid('group_id').notNull().references(() => interviewTemplateGroups.id, { onDelete: 'restrict' }),
    rowIndex: integer('row_index').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
    uqInterviewGroupRow: uniqueIndex('uq_oc_interview_group_row').on(t.interviewId, t.groupId, t.rowIndex),
}));

export const ocInterviewGroupValues = pgTable('oc_interview_group_values', {
    id: uuid('id').primaryKey().defaultRandom(),
    rowId: uuid('row_id').notNull().references(() => ocInterviewGroupRows.id, { onDelete: 'cascade' }),
    fieldId: uuid('field_id').notNull().references(() => interviewTemplateFields.id, { onDelete: 'restrict' }),
    valueText: text('value_text'),
    valueDate: date('value_date', { mode: 'date' }),
    valueNumber: integer('value_number'),
    valueBool: boolean('value_bool'),
    valueJson: jsonb('value_json'),
    filedAt: date('filed_at', { mode: 'date' }),
    filedByName: varchar('filed_by_name', { length: 160 }),
    filedByRank: varchar('filed_by_rank', { length: 64 }),
    filedByAppointment: varchar('filed_by_appointment', { length: 128 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
    uqInterviewGroupValue: uniqueIndex('uq_oc_interview_group_value').on(t.rowId, t.fieldId),
}));
