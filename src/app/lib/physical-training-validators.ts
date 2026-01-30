import { z } from 'zod';

const BoolString = z.enum(['true', 'false']).transform((v) => v === 'true');

const nonEmptyPartial = <Shape extends z.ZodRawShape>(schema: z.ZodObject<Shape>) =>
    schema.partial().superRefine((val, ctx) => {
        if (!Object.values(val).some((value) => value !== undefined)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Provide at least one field to update',
            });
        }
    });

export const Semester = z.coerce.number().int().min(1).max(6);

export const ptTypeCreateSchema = z.object({
    semester: Semester,
    code: z.string().trim().min(1).max(32),
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().max(2000).optional().nullable(),
    maxTotalMarks: z.coerce.number().int().min(0),
    sortOrder: z.coerce.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
});
export const ptTypeUpdateSchema = nonEmptyPartial(ptTypeCreateSchema);

export const ptTypeQuerySchema = z.object({
    semester: Semester.optional(),
    includeDeleted: BoolString.optional(),
});

export const ptTypeParam = z.object({ typeId: z.string().uuid() });

export const ptAttemptCreateSchema = z.object({
    code: z.string().trim().min(1).max(16),
    label: z.string().trim().min(1).max(64),
    isCompensatory: z.boolean().optional(),
    sortOrder: z.coerce.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
});
export const ptAttemptUpdateSchema = nonEmptyPartial(ptAttemptCreateSchema);
export const ptAttemptQuerySchema = z.object({
    includeDeleted: BoolString.optional(),
});
export const ptAttemptParam = z.object({
    typeId: z.string().uuid(),
    attemptId: z.string().uuid(),
});

export const ptAttemptGradeCreateSchema = z.object({
    code: z.string().trim().min(1).max(8),
    label: z.string().trim().min(1).max(64),
    sortOrder: z.coerce.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
});
export const ptAttemptGradeUpdateSchema = nonEmptyPartial(ptAttemptGradeCreateSchema);
export const ptAttemptGradeQuerySchema = z.object({
    includeDeleted: BoolString.optional(),
});
export const ptAttemptGradeParam = z.object({
    typeId: z.string().uuid(),
    attemptId: z.string().uuid(),
    gradeId: z.string().uuid(),
});

export const ptTaskCreateSchema = z.object({
    title: z.string().trim().min(1).max(160),
    maxMarks: z.coerce.number().int().min(0),
    sortOrder: z.coerce.number().int().min(0).optional(),
});
export const ptTaskUpdateSchema = nonEmptyPartial(ptTaskCreateSchema);
export const ptTaskQuerySchema = z.object({
    includeDeleted: BoolString.optional(),
});
export const ptTaskParam = z.object({
    typeId: z.string().uuid(),
    taskId: z.string().uuid(),
});

export const ptTaskScoreCreateSchema = z.object({
    ptAttemptId: z.string().uuid(),
    ptAttemptGradeId: z.string().uuid(),
    maxMarks: z.coerce.number().int().min(0),
});
export const ptTaskScoreUpdateSchema = nonEmptyPartial(ptTaskScoreCreateSchema);
export const ptTaskScoreParam = z.object({
    typeId: z.string().uuid(),
    taskId: z.string().uuid(),
    scoreId: z.string().uuid(),
});

export const ptMotivationFieldCreateSchema = z.object({
    semester: Semester,
    label: z.string().trim().min(1).max(160),
    sortOrder: z.coerce.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
});
export const ptMotivationFieldUpdateSchema = nonEmptyPartial(ptMotivationFieldCreateSchema);
export const ptMotivationFieldQuerySchema = z.object({
    semester: Semester.optional(),
    includeDeleted: BoolString.optional(),
});
export const ptMotivationFieldParam = z.object({ id: z.string().uuid() });

export const ptTemplateQuerySchema = z.object({
    semester: Semester,
    includeDeleted: BoolString.optional(),
});
