import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '@/app/db/client';
import {
    ocOlqCategories,
    ocOlqSubtitles,
    ocOlq,
    ocOlqScores,
    ocCourseEnrollments,
} from '@/app/db/schema/training/oc';
import { ApiError } from '@/app/lib/http';
import { getCourse } from '@/app/db/queries/courses';
import { getOcCourseInfo } from '@/app/db/queries/oc';
import { getOrCreateActiveEnrollment } from '@/app/db/queries/oc-enrollments';

type ListOlqCategoriesOpts = {
    courseId: string;
    includeSubtitles?: boolean;
    isActive?: boolean;
    fallbackToLegacyGlobal?: boolean;
};

type ListOlqSubtitlesOpts = {
    courseId: string;
    categoryId?: string;
    isActive?: boolean;
    fallbackToLegacyGlobal?: boolean;
};

async function ensureCourseExists(courseId: string) {
    const course = await getCourse(courseId);
    if (!course) throw new ApiError(404, 'Course not found', 'not_found');
    return course;
}

function ensureMarksWithinBounds(marksScored: number, maxMarks: number) {
    if (marksScored > maxMarks) {
        throw new ApiError(400, 'marksScored cannot exceed maxMarks', 'bad_request', {
            marksScored,
            maxMarks,
        });
    }
    if (marksScored < 0) {
        throw new ApiError(400, 'marksScored cannot be negative', 'bad_request');
    }
}

