import { z } from 'zod';

export const courseCreateSchema = z.object({
    code: z.string().trim().min(2).max(32),              // 'TES-50'
    title: z.string().trim().min(2).max(160),
    notes: z.string().trim().max(2000).optional(),
});

export const courseUpdateSchema = z.object({
    code: z.string().trim().min(2).max(32).optional(),
    title: z.string().trim().min(2).max(160).optional(),
    notes: z.string().trim().max(2000).optional(),
    restore: z.boolean().optional(),                     // undelete if true
}).refine(v => Object.keys(v).length > 0, { message: 'Provide at least one field to update' });

export const subjectCreateSchema = z.object({
    code: z.string().trim().min(2).max(32),
    name: z.string().trim().min(2).max(160),
    branch: z.enum(['C', 'E', 'M']),
    hasTheory: z.boolean().optional(),
    hasPractical: z.boolean().optional(),
    defaultTheoryCredits: z.coerce.number().int().min(0).max(20).optional(),
    defaultPracticalCredits: z.coerce.number().int().min(0).max(20).optional(),
    description: z.string().trim().max(2000).optional(),
});

export const subjectUpdateSchema = subjectCreateSchema.partial().refine(
    v => Object.keys(v).length > 0, { message: 'No changes provided' }
);

export const instructorCreateSchema = z.object({
    // either link to an existing user OR supply external details
    userId: z.string().uuid().optional(),
    name: z.string().trim().min(2).max(160).optional(),
    email: z.string().trim().email().max(255).optional(),
    phone: z.string().trim().max(32).optional(),
    affiliation: z.string().trim().max(160).optional(),
    notes: z.string().trim().max(2000).optional(),
}).superRefine((data, ctx) => {
    if (data.userId) return;
    const missing: string[] = [];
    if (!data.name) missing.push('name');
    if (!data.email) missing.push('email');
    if (!data.phone) missing.push('phone');
    if (missing.length) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Missing required field(s): ${missing.join(', ')}`,
        });
    }
});

export const instructorUpdateSchema = instructorCreateSchema.partial().refine(
    v => Object.keys(v).length > 0, { message: 'No changes provided' }
);

// Offering
export const offeringCreateSchema = z.object({
    subjectId: z.string().uuid().optional(),
    subjectCode: z.string().trim().optional(),
    semester: z.coerce.number().int().min(1).max(6),
    includeTheory: z.boolean().optional(),
    includePractical: z.boolean().optional(),
    theoryCredits: z.coerce.number().int().min(0).max(20).optional().nullable(),
    practicalCredits: z.coerce.number().int().min(0).max(20).optional().nullable(),
    instructors: z.array(z.object({
        instructorId: z.string().uuid().optional(),
        userId: z.string().uuid().optional(),
        name: z.string().trim().optional(),
        email: z.string().trim().email().optional(),
        phone: z.string().trim().optional(),
        role: z.enum(['PRIMARY', 'ASSISTANT']).optional().default('PRIMARY'),
    })).optional(),
}).refine(v => v.subjectId || v.subjectCode, { message: 'Provide subjectId or subjectCode' });

export const offeringUpdateSchema = z.object({
    includeTheory: z.boolean().optional(),
    includePractical: z.boolean().optional(),
    theoryCredits: z.coerce.number().int().min(0).max(20).optional().nullable(),
    practicalCredits: z.coerce.number().int().min(0).max(20).optional().nullable(),
    // replace instructors fully if provided
    instructors: z.array(z.object({
        instructorId: z.string().uuid().optional(),
        userId: z.string().uuid().optional(),
        name: z.string().trim().optional(),
        email: z.string().trim().email().optional(),
        phone: z.string().trim().optional(),
        role: z.enum(['PRIMARY', 'ASSISTANT']).optional().default('PRIMARY'),
    })).optional(),
}).refine(v => Object.keys(v).length > 0, { message: 'No changes provided' });

export const offeringAssignSchema = z.object({
    sourceCourseId: z.string().uuid(),
    mode: z.literal('copy').default('copy'),
    semester: z.coerce.number().int().min(1).max(8).optional(),
    subjectIds: z.array(z.string().uuid()).min(1).optional(),
});

export const listQuerySchema = z.object({
    q: z.string().trim().optional(),
    branch: z.enum(['C', 'E', 'M']).optional(),
    includeDeleted: z.enum(['true', 'false']).optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
    offset: z.coerce.number().int().min(0).max(5000).optional(),
});

export const subjectListQuerySchema = listQuerySchema.extend({
    semester: z.coerce.number().int().min(1).max(6).optional(),
    courseId: z.string().uuid().optional(),
});
