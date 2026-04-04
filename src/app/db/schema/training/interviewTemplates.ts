import { pgTable, uuid, varchar, timestamp, integer, boolean, text, uniqueIndex } from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// Interview templates (admin-managed, global)
// ---------------------------------------------------------------------------
export const interviewTemplates = pgTable('interview_templates', {
    id: uuid('id').primaryKey().defaultRandom(),
    code: varchar('code', { length: 32 }).notNull(),
    title: varchar('title', { length: 160 }).notNull(),
    description: text('description'),
    allowMultiple: boolean('allow_multiple').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
    uqTemplateCode: uniqueIndex('uq_interview_template_code').on(t.code),
}));

export const interviewTemplateSemesters = pgTable('interview_template_semesters', {
    id: uuid('id').primaryKey().defaultRandom(),
    templateId: uuid('template_id')
        .notNull()
        .references(() => interviewTemplates.id, { onDelete: 'cascade' }),
    semester: integer('semester').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
    uqTemplateSemester: uniqueIndex('uq_interview_template_semester').on(t.templateId, t.semester),
}));

export const interviewTemplateSections = pgTable('interview_template_sections', {
    id: uuid('id').primaryKey().defaultRandom(),
    templateId: uuid('template_id')
        .notNull()
        .references(() => interviewTemplates.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 160 }).notNull(),
    description: text('description'),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const interviewTemplateGroups = pgTable('interview_template_groups', {
    id: uuid('id').primaryKey().defaultRandom(),
    templateId: uuid('template_id')
        .notNull()
        .references(() => interviewTemplates.id, { onDelete: 'cascade' }),
    sectionId: uuid('section_id').references(() => interviewTemplateSections.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 160 }).notNull(),
    minRows: integer('min_rows').notNull().default(0),
    maxRows: integer('max_rows'),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const interviewTemplateFields = pgTable('interview_template_fields', {
    id: uuid('id').primaryKey().defaultRandom(),
    templateId: uuid('template_id')
        .notNull()
        .references(() => interviewTemplates.id, { onDelete: 'cascade' }),
    sectionId: uuid('section_id').references(() => interviewTemplateSections.id, { onDelete: 'cascade' }),
    groupId: uuid('group_id').references(() => interviewTemplateGroups.id, { onDelete: 'cascade' }),
    key: varchar('key', { length: 64 }).notNull(),
    label: varchar('label', { length: 160 }).notNull(),
    fieldType: varchar('field_type', { length: 32 }).notNull(),
    required: boolean('required').notNull().default(false),
    helpText: text('help_text'),
    maxLength: integer('max_length'),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    captureFiledAt: boolean('capture_filed_at').notNull().default(true),
    captureSignature: boolean('capture_signature').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
    uqTemplateFieldKey: uniqueIndex('uq_interview_template_field_key').on(t.templateId, t.key),
}));

export const interviewTemplateFieldOptions = pgTable('interview_template_field_options', {
    id: uuid('id').primaryKey().defaultRandom(),
    fieldId: uuid('field_id')
        .notNull()
        .references(() => interviewTemplateFields.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 32 }).notNull(),
    label: varchar('label', { length: 160 }).notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
    uqFieldOptionCode: uniqueIndex('uq_interview_field_option_code').on(t.fieldId, t.code),
}));