function mapCategoriesWithSubtitles(
    categories: Array<{
        id: string;
        courseId: string | null;
        code: string;
        title: string;
        description: string | null;
        displayOrder: number;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>,
    subtitles: Array<{
        id: string;
        categoryId: string;
        subtitle: string;
        maxMarks: number;
        displayOrder: number;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>
) {
    const grouped = subtitles.reduce<Record<string, typeof subtitles>>((acc, s) => {
        (acc[s.categoryId] ||= []).push(s);
        return acc;
    }, {});

    return categories.map((c) => ({
        ...c,
        subtitles: grouped[c.id] ?? [],
    }));
}

async function listCategoriesByCourse(
    courseId: string | null,
    opts: { includeSubtitles?: boolean; isActive?: boolean } = {}
) {
    const wh: any[] = [courseId === null ? isNull(ocOlqCategories.courseId) : eq(ocOlqCategories.courseId, courseId)];
    if (opts.isActive !== undefined) wh.push(eq(ocOlqCategories.isActive, opts.isActive));

    const categories = await db
        .select({
            id: ocOlqCategories.id,
            courseId: ocOlqCategories.courseId,
            code: ocOlqCategories.code,
            title: ocOlqCategories.title,
            description: ocOlqCategories.description,
            displayOrder: ocOlqCategories.displayOrder,
            isActive: ocOlqCategories.isActive,
            createdAt: ocOlqCategories.createdAt,
            updatedAt: ocOlqCategories.updatedAt,
        })
        .from(ocOlqCategories)
        .where(and(...wh))
        .orderBy(ocOlqCategories.displayOrder, ocOlqCategories.title);

    if (!opts.includeSubtitles || !categories.length) {
        return categories.map((c) => ({ ...c, subtitles: undefined }));
    }

    const categoryIds = categories.map((c) => c.id);
    const subtitles = await db
        .select({
            id: ocOlqSubtitles.id,
            categoryId: ocOlqSubtitles.categoryId,
            subtitle: ocOlqSubtitles.subtitle,
            maxMarks: ocOlqSubtitles.maxMarks,
            displayOrder: ocOlqSubtitles.displayOrder,
            isActive: ocOlqSubtitles.isActive,
            createdAt: ocOlqSubtitles.createdAt,
            updatedAt: ocOlqSubtitles.updatedAt,
        })
        .from(ocOlqSubtitles)
        .where(inArray(ocOlqSubtitles.categoryId, categoryIds))
        .orderBy(ocOlqSubtitles.displayOrder, ocOlqSubtitles.subtitle);

    return mapCategoriesWithSubtitles(categories, subtitles);
}

export async function ensureCategoryBelongsToCourse(categoryId: string, courseId: string) {
    const [row] = await db
        .select({
            id: ocOlqCategories.id,
            courseId: ocOlqCategories.courseId,
            code: ocOlqCategories.code,
            title: ocOlqCategories.title,
            description: ocOlqCategories.description,
            displayOrder: ocOlqCategories.displayOrder,
            isActive: ocOlqCategories.isActive,
            createdAt: ocOlqCategories.createdAt,
            updatedAt: ocOlqCategories.updatedAt,
        })
        .from(ocOlqCategories)
        .where(and(eq(ocOlqCategories.id, categoryId), eq(ocOlqCategories.courseId, courseId)))
        .limit(1);

    if (!row) throw new ApiError(404, 'OLQ category not found for this course', 'not_found');
    return row;
}

export async function ensureSubtitleBelongsToCourseAndActive(subtitleId: string, courseId: string) {
    const [row] = await db
        .select({
            id: ocOlqSubtitles.id,
            maxMarks: ocOlqSubtitles.maxMarks,
            subtitleIsActive: ocOlqSubtitles.isActive,
            categoryId: ocOlqCategories.id,
            courseId: ocOlqCategories.courseId,
            categoryIsActive: ocOlqCategories.isActive,
        })
        .from(ocOlqSubtitles)
        .innerJoin(ocOlqCategories, eq(ocOlqCategories.id, ocOlqSubtitles.categoryId))
        .where(and(eq(ocOlqSubtitles.id, subtitleId), eq(ocOlqCategories.courseId, courseId)))
        .limit(1);

    if (!row) {
        throw new ApiError(400, 'Subtitle does not belong to OC course template', 'bad_request');
    }
    if (!row.subtitleIsActive || !row.categoryIsActive) {
        throw new ApiError(400, 'Subtitle is inactive in current course template', 'bad_request');
    }

    return row;
}

// --- Categories -------------------------------------------------------------
export async function getCourseTemplateCategories(opts: ListOlqCategoriesOpts) {
    await ensureCourseExists(opts.courseId);
    const items = await listCategoriesByCourse(opts.courseId, {
        includeSubtitles: opts.includeSubtitles ?? false,
        isActive: opts.isActive,
    });

    if (items.length || !opts.fallbackToLegacyGlobal) {
        return items;
    }

    return listCategoriesByCourse(null, {
        includeSubtitles: opts.includeSubtitles ?? false,
        isActive: opts.isActive,
    });
}

export async function listOlqCategories(opts: ListOlqCategoriesOpts) {
    return getCourseTemplateCategories(opts);
}

export async function getOlqCategory(courseId: string, id: string, includeSubtitles = false) {
    await ensureCourseExists(courseId);
    const row = await ensureCategoryBelongsToCourse(id, courseId);
    if (!includeSubtitles) return row;

    const subtitles = await db
        .select({
            id: ocOlqSubtitles.id,
            categoryId: ocOlqSubtitles.categoryId,
            subtitle: ocOlqSubtitles.subtitle,
            maxMarks: ocOlqSubtitles.maxMarks,
            displayOrder: ocOlqSubtitles.displayOrder,
            isActive: ocOlqSubtitles.isActive,
            createdAt: ocOlqSubtitles.createdAt,
            updatedAt: ocOlqSubtitles.updatedAt,
        })
        .from(ocOlqSubtitles)
        .where(eq(ocOlqSubtitles.categoryId, id))
        .orderBy(ocOlqSubtitles.displayOrder, ocOlqSubtitles.subtitle);

    return { ...row, subtitles };
}

export async function createOlqCategory(courseId: string, data: Omit<typeof ocOlqCategories.$inferInsert, 'courseId'>) {
    await ensureCourseExists(courseId);
    const now = new Date();
    const [row] = await db
        .insert(ocOlqCategories)
        .values({ ...data, courseId, createdAt: now, updatedAt: now })
        .returning();
    return row;
}

export async function updateOlqCategory(courseId: string, id: string, data: Partial<typeof ocOlqCategories.$inferInsert>) {
    await ensureCourseExists(courseId);
    await ensureCategoryBelongsToCourse(id, courseId);

    const patch = { ...data };
    delete (patch as any).courseId;

    const [row] = await db
        .update(ocOlqCategories)
        .set({ ...patch, updatedAt: new Date() })
        .where(and(eq(ocOlqCategories.id, id), eq(ocOlqCategories.courseId, courseId)))
        .returning();
    return row ?? null;
}

export async function deleteOlqCategory(courseId: string, id: string, opts: { hard?: boolean } = {}) {
    await ensureCourseExists(courseId);
    await ensureCategoryBelongsToCourse(id, courseId);

    if (opts.hard) {
        const [row] = await db
            .delete(ocOlqCategories)
            .where(and(eq(ocOlqCategories.id, id), eq(ocOlqCategories.courseId, courseId)))
            .returning();
        return row ?? null;
    }

    const [row] = await db
        .update(ocOlqCategories)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(eq(ocOlqCategories.id, id), eq(ocOlqCategories.courseId, courseId)))
        .returning();
    return row ?? null;
}

// --- Subtitles --------------------------------------------------------------
export async function getCourseTemplateSubtitles(opts: ListOlqSubtitlesOpts) {
    await ensureCourseExists(opts.courseId);
    const categoryWh: any[] = [eq(ocOlqCategories.courseId, opts.courseId)];
    if (opts.isActive !== undefined) categoryWh.push(eq(ocOlqCategories.isActive, opts.isActive));
    if (opts.categoryId) categoryWh.push(eq(ocOlqCategories.id, opts.categoryId));

    const categories = await db
        .select({ id: ocOlqCategories.id })
        .from(ocOlqCategories)
        .where(and(...categoryWh));

    if (!categories.length && opts.fallbackToLegacyGlobal) {
        const fallbackCategoryWh: any[] = [isNull(ocOlqCategories.courseId)];
        if (opts.isActive !== undefined) fallbackCategoryWh.push(eq(ocOlqCategories.isActive, opts.isActive));
        if (opts.categoryId) fallbackCategoryWh.push(eq(ocOlqCategories.id, opts.categoryId));
        const fallbackCategories = await db
            .select({ id: ocOlqCategories.id })
            .from(ocOlqCategories)
            .where(and(...fallbackCategoryWh));

        if (!fallbackCategories.length) return [];
        const fallbackCategoryIds = fallbackCategories.map((c) => c.id);
        const subtitleWh: any[] = [inArray(ocOlqSubtitles.categoryId, fallbackCategoryIds)];
        if (opts.isActive !== undefined) subtitleWh.push(eq(ocOlqSubtitles.isActive, opts.isActive));
        return db
            .select({
                id: ocOlqSubtitles.id,
                categoryId: ocOlqSubtitles.categoryId,
                subtitle: ocOlqSubtitles.subtitle,
                maxMarks: ocOlqSubtitles.maxMarks,
                displayOrder: ocOlqSubtitles.displayOrder,
                isActive: ocOlqSubtitles.isActive,
                createdAt: ocOlqSubtitles.createdAt,
                updatedAt: ocOlqSubtitles.updatedAt,
            })
            .from(ocOlqSubtitles)
            .where(and(...subtitleWh))
            .orderBy(ocOlqSubtitles.displayOrder, ocOlqSubtitles.subtitle);
    }

    if (!categories.length) return [];
    const categoryIds = categories.map((c) => c.id);
    const subtitleWh: any[] = [inArray(ocOlqSubtitles.categoryId, categoryIds)];
    if (opts.isActive !== undefined) subtitleWh.push(eq(ocOlqSubtitles.isActive, opts.isActive));

    return db
        .select({
            id: ocOlqSubtitles.id,
            categoryId: ocOlqSubtitles.categoryId,
            subtitle: ocOlqSubtitles.subtitle,
            maxMarks: ocOlqSubtitles.maxMarks,
            displayOrder: ocOlqSubtitles.displayOrder,
            isActive: ocOlqSubtitles.isActive,
            createdAt: ocOlqSubtitles.createdAt,
            updatedAt: ocOlqSubtitles.updatedAt,
        })
        .from(ocOlqSubtitles)
        .where(and(...subtitleWh))
        .orderBy(ocOlqSubtitles.displayOrder, ocOlqSubtitles.subtitle);
}

export async function listOlqSubtitles(opts: ListOlqSubtitlesOpts) {
    return getCourseTemplateSubtitles(opts);
}

export async function getOlqSubtitle(courseId: string, id: string) {
    await ensureCourseExists(courseId);
    const [row] = await db
        .select({
            id: ocOlqSubtitles.id,
            categoryId: ocOlqSubtitles.categoryId,
            subtitle: ocOlqSubtitles.subtitle,
            maxMarks: ocOlqSubtitles.maxMarks,
            displayOrder: ocOlqSubtitles.displayOrder,
            isActive: ocOlqSubtitles.isActive,
            createdAt: ocOlqSubtitles.createdAt,
            updatedAt: ocOlqSubtitles.updatedAt,
        })
        .from(ocOlqSubtitles)
        .innerJoin(ocOlqCategories, eq(ocOlqCategories.id, ocOlqSubtitles.categoryId))
        .where(and(eq(ocOlqSubtitles.id, id), eq(ocOlqCategories.courseId, courseId)))
        .limit(1);
    return row ?? null;
}

export async function createOlqSubtitle(courseId: string, data: Omit<typeof ocOlqSubtitles.$inferInsert, 'categoryId'> & { categoryId: string }) {
    await ensureCourseExists(courseId);
    await ensureCategoryBelongsToCourse(data.categoryId, courseId);
    const now = new Date();
    const [row] = await db
        .insert(ocOlqSubtitles)
        .values({ ...data, createdAt: now, updatedAt: now })
        .returning();
    return row;
}

export async function updateOlqSubtitle(courseId: string, id: string, data: Partial<typeof ocOlqSubtitles.$inferInsert>) {
    await ensureCourseExists(courseId);
    const existing = await getOlqSubtitle(courseId, id);
    if (!existing) return null;
    if (data.categoryId) await ensureCategoryBelongsToCourse(data.categoryId, courseId);

    const [row] = await db
        .update(ocOlqSubtitles)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(ocOlqSubtitles.id, id))
        .returning();
    return row ?? null;
}

