import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/app/db/client';
import {
    ocOlqCategories,
    ocOlqSubtitles,
    ocOlq,
    ocOlqScores,
} from '@/app/db/schema/training/oc';
import { ApiError } from '@/app/lib/http';

// --- Categories -------------------------------------------------------------
export async function listOlqCategories(opts: { includeSubtitles?: boolean; isActive?: boolean } = {}) {
    const wh: any[] = [];
    if (opts.isActive !== undefined) wh.push(eq(ocOlqCategories.isActive, opts.isActive));

    const categories = await db
        .select({
            id: ocOlqCategories.id,
            code: ocOlqCategories.code,
            title: ocOlqCategories.title,
            description: ocOlqCategories.description,
            displayOrder: ocOlqCategories.displayOrder,
            isActive: ocOlqCategories.isActive,
            createdAt: ocOlqCategories.createdAt,
            updatedAt: ocOlqCategories.updatedAt,
        })
        .from(ocOlqCategories)
        .where(wh.length ? and(...wh) : undefined)
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

    const grouped = subtitles.reduce<Record<string, typeof subtitles>>((acc, s) => {
        (acc[s.categoryId] ||= []).push(s);
        return acc;
    }, {});

    return categories.map((c) => ({
        ...c,
        subtitles: grouped[c.id] ?? [],
    }));
}

export async function getOlqCategory(id: string, includeSubtitles = false) {
    const [row] = await db
        .select()
        .from(ocOlqCategories)
        .where(eq(ocOlqCategories.id, id))
        .limit(1);
    if (!row) return null;
    const base = {
        id: row.id,
        code: row.code,
        title: row.title,
        description: row.description,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
    if (!includeSubtitles) return base;
    const subs = await db
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
    return { ...base, subtitles: subs };
}

export async function createOlqCategory(data: typeof ocOlqCategories.$inferInsert) {
    const now = new Date();
    const [row] = await db
        .insert(ocOlqCategories)
        .values({ ...data, createdAt: now, updatedAt: now })
        .returning();
    return row;
}

export async function updateOlqCategory(id: string, data: Partial<typeof ocOlqCategories.$inferInsert>) {
    const [row] = await db
        .update(ocOlqCategories)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(ocOlqCategories.id, id))
        .returning();
    return row ?? null;
}

export async function deleteOlqCategory(id: string, opts: { hard?: boolean } = {}) {
    if (opts.hard) {
        const [row] = await db.delete(ocOlqCategories).where(eq(ocOlqCategories.id, id)).returning();
        return row ?? null;
    }
    const [row] = await db
        .update(ocOlqCategories)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(ocOlqCategories.id, id))
        .returning();
    return row ?? null;
}

// --- Subtitles --------------------------------------------------------------
async function ensureCategoryExists(categoryId: string) {
    const [row] = await db
        .select({ id: ocOlqCategories.id })
        .from(ocOlqCategories)
        .where(eq(ocOlqCategories.id, categoryId))
        .limit(1);
    if (!row) throw new ApiError(404, 'OLQ category not found', 'not_found');
}

export async function listOlqSubtitles(opts: { categoryId?: string; isActive?: boolean } = {}) {
    const wh: any[] = [];
    if (opts.categoryId) wh.push(eq(ocOlqSubtitles.categoryId, opts.categoryId));
    if (opts.isActive !== undefined) wh.push(eq(ocOlqSubtitles.isActive, opts.isActive));

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
        .where(wh.length ? and(...wh) : undefined)
        .orderBy(ocOlqSubtitles.displayOrder, ocOlqSubtitles.subtitle);
}

export async function getOlqSubtitle(id: string) {
    const [row] = await db
        .select()
        .from(ocOlqSubtitles)
        .where(eq(ocOlqSubtitles.id, id))
        .limit(1);
    return row ?? null;
}

