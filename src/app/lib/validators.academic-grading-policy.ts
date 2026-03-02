import { z } from 'zod';
import { LETTER_GRADE_VALUES } from '@/app/lib/grading';

export const gpaFormulaTemplateSchema = z.enum(['CREDIT_WEIGHTED', 'SEMESTER_AVG']);

export const letterGradeBandSchema = z.object({
  minMarks: z.number().int().min(0).max(100),
  grade: z.enum(LETTER_GRADE_VALUES),
});

export const gradePointBandSchema = z.object({
  minMarks: z.number().int().min(0).max(100),
  points: z.number().int().min(0).max(10),
});

export const academicGradingPolicyUpdateSchema = z
  .object({
    letterGradeBands: z.array(letterGradeBandSchema).min(1).optional(),
    gradePointBands: z.array(gradePointBandSchema).min(1).optional(),
    sgpaFormulaTemplate: gpaFormulaTemplateSchema.optional(),
    cgpaFormulaTemplate: gpaFormulaTemplateSchema.optional(),
    roundingScale: z.number().int().min(0).max(6).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  });

export const academicGradingPolicyRecalculateSchema = z
  .object({
    dryRun: z.boolean().optional().default(false),
    scope: z.enum(['all', 'courses']),
    courseIds: z.array(z.string().uuid()).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.scope === 'courses' && (!value.courseIds || value.courseIds.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['courseIds'],
        message: 'courseIds is required when scope is "courses".',
      });
    }
  });

export type AcademicGradingPolicyUpdateDto = z.infer<typeof academicGradingPolicyUpdateSchema>;
export type AcademicGradingPolicyRecalculateDto = z.infer<typeof academicGradingPolicyRecalculateSchema>;
