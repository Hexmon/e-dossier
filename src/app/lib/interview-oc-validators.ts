import { z } from 'zod';

const nonEmpty = <Shape extends z.ZodRawShape>(schema: z.ZodObject<Shape>) =>
    schema.superRefine((val, ctx) => {
        if (!Object.values(val).some((value) => value !== undefined)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Provide at least one field to update',
            });
        }
    });

export const Semester = z.coerce.number().int().min(1).max(6);

const interviewFieldValueSchema = z.object({
    fieldId: z.string().uuid(),
    valueText: z.string().trim().max(4000).optional().nullable(),
    valueDate: z.coerce.date().optional().nullable(),
    valueNumber: z.coerce.number().optional().nullable(),
    valueBool: z.boolean().optional().nullable(),
    valueJson: z.any().optional().nullable(),
    filedAt: z.coerce.date().optional().nullable(),
    filedByName: z.string().trim().max(160).optional().nullable(),
    filedByRank: z.string().trim().max(64).optional().nullable(),
    filedByAppointment: z.string().trim().max(128).optional().nullable(),
});

const interviewGroupRowSchema = z.object({
    rowIndex: z.coerce.number().int().min(0),
    fields: z.array(interviewFieldValueSchema).optional(),
});

const interviewGroupSchema = z.object({
    groupId: z.string().uuid(),
    rows: z.array(interviewGroupRowSchema).optional(),
});

export const interviewOcCreateSchema = z.object({
    templateId: z.string().uuid(),
    semester: Semester.optional().nullable(),
    course: z.string().trim().max(160).optional().nullable(),
    fields: z.array(interviewFieldValueSchema).optional(),
    groups: z.array(interviewGroupSchema).optional(),
});

export const interviewOcUpdateSchema = nonEmpty(z.object({
    templateId: z.string().uuid().optional(),
    semester: Semester.optional().nullable(),
    course: z.string().trim().max(160).optional().nullable(),
    fields: z.array(interviewFieldValueSchema).optional(),
    groups: z.array(interviewGroupSchema).optional(),
    deleteGroupRowIds: z.array(z.string().uuid()).optional(),
}));

export const interviewOcQuerySchema = z.object({
    templateId: z.string().uuid().optional(),
    semester: Semester.optional(),
});

export const InterviewIdParam = z.object({ interviewId: z.string().uuid() });
