import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '@/app/db/client';
import {
    ptTypes,
    ptTypeAttempts,
    ptAttemptGrades,
    ptTasks,
    ptTaskScores,
    ptMotivationAwardFields,
} from '@/app/db/schema/training/physicalTraining';

// Types ---------------------------------------------------------------------
export async function listPtTypes(opts: { semester?: number; includeDeleted?: boolean } = {}) {
    const wh: any[] = [];
    if (opts.semester) wh.push(eq(ptTypes.semester, opts.semester));
    if (!opts.includeDeleted) wh.push(isNull(ptTypes.deletedAt));
    return db
        .select({
            id: ptTypes.id,
            semester: ptTypes.semester,
            code: ptTypes.code,
            title: ptTypes.title,
            description: ptTypes.description,
            maxTotalMarks: ptTypes.maxTotalMarks,
            sortOrder: ptTypes.sortOrder,
            isActive: ptTypes.isActive,
            createdAt: ptTypes.createdAt,
            updatedAt: ptTypes.updatedAt,
            deletedAt: ptTypes.deletedAt,
        })
        .from(ptTypes)
        .where(wh.length ? and(...wh) : undefined)
        .orderBy(ptTypes.semester, ptTypes.sortOrder, ptTypes.title);
}

export async function getPtType(id: string) {
    const [row] = await db.select().from(ptTypes).where(eq(ptTypes.id, id)).limit(1);
    return row ?? null;
}

export async function createPtType(data: typeof ptTypes.$inferInsert) {
    const now = new Date();
    const [row] = await db
        .insert(ptTypes)
        .values({ ...data, createdAt: now, updatedAt: now })
        .returning();
    return row;
}

export async function updatePtType(id: string, data: Partial<typeof ptTypes.$inferInsert>) {
    const [row] = await db
        .update(ptTypes)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(ptTypes.id, id))
        .returning();
    return row ?? null;
}

export async function deletePtType(id: string, opts: { hard?: boolean } = {}) {
    if (opts.hard) {
        const [row] = await db.delete(ptTypes).where(eq(ptTypes.id, id)).returning();
        return row ?? null;
    }
    const [row] = await db
        .update(ptTypes)
        .set({ deletedAt: new Date() })
        .where(eq(ptTypes.id, id))
        .returning();
    return row ?? null;
}

// Attempts ------------------------------------------------------------------
export async function listPtAttempts(ptTypeId: string, opts: { includeDeleted?: boolean } = {}) {
    const wh: any[] = [eq(ptTypeAttempts.ptTypeId, ptTypeId)];
    if (!opts.includeDeleted) wh.push(isNull(ptTypeAttempts.deletedAt));
    return db
        .select({
            id: ptTypeAttempts.id,
            ptTypeId: ptTypeAttempts.ptTypeId,
            code: ptTypeAttempts.code,
            label: ptTypeAttempts.label,
            isCompensatory: ptTypeAttempts.isCompensatory,
            sortOrder: ptTypeAttempts.sortOrder,
            isActive: ptTypeAttempts.isActive,
            createdAt: ptTypeAttempts.createdAt,
            updatedAt: ptTypeAttempts.updatedAt,
            deletedAt: ptTypeAttempts.deletedAt,
        })
        .from(ptTypeAttempts)
        .where(and(...wh))
        .orderBy(ptTypeAttempts.sortOrder, ptTypeAttempts.code);
}

export async function getPtAttempt(id: string) {
    const [row] = await db.select().from(ptTypeAttempts).where(eq(ptTypeAttempts.id, id)).limit(1);
    return row ?? null;
}

export async function createPtAttempt(ptTypeId: string, data: Omit<typeof ptTypeAttempts.$inferInsert, 'ptTypeId'>) {
    const now = new Date();
    const [row] = await db
        .insert(ptTypeAttempts)
        .values({ ptTypeId, ...data, createdAt: now, updatedAt: now })
        .returning();
    return row;
}

export async function updatePtAttempt(id: string, data: Partial<typeof ptTypeAttempts.$inferInsert>) {
    const [row] = await db
        .update(ptTypeAttempts)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(ptTypeAttempts.id, id))
        .returning();
    return row ?? null;
}

export async function deletePtAttempt(id: string, opts: { hard?: boolean } = {}) {
    if (opts.hard) {
        const [row] = await db.delete(ptTypeAttempts).where(eq(ptTypeAttempts.id, id)).returning();
        return row ?? null;
    }
    const [row] = await db
        .update(ptTypeAttempts)
        .set({ deletedAt: new Date() })
        .where(eq(ptTypeAttempts.id, id))
        .returning();
    return row ?? null;
}

