import { and, eq, isNull, inArray } from 'drizzle-orm';
import { db } from '@/app/db/client';
import { trainingCamps, trainingCampActivities, trainingCampSettings } from '@/app/db/schema/training/oc';
import { ApiError } from '@/app/lib/http';
import { getCourse } from '@/app/db/queries/courses';

async function ensureCourseExists(courseId: string) {
    const course = await getCourse(courseId);
    if (!course) throw new ApiError(404, 'Course not found', 'not_found');
    return course;
}

// Camps ----------------------------------------------------------------------
export async function listTrainingCamps(opts: {
    courseId?: string | null;
    semester?: number;
    includeActivities?: boolean;
    includeDeleted?: boolean;
}) {
    const wh: any[] = [];
    if (opts.courseId !== undefined) {
        wh.push(opts.courseId === null ? isNull(trainingCamps.courseId) : eq(trainingCamps.courseId, opts.courseId));
    }
    if (opts.semester) wh.push(eq(trainingCamps.semester, opts.semester));
    if (!opts.includeDeleted) wh.push(isNull(trainingCamps.deletedAt));

    const camps = await db
        .select({
            id: trainingCamps.id,
            courseId: trainingCamps.courseId,
            name: trainingCamps.name,
            semester: trainingCamps.semester,
            sortOrder: trainingCamps.sortOrder,
            maxTotalMarks: trainingCamps.maxTotalMarks,
            performanceTitle: trainingCamps.performanceTitle,
            performanceGuidance: trainingCamps.performanceGuidance,
            signaturePrimaryLabel: trainingCamps.signaturePrimaryLabel,
            signatureSecondaryLabel: trainingCamps.signatureSecondaryLabel,
            noteLine1: trainingCamps.noteLine1,
            noteLine2: trainingCamps.noteLine2,
            showAggregateSummary: trainingCamps.showAggregateSummary,
            createdAt: trainingCamps.createdAt,
            updatedAt: trainingCamps.updatedAt,
            deletedAt: trainingCamps.deletedAt,
        })
        .from(trainingCamps)
        .where(wh.length ? and(...wh) : undefined)
        .orderBy(trainingCamps.courseId, trainingCamps.semester, trainingCamps.sortOrder, trainingCamps.name);

    if (!opts.includeActivities || !camps.length) return camps;

    const campIds = camps.map((c) => c.id);
    const activities = await db
        .select({
            id: trainingCampActivities.id,
            trainingCampId: trainingCampActivities.trainingCampId,
            name: trainingCampActivities.name,
            defaultMaxMarks: trainingCampActivities.defaultMaxMarks,
            sortOrder: trainingCampActivities.sortOrder,
            createdAt: trainingCampActivities.createdAt,
            updatedAt: trainingCampActivities.updatedAt,
            deletedAt: trainingCampActivities.deletedAt,
        })
        .from(trainingCampActivities)
        .where(campIds.length ? inArray(trainingCampActivities.trainingCampId, campIds) : undefined);

    return camps.map((camp) => ({
        ...camp,
        activities: activities
            .filter((a) => a.trainingCampId === camp.id && (opts.includeDeleted || !a.deletedAt))
            .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    }));
}

export async function getTrainingCamp(id: string, includeActivities = false, includeDeletedActivities = false) {
    const [camp] = await db
        .select()
        .from(trainingCamps)
        .where(eq(trainingCamps.id, id))
        .limit(1);
    if (!camp) return null;
    if (!includeActivities) return camp;

    const activities = await listTrainingCampActivities(id, { includeDeleted: includeDeletedActivities });
    return { ...camp, activities };
}

export async function createTrainingCamp(data: typeof trainingCamps.$inferInsert) {
    const now = new Date();
    const [row] = await db
        .insert(trainingCamps)
        .values({ ...data, sortOrder: data.sortOrder ?? 1, createdAt: now, updatedAt: now })
        .returning();
    return row;
}

export async function updateTrainingCamp(id: string, data: Partial<typeof trainingCamps.$inferInsert>) {
    const [row] = await db
        .update(trainingCamps)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(trainingCamps.id, id))
        .returning();
    return row ?? null;
}