export async function deleteOlqSubtitle(courseId: string, id: string, opts: { hard?: boolean } = {}) {
    await ensureCourseExists(courseId);
    const existing = await getOlqSubtitle(courseId, id);
    if (!existing) return null;

    if (opts.hard) {
        const [row] = await db.delete(ocOlqSubtitles).where(eq(ocOlqSubtitles.id, id)).returning();
        return row ?? null;
    }
    const [row] = await db
        .update(ocOlqSubtitles)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(ocOlqSubtitles.id, id))
        .returning();
    return row ?? null;
}

export async function copyOlqTemplateToCourse(input: {
    sourceCourseId: string;
    targetCourseId: string;
    mode: 'replace';
}) {
    if (input.mode !== 'replace') {
        throw new ApiError(400, 'Only replace mode is supported', 'bad_request');
    }
    if (input.sourceCourseId === input.targetCourseId) {
        throw new ApiError(400, 'sourceCourseId and targetCourseId cannot be the same', 'bad_request');
    }

    await ensureCourseExists(input.sourceCourseId);
    await ensureCourseExists(input.targetCourseId);

    const sourceCategories = await listOlqCategories({
        courseId: input.sourceCourseId,
        includeSubtitles: true,
        isActive: true,
    });

    return db.transaction(async (tx) => {
        const targetActiveCategories = await tx
            .select({ id: ocOlqCategories.id })
            .from(ocOlqCategories)
            .where(and(eq(ocOlqCategories.courseId, input.targetCourseId), eq(ocOlqCategories.isActive, true)));

        const targetCategoryIds = targetActiveCategories.map((c) => c.id);
        if (targetCategoryIds.length) {
            await tx
                .update(ocOlqSubtitles)
                .set({ isActive: false, updatedAt: new Date() })
                .where(and(inArray(ocOlqSubtitles.categoryId, targetCategoryIds), eq(ocOlqSubtitles.isActive, true)));
        }

        await tx
            .update(ocOlqCategories)
            .set({ isActive: false, updatedAt: new Date() })
            .where(and(eq(ocOlqCategories.courseId, input.targetCourseId), eq(ocOlqCategories.isActive, true)));

        let categoriesCopied = 0;
        let subtitlesCopied = 0;

        for (const category of sourceCategories) {
            const [createdCategory] = await tx
                .insert(ocOlqCategories)
                .values({
                    courseId: input.targetCourseId,
                    code: category.code,
                    title: category.title,
                    description: category.description ?? null,
                    displayOrder: category.displayOrder ?? 0,
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                })
                .returning({ id: ocOlqCategories.id });
            categoriesCopied += 1;

            for (const subtitle of category.subtitles ?? []) {
                await tx
                    .insert(ocOlqSubtitles)
                    .values({
                        categoryId: createdCategory.id,
                        subtitle: subtitle.subtitle,
                        maxMarks: subtitle.maxMarks ?? 20,
                        displayOrder: subtitle.displayOrder ?? 0,
                        isActive: true,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    });
                subtitlesCopied += 1;
            }
        }

        return {
            targetCourseId: input.targetCourseId,
            sourceCourseId: input.sourceCourseId,
            categoriesCopied,
            subtitlesCopied,
            mode: input.mode,
        };
    });
}

