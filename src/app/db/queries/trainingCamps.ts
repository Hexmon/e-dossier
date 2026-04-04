import { and, eq, isNull, inArray } from 'drizzle-orm';
import { db } from '@/app/db/client';
import { trainingCamps, trainingCampActivities, trainingCampSettings } from '@/app/db/schema/training/oc';

// Camps ----------------------------------------------------------------------
export async function listTrainingCamps(opts: {
    semester?: number;
    includeActivities?: boolean;
    includeDeleted?: boolean;
}) {
    const wh: any[] = [];
    if (opts.semester) wh.push(eq(trainingCamps.semester, opts.semester));
    if (!opts.includeDeleted) wh.push(isNull(trainingCamps.deletedAt));

    const camps = await db
        .select({
            id: trainingCamps.id,
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
        .orderBy(trainingCamps.semester, trainingCamps.sortOrder, trainingCamps.name);

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
    semester: number,
    opts: { excludeCampId?: string } = {},
): Promise<number> {
    const activeRows = await db
        .select({ id: trainingCamps.id })
        .from(trainingCamps)
        .where(and(eq(trainingCamps.semester, semester), isNull(trainingCamps.deletedAt)));

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
