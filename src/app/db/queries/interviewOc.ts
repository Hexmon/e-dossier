import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/app/db/client';
import {
    interviewTemplates,
    interviewTemplateSemesters,
    interviewTemplateFields,
    interviewTemplateGroups,
} from '@/app/db/schema/training/interviewTemplates';
import {
    ocInterviews,
    ocInterviewFieldValues,
    ocInterviewGroupRows,
    ocInterviewGroupValues,
} from '@/app/db/schema/training/interviewOc';
import { getOrCreateActiveEnrollment } from '@/app/db/queries/oc-enrollments';

// Template lookups for validation ------------------------------------------
export async function getInterviewTemplateBase(id: string) {
    const [row] = await db
        .select({
            id: interviewTemplates.id,
            code: interviewTemplates.code,
            isActive: interviewTemplates.isActive,
            deletedAt: interviewTemplates.deletedAt,
        })
        .from(interviewTemplates)
        .where(eq(interviewTemplates.id, id))
        .limit(1);
    return row ?? null;
}

export async function listInterviewTemplateSemestersByTemplate(templateId: string) {
    return db
        .select({ semester: interviewTemplateSemesters.semester })
        .from(interviewTemplateSemesters)
        .where(eq(interviewTemplateSemesters.templateId, templateId));
}

export async function listInterviewTemplateFieldsByIds(ids: string[]) {
    if (!ids.length) return [];
    return db
        .select({
            id: interviewTemplateFields.id,
            templateId: interviewTemplateFields.templateId,
            groupId: interviewTemplateFields.groupId,
            isActive: interviewTemplateFields.isActive,
            deletedAt: interviewTemplateFields.deletedAt,
        })
        .from(interviewTemplateFields)
        .where(inArray(interviewTemplateFields.id, ids));
}

export async function listInterviewTemplateGroupsByIds(ids: string[]) {
    if (!ids.length) return [];
    return db
        .select({
            id: interviewTemplateGroups.id,
            templateId: interviewTemplateGroups.templateId,
            isActive: interviewTemplateGroups.isActive,
            deletedAt: interviewTemplateGroups.deletedAt,
        })
        .from(interviewTemplateGroups)
        .where(inArray(interviewTemplateGroups.id, ids));
}

// OC interviews -------------------------------------------------------------
export async function createOcInterview(data: typeof ocInterviews.$inferInsert) {
    const now = new Date();
    const activeEnrollment = await getOrCreateActiveEnrollment(data.ocId);
    const [row] = await db
        .insert(ocInterviews)
        .values({ ...data, enrollmentId: data.enrollmentId ?? activeEnrollment.id, createdAt: now, updatedAt: now })
        .returning();
    return row;
}

export async function updateOcInterview(id: string, data: Partial<typeof ocInterviews.$inferInsert>) {
    const [row] = await db
        .update(ocInterviews)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(ocInterviews.id, id))
        .returning();
    return row ?? null;
}

export async function deleteOcInterview(id: string) {
    const [row] = await db.delete(ocInterviews).where(eq(ocInterviews.id, id)).returning();
    return row ?? null;
}

export async function getOcInterview(id: string) {
    const [row] = await db.select().from(ocInterviews).where(eq(ocInterviews.id, id)).limit(1);
    return row ?? null;
}

export async function listOcInterviews(ocId: string, opts: { templateId?: string; semester?: number } = {}) {
    const activeEnrollment = await getOrCreateActiveEnrollment(ocId);
    const wh: any[] = [eq(ocInterviews.ocId, ocId), eq(ocInterviews.enrollmentId, activeEnrollment.id)];
    if (opts.templateId) wh.push(eq(ocInterviews.templateId, opts.templateId));
    if (opts.semester !== undefined) wh.push(eq(ocInterviews.semester, opts.semester));
    return db
        .select({
            id: ocInterviews.id,
            ocId: ocInterviews.ocId,
            templateId: ocInterviews.templateId,
            semester: ocInterviews.semester,
            course: ocInterviews.course,
            createdAt: ocInterviews.createdAt,
            updatedAt: ocInterviews.updatedAt,
        })
        .from(ocInterviews)
        .where(and(...wh))
        .orderBy(ocInterviews.createdAt);
}

