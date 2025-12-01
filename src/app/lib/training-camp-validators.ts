import { z } from 'zod';
import { campSemesterKind } from '@/app/db/schema/training/oc';

const BoolString = z.enum(['true', 'false']).transform((v) => v === 'true');

export const trainingCampCreateSchema = z.object({
    name: z.string().trim().min(1).max(120),
    semester: z.enum(campSemesterKind.enumValues),
    maxTotalMarks: z.coerce.number().int().min(0),
});

export const trainingCampUpdateSchema = trainingCampCreateSchema.partial().refine(
    (v) => Object.keys(v).length > 0,
    { message: 'Provide at least one field to update' },
);

export const trainingCampQuerySchema = z.object({
    semester: z.enum(campSemesterKind.enumValues).optional(),
    includeActivities: BoolString.optional(),
    includeDeleted: BoolString.optional(),
});

export const trainingCampParam = z.object({ campId: z.string().uuid() });

export const trainingCampActivityCreateSchema = z.object({
    name: z.string().trim().min(1).max(160),
    defaultMaxMarks: z.coerce.number().int().min(0),
    sortOrder: z.coerce.number().int().min(0).optional(),
});

export const trainingCampActivityUpdateSchema = trainingCampActivityCreateSchema.partial().refine(
    (v) => Object.keys(v).length > 0,
    { message: 'Provide at least one field to update' },
);

export const trainingCampActivityQuerySchema = z.object({
    includeDeleted: BoolString.optional(),
});

export const trainingCampActivityParam = z.object({
    campId: z.string().uuid(),
    activityId: z.string().uuid(),
});
