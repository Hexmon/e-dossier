import { z } from 'zod';
import { Semester } from '@/app/lib/oc-validators';

const requireUpdateFields = <T extends { [k: string]: unknown }>(
    schema: z.ZodType<T>,
    keys: Array<keyof T>,
) =>
    schema.superRefine((val, ctx) => {
        if (!keys.some((key) => val[key] !== undefined)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Provide at least one field to update',
            });
        }
    });

export const ptOcScoresQuerySchema = z.object({
    semester: Semester,
});

export const ptOcScoreItemSchema = z.object({
    ptTaskScoreId: z.string().uuid(),
    marksScored: z.coerce.number().int().min(0),
    remark: z.string().trim().max(2000).optional().nullable(),
});

export const ptOcScoresUpsertSchema = z.object({
    semester: Semester,
    scores: z.array(ptOcScoreItemSchema).min(1),
});

export const ptOcScoresUpdateSchema = requireUpdateFields(z.object({
    semester: Semester,
    scores: z.array(ptOcScoreItemSchema).min(1).optional(),
    deleteScoreIds: z.array(z.string().uuid()).min(1).optional(),
}), ['scores', 'deleteScoreIds']);

export const ptOcScoresDeleteSchema = z.object({
    semester: Semester,
    scoreIds: z.array(z.string().uuid()).min(1).optional(),
});

export const ptOcMotivationQuerySchema = z.object({
    semester: Semester,
});

export const ptOcMotivationItemSchema = z.object({
    fieldId: z.string().uuid(),
    value: z.string().trim().max(4000).optional().nullable(),
});

export const ptOcMotivationUpsertSchema = z.object({
    semester: Semester,
    values: z.array(ptOcMotivationItemSchema).min(1),
});

export const ptOcMotivationUpdateSchema = requireUpdateFields(z.object({
    semester: Semester,
    values: z.array(ptOcMotivationItemSchema).min(1).optional(),
    deleteFieldIds: z.array(z.string().uuid()).min(1).optional(),
}), ['values', 'deleteFieldIds']);

export const ptOcMotivationDeleteSchema = z.object({
    semester: Semester,
    fieldIds: z.array(z.string().uuid()).min(1).optional(),
});

const boolFromQuery = z
    .union([z.boolean(), z.literal('true'), z.literal('false')])
    .optional()
    .transform((value) => {
        if (typeof value === 'boolean') return value;
        if (value === 'false') return false;
        if (value === 'true') return true;
        return undefined;
    });

export const ptOcBulkQuerySchema = z.object({
    courseId: z.string().uuid(),
    semester: Semester,
    active: boolFromQuery.default(true),
    q: z.string().trim().max(120).optional(),
    platoonId: z.string().uuid().optional(),
    platoon: z.string().trim().min(1).max(64).optional(),
});

export const ptOcBulkScoreUpsertSchema = z.object({
    ptTaskScoreId: z.string().uuid(),
    marksScored: z.coerce.number().int().min(0),
    remark: z.string().trim().max(2000).optional().nullable(),
});

export const ptOcBulkMotivationUpsertSchema = z.object({
    fieldId: z.string().uuid(),
    value: z.string().trim().max(4000).optional().nullable(),
});

export const ptOcBulkItemSchema = z.object({
    ocId: z.string().uuid(),
    scoresUpsert: z.array(ptOcBulkScoreUpsertSchema).optional(),
    motivationUpsert: z.array(ptOcBulkMotivationUpsertSchema).optional(),
    clearScoreIds: z.array(z.string().uuid()).optional(), // ptTaskScoreId[]
    clearMotivationFieldIds: z.array(z.string().uuid()).optional(), // ptMotivationFieldId[]
});

export const ptOcBulkUpsertSchema = z.object({
    courseId: z.string().uuid(),
    semester: Semester,
    items: z.array(ptOcBulkItemSchema).min(1),
    failFast: z.boolean().optional().default(false),
});