// Grades --------------------------------------------------------------------
export async function listPtAttemptGrades(ptAttemptId: string, opts: { includeDeleted?: boolean } = {}) {
    const wh: any[] = [eq(ptAttemptGrades.ptAttemptId, ptAttemptId)];
    if (!opts.includeDeleted) wh.push(isNull(ptAttemptGrades.deletedAt));
    return db
        .select({
            id: ptAttemptGrades.id,
            ptAttemptId: ptAttemptGrades.ptAttemptId,
            code: ptAttemptGrades.code,
            label: ptAttemptGrades.label,
            sortOrder: ptAttemptGrades.sortOrder,
            isActive: ptAttemptGrades.isActive,
            createdAt: ptAttemptGrades.createdAt,
            updatedAt: ptAttemptGrades.updatedAt,
            deletedAt: ptAttemptGrades.deletedAt,
        })
        .from(ptAttemptGrades)
        .where(and(...wh))
        .orderBy(ptAttemptGrades.sortOrder, ptAttemptGrades.code);
}

export async function getPtAttemptGrade(id: string) {
    const [row] = await db.select().from(ptAttemptGrades).where(eq(ptAttemptGrades.id, id)).limit(1);
    return row ?? null;
}

export async function createPtAttemptGrade(
    ptAttemptId: string,
    data: Omit<typeof ptAttemptGrades.$inferInsert, 'ptAttemptId'>,
) {
    const now = new Date();
    const [row] = await db
        .insert(ptAttemptGrades)
        .values({ ptAttemptId, ...data, createdAt: now, updatedAt: now })
        .returning();
    return row;
}

export async function updatePtAttemptGrade(id: string, data: Partial<typeof ptAttemptGrades.$inferInsert>) {
    const [row] = await db
        .update(ptAttemptGrades)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(ptAttemptGrades.id, id))
        .returning();
    return row ?? null;
}

export async function deletePtAttemptGrade(id: string, opts: { hard?: boolean } = {}) {
    if (opts.hard) {
        const [row] = await db.delete(ptAttemptGrades).where(eq(ptAttemptGrades.id, id)).returning();
        return row ?? null;
    }
    const [row] = await db
        .update(ptAttemptGrades)
        .set({ deletedAt: new Date() })
        .where(eq(ptAttemptGrades.id, id))
        .returning();
    return row ?? null;
}

// Tasks ---------------------------------------------------------------------
export async function listPtTasks(ptTypeId: string, opts: { includeDeleted?: boolean } = {}) {
    const wh: any[] = [eq(ptTasks.ptTypeId, ptTypeId)];
    if (!opts.includeDeleted) wh.push(isNull(ptTasks.deletedAt));
    return db
        .select({
            id: ptTasks.id,
            ptTypeId: ptTasks.ptTypeId,
            title: ptTasks.title,
            maxMarks: ptTasks.maxMarks,
            sortOrder: ptTasks.sortOrder,
            createdAt: ptTasks.createdAt,
            updatedAt: ptTasks.updatedAt,
            deletedAt: ptTasks.deletedAt,
        })
        .from(ptTasks)
        .where(and(...wh))
        .orderBy(ptTasks.sortOrder, ptTasks.title);
}

export async function getPtTask(id: string) {
    const [row] = await db.select().from(ptTasks).where(eq(ptTasks.id, id)).limit(1);
    return row ?? null;
}

export async function createPtTask(ptTypeId: string, data: Omit<typeof ptTasks.$inferInsert, 'ptTypeId'>) {
    const now = new Date();
    const [row] = await db
        .insert(ptTasks)
        .values({ ptTypeId, ...data, createdAt: now, updatedAt: now })
        .returning();
    return row;
}

export async function updatePtTask(id: string, data: Partial<typeof ptTasks.$inferInsert>) {
    const [row] = await db
        .update(ptTasks)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(ptTasks.id, id))
        .returning();
    return row ?? null;
}

export async function deletePtTask(id: string, opts: { hard?: boolean } = {}) {
    if (opts.hard) {
        const [row] = await db.delete(ptTasks).where(eq(ptTasks.id, id)).returning();
        return row ?? null;
    }
    const [row] = await db
        .update(ptTasks)
        .set({ deletedAt: new Date() })
        .where(eq(ptTasks.id, id))
        .returning();
    return row ?? null;
}