// --- OLQ headers & scores ---------------------------------------------------
async function upsertOlqScore(
    ocOlqId: string,
    subtitleId: string,
    marksScored: number
) {
    const [subtitle] = await db
        .select({
            id: ocOlqSubtitles.id,
            maxMarks: ocOlqSubtitles.maxMarks,
        })
        .from(ocOlqSubtitles)
        .where(eq(ocOlqSubtitles.id, subtitleId))
        .limit(1);
    if (!subtitle) throw new ApiError(404, 'OLQ subtitle not found', 'not_found');

    ensureMarksWithinBounds(marksScored, subtitle.maxMarks);

    const [existing] = await db
        .select()
        .from(ocOlqScores)
        .where(and(eq(ocOlqScores.ocOlqId, ocOlqId), eq(ocOlqScores.subtitleId, subtitleId)))
        .limit(1);

    if (existing) {
        const [row] = await db
            .update(ocOlqScores)
            .set({ marksScored })
            .where(eq(ocOlqScores.id, existing.id))
            .returning();
        return row;
    }

    const [row] = await db
        .insert(ocOlqScores)
        .values({ ocOlqId, subtitleId, marksScored })
        .returning();
    return row;
}

export async function upsertOlqHeader(
    ocId: string,
    semester: number,
    data: Partial<typeof ocOlq.$inferInsert> = {}
) {
    const activeEnrollment = await getOrCreateActiveEnrollment(ocId);
    const [existing] = await db
        .select()
        .from(ocOlq)
        .where(and(eq(ocOlq.ocId, ocId), eq(ocOlq.enrollmentId, activeEnrollment.id), eq(ocOlq.semester, semester)))
        .limit(1);

    if (existing) {
        const [row] = await db
            .update(ocOlq)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(ocOlq.id, existing.id))
            .returning();
        return row;
    }

    const [row] = await db
        .insert(ocOlq)
        .values({ ocId, enrollmentId: activeEnrollment.id, semester, ...data })
        .returning();
    return row;
}

