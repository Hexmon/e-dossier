import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '@/app/db/client';
import {
    interviewTemplates,
    interviewTemplateSemesters,
    interviewTemplateSections,
    interviewTemplateGroups,
    interviewTemplateFields,
    interviewTemplateFieldOptions,
} from '@/app/db/schema/training/interviewTemplates';
import { ApiError } from '@/app/lib/http';
import { getCourse } from '@/app/db/queries/courses';

async function ensureCourseExists(courseId: string) {
    const course = await getCourse(courseId);
    if (!course) throw new ApiError(404, 'Course not found', 'not_found');
    return course;
}

// Templates -----------------------------------------------------------------
export async function listInterviewTemplates(
    opts: { courseId?: string | null; semester?: number; includeDeleted?: boolean } = {},
) {
    const wh: any[] = [];
    if (opts.courseId !== undefined) {
        wh.push(
            opts.courseId === null ? isNull(interviewTemplates.courseId) : eq(interviewTemplates.courseId, opts.courseId),
        );
    }
    if (!opts.includeDeleted) wh.push(isNull(interviewTemplates.deletedAt));

    if (opts.semester) {
        const templateIds = await db
            .select({ templateId: interviewTemplateSemesters.templateId })
            .from(interviewTemplateSemesters)
            .where(eq(interviewTemplateSemesters.semester, opts.semester));
        const ids = templateIds.map((row) => row.templateId);
        if (!ids.length) return [];
        wh.push(inArray(interviewTemplates.id, ids));
    }

    const rows = await db
        .select({
            id: interviewTemplates.id,
            courseId: interviewTemplates.courseId,
            code: interviewTemplates.code,
            title: interviewTemplates.title,
            description: interviewTemplates.description,
            allowMultiple: interviewTemplates.allowMultiple,
            sortOrder: interviewTemplates.sortOrder,
            isActive: interviewTemplates.isActive,
            createdAt: interviewTemplates.createdAt,
            updatedAt: interviewTemplates.updatedAt,
            deletedAt: interviewTemplates.deletedAt,
        })
        .from(interviewTemplates)
        .where(wh.length ? and(...wh) : undefined)
        .orderBy(interviewTemplates.courseId, interviewTemplates.sortOrder, interviewTemplates.title);

    if (!rows.length) return rows;

    const templateIds = rows.map((row) => row.id);
    const semesterRows = await db
        .select({ templateId: interviewTemplateSemesters.templateId, semester: interviewTemplateSemesters.semester })
        .from(interviewTemplateSemesters)
        .where(inArray(interviewTemplateSemesters.templateId, templateIds));

    const semMap = new Map<string, number[]>();
    for (const row of semesterRows) {
        const list = semMap.get(row.templateId) ?? [];
        list.push(row.semester);
        semMap.set(row.templateId, list);
    }

    return rows.map((row) => ({
        ...row,
        semesters: (semMap.get(row.id) ?? []).sort((a, b) => a - b),
    }));
}

export async function resolveInterviewTemplateCopySource(
    sourceCourseId: string,
    loadTemplates: typeof listInterviewTemplates = listInterviewTemplates,
) {
    const courseTemplates = await loadTemplates({
        courseId: sourceCourseId,
        includeDeleted: false,
    });
    if (courseTemplates.length > 0) {
        return courseTemplates;
    }

    const defaultTemplates = await loadTemplates({
        courseId: null,
        includeDeleted: false,
    });
    if (defaultTemplates.length > 0) {
        return defaultTemplates;
    }

    throw new ApiError(404, 'Source interview course is not configured.', 'not_found');
}

export async function getInterviewTemplate(id: string) {
    const [row] = await db.select().from(interviewTemplates).where(eq(interviewTemplates.id, id)).limit(1);
    if (!row) return null;
    const semesters = await db
        .select({ semester: interviewTemplateSemesters.semester })
        .from(interviewTemplateSemesters)
        .where(eq(interviewTemplateSemesters.templateId, id));
    return {
        ...row,
        semesters: semesters.map((s) => s.semester).sort((a, b) => a - b),
    };
}

export async function createInterviewTemplate(data: typeof interviewTemplates.$inferInsert) {
    const now = new Date();
    const [row] = await db
        .insert(interviewTemplates)
        .values({ ...data, createdAt: now, updatedAt: now })
        .returning();
    return row;
}

export async function updateInterviewTemplate(id: string, data: Partial<typeof interviewTemplates.$inferInsert>) {
    const [row] = await db
        .update(interviewTemplates)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(interviewTemplates.id, id))
        .returning();
    return row ?? null;
}

export async function deleteInterviewTemplate(id: string, opts: { hard?: boolean } = {}) {
    if (opts.hard) {
        const [row] = await db.delete(interviewTemplates).where(eq(interviewTemplates.id, id)).returning();
        return row ?? null;
    }
    const [row] = await db
        .update(interviewTemplates)
        .set({ deletedAt: new Date() })
        .where(eq(interviewTemplates.id, id))
        .returning();
    return row ?? null;
}

