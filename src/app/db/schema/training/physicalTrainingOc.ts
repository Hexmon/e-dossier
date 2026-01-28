import { pgTable, uuid, integer, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { ocCadets } from './oc';
import { ptTaskScores, ptMotivationAwardFields } from './physicalTraining';

// ---------------------------------------------------------------------------
// OC Physical Training marks (per attempt/grade)
// ---------------------------------------------------------------------------
export const ocPtTaskScores = pgTable('oc_pt_task_scores', {
    id: uuid('id').primaryKey().defaultRandom(),
    ocId: uuid('oc_id').notNull().references(() => ocCadets.id, { onDelete: 'cascade' }),
    semester: integer('semester').notNull(),
    ptTaskScoreId: uuid('pt_task_score_id')
        .notNull()
        .references(() => ptTaskScores.id, { onDelete: 'restrict' }),
    marksScored: integer('marks_scored').notNull(),
    remark: text('remark'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
    uqOcScore: uniqueIndex('uq_oc_pt_task_score').on(t.ocId, t.ptTaskScoreId),
    semCheck: { check: sql`CHECK (${t.semester.name} BETWEEN 1 AND 6)` },
    marksNonNegative: { check: sql`CHECK (${t.marksScored.name} >= 0)` },
}));

// ---------------------------------------------------------------------------
// OC Physical Training motivation award values (text)
// ---------------------------------------------------------------------------
export const ocPtMotivationAwards = pgTable('oc_pt_motivation_awards', {
    id: uuid('id').primaryKey().defaultRandom(),
    ocId: uuid('oc_id').notNull().references(() => ocCadets.id, { onDelete: 'cascade' }),
    semester: integer('semester').notNull(),
    ptMotivationFieldId: uuid('pt_motivation_field_id')
        .notNull()
        .references(() => ptMotivationAwardFields.id, { onDelete: 'restrict' }),
    value: text('value'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
    uqOcField: uniqueIndex('uq_oc_pt_motivation_field').on(t.ocId, t.ptMotivationFieldId),
    semCheck: { check: sql`CHECK (${t.semester.name} BETWEEN 1 AND 6)` },
}));