export async function deleteOlqScore(ocOlqId: string, subtitleId: string) {
    const [row] = await db
        .delete(ocOlqScores)
        .where(and(eq(ocOlqScores.ocOlqId, ocOlqId), eq(ocOlqScores.subtitleId, subtitleId)))
        .returning();
    return row ?? null;
}

export async function recomputeOlqTotal(ocOlqId: string) {
    const [agg] = await db
        .select({ total: sql<number>`SUM(${ocOlqScores.marksScored})` })
        .from(ocOlqScores)
        .where(eq(ocOlqScores.ocOlqId, ocOlqId));

    const totalMarks = agg?.total ?? 0;
    const [row] = await db
        .update(ocOlq)
        .set({ totalMarks, updatedAt: new Date() })
        .where(eq(ocOlq.id, ocOlqId))
        .returning();
    return row;
}

export async function deleteOlqHeader(ocId: string, semester: number) {
    const activeEnrollment = await getOrCreateActiveEnrollment(ocId);
    const [row] = await db
        .delete(ocOlq)
        .where(and(eq(ocOlq.ocId, ocId), eq(ocOlq.enrollmentId, activeEnrollment.id), eq(ocOlq.semester, semester)))
        .returning();
    return row ?? null;
}

// --- Fetch helpers ----------------------------------------------------------
function groupScoresByCategory(
    rows: Array<{
        categoryId: string;
        categoryCode: string;
        categoryTitle: string;
        categoryOrder: number;
        subtitleId: string;
        subtitle: string;
        subtitleOrder: number;
        maxMarks: number;
        marksScored: number;
        isActiveSubtitle: boolean;
        isActiveCategory: boolean;
    }>
) {
    const byCat: Record<string, any> = {};
    for (const r of rows) {
        if (!byCat[r.categoryId]) {
            byCat[r.categoryId] = {
                categoryId: r.categoryId,
                code: r.categoryCode,
                title: r.categoryTitle,
                displayOrder: r.categoryOrder,
                isActive: r.isActiveCategory,
                subtitles: [] as any[],
            };
        }
        byCat[r.categoryId].subtitles.push({
            subtitleId: r.subtitleId,
            subtitle: r.subtitle,
            displayOrder: r.subtitleOrder,
            maxMarks: r.maxMarks,
            marksScored: r.marksScored,
            isActive: r.isActiveSubtitle,
        });
    }
    return Object.values(byCat).sort((a: any, b: any) => a.displayOrder - b.displayOrder);
}