// Field values --------------------------------------------------------------
export async function listOcInterviewFieldValues(interviewIds: string[]) {
    if (!interviewIds.length) return [];
    return db
        .select({
            id: ocInterviewFieldValues.id,
            interviewId: ocInterviewFieldValues.interviewId,
            fieldId: ocInterviewFieldValues.fieldId,
            valueText: ocInterviewFieldValues.valueText,
            valueDate: ocInterviewFieldValues.valueDate,
            valueNumber: ocInterviewFieldValues.valueNumber,
            valueBool: ocInterviewFieldValues.valueBool,
            valueJson: ocInterviewFieldValues.valueJson,
            filedAt: ocInterviewFieldValues.filedAt,
            filedByName: ocInterviewFieldValues.filedByName,
            filedByRank: ocInterviewFieldValues.filedByRank,
            filedByAppointment: ocInterviewFieldValues.filedByAppointment,
            createdAt: ocInterviewFieldValues.createdAt,
            updatedAt: ocInterviewFieldValues.updatedAt,
        })
        .from(ocInterviewFieldValues)
        .where(inArray(ocInterviewFieldValues.interviewId, interviewIds))
        .orderBy(ocInterviewFieldValues.createdAt);
}

export async function upsertOcInterviewFieldValues(
    interviewId: string,
    values: Array<{
        fieldId: string;
        valueText?: string | null;
        valueDate?: Date | null;
        valueNumber?: number | null;
        valueBool?: boolean | null;
        valueJson?: unknown | null;
        filedAt?: Date | null;
        filedByName?: string | null;
        filedByRank?: string | null;
        filedByAppointment?: string | null;
    }>,
) {
    if (!values.length) return [];
    const now = new Date();
    return db.transaction(async (tx) => {
        const rows: Array<typeof ocInterviewFieldValues.$inferSelect> = [];
        for (const item of values) {
            const [row] = await tx
                .insert(ocInterviewFieldValues)
                .values({
                    interviewId,
                    fieldId: item.fieldId,
                    valueText: item.valueText ?? null,
                    valueDate: item.valueDate ?? null,
                    valueNumber: item.valueNumber ?? null,
                    valueBool: item.valueBool ?? null,
                    valueJson: item.valueJson ?? null,
                    filedAt: item.filedAt ?? null,
                    filedByName: item.filedByName ?? null,
                    filedByRank: item.filedByRank ?? null,
                    filedByAppointment: item.filedByAppointment ?? null,
                    createdAt: now,
                    updatedAt: now,
                })
                .onConflictDoUpdate({
                    target: [ocInterviewFieldValues.interviewId, ocInterviewFieldValues.fieldId],
                    set: {
                        valueText: item.valueText ?? null,
                        valueDate: item.valueDate ?? null,
                        valueNumber: item.valueNumber ?? null,
                        valueBool: item.valueBool ?? null,
                        valueJson: item.valueJson ?? null,
                        filedAt: item.filedAt ?? null,
                        filedByName: item.filedByName ?? null,
                        filedByRank: item.filedByRank ?? null,
                        filedByAppointment: item.filedByAppointment ?? null,
                        updatedAt: now,
                    },
                })
                .returning();
            if (row) rows.push(row);
        }
        return rows;
    });
}

// Group rows ----------------------------------------------------------------
export async function listOcInterviewGroupRows(interviewIds: string[]) {
    if (!interviewIds.length) return [];
    return db
        .select({
            id: ocInterviewGroupRows.id,
            interviewId: ocInterviewGroupRows.interviewId,
            groupId: ocInterviewGroupRows.groupId,
            rowIndex: ocInterviewGroupRows.rowIndex,
            createdAt: ocInterviewGroupRows.createdAt,
            updatedAt: ocInterviewGroupRows.updatedAt,
        })
        .from(ocInterviewGroupRows)
        .where(inArray(ocInterviewGroupRows.interviewId, interviewIds))
        .orderBy(ocInterviewGroupRows.groupId, ocInterviewGroupRows.rowIndex);
}