export async function createOlqSubtitle(data: typeof ocOlqSubtitles.$inferInsert) {
    await ensureCategoryExists(data.categoryId);
    const now = new Date();
    const [row] = await db
        .insert(ocOlqSubtitles)
        .values({ ...data, createdAt: now, updatedAt: now })
        .returning();
    return row;
}

export async function updateOlqSubtitle(id: string, data: Partial<typeof ocOlqSubtitles.$inferInsert>) {
    if (data.categoryId) await ensureCategoryExists(data.categoryId);
    const [row] = await db
        .update(ocOlqSubtitles)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(ocOlqSubtitles.id, id))
        .returning();
    return row ?? null;
}

export async function deleteOlqSubtitle(id: string, opts: { hard?: boolean } = {}) {
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

// --- OLQ headers & scores ---------------------------------------------------
async function ensureSubtitle(subtitleId: string) {
    const [sub] = await db
        .select({
            id: ocOlqSubtitles.id,
            maxMarks: ocOlqSubtitles.maxMarks,
            isActive: ocOlqSubtitles.isActive,
        })
        .from(ocOlqSubtitles)
        .where(eq(ocOlqSubtitles.id, subtitleId))
        .limit(1);
    if (!sub) throw new ApiError(404, 'OLQ subtitle not found', 'not_found');
    return sub;
}

export async function upsertOlqHeader(
    ocId: string,
    semester: number,
    data: Partial<typeof ocOlq.$inferInsert> = {}
) {
    const [existing] = await db
        .select()
        .from(ocOlq)
        .where(and(eq(ocOlq.ocId, ocId), eq(ocOlq.semester, semester)))
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
        .values({ ocId, semester, ...data })
        .returning();
    return row;
}

export async function upsertOlqScore(
    ocOlqId: string,
    subtitleId: string,
    marksScored: number
) {
    const subtitle = await ensureSubtitle(subtitleId);
    if (marksScored > subtitle.maxMarks) {
        throw new ApiError(400, 'marksScored cannot exceed maxMarks', 'bad_request', {
            marksScored,
            maxMarks: subtitle.maxMarks,
        });
    }
    if (marksScored < 0) {
        throw new ApiError(400, 'marksScored cannot be negative', 'bad_request');
    }

    const [existing] = await db
        .select()
        .from(ocOlqScores)
        .where(and(eq(ocOlqScores.ocOlqId, ocOlqId), eq(ocOlqScores.subtitleId, subtitleId)))
        .limit(1);

    if (existing) {
        const [row] = await db
            .update(ocOlqScores)
            .set({ marksScored, })
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
    const [row] = await db
        .delete(ocOlq)
        .where(and(eq(ocOlq.ocId, ocId), eq(ocOlq.semester, semester)))
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
}) {
    const { ocId, semester, includeCategories = true, categoryId, subtitleId } = opts;

    const [header] = await db
        .select({
            id: ocOlq.id,
            ocId: ocOlq.ocId,
            semester: ocOlq.semester,
            totalMarks: ocOlq.totalMarks,
            remarks: ocOlq.remarks,
        })
        .from(ocOlq)
        .where(and(eq(ocOlq.ocId, ocId), eq(ocOlq.semester, semester)))
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
    const header = await upsertOlqHeader(input.ocId, input.semester, {
        remarks: input.remarks ?? null,
    });

    if (input.scores?.length) {
        for (const score of input.scores) {
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
    const header = await upsertOlqHeader(input.ocId, input.semester, {
        remarks: input.remarks ?? null,
    });

    if (input.scores?.length) {
        for (const score of input.scores) {
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
    const wh: any[] = [eq(ocOlq.semester, opts.semester)];
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
        .innerJoin(ocOlqScores, eq(ocOlqScores.ocOlqId, ocOlq.id))
        .innerJoin(ocOlqSubtitles, eq(ocOlqSubtitles.id, ocOlqScores.subtitleId))
        .where(and(...wh))
        .groupBy(ocOlq.id, ocOlq.ocId, ocOlq.semester, ocOlq.totalMarks, ocOlq.remarks);

    return rows;
}