// Task scores ----------------------------------------------------------------
export async function listPtTaskScores(ptTaskId: string) {
    return db
        .select({
            id: ptTaskScores.id,
            ptTaskId: ptTaskScores.ptTaskId,
            ptAttemptId: ptTaskScores.ptAttemptId,
            ptAttemptGradeId: ptTaskScores.ptAttemptGradeId,
            maxMarks: ptTaskScores.maxMarks,
            createdAt: ptTaskScores.createdAt,
            updatedAt: ptTaskScores.updatedAt,
        })
        .from(ptTaskScores)
        .where(eq(ptTaskScores.ptTaskId, ptTaskId));
}

export async function getPtTaskScore(id: string) {
    const [row] = await db.select().from(ptTaskScores).where(eq(ptTaskScores.id, id)).limit(1);
    return row ?? null;
}

export async function createPtTaskScore(
    ptTaskId: string,
    data: Omit<typeof ptTaskScores.$inferInsert, 'ptTaskId'>,
) {
    const [row] = await db
        .insert(ptTaskScores)
        .values({ ptTaskId, ...data, createdAt: new Date(), updatedAt: new Date() })
        .returning();
    return row;
}

export async function updatePtTaskScore(id: string, data: Partial<typeof ptTaskScores.$inferInsert>) {
    const [row] = await db
        .update(ptTaskScores)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(ptTaskScores.id, id))
        .returning();
    return row ?? null;
}

export async function deletePtTaskScore(id: string) {
    const [row] = await db.delete(ptTaskScores).where(eq(ptTaskScores.id, id)).returning();
    return row ?? null;
}

// Motivation fields ----------------------------------------------------------
export async function listPtMotivationFields(opts: { semester?: number; includeDeleted?: boolean } = {}) {
    const wh: any[] = [];
    if (opts.semester) wh.push(eq(ptMotivationAwardFields.semester, opts.semester));
    if (!opts.includeDeleted) wh.push(isNull(ptMotivationAwardFields.deletedAt));
    return db
        .select({
            id: ptMotivationAwardFields.id,
            semester: ptMotivationAwardFields.semester,
            label: ptMotivationAwardFields.label,
            sortOrder: ptMotivationAwardFields.sortOrder,
            isActive: ptMotivationAwardFields.isActive,
            createdAt: ptMotivationAwardFields.createdAt,
            updatedAt: ptMotivationAwardFields.updatedAt,
            deletedAt: ptMotivationAwardFields.deletedAt,
        })
        .from(ptMotivationAwardFields)
        .where(wh.length ? and(...wh) : undefined)
        .orderBy(ptMotivationAwardFields.semester, ptMotivationAwardFields.sortOrder, ptMotivationAwardFields.label);
}

export async function getPtMotivationField(id: string) {
    const [row] = await db.select().from(ptMotivationAwardFields).where(eq(ptMotivationAwardFields.id, id)).limit(1);
    return row ?? null;
}

export async function createPtMotivationField(data: typeof ptMotivationAwardFields.$inferInsert) {
    const now = new Date();
    const [row] = await db
        .insert(ptMotivationAwardFields)
        .values({ ...data, createdAt: now, updatedAt: now })
        .returning();
    return row;
}

export async function updatePtMotivationField(id: string, data: Partial<typeof ptMotivationAwardFields.$inferInsert>) {
    const [row] = await db
        .update(ptMotivationAwardFields)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(ptMotivationAwardFields.id, id))
        .returning();
    return row ?? null;
}

export async function deletePtMotivationField(id: string, opts: { hard?: boolean } = {}) {
    if (opts.hard) {
        const [row] = await db.delete(ptMotivationAwardFields).where(eq(ptMotivationAwardFields.id, id)).returning();
        return row ?? null;
    }
    const [row] = await db
        .update(ptMotivationAwardFields)
        .set({ deletedAt: new Date() })
        .where(eq(ptMotivationAwardFields.id, id))
        .returning();
    return row ?? null;
}

