import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/app/db/client';
import {
    ptTaskScores,
    ptTasks,
    ptTypes,
    ptTypeAttempts,
    ptAttemptGrades,
    ptMotivationAwardFields,
} from '@/app/db/schema/training/physicalTraining';
import { ocPtTaskScores, ocPtMotivationAwards } from '@/app/db/schema/training/physicalTrainingOc';
import { getOrCreateActiveEnrollment } from '@/app/db/queries/oc-enrollments';

// Template score details for validation -------------------------------------
export async function listTemplateScoresByIds(ids: string[]) {
    if (!ids.length) return [];
    return db
        .select({
            ptTaskScoreId: ptTaskScores.id,
            maxMarks: ptTaskScores.maxMarks,
            ptTaskId: ptTasks.id,
            ptTypeId: ptTypes.id,
            ptAttemptId: ptTypeAttempts.id,
            ptAttemptGradeId: ptAttemptGrades.id,
            semester: ptTypes.semester,
            typeIsActive: ptTypes.isActive,
            attemptIsActive: ptTypeAttempts.isActive,
            gradeIsActive: ptAttemptGrades.isActive,
            typeDeletedAt: ptTypes.deletedAt,
            taskDeletedAt: ptTasks.deletedAt,
            attemptDeletedAt: ptTypeAttempts.deletedAt,
            gradeDeletedAt: ptAttemptGrades.deletedAt,
        })
        .from(ptTaskScores)
        .innerJoin(ptTasks, eq(ptTasks.id, ptTaskScores.ptTaskId))
        .innerJoin(ptTypes, eq(ptTypes.id, ptTasks.ptTypeId))
        .innerJoin(ptTypeAttempts, eq(ptTypeAttempts.id, ptTaskScores.ptAttemptId))
        .innerJoin(ptAttemptGrades, eq(ptAttemptGrades.id, ptTaskScores.ptAttemptGradeId))
        .where(inArray(ptTaskScores.id, ids));
}

export async function listMotivationFieldsByIds(ids: string[]) {
    if (!ids.length) return [];
    return db
        .select({
            id: ptMotivationAwardFields.id,
            semester: ptMotivationAwardFields.semester,
            isActive: ptMotivationAwardFields.isActive,
            deletedAt: ptMotivationAwardFields.deletedAt,
        })
        .from(ptMotivationAwardFields)
        .where(inArray(ptMotivationAwardFields.id, ids));
}

// OC PT scores ---------------------------------------------------------------
export async function listOcPtScores(ocId: string, semester: number) {
    const activeEnrollment = await getOrCreateActiveEnrollment(ocId);
    return db
        .select({
            id: ocPtTaskScores.id,
            ocId: ocPtTaskScores.ocId,
            semester: ocPtTaskScores.semester,
            ptTaskScoreId: ocPtTaskScores.ptTaskScoreId,
            marksScored: ocPtTaskScores.marksScored,
            remark: ocPtTaskScores.remark,
            createdAt: ocPtTaskScores.createdAt,
            updatedAt: ocPtTaskScores.updatedAt,
            templateMaxMarks: ptTaskScores.maxMarks,
            ptTaskId: ptTasks.id,
            ptTypeId: ptTypes.id,
            ptAttemptId: ptTypeAttempts.id,
            ptAttemptGradeId: ptAttemptGrades.id,
            ptTypeCode: ptTypes.code,
            ptTypeTitle: ptTypes.title,
            taskTitle: ptTasks.title,
            attemptCode: ptTypeAttempts.code,
            gradeCode: ptAttemptGrades.code,
        })
        .from(ocPtTaskScores)
        .innerJoin(ptTaskScores, eq(ptTaskScores.id, ocPtTaskScores.ptTaskScoreId))
        .innerJoin(ptTasks, eq(ptTasks.id, ptTaskScores.ptTaskId))
        .innerJoin(ptTypes, eq(ptTypes.id, ptTasks.ptTypeId))
        .innerJoin(ptTypeAttempts, eq(ptTypeAttempts.id, ptTaskScores.ptAttemptId))
        .innerJoin(ptAttemptGrades, eq(ptAttemptGrades.id, ptTaskScores.ptAttemptGradeId))
        .where(
            and(
                eq(ocPtTaskScores.ocId, ocId),
                eq(ocPtTaskScores.enrollmentId, activeEnrollment.id),
                eq(ocPtTaskScores.semester, semester),
            ),
        )
        .orderBy(ptTypes.sortOrder, ptTasks.sortOrder, ptTypeAttempts.sortOrder, ptAttemptGrades.sortOrder);
}