// Template semesters ---------------------------------------------------------
export async function listInterviewTemplateSemesters(templateId: string) {
    return db
        .select({
            id: interviewTemplateSemesters.id,
            templateId: interviewTemplateSemesters.templateId,
            semester: interviewTemplateSemesters.semester,
            createdAt: interviewTemplateSemesters.createdAt,
            updatedAt: interviewTemplateSemesters.updatedAt,
        })
        .from(interviewTemplateSemesters)
        .where(eq(interviewTemplateSemesters.templateId, templateId))
        .orderBy(interviewTemplateSemesters.semester);
}

export async function addInterviewTemplateSemester(templateId: string, semester: number) {
    const now = new Date();
    const [row] = await db
        .insert(interviewTemplateSemesters)
        .values({ templateId, semester, createdAt: now, updatedAt: now })
        .returning();
    return row;
}

export async function removeInterviewTemplateSemester(templateId: string, semester: number) {
    const [row] = await db
        .delete(interviewTemplateSemesters)
        .where(and(eq(interviewTemplateSemesters.templateId, templateId), eq(interviewTemplateSemesters.semester, semester)))
        .returning();
    return row ?? null;
}

// Sections ------------------------------------------------------------------
export async function listInterviewTemplateSections(templateId: string, opts: { includeDeleted?: boolean } = {}) {
    const wh: any[] = [eq(interviewTemplateSections.templateId, templateId)];
    if (!opts.includeDeleted) wh.push(isNull(interviewTemplateSections.deletedAt));
    return db
        .select({
            id: interviewTemplateSections.id,
            templateId: interviewTemplateSections.templateId,
            title: interviewTemplateSections.title,
            description: interviewTemplateSections.description,
            sortOrder: interviewTemplateSections.sortOrder,
            isActive: interviewTemplateSections.isActive,
            createdAt: interviewTemplateSections.createdAt,
            updatedAt: interviewTemplateSections.updatedAt,
            deletedAt: interviewTemplateSections.deletedAt,
        })
        .from(interviewTemplateSections)
        .where(and(...wh))
        .orderBy(interviewTemplateSections.sortOrder, interviewTemplateSections.title);
}

export async function getInterviewTemplateSection(id: string) {
    const [row] = await db.select().from(interviewTemplateSections).where(eq(interviewTemplateSections.id, id)).limit(1);
    return row ?? null;
}

export async function createInterviewTemplateSection(
    templateId: string,
    data: Omit<typeof interviewTemplateSections.$inferInsert, 'templateId'>,
) {
    const now = new Date();
    const [row] = await db
        .insert(interviewTemplateSections)
        .values({ templateId, ...data, createdAt: now, updatedAt: now })
        .returning();
    return row;
}

export async function updateInterviewTemplateSection(
    id: string,
    data: Partial<typeof interviewTemplateSections.$inferInsert>,
) {
    const [row] = await db
        .update(interviewTemplateSections)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(interviewTemplateSections.id, id))
        .returning();
    return row ?? null;
}

export async function deleteInterviewTemplateSection(id: string, opts: { hard?: boolean } = {}) {
    if (opts.hard) {
        const [row] = await db.delete(interviewTemplateSections).where(eq(interviewTemplateSections.id, id)).returning();
        return row ?? null;
    }
    const [row] = await db
        .update(interviewTemplateSections)
        .set({ deletedAt: new Date() })
        .where(eq(interviewTemplateSections.id, id))
        .returning();
    return row ?? null;
}

// Groups --------------------------------------------------------------------
export async function listInterviewTemplateGroups(templateId: string, opts: { includeDeleted?: boolean } = {}) {
    const wh: any[] = [eq(interviewTemplateGroups.templateId, templateId)];
    if (!opts.includeDeleted) wh.push(isNull(interviewTemplateGroups.deletedAt));
    return db
        .select({
            id: interviewTemplateGroups.id,
            templateId: interviewTemplateGroups.templateId,
            sectionId: interviewTemplateGroups.sectionId,
            title: interviewTemplateGroups.title,
            minRows: interviewTemplateGroups.minRows,
            maxRows: interviewTemplateGroups.maxRows,
            sortOrder: interviewTemplateGroups.sortOrder,
            isActive: interviewTemplateGroups.isActive,
            createdAt: interviewTemplateGroups.createdAt,
            updatedAt: interviewTemplateGroups.updatedAt,
            deletedAt: interviewTemplateGroups.deletedAt,
        })
        .from(interviewTemplateGroups)
        .where(and(...wh))
        .orderBy(interviewTemplateGroups.sortOrder, interviewTemplateGroups.title);
}

export async function getInterviewTemplateGroup(id: string) {
    const [row] = await db.select().from(interviewTemplateGroups).where(eq(interviewTemplateGroups.id, id)).limit(1);
    return row ?? null;
}

export async function createInterviewTemplateGroup(
    templateId: string,
    data: Omit<typeof interviewTemplateGroups.$inferInsert, 'templateId'>,
) {
    const now = new Date();
    const [row] = await db
        .insert(interviewTemplateGroups)
        .values({ templateId, ...data, createdAt: now, updatedAt: now })
        .returning();
    return row;
}

export async function updateInterviewTemplateGroup(id: string, data: Partial<typeof interviewTemplateGroups.$inferInsert>) {
    const [row] = await db
        .update(interviewTemplateGroups)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(interviewTemplateGroups.id, id))
        .returning();
    return row ?? null;
}