export async function deleteTrainingCamp(id: string, opts: { hard?: boolean } = {}) {
    if (opts.hard) {
        const [row] = await db.delete(trainingCamps).where(eq(trainingCamps.id, id)).returning();
        return row ?? null;
    }
    const [row] = await db
        .update(trainingCamps)
        .set({ deletedAt: new Date() })
        .where(eq(trainingCamps.id, id))
        .returning();
    return row ?? null;
}

// Settings -------------------------------------------------------------------
type TrainingCampSettingsRow = {
    id: string;
    singletonKey: string;
    maxCampsPerSemester: number;
    createdAt: Date;
    updatedAt: Date;
};

const SETTINGS_SINGLETON_KEY = 'default';

export async function getTrainingCampSettings(): Promise<TrainingCampSettingsRow> {
    const [existing] = await db
        .select()
        .from(trainingCampSettings)
        .where(eq(trainingCampSettings.singletonKey, SETTINGS_SINGLETON_KEY))
        .limit(1);

    if (existing) return existing;

    const now = new Date();
    const [created] = await db
        .insert(trainingCampSettings)
        .values({
            singletonKey: SETTINGS_SINGLETON_KEY,
            maxCampsPerSemester: 2,
            createdAt: now,
            updatedAt: now,
        })
        .returning();

    return created;
}

export async function updateTrainingCampSettings(data: { maxCampsPerSemester: number }): Promise<TrainingCampSettingsRow> {
    const current = await getTrainingCampSettings();
    const [updated] = await db
        .update(trainingCampSettings)
        .set({
            maxCampsPerSemester: data.maxCampsPerSemester,
            updatedAt: new Date(),
        })
        .where(eq(trainingCampSettings.id, current.id))
        .returning();

    return updated;
}

export async function countActiveTrainingCampsBySemester(
    courseId: string | null,
    semester: number,
    opts: { excludeCampId?: string } = {},
): Promise<number> {
    const courseScope = courseId === null ? isNull(trainingCamps.courseId) : eq(trainingCamps.courseId, courseId);
    const activeRows = await db
        .select({ id: trainingCamps.id })
        .from(trainingCamps)
        .where(and(courseScope, eq(trainingCamps.semester, semester), isNull(trainingCamps.deletedAt)));

    return opts.excludeCampId
        ? activeRows.filter((row) => row.id !== opts.excludeCampId).length
        : activeRows.length;
}

// Activities -----------------------------------------------------------------
export async function listTrainingCampActivities(
    trainingCampId: string,
    opts: { includeDeleted?: boolean } = {},
) {
    const wh: any[] = [eq(trainingCampActivities.trainingCampId, trainingCampId)];
    if (!opts.includeDeleted) wh.push(isNull(trainingCampActivities.deletedAt));

    return db
        .select({
            id: trainingCampActivities.id,
            trainingCampId: trainingCampActivities.trainingCampId,
            name: trainingCampActivities.name,
            defaultMaxMarks: trainingCampActivities.defaultMaxMarks,
            sortOrder: trainingCampActivities.sortOrder,
            createdAt: trainingCampActivities.createdAt,
            updatedAt: trainingCampActivities.updatedAt,
            deletedAt: trainingCampActivities.deletedAt,
        })
        .from(trainingCampActivities)
        .where(and(...wh))
        .orderBy(trainingCampActivities.sortOrder, trainingCampActivities.name);
}

export async function getTrainingCampActivity(id: string) {
    const [row] = await db
        .select()
        .from(trainingCampActivities)
        .where(eq(trainingCampActivities.id, id))
        .limit(1);
    return row ?? null;
}

export async function createTrainingCampActivity(
    trainingCampId: string,
    data: Omit<typeof trainingCampActivities.$inferInsert, 'trainingCampId' | 'id' | 'deletedAt'>,
) {
    const now = new Date();
    const [row] = await db
        .insert(trainingCampActivities)
        .values({
            trainingCampId,
            ...data,
            createdAt: now,
            updatedAt: now,
        })
        .returning();
    return row;
}

export async function updateTrainingCampActivity(
    id: string,
    data: Partial<typeof trainingCampActivities.$inferInsert>,
) {
    const [row] = await db
        .update(trainingCampActivities)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(trainingCampActivities.id, id))
        .returning();
    return row ?? null;
}

export async function deleteTrainingCampActivity(id: string, opts: { hard?: boolean } = {}) {
    if (opts.hard) {
        const [row] = await db.delete(trainingCampActivities).where(eq(trainingCampActivities.id, id)).returning();
        return row ?? null;
    }
    const [row] = await db
        .update(trainingCampActivities)
        .set({ deletedAt: new Date() })
        .where(eq(trainingCampActivities.id, id))
        .returning();
    return row ?? null;
}