export async function getOlqSheet(opts: {
    ocId: string;
    semester: number;
    includeCategories?: boolean;
    categoryId?: string;
    subtitleId?: string;
    enrollmentId?: string;
}) {
    const { ocId, semester, includeCategories = true, categoryId, subtitleId } = opts;
    const enrollmentId = opts.enrollmentId ?? (await getOrCreateActiveEnrollment(ocId)).id;

    const [header] = await db
        .select({
            id: ocOlq.id,
            ocId: ocOlq.ocId,
            enrollmentId: ocOlq.enrollmentId,
            semester: ocOlq.semester,
            totalMarks: ocOlq.totalMarks,
            remarks: ocOlq.remarks,
        })
        .from(ocOlq)
        .where(and(eq(ocOlq.ocId, ocId), eq(ocOlq.enrollmentId, enrollmentId), eq(ocOlq.semester, semester)))
        .limit(1);

    if (!header) return null;

    const wh: any[] = [eq(ocOlqScores.ocOlqId, header.id)];
    if (categoryId) wh.push(eq(ocOlqSubtitles.categoryId, categoryId));
    if (subtitleId) wh.push(eq(ocOlqScores.subtitleId, subtitleId));

    const scoreRows = await db
        .select({
            subtitleId: ocOlqSubtitles.id,
            subtitle: ocOlqSubtitles.subtitle,
            subtitleOrder: ocOlqSubtitles.displayOrder,
            maxMarks: ocOlqSubtitles.maxMarks,
            marksScored: ocOlqScores.marksScored,
            categoryId: ocOlqCategories.id,
            categoryCode: ocOlqCategories.code,
            categoryTitle: ocOlqCategories.title,
            categoryOrder: ocOlqCategories.displayOrder,
            isActiveSubtitle: ocOlqSubtitles.isActive,
            isActiveCategory: ocOlqCategories.isActive,
        })
        .from(ocOlqScores)
        .innerJoin(ocOlqSubtitles, eq(ocOlqSubtitles.id, ocOlqScores.subtitleId))
        .innerJoin(ocOlqCategories, eq(ocOlqCategories.id, ocOlqSubtitles.categoryId))
        .where(wh.length ? and(...wh) : undefined)
        .orderBy(ocOlqCategories.displayOrder, ocOlqSubtitles.displayOrder);

    const categories = includeCategories ? groupScoresByCategory(scoreRows) : undefined;

    return {
        id: header.id,
        ocId: header.ocId,
        enrollmentId: header.enrollmentId,
        semester: header.semester,
        totalMarks: header.totalMarks ?? scoreRows.reduce((acc, r) => acc + (r.marksScored ?? 0), 0),
        remarks: header.remarks,
        categories,
        scores: includeCategories ? undefined : scoreRows,
    };
}

export async function getOlqById(id: string, includeCategories = true) {
    const [header] = await db
        .select()
        .from(ocOlq)
        .where(eq(ocOlq.id, id))
        .limit(1);
    if (!header) return null;
    return getOlqSheet({
        ocId: header.ocId,
        enrollmentId: header.enrollmentId ?? undefined,
        semester: header.semester,
        includeCategories,
    });
}