export async function deleteInterviewTemplateGroup(id: string, opts: { hard?: boolean } = {}) {
    if (opts.hard) {
        const [row] = await db.delete(interviewTemplateGroups).where(eq(interviewTemplateGroups.id, id)).returning();
        return row ?? null;
    }
    const [row] = await db
        .update(interviewTemplateGroups)
        .set({ deletedAt: new Date() })
        .where(eq(interviewTemplateGroups.id, id))
        .returning();
    return row ?? null;
}

// Fields --------------------------------------------------------------------
export async function listInterviewTemplateFieldsBySection(sectionId: string, opts: { includeDeleted?: boolean } = {}) {
    const wh: any[] = [eq(interviewTemplateFields.sectionId, sectionId)];
    if (!opts.includeDeleted) wh.push(isNull(interviewTemplateFields.deletedAt));
    return db
        .select({
            id: interviewTemplateFields.id,
            templateId: interviewTemplateFields.templateId,
            sectionId: interviewTemplateFields.sectionId,
            groupId: interviewTemplateFields.groupId,
            key: interviewTemplateFields.key,
            label: interviewTemplateFields.label,
            fieldType: interviewTemplateFields.fieldType,
            required: interviewTemplateFields.required,
            helpText: interviewTemplateFields.helpText,
            maxLength: interviewTemplateFields.maxLength,
            sortOrder: interviewTemplateFields.sortOrder,
            isActive: interviewTemplateFields.isActive,
            captureFiledAt: interviewTemplateFields.captureFiledAt,
            captureSignature: interviewTemplateFields.captureSignature,
            createdAt: interviewTemplateFields.createdAt,
            updatedAt: interviewTemplateFields.updatedAt,
            deletedAt: interviewTemplateFields.deletedAt,
        })
        .from(interviewTemplateFields)
        .where(and(...wh))
        .orderBy(interviewTemplateFields.sortOrder, interviewTemplateFields.key);
}

export async function listInterviewTemplateFieldsByGroup(groupId: string, opts: { includeDeleted?: boolean } = {}) {
    const wh: any[] = [eq(interviewTemplateFields.groupId, groupId)];
    if (!opts.includeDeleted) wh.push(isNull(interviewTemplateFields.deletedAt));
    return db
        .select({
            id: interviewTemplateFields.id,
            templateId: interviewTemplateFields.templateId,
            sectionId: interviewTemplateFields.sectionId,
            groupId: interviewTemplateFields.groupId,
            key: interviewTemplateFields.key,
            label: interviewTemplateFields.label,
            fieldType: interviewTemplateFields.fieldType,
            required: interviewTemplateFields.required,
            helpText: interviewTemplateFields.helpText,
            maxLength: interviewTemplateFields.maxLength,
            sortOrder: interviewTemplateFields.sortOrder,
            isActive: interviewTemplateFields.isActive,
            captureFiledAt: interviewTemplateFields.captureFiledAt,
            captureSignature: interviewTemplateFields.captureSignature,
            createdAt: interviewTemplateFields.createdAt,
            updatedAt: interviewTemplateFields.updatedAt,
            deletedAt: interviewTemplateFields.deletedAt,
        })
        .from(interviewTemplateFields)
        .where(and(...wh))
        .orderBy(interviewTemplateFields.sortOrder, interviewTemplateFields.key);
}

export async function getInterviewTemplateField(id: string) {
    const [row] = await db.select().from(interviewTemplateFields).where(eq(interviewTemplateFields.id, id)).limit(1);
    return row ?? null;
}

export async function createInterviewTemplateField(
    templateId: string,
    data: Omit<typeof interviewTemplateFields.$inferInsert, 'templateId'>,
) {
    const now = new Date();
    const [row] = await db
        .insert(interviewTemplateFields)
        .values({ templateId, ...data, createdAt: now, updatedAt: now })
        .returning();
    return row;
}

export async function updateInterviewTemplateField(id: string, data: Partial<typeof interviewTemplateFields.$inferInsert>) {
    const [row] = await db
        .update(interviewTemplateFields)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(interviewTemplateFields.id, id))
        .returning();
    return row ?? null;
}

export async function deleteInterviewTemplateField(id: string, opts: { hard?: boolean } = {}) {
    if (opts.hard) {
        const [row] = await db.delete(interviewTemplateFields).where(eq(interviewTemplateFields.id, id)).returning();
        return row ?? null;
    }
    const [row] = await db
        .update(interviewTemplateFields)
        .set({ deletedAt: new Date() })
        .where(eq(interviewTemplateFields.id, id))
        .returning();
    return row ?? null;
}

// Field options --------------------------------------------------------------
export async function listInterviewTemplateFieldOptions(fieldId: string, opts: { includeDeleted?: boolean } = {}) {
    const wh: any[] = [eq(interviewTemplateFieldOptions.fieldId, fieldId)];
    if (!opts.includeDeleted) wh.push(isNull(interviewTemplateFieldOptions.deletedAt));
    return db
        .select({
            id: interviewTemplateFieldOptions.id,
            fieldId: interviewTemplateFieldOptions.fieldId,
            code: interviewTemplateFieldOptions.code,
            label: interviewTemplateFieldOptions.label,
            sortOrder: interviewTemplateFieldOptions.sortOrder,
            isActive: interviewTemplateFieldOptions.isActive,
            createdAt: interviewTemplateFieldOptions.createdAt,
            updatedAt: interviewTemplateFieldOptions.updatedAt,
            deletedAt: interviewTemplateFieldOptions.deletedAt,
        })
        .from(interviewTemplateFieldOptions)
        .where(and(...wh))
        .orderBy(interviewTemplateFieldOptions.sortOrder, interviewTemplateFieldOptions.code);
}

