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

// Templates -----------------------------------------------------------------
export async function listInterviewTemplates(opts: { semester?: number; includeDeleted?: boolean } = {}) {
    const wh: any[] = [];
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
        .orderBy(interviewTemplates.sortOrder, interviewTemplates.title);

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