export async function getOlqScore(ocId: string, semester: number, subtitleId: string) {
    const sheet = await getOlqSheet({ ocId, semester, includeCategories: false, subtitleId });
    if (!sheet || !sheet.scores?.length) return null;
    const [score] = sheet.scores;
    return {
        ocId,
        semester,
        subtitleId,
        marksScored: score.marksScored,
    };
}

export async function upsertOlqWithScores(input: {
    ocId: string;
    semester: number;
    remarks?: string | null;
    scores?: Array<{ subtitleId: string; marksScored: number }>;
}) {
    const courseInfo = await getOcCourseInfo(input.ocId);
    if (!courseInfo) throw new ApiError(404, 'OC not found', 'not_found');

    const header = await upsertOlqHeader(input.ocId, input.semester, {
        remarks: input.remarks ?? null,
    });

    if (input.scores?.length) {
        for (const score of input.scores) {
            const subtitle = await ensureSubtitleBelongsToCourseAndActive(score.subtitleId, courseInfo.courseId);
            ensureMarksWithinBounds(score.marksScored, subtitle.maxMarks);
            await upsertOlqScore(header.id, score.subtitleId, score.marksScored);
        }
    }

    await recomputeOlqTotal(header.id);
    return header;
}

export async function updateOlqWithScores(input: {
    ocId: string;
    semester: number;
    remarks?: string | null;
    scores?: Array<{ subtitleId: string; marksScored: number }>;
    deleteSubtitleIds?: string[];
}) {
    const courseInfo = await getOcCourseInfo(input.ocId);
    if (!courseInfo) throw new ApiError(404, 'OC not found', 'not_found');

    const header = await upsertOlqHeader(input.ocId, input.semester, {
        remarks: input.remarks ?? null,
    });

    if (input.scores?.length) {
        for (const score of input.scores) {
            const subtitle = await ensureSubtitleBelongsToCourseAndActive(score.subtitleId, courseInfo.courseId);
            ensureMarksWithinBounds(score.marksScored, subtitle.maxMarks);
            await upsertOlqScore(header.id, score.subtitleId, score.marksScored);
        }
    }

    if (input.deleteSubtitleIds?.length) {
        for (const subtitleId of input.deleteSubtitleIds) {
            await deleteOlqScore(header.id, subtitleId);
        }
    }

    await recomputeOlqTotal(header.id);
    return header;
}

export async function listOlqBySemester(opts: {
    semester: number;
    ocId?: string;
    categoryId?: string;
    subtitleId?: string;
}) {
    const wh: any[] = [eq(ocOlq.semester, opts.semester), eq(ocCourseEnrollments.status, "ACTIVE")];
    if (opts.ocId) wh.push(eq(ocOlq.ocId, opts.ocId));

    if (!opts.categoryId && !opts.subtitleId) {
        const rows = await db
            .select({
                id: ocOlq.id,
                ocId: ocOlq.ocId,
                semester: ocOlq.semester,
                totalMarks: ocOlq.totalMarks,
                remarks: ocOlq.remarks,
            })
            .from(ocOlq)
            .innerJoin(ocCourseEnrollments, eq(ocCourseEnrollments.id, ocOlq.enrollmentId))
            .where(and(...wh));
        return rows;
    }

    if (opts.subtitleId) {
        wh.push(eq(ocOlqScores.subtitleId, opts.subtitleId));
    }
    if (opts.categoryId) {
        wh.push(eq(ocOlqSubtitles.categoryId, opts.categoryId));
    }

    const rows = await db
        .select({
            id: ocOlq.id,
            ocId: ocOlq.ocId,
            semester: ocOlq.semester,
            totalMarks: ocOlq.totalMarks,
            remarks: ocOlq.remarks,
        })
        .from(ocOlq)
        .innerJoin(ocCourseEnrollments, eq(ocCourseEnrollments.id, ocOlq.enrollmentId))
        .innerJoin(ocOlqScores, eq(ocOlqScores.ocOlqId, ocOlq.id))
        .innerJoin(ocOlqSubtitles, eq(ocOlqSubtitles.id, ocOlqScores.subtitleId))
        .where(and(...wh))
        .groupBy(ocOlq.id, ocOlq.ocId, ocOlq.semester, ocOlq.totalMarks, ocOlq.remarks);

    return rows;
}
