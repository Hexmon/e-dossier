import { z } from 'zod';

const BoolString = z.enum(['true', 'false']).transform((v) => v === 'true');
const CampSemester = z.coerce.number().int().min(1).max(6);

export const trainingCampCreateSchema = z.object({
    courseId: z.string().uuid(),
    name: z.string().trim().min(1).max(120),
    semester: CampSemester,
    sortOrder: z.coerce.number().int().min(1).max(10).optional(),
    maxTotalMarks: z.coerce.number().int().min(0),
    performanceTitle: z.string().trim().max(200).optional().nullable(),
    performanceGuidance: z.string().trim().max(2000).optional().nullable(),
    signaturePrimaryLabel: z.string().trim().max(120).optional().nullable(),
    signatureSecondaryLabel: z.string().trim().max(120).optional().nullable(),
    noteLine1: z.string().trim().max(500).optional().nullable(),
    noteLine2: z.string().trim().max(500).optional().nullable(),
    showAggregateSummary: z.boolean().optional(),
});

export const trainingCampUpdateSchema = trainingCampCreateSchema.partial().refine(
    (v) => Object.keys(v).length > 0,
    { message: 'Provide at least one field to update' },
);

export const trainingCampQuerySchema = z.object({
    courseId: z.string().uuid().optional(),
    semester: CampSemester.optional(),
    includeActivities: BoolString.optional(),
    includeDeleted: BoolString.optional(),
});

export const trainingCampSettingsSchema = z.object({
    maxCampsPerSemester: z.coerce.number().int().min(1).max(6),
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

export const trainingCampCopySchema = z.object({
    sourceCourseId: z.string().uuid(),
    targetCourseId: z.string().uuid(),
    semester: CampSemester,
    mode: z.literal('replace').default('replace'),
});
