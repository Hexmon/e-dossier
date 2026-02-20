import { db } from '@/app/db/client';
import { subjects } from '@/app/db/schema/training/subjects';
import { courseOfferings } from '@/app/db/schema/training/courseOfferings';
import { and, eq, exists, ilike, isNull } from 'drizzle-orm';

export async function listSubjects(opts: {
    q?: string;
    branch?: 'C' | 'E' | 'M';
    includeDeleted?: boolean;
    limit?: number;
    offset?: number;
    semester?: number;
    courseId?: string;
}) {
    const wh: any[] = [];
    if (opts.q) wh.push(ilike(subjects.name, `%${opts.q}%`));
    if (opts.branch) wh.push(eq(subjects.branch, opts.branch));
    if (!opts.includeDeleted) wh.push(isNull(subjects.deletedAt));
    if (opts.semester !== undefined || opts.courseId) {
        const offeringWh: any[] = [
            eq(courseOfferings.subjectId, subjects.id),
            isNull(courseOfferings.deletedAt),
        ];
        if (opts.semester !== undefined) offeringWh.push(eq(courseOfferings.semester, opts.semester));
        if (opts.courseId) offeringWh.push(eq(courseOfferings.courseId, opts.courseId));

        wh.push(
            exists(
                db
                    .select({ id: courseOfferings.id })
                    .from(courseOfferings)
                    .where(and(...offeringWh))
            )
        );
    }

    return db
        .select({
            id: subjects.id,
            code: subjects.code,
            name: subjects.name,
            branch: subjects.branch,
            hasTheory: subjects.hasTheory,
            hasPractical: subjects.hasPractical,
            defaultTheoryCredits: subjects.defaultTheoryCredits,
            defaultPracticalCredits: subjects.defaultPracticalCredits,
            description: subjects.description,
            createdAt: subjects.createdAt,
            updatedAt: subjects.updatedAt,
            deletedAt: subjects.deletedAt,
        })
        .from(subjects)
        .where(wh.length ? and(...wh) : undefined)
        .orderBy(subjects.code)
        .limit(opts.limit ?? 100)
        .offset(opts.offset ?? 0);
}

export async function softDeleteSubject(id: string) {
    return db.transaction(async (tx) => {
        const [before] = await tx
            .select()
            .from(subjects)
            .where(eq(subjects.id, id))
            .limit(1);
        if (!before) return null;
        const now = new Date();
        const [after] = await tx
            .update(subjects)
            .set({ deletedAt: now })
            .where(eq(subjects.id, id))
            .returning();

        await tx
            .update(courseOfferings)
            .set({ deletedAt: now })
            .where(eq(courseOfferings.subjectId, id));
        return { before, after };
    });
}

export async function hardDeleteSubject(id: string) {
    return db.transaction(async (tx) => {
        const [before] = await tx
            .select()
            .from(subjects)
            .where(eq(subjects.id, id))
            .limit(1);
        if (!before) return null;
        await tx.delete(courseOfferings).where(eq(courseOfferings.subjectId, id));
        await tx.delete(subjects).where(eq(subjects.id, id));
        return { before };
    });
}