export async function upsertOcInterviewGroupRows(
    interviewId: string,
    rows: Array<{ groupId: string; rowIndex: number }>,
) {
    if (!rows.length) return [];
    const now = new Date();
    return db.transaction(async (tx) => {
        const out: Array<typeof ocInterviewGroupRows.$inferSelect> = [];
        for (const item of rows) {
            const [row] = await tx
                .insert(ocInterviewGroupRows)
                .values({
                    interviewId,
                    groupId: item.groupId,
                    rowIndex: item.rowIndex,
                    createdAt: now,
                    updatedAt: now,
                })
                .onConflictDoUpdate({
                    target: [ocInterviewGroupRows.interviewId, ocInterviewGroupRows.groupId, ocInterviewGroupRows.rowIndex],
                    set: {
                        updatedAt: now,
                    },
                })
                .returning();
            if (row) out.push(row);
        }
        return out;
    });
}

export async function deleteOcInterviewGroupRowsByIds(interviewId: string, ids: string[]) {
    if (!ids.length) return [];
    return db
        .delete(ocInterviewGroupRows)
        .where(and(eq(ocInterviewGroupRows.interviewId, interviewId), inArray(ocInterviewGroupRows.id, ids)))
        .returning();
}

// Group values --------------------------------------------------------------
export async function listOcInterviewGroupValues(rowIds: string[]) {
    if (!rowIds.length) return [];
    return db
        .select({
            id: ocInterviewGroupValues.id,
            rowId: ocInterviewGroupValues.rowId,
            fieldId: ocInterviewGroupValues.fieldId,
            valueText: ocInterviewGroupValues.valueText,
            valueDate: ocInterviewGroupValues.valueDate,
            valueNumber: ocInterviewGroupValues.valueNumber,
            valueBool: ocInterviewGroupValues.valueBool,
            valueJson: ocInterviewGroupValues.valueJson,
            filedAt: ocInterviewGroupValues.filedAt,
            filedByName: ocInterviewGroupValues.filedByName,
            filedByRank: ocInterviewGroupValues.filedByRank,
            filedByAppointment: ocInterviewGroupValues.filedByAppointment,
            createdAt: ocInterviewGroupValues.createdAt,
            updatedAt: ocInterviewGroupValues.updatedAt,
        })
        .from(ocInterviewGroupValues)
        .where(inArray(ocInterviewGroupValues.rowId, rowIds))
        .orderBy(ocInterviewGroupValues.createdAt);
}

export async function upsertOcInterviewGroupValues(
    rowId: string,
    values: Array<{
        fieldId: string;
        valueText?: string | null;
        valueDate?: Date | null;
        valueNumber?: number | null;
        valueBool?: boolean | null;
        valueJson?: unknown | null;
        filedAt?: Date | null;
        filedByName?: string | null;
        filedByRank?: string | null;
        filedByAppointment?: string | null;
    }>,
) {
    if (!values.length) return [];
    const now = new Date();
    return db.transaction(async (tx) => {
        const out: Array<typeof ocInterviewGroupValues.$inferSelect> = [];
        for (const item of values) {
            const [row] = await tx
                .insert(ocInterviewGroupValues)
                .values({
                    rowId,
                    fieldId: item.fieldId,
                    valueText: item.valueText ?? null,
                    valueDate: item.valueDate ?? null,
                    valueNumber: item.valueNumber ?? null,
                    valueBool: item.valueBool ?? null,
                    valueJson: item.valueJson ?? null,
                    filedAt: item.filedAt ?? null,
                    filedByName: item.filedByName ?? null,
                    filedByRank: item.filedByRank ?? null,
                    filedByAppointment: item.filedByAppointment ?? null,
                    createdAt: now,
                    updatedAt: now,
                })
                .onConflictDoUpdate({
                    target: [ocInterviewGroupValues.rowId, ocInterviewGroupValues.fieldId],
                    set: {
                        valueText: item.valueText ?? null,
                        valueDate: item.valueDate ?? null,
                        valueNumber: item.valueNumber ?? null,
                        valueBool: item.valueBool ?? null,
                        valueJson: item.valueJson ?? null,
                        filedAt: item.filedAt ?? null,
                        filedByName: item.filedByName ?? null,
                        filedByRank: item.filedByRank ?? null,
                        filedByAppointment: item.filedByAppointment ?? null,
                        updatedAt: now,
                    },
                })
                .returning();
            if (row) out.push(row);
        }
        return out;
    });
}
