import { sql } from 'drizzle-orm';
import { check, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { users } from '@/app/db/schema/auth/users';
import type { GradePointBand, LetterGradeBand } from '@/app/lib/grading';
import type { GpaFormulaTemplate } from '@/app/lib/grading-policy';

export const academicGradingPolicySettings = pgTable(
  'academic_grading_policy_settings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    singletonKey: text('singleton_key').notNull().default('default'),
    letterGradeBands: jsonb('letter_grade_bands').$type<LetterGradeBand[]>().notNull(),
    gradePointBands: jsonb('grade_point_bands').$type<GradePointBand[]>().notNull(),
    sgpaFormulaTemplate: text('sgpa_formula_template').$type<GpaFormulaTemplate>().notNull().default('CREDIT_WEIGHTED'),
    cgpaFormulaTemplate: text('cgpa_formula_template').$type<GpaFormulaTemplate>().notNull().default('CREDIT_WEIGHTED'),
    roundingScale: integer('rounding_scale').notNull().default(2),
    updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uqSingleton: uniqueIndex('uq_academic_grading_policy_settings_singleton').on(table.singletonKey),
    roundingScaleCheck: check(
      'academic_grading_policy_rounding_scale_check',
      sql`${table.roundingScale} BETWEEN 0 AND 6`
    ),
    sgpaFormulaCheck: check(
      'academic_grading_policy_sgpa_formula_check',
      sql`${table.sgpaFormulaTemplate} IN ('CREDIT_WEIGHTED', 'SEMESTER_AVG')`
    ),
    cgpaFormulaCheck: check(
      'academic_grading_policy_cgpa_formula_check',
      sql`${table.cgpaFormulaTemplate} IN ('CREDIT_WEIGHTED', 'SEMESTER_AVG')`
    ),
  })
);
