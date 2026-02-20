import { z } from 'zod';
import { Semester } from './oc-validators';

const BoolString = z.enum(['true', 'false']).transform((v) => v === 'true');

// --- Categories -------------------------------------------------------------
export const olqCategoryCreateSchema = z.object({
    code: z.string().trim().min(1).max(50),
    title: z.string().trim().min(1).max(255),
    description: z.string().trim().optional(),
    displayOrder: z.coerce.number().int().optional(),
    isActive: z.boolean().optional(),
});

export const olqCategoryUpdateSchema = olqCategoryCreateSchema.partial().refine(
    (v) => Object.keys(v).length > 0,
    { message: 'Provide at least one field to update' }
);

export const olqCategoryQuerySchema = z.object({
    includeSubtitles: BoolString.optional(),
    isActive: BoolString.optional(),
});

export const OlqCategoryIdParam = z.object({ categoryId: z.string().uuid() });
export const OlqCourseIdParam = z.object({ courseId: z.string().uuid() });

// --- Subtitles (traits) -----------------------------------------------------
export const olqSubtitleCreateSchema = z.object({
    categoryId: z.string().uuid(),
    subtitle: z.string().trim().min(1).max(255),
    maxMarks: z.coerce.number().int().min(0).optional(),
    displayOrder: z.coerce.number().int().optional(),
    isActive: z.boolean().optional(),
});

export const olqSubtitleUpdateSchema = olqSubtitleCreateSchema.partial().refine(
    (v) => Object.keys(v).length > 0,
    { message: 'Provide at least one field to update' }
);

export const olqSubtitleQuerySchema = z.object({
    categoryId: z.string().uuid().optional(),
    isActive: BoolString.optional(),
});

export const OlqSubtitleIdParam = z.object({ subtitleId: z.string().uuid() });

export const olqTemplateCopySchema = z.object({
    sourceCourseId: z.string().uuid(),
    mode: z.literal('replace').default('replace'),
});

// --- OLQ header + scores ----------------------------------------------------
export const olqScoreSchema = z.object({
    subtitleId: z.string().uuid(),
    marksScored: z.coerce.number().int().min(0),
});

export const olqUpsertSchema = z.object({
    ocId: z.string().uuid(),
    semester: Semester,
    remarks: z.string().trim().nullable().optional(),
    scores: z.array(olqScoreSchema).optional(),
});

export const olqUpdateSchema = z.object({
    remarks: z.string().trim().nullable().optional(),
    scores: z.array(olqScoreSchema).optional(),
    deleteSubtitleIds: z.array(z.string().uuid()).optional(),
    semester: Semester,
});

export const olqDeleteSchema = z.object({
    semester: Semester,
    subtitleId: z.string().uuid().optional(),
});

export const olqQuerySchema = z.object({
    ocId: z.string().uuid(),
    semester: Semester,
    includeCategories: BoolString.optional(),
    categoryId: z.string().uuid().optional(),
    subtitleId: z.string().uuid().optional(),
});

export const olqScoreQuerySchema = z.object({
    ocId: z.string().uuid(),
    semester: Semester,
    subtitleId: z.string().uuid(),
});

export const olqBySemesterQuerySchema = z.object({
    semester: Semester,
    ocId: z.string().uuid().optional(),
    categoryId: z.string().uuid().optional(),
    subtitleId: z.string().uuid().optional(),
});

export const OlqIdParam = z.object({ id: z.string().uuid() });