export async function getInterviewTemplateFieldOption(id: string) {
    const [row] = await db
        .select()
        .from(interviewTemplateFieldOptions)
        .where(eq(interviewTemplateFieldOptions.id, id))
        .limit(1);
    return row ?? null;
}

export async function createInterviewTemplateFieldOption(
    fieldId: string,
    data: Omit<typeof interviewTemplateFieldOptions.$inferInsert, 'fieldId'>,
) {
    const now = new Date();
    const [row] = await db
        .insert(interviewTemplateFieldOptions)
        .values({ fieldId, ...data, createdAt: now, updatedAt: now })
        .returning();
    return row;
}

export async function updateInterviewTemplateFieldOption(
    id: string,
    data: Partial<typeof interviewTemplateFieldOptions.$inferInsert>,
) {
    const [row] = await db
        .update(interviewTemplateFieldOptions)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(interviewTemplateFieldOptions.id, id))
        .returning();
    return row ?? null;
}

export async function deleteInterviewTemplateFieldOption(id: string, opts: { hard?: boolean } = {}) {
    if (opts.hard) {
        const [row] = await db
            .delete(interviewTemplateFieldOptions)
            .where(eq(interviewTemplateFieldOptions.id, id))
            .returning();
        return row ?? null;
    }
    const [row] = await db
        .update(interviewTemplateFieldOptions)
        .set({ deletedAt: new Date() })
        .where(eq(interviewTemplateFieldOptions.id, id))
        .returning();
    return row ?? null;
}

export type InterviewTemplateCloneResult = {
    sourceTemplateId: string;
    templateId: string;
    semestersCopied: number;
    sectionsCopied: number;
    groupsCopied: number;
    fieldsCopied: number;
    optionsCopied: number;
};