type CopyStats = {
    created: number;
    updated: number;
    deactivated: number;
};

export type TrainingCampTemplateCopyResult = {
    sourceCourseId: string;
    targetCourseId: string;
    semester: number;
    mode: 'replace';
    createdCount: number;
    updatedCount: number;
    deactivatedCount: number;
    stats: {
        camps: CopyStats;
        activities: CopyStats;
    };
};

function createCopyStats(): CopyStats {
    return { created: 0, updated: 0, deactivated: 0 };
}

function hasChanges(current: Record<string, unknown>, next: Record<string, unknown>) {
    return Object.entries(next).some(([key, value]) => (current[key] ?? null) !== (value ?? null));
}

export async function copyTrainingCampTemplateSemester(input: {
    sourceCourseId: string;
    targetCourseId: string;
    semester: number;
    mode?: 'replace';
}): Promise<TrainingCampTemplateCopyResult> {
    const mode = input.mode ?? 'replace';
    if (input.sourceCourseId === input.targetCourseId) {
        throw new ApiError(400, 'sourceCourseId and targetCourseId cannot be the same', 'bad_request');
    }

    await ensureCourseExists(input.sourceCourseId);
    await ensureCourseExists(input.targetCourseId);

    const sourceCamps = await listTrainingCamps({
        courseId: input.sourceCourseId,
        semester: input.semester,
        includeActivities: true,
        includeDeleted: false,
    }) as Array<Awaited<ReturnType<typeof listTrainingCamps>>[number] & {
        activities?: Array<{
            id: string;
            trainingCampId: string;
            name: string;
            defaultMaxMarks: number;
            sortOrder: number;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
        }>;
    }>;

    if (sourceCamps.length === 0) {
        throw new ApiError(404, 'Source training camp course is not configured for this semester.', 'not_found');
    }

    const stats = {
        camps: createCopyStats(),
        activities: createCopyStats(),
    };
    const now = new Date();

    await db.transaction(async (tx) => {
        const targetCamps = await tx
            .select({
                id: trainingCamps.id,
                name: trainingCamps.name,
                sortOrder: trainingCamps.sortOrder,
                maxTotalMarks: trainingCamps.maxTotalMarks,
                performanceTitle: trainingCamps.performanceTitle,
                performanceGuidance: trainingCamps.performanceGuidance,
                signaturePrimaryLabel: trainingCamps.signaturePrimaryLabel,
                signatureSecondaryLabel: trainingCamps.signatureSecondaryLabel,
                noteLine1: trainingCamps.noteLine1,
                noteLine2: trainingCamps.noteLine2,
                showAggregateSummary: trainingCamps.showAggregateSummary,
                deletedAt: trainingCamps.deletedAt,
            })
            .from(trainingCamps)
            .where(and(eq(trainingCamps.courseId, input.targetCourseId), eq(trainingCamps.semester, input.semester)));

        const targetCampByName = new Map(targetCamps.map((row) => [row.name, row]));
        const visitedCampIds = new Set<string>();

        for (const sourceCamp of sourceCamps) {
            const targetCamp = targetCampByName.get(sourceCamp.name);
            let targetCampId = targetCamp?.id ?? '';

            if (!targetCamp) {
                const [createdCamp] = await tx
                    .insert(trainingCamps)
                    .values({
                        courseId: input.targetCourseId,
                        semester: input.semester,
                        name: sourceCamp.name,
                        sortOrder: sourceCamp.sortOrder,
                        maxTotalMarks: sourceCamp.maxTotalMarks,
                        performanceTitle: sourceCamp.performanceTitle ?? null,
                        performanceGuidance: sourceCamp.performanceGuidance ?? null,
                        signaturePrimaryLabel: sourceCamp.signaturePrimaryLabel ?? null,
                        signatureSecondaryLabel: sourceCamp.signatureSecondaryLabel ?? null,
                        noteLine1: sourceCamp.noteLine1 ?? null,
                        noteLine2: sourceCamp.noteLine2 ?? null,
                        showAggregateSummary: sourceCamp.showAggregateSummary ?? false,
                        createdAt: now,
                        updatedAt: now,
                    })
                    .returning({ id: trainingCamps.id });
                targetCampId = createdCamp.id;
                stats.camps.created += 1;
            } else {
                const patch = {
                    sortOrder: sourceCamp.sortOrder,
                    maxTotalMarks: sourceCamp.maxTotalMarks,
                    performanceTitle: sourceCamp.performanceTitle ?? null,
                    performanceGuidance: sourceCamp.performanceGuidance ?? null,
                    signaturePrimaryLabel: sourceCamp.signaturePrimaryLabel ?? null,
                    signatureSecondaryLabel: sourceCamp.signatureSecondaryLabel ?? null,
                    noteLine1: sourceCamp.noteLine1 ?? null,
                    noteLine2: sourceCamp.noteLine2 ?? null,
                    showAggregateSummary: sourceCamp.showAggregateSummary ?? false,
                    deletedAt: null as Date | null,
                };
                if (hasChanges(targetCamp, patch)) {
                    await tx
                        .update(trainingCamps)
                        .set({ ...patch, updatedAt: now })
                        .where(eq(trainingCamps.id, targetCamp.id));
                    stats.camps.updated += 1;
                }
                targetCampId = targetCamp.id;
            }

            visitedCampIds.add(targetCampId);

            const targetActivities = await tx
                .select({
                    id: trainingCampActivities.id,
                    name: trainingCampActivities.name,
                    defaultMaxMarks: trainingCampActivities.defaultMaxMarks,
                    sortOrder: trainingCampActivities.sortOrder,
                    deletedAt: trainingCampActivities.deletedAt,
                })
                .from(trainingCampActivities)
                .where(eq(trainingCampActivities.trainingCampId, targetCampId));

            const targetActivityByName = new Map(targetActivities.map((row) => [row.name, row]));
            const visitedActivityIds = new Set<string>();

            for (const sourceActivity of sourceCamp.activities ?? []) {
                const targetActivity = targetActivityByName.get(sourceActivity.name);
                let targetActivityId = targetActivity?.id ?? '';

                if (!targetActivity) {
                    const [createdActivity] = await tx
                        .insert(trainingCampActivities)
                        .values({
                            trainingCampId: targetCampId,
                            name: sourceActivity.name,
                            defaultMaxMarks: sourceActivity.defaultMaxMarks,
                            sortOrder: sourceActivity.sortOrder,
                            createdAt: now,
                            updatedAt: now,
                        })
                        .returning({ id: trainingCampActivities.id });
                    targetActivityId = createdActivity.id;
                    stats.activities.created += 1;
                } else {
                    const patch = {
                        defaultMaxMarks: sourceActivity.defaultMaxMarks,
                        sortOrder: sourceActivity.sortOrder,
                        deletedAt: null as Date | null,
                    };
                    if (hasChanges(targetActivity, patch)) {
                        await tx
                            .update(trainingCampActivities)
                            .set({ ...patch, updatedAt: now })
                            .where(eq(trainingCampActivities.id, targetActivity.id));
                        stats.activities.updated += 1;
                    }
                    targetActivityId = targetActivity.id;
                }

                visitedActivityIds.add(targetActivityId);
            }

            const staleActivityIds = targetActivities
                .filter((row) => !visitedActivityIds.has(row.id))
                .map((row) => row.id);

            if (staleActivityIds.length > 0) {
                await tx
                    .update(trainingCampActivities)
                    .set({ deletedAt: now, updatedAt: now })
                    .where(inArray(trainingCampActivities.id, staleActivityIds));
                stats.activities.deactivated += staleActivityIds.length;
            }
        }

        const staleCampIds = targetCamps
            .filter((row) => !visitedCampIds.has(row.id))
            .map((row) => row.id);

        if (staleCampIds.length > 0) {
            await tx
                .update(trainingCamps)
                .set({ deletedAt: now, updatedAt: now })
                .where(inArray(trainingCamps.id, staleCampIds));
            stats.camps.deactivated += staleCampIds.length;
        }
    });

    return {
        sourceCourseId: input.sourceCourseId,
        targetCourseId: input.targetCourseId,
        semester: input.semester,
        mode,
        createdCount: stats.camps.created + stats.activities.created,
        updatedCount: stats.camps.updated + stats.activities.updated,
        deactivatedCount: stats.camps.deactivated + stats.activities.deactivated,
        stats,
    };
}
