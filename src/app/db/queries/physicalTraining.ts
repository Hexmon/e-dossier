import { and, eq, inArray, isNull, ne, sql } from 'drizzle-orm';
import { db } from '@/app/db/client';
import {
    ptTypes,
    ptTypeAttempts,
    ptAttemptGrades,
    ptTasks,
    ptTaskScores,
    ptMotivationAwardFields,
} from '@/app/db/schema/training/physicalTraining';
import { ocPtTaskScores } from '@/app/db/schema/training/physicalTrainingOc';
import { ApiError } from '@/app/lib/http';
import { getCourse } from '@/app/db/queries/courses';

async function ensureCourseExists(courseId: string) {
    const course = await getCourse(courseId);
    if (!course) throw new ApiError(404, 'Course not found', 'not_found');
    return course;
}

// Types ---------------------------------------------------------------------
export async function listPtTypes(opts: { courseId?: string | null; semester?: number; includeDeleted?: boolean } = {}) {
    const wh: any[] = [];
    if (opts.courseId !== undefined) {
        wh.push(opts.courseId === null ? isNull(ptTypes.courseId) : eq(ptTypes.courseId, opts.courseId));
    }
    if (opts.semester) wh.push(eq(ptTypes.semester, opts.semester));
    if (!opts.includeDeleted) wh.push(isNull(ptTypes.deletedAt));
    return db
        .select({
            id: ptTypes.id,
            courseId: ptTypes.courseId,
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
        .orderBy(ptTypes.courseId, ptTypes.semester, ptTypes.sortOrder, ptTypes.title);
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

export async function getNextPtTypeSortOrder(
    courseId: string,
    semester: number,
    opts: { excludeId?: string } = {},
) {
    const wh = [
        eq(ptTypes.courseId, courseId),
        eq(ptTypes.semester, semester),
        isNull(ptTypes.deletedAt),
        ...(opts.excludeId ? [ne(ptTypes.id, opts.excludeId)] : []),
    ];

    const [row] = await db
        .select({
            next: sql<number>`coalesce(max(${ptTypes.sortOrder}), 0) + 1`,
        })
        .from(ptTypes)
        .where(and(...wh));

    return row?.next ?? 1;
}

export async function findPtTypeBySemesterAndSortOrder(
    courseId: string | null,
    semester: number,
    sortOrder: number,
    opts: { excludeId?: string } = {},
) {
    const wh = [
        courseId === null ? isNull(ptTypes.courseId) : eq(ptTypes.courseId, courseId),
        eq(ptTypes.semester, semester),
        eq(ptTypes.sortOrder, sortOrder),
        isNull(ptTypes.deletedAt),
        ...(opts.excludeId ? [ne(ptTypes.id, opts.excludeId)] : []),
    ];

    const [row] = await db
        .select({
            id: ptTypes.id,
            courseId: ptTypes.courseId,
            semester: ptTypes.semester,
            code: ptTypes.code,
            title: ptTypes.title,
            sortOrder: ptTypes.sortOrder,
        })
        .from(ptTypes)
        .where(and(...wh))
        .limit(1);

    return row ?? null;
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

export async function getNextPtAttemptSortOrder(ptTypeId: string, opts: { excludeId?: string } = {}) {
    const wh = [
        eq(ptTypeAttempts.ptTypeId, ptTypeId),
        isNull(ptTypeAttempts.deletedAt),
        ...(opts.excludeId ? [ne(ptTypeAttempts.id, opts.excludeId)] : []),
    ];

    const [row] = await db
        .select({
            next: sql<number>`coalesce(max(${ptTypeAttempts.sortOrder}), 0) + 1`,
        })
        .from(ptTypeAttempts)
        .where(and(...wh));

    return row?.next ?? 1;
}

export async function findPtAttemptByTypeAndSortOrder(
    ptTypeId: string,
    sortOrder: number,
    opts: { excludeId?: string } = {},
) {
    const wh = [
        eq(ptTypeAttempts.ptTypeId, ptTypeId),
        eq(ptTypeAttempts.sortOrder, sortOrder),
        isNull(ptTypeAttempts.deletedAt),
        ...(opts.excludeId ? [ne(ptTypeAttempts.id, opts.excludeId)] : []),
    ];

    const [row] = await db
        .select({
            id: ptTypeAttempts.id,
            ptTypeId: ptTypeAttempts.ptTypeId,
            code: ptTypeAttempts.code,
            label: ptTypeAttempts.label,
            sortOrder: ptTypeAttempts.sortOrder,
        })
        .from(ptTypeAttempts)
        .where(and(...wh))
        .limit(1);

    return row ?? null;
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

export async function getNextPtAttemptGradeSortOrder(ptAttemptId: string, opts: { excludeId?: string } = {}) {
    const wh = [
        eq(ptAttemptGrades.ptAttemptId, ptAttemptId),
        isNull(ptAttemptGrades.deletedAt),
        ...(opts.excludeId ? [ne(ptAttemptGrades.id, opts.excludeId)] : []),
    ];

    const [row] = await db
        .select({
            next: sql<number>`coalesce(max(${ptAttemptGrades.sortOrder}), 0) + 1`,
        })
        .from(ptAttemptGrades)
        .where(and(...wh));

    return row?.next ?? 1;
}

export async function findPtAttemptGradeByAttemptAndSortOrder(
    ptAttemptId: string,
    sortOrder: number,
    opts: { excludeId?: string } = {},
) {
    const wh = [
        eq(ptAttemptGrades.ptAttemptId, ptAttemptId),
        eq(ptAttemptGrades.sortOrder, sortOrder),
        isNull(ptAttemptGrades.deletedAt),
        ...(opts.excludeId ? [ne(ptAttemptGrades.id, opts.excludeId)] : []),
    ];

    const [row] = await db
        .select({
            id: ptAttemptGrades.id,
            ptAttemptId: ptAttemptGrades.ptAttemptId,
            code: ptAttemptGrades.code,
            label: ptAttemptGrades.label,
            sortOrder: ptAttemptGrades.sortOrder,
        })
        .from(ptAttemptGrades)
        .where(and(...wh))
        .limit(1);

    return row ?? null;
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

export async function getNextPtTaskSortOrder(ptTypeId: string, opts: { excludeId?: string } = {}) {
    const wh = [
        eq(ptTasks.ptTypeId, ptTypeId),
        isNull(ptTasks.deletedAt),
        ...(opts.excludeId ? [ne(ptTasks.id, opts.excludeId)] : []),
    ];

    const [row] = await db
        .select({
            next: sql<number>`coalesce(max(${ptTasks.sortOrder}), 0) + 1`,
        })
        .from(ptTasks)
        .where(and(...wh));

    return row?.next ?? 1;
}

export async function findPtTaskByTypeAndSortOrder(
    ptTypeId: string,
    sortOrder: number,
    opts: { excludeId?: string } = {},
) {
    const wh = [
        eq(ptTasks.ptTypeId, ptTypeId),
        eq(ptTasks.sortOrder, sortOrder),
        isNull(ptTasks.deletedAt),
        ...(opts.excludeId ? [ne(ptTasks.id, opts.excludeId)] : []),
    ];

    const [row] = await db
        .select({
            id: ptTasks.id,
            ptTypeId: ptTasks.ptTypeId,
            title: ptTasks.title,
            sortOrder: ptTasks.sortOrder,
        })
        .from(ptTasks)
        .where(and(...wh))
        .limit(1);

    return row ?? null;
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
export async function listPtMotivationFields(opts: { courseId?: string | null; semester?: number; includeDeleted?: boolean } = {}) {
    const wh: any[] = [];
    if (opts.courseId !== undefined) {
        wh.push(
            opts.courseId === null
                ? isNull(ptMotivationAwardFields.courseId)
                : eq(ptMotivationAwardFields.courseId, opts.courseId),
        );
    }
    if (opts.semester) wh.push(eq(ptMotivationAwardFields.semester, opts.semester));
    if (!opts.includeDeleted) wh.push(isNull(ptMotivationAwardFields.deletedAt));
    return db
        .select({
            id: ptMotivationAwardFields.id,
            courseId: ptMotivationAwardFields.courseId,
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
        .orderBy(
            ptMotivationAwardFields.courseId,
            ptMotivationAwardFields.semester,
            ptMotivationAwardFields.sortOrder,
            ptMotivationAwardFields.label,
        );
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

export async function getNextPtMotivationFieldSortOrder(
    courseId: string,
    semester: number,
    opts: { excludeId?: string } = {},
) {
    const wh = [
        eq(ptMotivationAwardFields.courseId, courseId),
        eq(ptMotivationAwardFields.semester, semester),
        isNull(ptMotivationAwardFields.deletedAt),
        ...(opts.excludeId ? [ne(ptMotivationAwardFields.id, opts.excludeId)] : []),
    ];

    const [row] = await db
        .select({
            next: sql<number>`coalesce(max(${ptMotivationAwardFields.sortOrder}), 0) + 1`,
        })
        .from(ptMotivationAwardFields)
        .where(and(...wh));

    return row?.next ?? 1;
}

export async function findPtMotivationFieldBySemesterAndSortOrder(
    courseId: string | null,
    semester: number,
    sortOrder: number,
    opts: { excludeId?: string } = {},
) {
    const wh = [
        courseId === null
            ? isNull(ptMotivationAwardFields.courseId)
            : eq(ptMotivationAwardFields.courseId, courseId),
        eq(ptMotivationAwardFields.semester, semester),
        eq(ptMotivationAwardFields.sortOrder, sortOrder),
        isNull(ptMotivationAwardFields.deletedAt),
        ...(opts.excludeId ? [ne(ptMotivationAwardFields.id, opts.excludeId)] : []),
    ];

    const [row] = await db
        .select({
            id: ptMotivationAwardFields.id,
            courseId: ptMotivationAwardFields.courseId,
            semester: ptMotivationAwardFields.semester,
            label: ptMotivationAwardFields.label,
            sortOrder: ptMotivationAwardFields.sortOrder,
        })
        .from(ptMotivationAwardFields)
        .where(and(...wh))
        .limit(1);

    return row ?? null;
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
async function buildPtTemplate(
    courseId: string | null,
    semester: number,
    opts: { includeDeleted?: boolean } = {},
) {
    const types = await listPtTypes({ courseId, semester, includeDeleted: opts.includeDeleted });
    if (!types.length) {
        return {
            courseId,
            semester,
            types: [],
            motivationFields: await listPtMotivationFields({
                courseId,
                semester,
                includeDeleted: opts.includeDeleted,
            }),
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

    const motivationFields = await listPtMotivationFields({
        courseId,
        semester,
        includeDeleted: opts.includeDeleted,
    });

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
        courseId,
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

export async function getPtTemplateBySemester(semester: number, opts: { includeDeleted?: boolean } = {}) {
    return buildPtTemplate(null, semester, opts);
}

export async function getPtTemplateByCourseSemester(
    courseId: string,
    semester: number,
    opts: { includeDeleted?: boolean; fallbackToLegacyGlobal?: boolean } = {},
) {
    await ensureCourseExists(courseId);
    const courseTemplate = await buildPtTemplate(courseId, semester, opts);
    if (
        (courseTemplate.types.length > 0 || courseTemplate.motivationFields.length > 0) ||
        !opts.fallbackToLegacyGlobal
    ) {
        return courseTemplate;
    }

    return buildPtTemplate(null, semester, opts);
}

type CopyStats = {
    created: number;
    updated: number;
    deactivated: number;
    deleted: number;
    preserved: number;
};

export type PtTemplateCopyResult = {
    sourceCourseId: string;
    targetCourseId: string;
    semester: number;
    mode: 'replace';
    createdCount: number;
    updatedCount: number;
    deactivatedCount: number;
    deletedCount: number;
    preservedCount: number;
    warnings: string[];
    stats: {
        types: CopyStats;
        attempts: CopyStats;
        grades: CopyStats;
        tasks: CopyStats;
        taskScores: CopyStats;
        motivationFields: CopyStats;
    };
};

function createCopyStats(): CopyStats {
    return { created: 0, updated: 0, deactivated: 0, deleted: 0, preserved: 0 };
}

function createPtCopyResult(
    sourceCourseId: string,
    targetCourseId: string,
    semester: number,
    stats: PtTemplateCopyResult['stats'],
    warnings: string[],
): PtTemplateCopyResult {
    const entityStats = Object.values(stats);
    return {
        sourceCourseId,
        targetCourseId,
        semester,
        mode: 'replace',
        createdCount: entityStats.reduce((sum, item) => sum + item.created, 0),
        updatedCount: entityStats.reduce((sum, item) => sum + item.updated, 0),
        deactivatedCount: entityStats.reduce((sum, item) => sum + item.deactivated, 0),
        deletedCount: entityStats.reduce((sum, item) => sum + item.deleted, 0),
        preservedCount: entityStats.reduce((sum, item) => sum + item.preserved, 0),
        warnings,
        stats,
    };
}

function hasChanges(current: Record<string, unknown>, next: Record<string, unknown>) {
    return Object.entries(next).some(([key, value]) => (current[key] ?? null) !== (value ?? null));
}

export async function copyPtTemplateToCourse(input: {
    sourceCourseId: string;
    targetCourseId: string;
    semester: number;
    mode?: 'replace';
}): Promise<PtTemplateCopyResult> {
    const mode = input.mode ?? 'replace';
    if (input.sourceCourseId === input.targetCourseId) {
        throw new ApiError(400, 'sourceCourseId and targetCourseId cannot be the same', 'bad_request');
    }

    await ensureCourseExists(input.sourceCourseId);
    await ensureCourseExists(input.targetCourseId);

    const source = await getPtTemplateByCourseSemester(input.sourceCourseId, input.semester, {
        includeDeleted: false,
        fallbackToLegacyGlobal: true,
    });
    if (source.types.length === 0 && source.motivationFields.length === 0) {
        throw new ApiError(404, 'Source PT template course is not configured for this semester.', 'not_found');
    }

    const warnings: string[] = [];
    const stats: PtTemplateCopyResult['stats'] = {
        types: createCopyStats(),
        attempts: createCopyStats(),
        grades: createCopyStats(),
        tasks: createCopyStats(),
        taskScores: createCopyStats(),
        motivationFields: createCopyStats(),
    };
    const now = new Date();

    await db.transaction(async (tx) => {
        const targetTypeRows = await tx
            .select({
                id: ptTypes.id,
                code: ptTypes.code,
                title: ptTypes.title,
                description: ptTypes.description,
                maxTotalMarks: ptTypes.maxTotalMarks,
                sortOrder: ptTypes.sortOrder,
                isActive: ptTypes.isActive,
                deletedAt: ptTypes.deletedAt,
            })
            .from(ptTypes)
            .where(and(eq(ptTypes.courseId, input.targetCourseId), eq(ptTypes.semester, input.semester)));

        const targetTypeByCode = new Map(targetTypeRows.map((row) => [row.code, row]));
        const visitedTypeIds = new Set<string>();

        for (const sourceType of source.types) {
            const targetType = targetTypeByCode.get(sourceType.code);
            let targetTypeId = targetType?.id ?? '';

            if (!targetType) {
                const [createdType] = await tx
                    .insert(ptTypes)
                    .values({
                        courseId: input.targetCourseId,
                        semester: input.semester,
                        code: sourceType.code,
                        title: sourceType.title,
                        description: sourceType.description ?? null,
                        maxTotalMarks: sourceType.maxTotalMarks,
                        sortOrder: sourceType.sortOrder,
                        isActive: sourceType.isActive,
                        createdAt: now,
                        updatedAt: now,
                    })
                    .returning({ id: ptTypes.id });
                targetTypeId = createdType.id;
                stats.types.created += 1;
            } else {
                const patch = {
                    title: sourceType.title,
                    description: sourceType.description ?? null,
                    maxTotalMarks: sourceType.maxTotalMarks,
                    sortOrder: sourceType.sortOrder,
                    isActive: sourceType.isActive,
                    deletedAt: null as Date | null,
                };
                if (hasChanges(targetType, patch)) {
                    await tx
                        .update(ptTypes)
                        .set({ ...patch, updatedAt: now })
                        .where(eq(ptTypes.id, targetType.id));
                    stats.types.updated += 1;
                }
                targetTypeId = targetType.id;
            }

            visitedTypeIds.add(targetTypeId);

            const existingAttempts = await tx
                .select({
                    id: ptTypeAttempts.id,
                    code: ptTypeAttempts.code,
                    label: ptTypeAttempts.label,
                    isCompensatory: ptTypeAttempts.isCompensatory,
                    sortOrder: ptTypeAttempts.sortOrder,
                    isActive: ptTypeAttempts.isActive,
                    deletedAt: ptTypeAttempts.deletedAt,
                })
                .from(ptTypeAttempts)
                .where(eq(ptTypeAttempts.ptTypeId, targetTypeId));

            const attemptByCode = new Map(existingAttempts.map((row) => [row.code, row]));
            const attemptIdByCode = new Map<string, string>();
            const gradeIdByAttemptAndCode = new Map<string, string>();
            const visitedAttemptIds = new Set<string>();
            const visitedGradeIds = new Set<string>();

            for (const sourceAttempt of sourceType.attempts) {
                const targetAttempt = attemptByCode.get(sourceAttempt.code);
                let targetAttemptId = targetAttempt?.id ?? '';

                if (!targetAttempt) {
                    const [createdAttempt] = await tx
                        .insert(ptTypeAttempts)
                        .values({
                            ptTypeId: targetTypeId,
                            code: sourceAttempt.code,
                            label: sourceAttempt.label,
                            isCompensatory: sourceAttempt.isCompensatory,
                            sortOrder: sourceAttempt.sortOrder,
                            isActive: sourceAttempt.isActive,
                            createdAt: now,
                            updatedAt: now,
                        })
                        .returning({ id: ptTypeAttempts.id });
                    targetAttemptId = createdAttempt.id;
                    stats.attempts.created += 1;
                } else {
                    const patch = {
                        label: sourceAttempt.label,
                        isCompensatory: sourceAttempt.isCompensatory,
                        sortOrder: sourceAttempt.sortOrder,
                        isActive: sourceAttempt.isActive,
                        deletedAt: null as Date | null,
                    };
                    if (hasChanges(targetAttempt, patch)) {
                        await tx
                            .update(ptTypeAttempts)
                            .set({ ...patch, updatedAt: now })
                            .where(eq(ptTypeAttempts.id, targetAttempt.id));
                        stats.attempts.updated += 1;
                    }
                    targetAttemptId = targetAttempt.id;
                }

                visitedAttemptIds.add(targetAttemptId);
                attemptIdByCode.set(sourceAttempt.code, targetAttemptId);

                const existingGrades = await tx
                    .select({
                        id: ptAttemptGrades.id,
                        code: ptAttemptGrades.code,
                        label: ptAttemptGrades.label,
                        sortOrder: ptAttemptGrades.sortOrder,
                        isActive: ptAttemptGrades.isActive,
                        deletedAt: ptAttemptGrades.deletedAt,
                    })
                    .from(ptAttemptGrades)
                    .where(eq(ptAttemptGrades.ptAttemptId, targetAttemptId));

                const gradeByCode = new Map(existingGrades.map((row) => [row.code, row]));

                for (const sourceGrade of sourceAttempt.grades) {
                    const targetGrade = gradeByCode.get(sourceGrade.code);
                    let targetGradeId = targetGrade?.id ?? '';

                    if (!targetGrade) {
                        const [createdGrade] = await tx
                            .insert(ptAttemptGrades)
                            .values({
                                ptAttemptId: targetAttemptId,
                                code: sourceGrade.code,
                                label: sourceGrade.label,
                                sortOrder: sourceGrade.sortOrder,
                                isActive: sourceGrade.isActive,
                                createdAt: now,
                                updatedAt: now,
                            })
                            .returning({ id: ptAttemptGrades.id });
                        targetGradeId = createdGrade.id;
                        stats.grades.created += 1;
                    } else {
                        const patch = {
                            label: sourceGrade.label,
                            sortOrder: sourceGrade.sortOrder,
                            isActive: sourceGrade.isActive,
                            deletedAt: null as Date | null,
                        };
                        if (hasChanges(targetGrade, patch)) {
                            await tx
                                .update(ptAttemptGrades)
                                .set({ ...patch, updatedAt: now })
                                .where(eq(ptAttemptGrades.id, targetGrade.id));
                            stats.grades.updated += 1;
                        }
                        targetGradeId = targetGrade.id;
                    }

                    visitedGradeIds.add(targetGradeId);
                    gradeIdByAttemptAndCode.set(`${sourceAttempt.code}:${sourceGrade.code}`, targetGradeId);
                }

                const staleGradeIds = existingGrades
                    .filter((row) => !visitedGradeIds.has(row.id))
                    .map((row) => row.id);

                if (staleGradeIds.length > 0) {
                    await tx
                        .update(ptAttemptGrades)
                        .set({ deletedAt: now, updatedAt: now })
                        .where(inArray(ptAttemptGrades.id, staleGradeIds));
                    stats.grades.deactivated += staleGradeIds.length;
                }
            }

            const staleAttemptIds = existingAttempts
                .filter((row) => !visitedAttemptIds.has(row.id))
                .map((row) => row.id);

            if (staleAttemptIds.length > 0) {
                await tx
                    .update(ptTypeAttempts)
                    .set({ deletedAt: now, updatedAt: now })
                    .where(inArray(ptTypeAttempts.id, staleAttemptIds));
                stats.attempts.deactivated += staleAttemptIds.length;
            }

            const existingTasks = await tx
                .select({
                    id: ptTasks.id,
                    title: ptTasks.title,
                    maxMarks: ptTasks.maxMarks,
                    sortOrder: ptTasks.sortOrder,
                    deletedAt: ptTasks.deletedAt,
                })
                .from(ptTasks)
                .where(eq(ptTasks.ptTypeId, targetTypeId));

            const taskByTitle = new Map(existingTasks.map((row) => [row.title, row]));
            const visitedTaskIds = new Set<string>();

            for (const sourceTask of sourceType.tasks) {
                const targetTask = taskByTitle.get(sourceTask.title);
                let targetTaskId = targetTask?.id ?? '';

                if (!targetTask) {
                    const [createdTask] = await tx
                        .insert(ptTasks)
                        .values({
                            ptTypeId: targetTypeId,
                            title: sourceTask.title,
                            maxMarks: sourceTask.maxMarks,
                            sortOrder: sourceTask.sortOrder,
                            createdAt: now,
                            updatedAt: now,
                        })
                        .returning({ id: ptTasks.id });
                    targetTaskId = createdTask.id;
                    stats.tasks.created += 1;
                } else {
                    const patch = {
                        maxMarks: sourceTask.maxMarks,
                        sortOrder: sourceTask.sortOrder,
                        deletedAt: null as Date | null,
                    };
                    if (hasChanges(targetTask, patch)) {
                        await tx
                            .update(ptTasks)
                            .set({ ...patch, updatedAt: now })
                            .where(eq(ptTasks.id, targetTask.id));
                        stats.tasks.updated += 1;
                    }
                    targetTaskId = targetTask.id;
                }

                visitedTaskIds.add(targetTaskId);

                const existingScores = await tx
                    .select({
                        id: ptTaskScores.id,
                        ptAttemptId: ptTaskScores.ptAttemptId,
                        ptAttemptGradeId: ptTaskScores.ptAttemptGradeId,
                        maxMarks: ptTaskScores.maxMarks,
                    })
                    .from(ptTaskScores)
                    .where(eq(ptTaskScores.ptTaskId, targetTaskId));

                const scoreByKey = new Map(
                    existingScores.map((row) => [`${row.ptAttemptId}:${row.ptAttemptGradeId}`, row]),
                );
                const expectedScoreKeys = new Set<string>();

                for (const sourceAttempt of sourceTask.attempts) {
                    const targetAttemptId = attemptIdByCode.get(sourceAttempt.code);
                    if (!targetAttemptId) continue;

                    for (const sourceGrade of sourceAttempt.grades) {
                        if (sourceGrade.maxMarks === null || sourceGrade.maxMarks === undefined) {
                            continue;
                        }

                        const targetGradeId = gradeIdByAttemptAndCode.get(
                            `${sourceAttempt.code}:${sourceGrade.code}`,
                        );
                        if (!targetGradeId) continue;

                        const scoreKey = `${targetAttemptId}:${targetGradeId}`;
                        expectedScoreKeys.add(scoreKey);
                        const targetScore = scoreByKey.get(scoreKey);

                        if (!targetScore) {
                            await tx.insert(ptTaskScores).values({
                                ptTaskId: targetTaskId,
                                ptAttemptId: targetAttemptId,
                                ptAttemptGradeId: targetGradeId,
                                maxMarks: sourceGrade.maxMarks,
                                createdAt: now,
                                updatedAt: now,
                            });
                            stats.taskScores.created += 1;
                            continue;
                        }

                        if (targetScore.maxMarks !== sourceGrade.maxMarks) {
                            await tx
                                .update(ptTaskScores)
                                .set({ maxMarks: sourceGrade.maxMarks, updatedAt: now })
                                .where(eq(ptTaskScores.id, targetScore.id));
                            stats.taskScores.updated += 1;
                        }
                    }
                }

                for (const existingScore of existingScores) {
                    const scoreKey = `${existingScore.ptAttemptId}:${existingScore.ptAttemptGradeId}`;
                    if (expectedScoreKeys.has(scoreKey)) continue;

                    const [linkedOcScore] = await tx
                        .select({ id: ocPtTaskScores.id })
                        .from(ocPtTaskScores)
                        .where(eq(ocPtTaskScores.ptTaskScoreId, existingScore.id))
                        .limit(1);

                    if (linkedOcScore) {
                        stats.taskScores.preserved += 1;
                        warnings.push(
                            `Preserved PT task score ${existingScore.id} in course ${input.targetCourseId} semester ${input.semester} because OC scores reference it.`,
                        );
                        continue;
                    }

                    await tx.delete(ptTaskScores).where(eq(ptTaskScores.id, existingScore.id));
                    stats.taskScores.deleted += 1;
                }
            }

            const staleTaskIds = existingTasks
                .filter((row) => !visitedTaskIds.has(row.id))
                .map((row) => row.id);

            if (staleTaskIds.length > 0) {
                await tx
                    .update(ptTasks)
                    .set({ deletedAt: now, updatedAt: now })
                    .where(inArray(ptTasks.id, staleTaskIds));
                stats.tasks.deactivated += staleTaskIds.length;
            }
        }

        const staleTypeIds = targetTypeRows
            .filter((row) => !visitedTypeIds.has(row.id))
            .map((row) => row.id);

        if (staleTypeIds.length > 0) {
            await tx
                .update(ptTypes)
                .set({ deletedAt: now, updatedAt: now })
                .where(inArray(ptTypes.id, staleTypeIds));
            stats.types.deactivated += staleTypeIds.length;
        }

        const targetMotivationFields = await tx
            .select({
                id: ptMotivationAwardFields.id,
                label: ptMotivationAwardFields.label,
                sortOrder: ptMotivationAwardFields.sortOrder,
                isActive: ptMotivationAwardFields.isActive,
                deletedAt: ptMotivationAwardFields.deletedAt,
            })
            .from(ptMotivationAwardFields)
            .where(
                and(
                    eq(ptMotivationAwardFields.courseId, input.targetCourseId),
                    eq(ptMotivationAwardFields.semester, input.semester),
                ),
            );

        const fieldByLabel = new Map(targetMotivationFields.map((row) => [row.label, row]));
        const visitedFieldIds = new Set<string>();

        for (const sourceField of source.motivationFields) {
            const targetField = fieldByLabel.get(sourceField.label);
            let targetFieldId = targetField?.id ?? '';

            if (!targetField) {
                const [createdField] = await tx
                    .insert(ptMotivationAwardFields)
                    .values({
                        courseId: input.targetCourseId,
                        semester: input.semester,
                        label: sourceField.label,
                        sortOrder: sourceField.sortOrder,
                        isActive: sourceField.isActive,
                        createdAt: now,
                        updatedAt: now,
                    })
                    .returning({ id: ptMotivationAwardFields.id });
                targetFieldId = createdField.id;
                stats.motivationFields.created += 1;
            } else {
                const patch = {
                    sortOrder: sourceField.sortOrder,
                    isActive: sourceField.isActive,
                    deletedAt: null as Date | null,
                };
                if (hasChanges(targetField, patch)) {
                    await tx
                        .update(ptMotivationAwardFields)
                        .set({ ...patch, updatedAt: now })
                        .where(eq(ptMotivationAwardFields.id, targetField.id));
                    stats.motivationFields.updated += 1;
                }
                targetFieldId = targetField.id;
            }

            visitedFieldIds.add(targetFieldId);
        }

        const staleFieldIds = targetMotivationFields
            .filter((row) => !visitedFieldIds.has(row.id))
            .map((row) => row.id);

        if (staleFieldIds.length > 0) {
            await tx
                .update(ptMotivationAwardFields)
                .set({ deletedAt: now, updatedAt: now })
                .where(inArray(ptMotivationAwardFields.id, staleFieldIds));
            stats.motivationFields.deactivated += staleFieldIds.length;
        }
    });

    return createPtCopyResult(input.sourceCourseId, input.targetCourseId, input.semester, stats, warnings);
}
