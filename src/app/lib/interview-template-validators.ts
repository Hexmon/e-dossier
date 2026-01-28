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

// Templates -----------------------------------------------------------------
export const interviewTemplateCreateSchema = z.object({
    code: z.string().trim().min(1).max(32),
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().max(2000).optional().nullable(),
    allowMultiple: z.boolean().optional(),
    sortOrder: z.coerce.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
});
export const interviewTemplateUpdateSchema = nonEmptyPartial(interviewTemplateCreateSchema);

export const interviewTemplateQuerySchema = z.object({
    semester: Semester.optional(),
    includeDeleted: BoolString.optional(),
});

export const interviewTemplateParam = z.object({ templateId: z.string().uuid() });

// Template semesters ---------------------------------------------------------
export const interviewTemplateSemesterCreateSchema = z.object({
    semester: Semester,
});
export const interviewTemplateSemesterParam = z.object({
    templateId: z.string().uuid(),
    semester: Semester,
});

// Sections ------------------------------------------------------------------
export const interviewSectionCreateSchema = z.object({
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().max(2000).optional().nullable(),
    sortOrder: z.coerce.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
});
export const interviewSectionUpdateSchema = nonEmptyPartial(interviewSectionCreateSchema);
export const interviewSectionQuerySchema = z.object({
    includeDeleted: BoolString.optional(),
});
export const interviewSectionParam = z.object({
    templateId: z.string().uuid(),
    sectionId: z.string().uuid(),
});

// Groups --------------------------------------------------------------------
export const interviewGroupCreateSchema = z
    .object({
        sectionId: z.string().uuid().optional().nullable(),
        title: z.string().trim().min(1).max(160),
        minRows: z.coerce.number().int().min(0).optional(),
        maxRows: z.coerce.number().int().min(0).optional().nullable(),
        sortOrder: z.coerce.number().int().min(0).optional(),
        isActive: z.boolean().optional(),
    })
    .superRefine((val, ctx) => {
        if (val.maxRows !== undefined && val.maxRows !== null && val.minRows !== undefined) {
            if (val.maxRows < val.minRows) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['maxRows'],
                    message: 'maxRows cannot be less than minRows',
                });
            }
        }
    });
export const interviewGroupUpdateSchema = nonEmptyPartial(interviewGroupCreateSchema);
export const interviewGroupQuerySchema = z.object({
    includeDeleted: BoolString.optional(),
});
export const interviewGroupParam = z.object({
    templateId: z.string().uuid(),
    groupId: z.string().uuid(),
});

// Fields --------------------------------------------------------------------
export const interviewFieldType = z.enum([
    'text',
    'textarea',
    'date',
    'number',
    'checkbox',
    'select',
    'signature',
]);

export const interviewFieldCreateSchema = z.object({
    key: z.string().trim().min(1).max(64),
    label: z.string().trim().min(1).max(160),
    fieldType: interviewFieldType,
    required: z.boolean().optional(),
    helpText: z.string().trim().max(2000).optional().nullable(),
    maxLength: z.coerce.number().int().min(0).optional().nullable(),
    sortOrder: z.coerce.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
    captureFiledAt: z.boolean().optional(),
    captureSignature: z.boolean().optional(),
});
export const interviewFieldUpdateSchema = nonEmptyPartial(interviewFieldCreateSchema);
export const interviewFieldQuerySchema = z.object({
    includeDeleted: BoolString.optional(),
});
export const interviewFieldParam = z.object({
    templateId: z.string().uuid(),
    fieldId: z.string().uuid(),
});

// Field options --------------------------------------------------------------
export const interviewFieldOptionCreateSchema = z.object({
    code: z.string().trim().min(1).max(32),
    label: z.string().trim().min(1).max(160),
    sortOrder: z.coerce.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
});
export const interviewFieldOptionUpdateSchema = nonEmptyPartial(interviewFieldOptionCreateSchema);
export const interviewFieldOptionQuerySchema = z.object({
    includeDeleted: BoolString.optional(),
});
export const interviewFieldOptionParam = z.object({
    templateId: z.string().uuid(),
    fieldId: z.string().uuid(),
    optionId: z.string().uuid(),
});
