import { z } from 'zod';

export const punishmentCreateSchema = z.object({
    title: z.string().trim().min(2).max(160),
    marksDeduction: z.coerce.number().int().min(0).optional(),
});

export const punishmentUpdateSchema = z.object({
    title: z.string().trim().min(2).max(160).optional(),
    marksDeduction: z.coerce.number().int().min(0).optional(),
}).refine(v => Object.keys(v).length > 0, { message: 'Provide at least one field to update' });

export const punishmentListQuerySchema = z.object({
    q: z.string().trim().optional(),
    includeDeleted: z.enum(['true', 'false']).optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
    offset: z.coerce.number().int().min(0).max(5000).optional(),
});