export async function cloneInterviewTemplate(input: {
    sourceTemplateId: string;
    targetCourseId?: string | null;
    code: string;
    title: string;
    description?: string | null;
    allowMultiple?: boolean;
    sortOrder?: number;
    isActive?: boolean;
    semesters?: number[];
}) : Promise<InterviewTemplateCloneResult> {
    const sourceTemplate = await getInterviewTemplate(input.sourceTemplateId);
    if (!sourceTemplate) {
        throw new ApiError(404, 'Source interview template not found.', 'not_found');
    }

    const sourceSections = await listInterviewTemplateSections(input.sourceTemplateId, { includeDeleted: false });
    const sourceGroups = await listInterviewTemplateGroups(input.sourceTemplateId, { includeDeleted: false });
    const sourceFields = await db
        .select({
            id: interviewTemplateFields.id,
            sectionId: interviewTemplateFields.sectionId,
            groupId: interviewTemplateFields.groupId,
            key: interviewTemplateFields.key,
            label: interviewTemplateFields.label,
            fieldType: interviewTemplateFields.fieldType,
            required: interviewTemplateFields.required,
            helpText: interviewTemplateFields.helpText,
            maxLength: interviewTemplateFields.maxLength,
            sortOrder: interviewTemplateFields.sortOrder,
            isActive: interviewTemplateFields.isActive,
            captureFiledAt: interviewTemplateFields.captureFiledAt,
            captureSignature: interviewTemplateFields.captureSignature,
        })
        .from(interviewTemplateFields)
        .where(and(eq(interviewTemplateFields.templateId, input.sourceTemplateId), isNull(interviewTemplateFields.deletedAt)))
        .orderBy(interviewTemplateFields.sortOrder, interviewTemplateFields.key);

    const sourceFieldIds = sourceFields.map((field) => field.id);
    const sourceOptions = sourceFieldIds.length
        ? await db
            .select({
                id: interviewTemplateFieldOptions.id,
                fieldId: interviewTemplateFieldOptions.fieldId,
                code: interviewTemplateFieldOptions.code,
                label: interviewTemplateFieldOptions.label,
                sortOrder: interviewTemplateFieldOptions.sortOrder,
                isActive: interviewTemplateFieldOptions.isActive,
            })
            .from(interviewTemplateFieldOptions)
            .where(
                and(
                    inArray(interviewTemplateFieldOptions.fieldId, sourceFieldIds),
                    isNull(interviewTemplateFieldOptions.deletedAt),
                ),
            )
            .orderBy(interviewTemplateFieldOptions.sortOrder, interviewTemplateFieldOptions.code)
        : [];

    const semestersToClone = [...new Set((input.semesters ?? sourceTemplate.semesters ?? []).sort((a, b) => a - b))];
    const now = new Date();

    return db.transaction(async (tx) => {
        const [createdTemplate] = await tx
            .insert(interviewTemplates)
            .values({
                courseId: input.targetCourseId ?? sourceTemplate.courseId ?? null,
                code: input.code,
                title: input.title,
                description: input.description ?? sourceTemplate.description ?? null,
                allowMultiple: input.allowMultiple ?? sourceTemplate.allowMultiple,
                sortOrder: input.sortOrder ?? sourceTemplate.sortOrder,
                isActive: input.isActive ?? sourceTemplate.isActive,
                createdAt: now,
                updatedAt: now,
            })
            .returning({ id: interviewTemplates.id });

        if (semestersToClone.length > 0) {
            await tx.insert(interviewTemplateSemesters).values(
                semestersToClone.map((semester) => ({
                    templateId: createdTemplate.id,
                    semester,
                    createdAt: now,
                    updatedAt: now,
                })),
            );
        }

        const sectionIdMap = new Map<string, string>();
        for (const section of sourceSections) {
            const [createdSection] = await tx
                .insert(interviewTemplateSections)
                .values({
                    templateId: createdTemplate.id,
                    title: section.title,
                    description: section.description ?? null,
                    sortOrder: section.sortOrder,
                    isActive: section.isActive,
                    createdAt: now,
                    updatedAt: now,
                })
                .returning({ id: interviewTemplateSections.id });
            sectionIdMap.set(section.id, createdSection.id);
        }

        const groupIdMap = new Map<string, string>();
        for (const group of sourceGroups) {
            const [createdGroup] = await tx
                .insert(interviewTemplateGroups)
                .values({
                    templateId: createdTemplate.id,
                    sectionId: group.sectionId ? (sectionIdMap.get(group.sectionId) ?? null) : null,
                    title: group.title,
                    minRows: group.minRows,
                    maxRows: group.maxRows,
                    sortOrder: group.sortOrder,
                    isActive: group.isActive,
                    createdAt: now,
                    updatedAt: now,
                })
                .returning({ id: interviewTemplateGroups.id });
            groupIdMap.set(group.id, createdGroup.id);
        }

        const fieldIdMap = new Map<string, string>();
        for (const field of sourceFields) {
            const [createdField] = await tx
                .insert(interviewTemplateFields)
                .values({
                    templateId: createdTemplate.id,
                    sectionId: field.sectionId ? (sectionIdMap.get(field.sectionId) ?? null) : null,
                    groupId: field.groupId ? (groupIdMap.get(field.groupId) ?? null) : null,
                    key: field.key,
                    label: field.label,
                    fieldType: field.fieldType,
                    required: field.required,
                    helpText: field.helpText ?? null,
                    maxLength: field.maxLength ?? null,
                    sortOrder: field.sortOrder,
                    isActive: field.isActive,
                    captureFiledAt: field.captureFiledAt,
                    captureSignature: field.captureSignature,
                    createdAt: now,
                    updatedAt: now,
                })
                .returning({ id: interviewTemplateFields.id });
            fieldIdMap.set(field.id, createdField.id);
        }

        for (const option of sourceOptions) {
            const clonedFieldId = fieldIdMap.get(option.fieldId);
            if (!clonedFieldId) continue;

            await tx.insert(interviewTemplateFieldOptions).values({
                fieldId: clonedFieldId,
                code: option.code,
                label: option.label,
                sortOrder: option.sortOrder,
                isActive: option.isActive,
                createdAt: now,
                updatedAt: now,
            });
        }

        return {
            sourceTemplateId: input.sourceTemplateId,
            templateId: createdTemplate.id,
            semestersCopied: semestersToClone.length,
            sectionsCopied: sourceSections.length,
            groupsCopied: sourceGroups.length,
            fieldsCopied: sourceFields.length,
            optionsCopied: sourceOptions.length,
        };
    });
}

type InterviewTemplateSyncStats = {
    templates: number;
    semesters: number;
    sections: number;
    groups: number;
    fields: number;
    options: number;
};

export type InterviewTemplateCourseCopyResult = {
    sourceCourseId: string;
    targetCourseId: string;
    mode: 'replace';
    templatesCopied: number;
    semestersCopied: number;
    sectionsCopied: number;
    groupsCopied: number;
    fieldsCopied: number;
    optionsCopied: number;
};