// Template aggregation -------------------------------------------------------
export async function getPtTemplateBySemester(semester: number, opts: { includeDeleted?: boolean } = {}) {
    const types = await listPtTypes({ semester, includeDeleted: opts.includeDeleted });
    if (!types.length) {
        return {
            semester,
            types: [],
            motivationFields: await listPtMotivationFields({ semester, includeDeleted: opts.includeDeleted }),
        };
    }

    const typeIds = types.map((t) => t.id);
    const attempts = await db
        .select({
            id: ptTypeAttempts.id,
            ptTypeId: ptTypeAttempts.ptTypeId,
            code: ptTypeAttempts.code,
            label: ptTypeAttempts.label,
            isCompensatory: ptTypeAttempts.isCompensatory,
            sortOrder: ptTypeAttempts.sortOrder,
            isActive: ptTypeAttempts.isActive,
            deletedAt: ptTypeAttempts.deletedAt,
        })
        .from(ptTypeAttempts)
        .where(
            and(
                inArray(ptTypeAttempts.ptTypeId, typeIds),
                ...(opts.includeDeleted ? [] : [isNull(ptTypeAttempts.deletedAt)]),
            ),
        )
        .orderBy(ptTypeAttempts.sortOrder, ptTypeAttempts.code);

    const attemptIds = attempts.map((a) => a.id);
    const grades = attemptIds.length
        ? await db
            .select({
                id: ptAttemptGrades.id,
                ptAttemptId: ptAttemptGrades.ptAttemptId,
                code: ptAttemptGrades.code,
                label: ptAttemptGrades.label,
                sortOrder: ptAttemptGrades.sortOrder,
                isActive: ptAttemptGrades.isActive,
                deletedAt: ptAttemptGrades.deletedAt,
            })
            .from(ptAttemptGrades)
            .where(
                and(
                    inArray(ptAttemptGrades.ptAttemptId, attemptIds),
                    ...(opts.includeDeleted ? [] : [isNull(ptAttemptGrades.deletedAt)]),
                ),
            )
            .orderBy(ptAttemptGrades.sortOrder, ptAttemptGrades.code)
        : [];

    const tasks = await db
        .select({
            id: ptTasks.id,
            ptTypeId: ptTasks.ptTypeId,
            title: ptTasks.title,
            maxMarks: ptTasks.maxMarks,
            sortOrder: ptTasks.sortOrder,
            deletedAt: ptTasks.deletedAt,
        })
        .from(ptTasks)
        .where(
            and(
                inArray(ptTasks.ptTypeId, typeIds),
                ...(opts.includeDeleted ? [] : [isNull(ptTasks.deletedAt)]),
            ),
        )
        .orderBy(ptTasks.sortOrder, ptTasks.title);

    const taskIds = tasks.map((t) => t.id);
    const scores = taskIds.length
        ? await db
            .select({
                id: ptTaskScores.id,
                ptTaskId: ptTaskScores.ptTaskId,
                ptAttemptId: ptTaskScores.ptAttemptId,
                ptAttemptGradeId: ptTaskScores.ptAttemptGradeId,
                maxMarks: ptTaskScores.maxMarks,
            })
            .from(ptTaskScores)
            .where(inArray(ptTaskScores.ptTaskId, taskIds))
        : [];

    const motivationFields = await listPtMotivationFields({ semester, includeDeleted: opts.includeDeleted });

    const gradesByAttempt = grades.reduce<Record<string, typeof grades>>((acc, grade) => {
        acc[grade.ptAttemptId] = acc[grade.ptAttemptId] ?? [];
        acc[grade.ptAttemptId].push(grade);
        return acc;
    }, {});

    const scoresByTask = scores.reduce<Record<string, typeof scores>>((acc, score) => {
        acc[score.ptTaskId] = acc[score.ptTaskId] ?? [];
        acc[score.ptTaskId].push(score);
        return acc;
    }, {});

    return {
        semester,
        types: types.map((type) => {
            const typeAttempts = attempts.filter((a) => a.ptTypeId === type.id);
            const typeTasks = tasks.filter((t) => t.ptTypeId === type.id);
            return {
                ...type,
                attempts: typeAttempts.map((attempt) => ({
                    ...attempt,
                    grades: (gradesByAttempt[attempt.id] ?? []).sort(
                        (a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code),
                    ),
                })),
                tasks: typeTasks.map((task) => {
                    const taskScores = scoresByTask[task.id] ?? [];
                    return {
                        ...task,
                        attempts: typeAttempts.map((attempt) => {
                            const attemptGrades = gradesByAttempt[attempt.id] ?? [];
                            return {
                                ...attempt,
                                grades: attemptGrades.map((grade) => {
                                    const score = taskScores.find(
                                        (s) =>
                                            s.ptAttemptId === attempt.id &&
                                            s.ptAttemptGradeId === grade.id,
                                    );
                                    return {
                                        ...grade,
                                        maxMarks: score?.maxMarks ?? null,
                                        scoreId: score?.id ?? null,
                                    };
                                }),
                            };
                        }),
                    };
                }),
            };
        }),
        motivationFields,
    };
}