export async function upsertOcPtScores(
    ocId: string,
    semester: number,
    scores: Array<{ ptTaskScoreId: string; marksScored: number; remark?: string | null }>,
) {
    if (!scores.length) return [];
    const now = new Date();
    return db.transaction(async (tx) => {
        const activeEnrollment = await getOrCreateActiveEnrollment(ocId, tx);
        const rows: Array<typeof ocPtTaskScores.$inferSelect> = [];
        for (const item of scores) {
            const [row] = await tx
                .insert(ocPtTaskScores)
                .values({
                    ocId,
                    enrollmentId: activeEnrollment.id,
                    semester,
                    ptTaskScoreId: item.ptTaskScoreId,
                    marksScored: item.marksScored,
                    remark: item.remark ?? null,
                    createdAt: now,
                    updatedAt: now,
                })
                .onConflictDoUpdate({
                    target: [ocPtTaskScores.enrollmentId, ocPtTaskScores.ptTaskScoreId],
                    set: {
                        semester,
                        marksScored: item.marksScored,
                        remark: item.remark ?? null,
                        updatedAt: now,
                    },
                })
                .returning();
            if (row) rows.push(row);
        }
        return rows;
    });
}

export async function deleteOcPtScoresByIds(ocId: string, ids: string[]) {
    if (!ids.length) return [];
    const activeEnrollment = await getOrCreateActiveEnrollment(ocId);
    return db
        .delete(ocPtTaskScores)
        .where(
            and(
                eq(ocPtTaskScores.ocId, ocId),
                eq(ocPtTaskScores.enrollmentId, activeEnrollment.id),
                inArray(ocPtTaskScores.id, ids),
            ),
        )
        .returning();
}

export async function deleteOcPtScoresBySemester(ocId: string, semester: number) {
    const activeEnrollment = await getOrCreateActiveEnrollment(ocId);
    return db
        .delete(ocPtTaskScores)
        .where(
            and(
                eq(ocPtTaskScores.ocId, ocId),
                eq(ocPtTaskScores.enrollmentId, activeEnrollment.id),
                eq(ocPtTaskScores.semester, semester),
            ),
        )
        .returning();
}

// OC Motivation values -------------------------------------------------------
export async function listOcPtMotivationValues(ocId: string, semester: number) {
    const activeEnrollment = await getOrCreateActiveEnrollment(ocId);
    return db
        .select({
            id: ocPtMotivationAwards.id,
            ocId: ocPtMotivationAwards.ocId,
            semester: ocPtMotivationAwards.semester,
            fieldId: ocPtMotivationAwards.ptMotivationFieldId,
            value: ocPtMotivationAwards.value,
            createdAt: ocPtMotivationAwards.createdAt,
            updatedAt: ocPtMotivationAwards.updatedAt,
            fieldLabel: ptMotivationAwardFields.label,
            fieldSortOrder: ptMotivationAwardFields.sortOrder,
        })
        .from(ocPtMotivationAwards)
        .innerJoin(ptMotivationAwardFields, eq(ptMotivationAwardFields.id, ocPtMotivationAwards.ptMotivationFieldId))
        .where(
            and(
                eq(ocPtMotivationAwards.ocId, ocId),
                eq(ocPtMotivationAwards.enrollmentId, activeEnrollment.id),
                eq(ocPtMotivationAwards.semester, semester),
            ),
        )
        .orderBy(ptMotivationAwardFields.sortOrder, ptMotivationAwardFields.label);
}

export async function upsertOcPtMotivationValues(
    ocId: string,
    semester: number,
    values: Array<{ fieldId: string; value?: string | null }>,
) {
    if (!values.length) return [];
    const now = new Date();
    return db.transaction(async (tx) => {
        const activeEnrollment = await getOrCreateActiveEnrollment(ocId, tx);
        const rows: Array<typeof ocPtMotivationAwards.$inferSelect> = [];
        for (const item of values) {
            const [row] = await tx
                .insert(ocPtMotivationAwards)
                .values({
                    ocId,
                    enrollmentId: activeEnrollment.id,
                    semester,
                    ptMotivationFieldId: item.fieldId,
                    value: item.value ?? null,
                    createdAt: now,
                    updatedAt: now,
                })
                .onConflictDoUpdate({
                    target: [ocPtMotivationAwards.enrollmentId, ocPtMotivationAwards.ptMotivationFieldId],
                    set: {
                        semester,
                        value: item.value ?? null,
                        updatedAt: now,
                    },
                })
                .returning();
            if (row) rows.push(row);
        }
        return rows;
    });
}

export async function deleteOcPtMotivationValuesByIds(ocId: string, ids: string[]) {
    if (!ids.length) return [];
    const activeEnrollment = await getOrCreateActiveEnrollment(ocId);
    return db
        .delete(ocPtMotivationAwards)
        .where(
            and(
                eq(ocPtMotivationAwards.ocId, ocId),
                eq(ocPtMotivationAwards.enrollmentId, activeEnrollment.id),
                inArray(ocPtMotivationAwards.id, ids),
            ),
        )
        .returning();
}

export async function deleteOcPtMotivationValuesBySemester(ocId: string, semester: number) {
    const activeEnrollment = await getOrCreateActiveEnrollment(ocId);
    return db
        .delete(ocPtMotivationAwards)
        .where(
            and(
                eq(ocPtMotivationAwards.ocId, ocId),
                eq(ocPtMotivationAwards.enrollmentId, activeEnrollment.id),
                eq(ocPtMotivationAwards.semester, semester),
            ),
        )
        .returning();
}