export async function copyInterviewTemplatesToCourse(input: {
    sourceCourseId: string;
    targetCourseId: string;
    mode?: 'replace';
}) : Promise<InterviewTemplateCourseCopyResult> {
    const mode = input.mode ?? 'replace';
    if (input.sourceCourseId === input.targetCourseId) {
        throw new ApiError(400, 'sourceCourseId and targetCourseId cannot be the same', 'bad_request');
    }

    await ensureCourseExists(input.sourceCourseId);
    await ensureCourseExists(input.targetCourseId);

    const sourceTemplates = await resolveInterviewTemplateCopySource(input.sourceCourseId);

    const now = new Date();
    const stats: InterviewTemplateSyncStats = {
        templates: 0,
        semesters: 0,
        sections: 0,
        groups: 0,
        fields: 0,
        options: 0,
    };

    await db.transaction(async (tx) => {
        const targetTemplates = await tx
            .select({
                id: interviewTemplates.id,
                code: interviewTemplates.code,
                title: interviewTemplates.title,
                description: interviewTemplates.description,
                allowMultiple: interviewTemplates.allowMultiple,
                sortOrder: interviewTemplates.sortOrder,
                isActive: interviewTemplates.isActive,
                deletedAt: interviewTemplates.deletedAt,
            })
            .from(interviewTemplates)
            .where(eq(interviewTemplates.courseId, input.targetCourseId));

        const targetByCode = new Map(targetTemplates.map((template) => [template.code, template]));
        const visitedTemplateIds = new Set<string>();

        for (const sourceTemplate of sourceTemplates) {
            const sourceTemplateId = sourceTemplate.id;
            const targetTemplate = targetByCode.get(sourceTemplate.code);
            let targetTemplateId = targetTemplate?.id ?? '';

            if (!targetTemplate) {
                const [createdTemplate] = await tx
                    .insert(interviewTemplates)
                    .values({
                        courseId: input.targetCourseId,
                        code: sourceTemplate.code,
                        title: sourceTemplate.title,
                        description: sourceTemplate.description ?? null,
                        allowMultiple: sourceTemplate.allowMultiple,
                        sortOrder: sourceTemplate.sortOrder,
                        isActive: sourceTemplate.isActive,
                        createdAt: now,
                        updatedAt: now,
                    })
                    .returning({ id: interviewTemplates.id });
                targetTemplateId = createdTemplate.id;
            } else {
                const patch = {
                    title: sourceTemplate.title,
                    description: sourceTemplate.description ?? null,
                    allowMultiple: sourceTemplate.allowMultiple,
                    sortOrder: sourceTemplate.sortOrder,
                    isActive: sourceTemplate.isActive,
                    deletedAt: null as Date | null,
                };
                await tx
                    .update(interviewTemplates)
                    .set({ ...patch, updatedAt: now })
                    .where(eq(interviewTemplates.id, targetTemplate.id));
                targetTemplateId = targetTemplate.id;
            }
            stats.templates += 1;
            visitedTemplateIds.add(targetTemplateId);

            const sourceSemesters = await tx
                .select({ semester: interviewTemplateSemesters.semester })
                .from(interviewTemplateSemesters)
                .where(eq(interviewTemplateSemesters.templateId, sourceTemplateId));
            const targetSemesters = await tx
                .select({
                    id: interviewTemplateSemesters.id,
                    semester: interviewTemplateSemesters.semester,
                })
                .from(interviewTemplateSemesters)
                .where(eq(interviewTemplateSemesters.templateId, targetTemplateId));

            const targetSemesterSet = new Set(targetSemesters.map((row) => row.semester));
            const sourceSemesterSet = new Set(sourceSemesters.map((row) => row.semester));

            for (const semester of sourceSemesterSet) {
                if (!targetSemesterSet.has(semester)) {
                    await tx.insert(interviewTemplateSemesters).values({
                        templateId: targetTemplateId,
                        semester,
                        createdAt: now,
                        updatedAt: now,
                    });
                }
                stats.semesters += 1;
            }

            const staleSemesterIds = targetSemesters
                .filter((row) => !sourceSemesterSet.has(row.semester))
                .map((row) => row.id);
            if (staleSemesterIds.length) {
                await tx
                    .delete(interviewTemplateSemesters)
                    .where(inArray(interviewTemplateSemesters.id, staleSemesterIds));
            }

            const sourceSections = await tx
                .select({
                    id: interviewTemplateSections.id,
                    title: interviewTemplateSections.title,
                    description: interviewTemplateSections.description,
                    sortOrder: interviewTemplateSections.sortOrder,
                    isActive: interviewTemplateSections.isActive,
                })
                .from(interviewTemplateSections)
                .where(and(eq(interviewTemplateSections.templateId, sourceTemplateId), isNull(interviewTemplateSections.deletedAt)));
            const targetSections = await tx
                .select({
                    id: interviewTemplateSections.id,
                    title: interviewTemplateSections.title,
                })
                .from(interviewTemplateSections)
                .where(eq(interviewTemplateSections.templateId, targetTemplateId));

            const targetSectionByTitle = new Map(targetSections.map((section) => [section.title, section]));
            const targetSectionIdBySource = new Map<string, string>();
            const visitedSectionIds = new Set<string>();

            for (const section of sourceSections) {
                const existingSection = targetSectionByTitle.get(section.title);
                let targetSectionId = existingSection?.id ?? '';

                if (!existingSection) {
                    const [createdSection] = await tx
                        .insert(interviewTemplateSections)
                        .values({
                            templateId: targetTemplateId,
                            title: section.title,
                            description: section.description ?? null,
                            sortOrder: section.sortOrder,
                            isActive: section.isActive,
                            createdAt: now,
                            updatedAt: now,
                        })
                        .returning({ id: interviewTemplateSections.id });
                    targetSectionId = createdSection.id;
                } else {
                    await tx
                        .update(interviewTemplateSections)
                        .set({
                            description: section.description ?? null,
                            sortOrder: section.sortOrder,
                            isActive: section.isActive,
                            deletedAt: null,
                            updatedAt: now,
                        })
                        .where(eq(interviewTemplateSections.id, existingSection.id));
                    targetSectionId = existingSection.id;
                }

                stats.sections += 1;
                visitedSectionIds.add(targetSectionId);
                targetSectionIdBySource.set(section.id, targetSectionId);
            }

            const staleSectionIds = targetSections
                .filter((section) => !visitedSectionIds.has(section.id))
                .map((section) => section.id);
            if (staleSectionIds.length) {
                await tx
                    .update(interviewTemplateSections)
                    .set({ deletedAt: now, updatedAt: now })
                    .where(inArray(interviewTemplateSections.id, staleSectionIds));
            }

            const sourceGroups = await tx
                .select({
                    id: interviewTemplateGroups.id,
                    sectionId: interviewTemplateGroups.sectionId,
                    title: interviewTemplateGroups.title,
                    minRows: interviewTemplateGroups.minRows,
                    maxRows: interviewTemplateGroups.maxRows,
                    sortOrder: interviewTemplateGroups.sortOrder,
                    isActive: interviewTemplateGroups.isActive,
                })
                .from(interviewTemplateGroups)
                .where(and(eq(interviewTemplateGroups.templateId, sourceTemplateId), isNull(interviewTemplateGroups.deletedAt)));
            const targetGroups = await tx
                .select({
                    id: interviewTemplateGroups.id,
                    sectionId: interviewTemplateGroups.sectionId,
                    title: interviewTemplateGroups.title,
                })
                .from(interviewTemplateGroups)
                .where(eq(interviewTemplateGroups.templateId, targetTemplateId));

            const targetGroupByKey = new Map(
                targetGroups.map((group) => [`${group.sectionId ?? 'root'}:${group.title}`, group]),
            );
            const targetGroupIdBySource = new Map<string, string>();
            const visitedGroupIds = new Set<string>();

            for (const group of sourceGroups) {
                const mappedSectionId = group.sectionId ? (targetSectionIdBySource.get(group.sectionId) ?? null) : null;
                const groupKey = `${mappedSectionId ?? 'root'}:${group.title}`;
                const existingGroup = targetGroupByKey.get(groupKey);
                let targetGroupId = existingGroup?.id ?? '';

                if (!existingGroup) {
                    const [createdGroup] = await tx
                        .insert(interviewTemplateGroups)
                        .values({
                            templateId: targetTemplateId,
                            sectionId: mappedSectionId,
                            title: group.title,
                            minRows: group.minRows,
                            maxRows: group.maxRows,
                            sortOrder: group.sortOrder,
                            isActive: group.isActive,
                            createdAt: now,
                            updatedAt: now,
                        })
                        .returning({ id: interviewTemplateGroups.id });
                    targetGroupId = createdGroup.id;
                } else {
                    await tx
                        .update(interviewTemplateGroups)
                        .set({
                            sectionId: mappedSectionId,
                            minRows: group.minRows,
                            maxRows: group.maxRows,
                            sortOrder: group.sortOrder,
                            isActive: group.isActive,
                            deletedAt: null,
                            updatedAt: now,
                        })
                        .where(eq(interviewTemplateGroups.id, existingGroup.id));
                    targetGroupId = existingGroup.id;
                }

                stats.groups += 1;
                visitedGroupIds.add(targetGroupId);
                targetGroupIdBySource.set(group.id, targetGroupId);
            }

            const staleGroupIds = targetGroups
                .filter((group) => !visitedGroupIds.has(group.id))
                .map((group) => group.id);
            if (staleGroupIds.length) {
                await tx
                    .update(interviewTemplateGroups)
                    .set({ deletedAt: now, updatedAt: now })
                    .where(inArray(interviewTemplateGroups.id, staleGroupIds));
            }

            const sourceFields = await tx
                .select({
                    id: interviewTemplateFields.id,
                    sectionId: interviewTemplateFields.sectionId,
                    groupId: interviewTemplateFields.groupId,
                    key: interviewTemplateFields.key,
                    label: interviewTemplateFields.label,
                    fieldType: interviewTemplateFields.fieldType,
                    required: interviewTemplateFields.required,
                    helpText: interviewTemplateFields.helpText,
                    maxLength: interviewTemplateFields.maxLength,
                    sortOrder: interviewTemplateFields.sortOrder,
                    isActive: interviewTemplateFields.isActive,
                    captureFiledAt: interviewTemplateFields.captureFiledAt,
                    captureSignature: interviewTemplateFields.captureSignature,
                })
                .from(interviewTemplateFields)
                .where(and(eq(interviewTemplateFields.templateId, sourceTemplateId), isNull(interviewTemplateFields.deletedAt)));
            const targetFields = await tx
                .select({
                    id: interviewTemplateFields.id,
                    key: interviewTemplateFields.key,
                })
                .from(interviewTemplateFields)
                .where(eq(interviewTemplateFields.templateId, targetTemplateId));

            const targetFieldByKey = new Map(targetFields.map((field) => [field.key, field]));
            const targetFieldIdBySource = new Map<string, string>();
            const visitedFieldIds = new Set<string>();

            for (const field of sourceFields) {
                const existingField = targetFieldByKey.get(field.key);
                const mappedSectionId = field.sectionId ? (targetSectionIdBySource.get(field.sectionId) ?? null) : null;
                const mappedGroupId = field.groupId ? (targetGroupIdBySource.get(field.groupId) ?? null) : null;
                let targetFieldId = existingField?.id ?? '';

                if (!existingField) {
                    const [createdField] = await tx
                        .insert(interviewTemplateFields)
                        .values({
                            templateId: targetTemplateId,
                            sectionId: mappedSectionId,
                            groupId: mappedGroupId,
                            key: field.key,
                            label: field.label,
                            fieldType: field.fieldType,
                            required: field.required,
                            helpText: field.helpText ?? null,
                            maxLength: field.maxLength ?? null,
                            sortOrder: field.sortOrder,
                            isActive: field.isActive,
                            captureFiledAt: field.captureFiledAt,
                            captureSignature: field.captureSignature,
                            createdAt: now,
                            updatedAt: now,
                        })
                        .returning({ id: interviewTemplateFields.id });
                    targetFieldId = createdField.id;
                } else {
                    await tx
                        .update(interviewTemplateFields)
                        .set({
                            sectionId: mappedSectionId,
                            groupId: mappedGroupId,
                            label: field.label,
                            fieldType: field.fieldType,
                            required: field.required,
                            helpText: field.helpText ?? null,
                            maxLength: field.maxLength ?? null,
                            sortOrder: field.sortOrder,
                            isActive: field.isActive,
                            captureFiledAt: field.captureFiledAt,
                            captureSignature: field.captureSignature,
                            deletedAt: null,
                            updatedAt: now,
                        })
                        .where(eq(interviewTemplateFields.id, existingField.id));
                    targetFieldId = existingField.id;
                }

                stats.fields += 1;
                visitedFieldIds.add(targetFieldId);
                targetFieldIdBySource.set(field.id, targetFieldId);
            }

            const staleFieldIds = targetFields
                .filter((field) => !visitedFieldIds.has(field.id))
                .map((field) => field.id);
            if (staleFieldIds.length) {
                await tx
                    .update(interviewTemplateFields)
                    .set({ deletedAt: now, updatedAt: now })
                    .where(inArray(interviewTemplateFields.id, staleFieldIds));
            }

            const sourceOptions = sourceFields.length
                ? await tx
                    .select({
                        id: interviewTemplateFieldOptions.id,
                        fieldId: interviewTemplateFieldOptions.fieldId,
                        code: interviewTemplateFieldOptions.code,
                        label: interviewTemplateFieldOptions.label,
                        sortOrder: interviewTemplateFieldOptions.sortOrder,
                        isActive: interviewTemplateFieldOptions.isActive,
                    })
                    .from(interviewTemplateFieldOptions)
                    .where(
                        and(
                            inArray(interviewTemplateFieldOptions.fieldId, sourceFields.map((field) => field.id)),
                            isNull(interviewTemplateFieldOptions.deletedAt),
                        ),
                    )
                : [];

            const targetOptions = targetFields.length
                ? await tx
                    .select({
                        id: interviewTemplateFieldOptions.id,
                        fieldId: interviewTemplateFieldOptions.fieldId,
                        code: interviewTemplateFieldOptions.code,
                    })
                    .from(interviewTemplateFieldOptions)
                    .where(inArray(interviewTemplateFieldOptions.fieldId, targetFields.map((field) => field.id)))
                : [];

            const targetOptionByKey = new Map(
                targetOptions.map((option) => [`${option.fieldId}:${option.code}`, option]),
            );
            const visitedOptionIds = new Set<string>();

            for (const option of sourceOptions) {
                const mappedFieldId = targetFieldIdBySource.get(option.fieldId);
                if (!mappedFieldId) continue;
                const optionKey = `${mappedFieldId}:${option.code}`;
                const existingOption = targetOptionByKey.get(optionKey);
                let optionId = existingOption?.id ?? '';

                if (!existingOption) {
                    const [createdOption] = await tx
                        .insert(interviewTemplateFieldOptions)
                        .values({
                            fieldId: mappedFieldId,
                            code: option.code,
                            label: option.label,
                            sortOrder: option.sortOrder,
                            isActive: option.isActive,
                            createdAt: now,
                            updatedAt: now,
                        })
                        .returning({ id: interviewTemplateFieldOptions.id });
                    optionId = createdOption.id;
                } else {
                    await tx
                        .update(interviewTemplateFieldOptions)
                        .set({
                            label: option.label,
                            sortOrder: option.sortOrder,
                            isActive: option.isActive,
                            deletedAt: null,
                            updatedAt: now,
                        })
                        .where(eq(interviewTemplateFieldOptions.id, existingOption.id));
                    optionId = existingOption.id;
                }

                stats.options += 1;
                visitedOptionIds.add(optionId);
            }

            const staleOptionIds = targetOptions
                .filter((option) => !visitedOptionIds.has(option.id))
                .map((option) => option.id);
            if (staleOptionIds.length) {
                await tx
                    .update(interviewTemplateFieldOptions)
                    .set({ deletedAt: now, updatedAt: now })
                    .where(inArray(interviewTemplateFieldOptions.id, staleOptionIds));
            }
        }

        const staleTemplateIds = targetTemplates
            .filter((template) => !visitedTemplateIds.has(template.id))
            .map((template) => template.id);
        if (staleTemplateIds.length) {
            await tx
                .update(interviewTemplates)
                .set({ deletedAt: now, updatedAt: now })
                .where(inArray(interviewTemplates.id, staleTemplateIds));
        }
    });

    return {
        sourceCourseId: input.sourceCourseId,
        targetCourseId: input.targetCourseId,
        mode,
        templatesCopied: stats.templates,
        semestersCopied: stats.semesters,
        sectionsCopied: stats.sections,
        groupsCopied: stats.groups,
        fieldsCopied: stats.fields,
        optionsCopied: stats.options,
    };
}
