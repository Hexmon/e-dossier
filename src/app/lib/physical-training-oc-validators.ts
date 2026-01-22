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
