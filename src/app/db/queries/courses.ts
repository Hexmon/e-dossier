import { db } from '@/app/db/client';
import { courses } from '@/app/db/schema/training/courses';
import { courseOfferings } from '@/app/db/schema/training/courseOfferings';
import { subjects } from '@/app/db/schema/training/subjects';
import { ocCadets } from '@/app/db/schema/training/oc';
import { and, eq, ilike, isNull, like, sql } from 'drizzle-orm';

export async function listCourses(opts: { q?: string; includeDeleted?: boolean; limit?: number; offset?: number; }) {
    const wh: any[] = [];
    if (!opts.includeDeleted) wh.push(isNull(courses.deletedAt));
    if (opts.q) wh.push(ilike(courses.code, `%${opts.q}%`));

    return db
        .select({
            id: courses.id,
            code: courses.code,
            title: courses.title,
            notes: courses.notes,
            createdAt: courses.createdAt,
            updatedAt: courses.updatedAt,
            deletedAt: courses.deletedAt,
        })
        .from(courses)
        .where(wh.length ? and(...wh) : undefined)
        .orderBy(courses.code)
        .limit(opts.limit ?? 100)
        .offset(opts.offset ?? 0);
}

export async function getCourse(id: string) {
    const [row] = await db
        .select()
        .from(courses)
        .where(eq(courses.id, id))
        .limit(1);
    return row ?? null;
}

export async function createCourse(data: { code: string; title: string; notes?: string }) {
    const now = new Date();
    const [row] = await db
        .insert(courses)
        .values({ code: data.code, title: data.title, notes: data.notes ?? null, createdAt: now, updatedAt: now })
        .returning({
            id: courses.id,
            code: courses.code,
            title: courses.title,
            notes: courses.notes,
            createdAt: courses.createdAt,
            updatedAt: courses.updatedAt,
            deletedAt: courses.deletedAt,
        });
    return row;
}

export async function updateCourse(id: string, patch: Partial<typeof courses.$inferInsert>) {
    const [row] = await db
        .update(courses)
        .set(patch)
        .where(eq(courses.id, id))
        .returning();
    return row ?? null;
}

export async function softDeleteCourse(id: string) {
    return db.transaction(async (tx) => {
        const now = new Date();
        const [row] = await tx
            .update(courses)
            .set({ deletedAt: now })
            .where(eq(courses.id, id))
            .returning({ id: courses.id });
        if (!row) return null;
        await tx
            .update(courseOfferings)
            .set({ deletedAt: now })
            .where(eq(courseOfferings.courseId, id));
        await tx
            .update(ocCadets)
            .set({ status: 'INACTIVE', updatedAt: now })
            .where(eq(ocCadets.courseId, id));
        return row;
    });
}

export async function hardDeleteCourse(id: string) {
    return db.transaction(async (tx) => {
        const now = new Date();
        await tx
            .update(ocCadets)
            .set({ status: 'INACTIVE', updatedAt: now })
            .where(eq(ocCadets.courseId, id));
        await tx.delete(courseOfferings).where(eq(courseOfferings.courseId, id));
        const [row] = await tx.delete(courses).where(eq(courses.id, id)).returning({ id: courses.id });
        return row ?? null;
    });
}

export async function listCourseOfferings(courseId: string, semester?: number) {
    const wh: any[] = [eq(courseOfferings.courseId, courseId), isNull(courseOfferings.deletedAt)];
    if (semester) wh.push(eq(courseOfferings.semester, semester));

    return db
        .select({
            id: courseOfferings.id,
            semester: courseOfferings.semester,
            includeTheory: courseOfferings.includeTheory,
            includePractical: courseOfferings.includePractical,
            theoryCredits: courseOfferings.theoryCredits,
            practicalCredits: courseOfferings.practicalCredits,
            subject: {
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
            },
        })
        .from(courseOfferings)
        .innerJoin(subjects, eq(subjects.id, courseOfferings.subjectId))
        .where(and(...wh))
        .orderBy(courseOfferings.semester);
}

export async function getCourseOfferingForSubject(courseId: string, semester: number, subjectId: string) {
    const [row] = await db
        .select({
            id: courseOfferings.id,
            semester: courseOfferings.semester,
            includeTheory: courseOfferings.includeTheory,
            includePractical: courseOfferings.includePractical,
            theoryCredits: courseOfferings.theoryCredits,
            practicalCredits: courseOfferings.practicalCredits,
            subject: {
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
            },
        })
        .from(courseOfferings)
        .innerJoin(subjects, eq(subjects.id, courseOfferings.subjectId))
        .where(and(
            eq(courseOfferings.courseId, courseId),
            eq(courseOfferings.semester, semester),
            eq(courseOfferings.subjectId, subjectId),
            isNull(courseOfferings.deletedAt),
            isNull(subjects.deletedAt),
        ))
        .limit(1);
    return row ?? null;
}

export type CourseOfferingRow =
    ReturnType<typeof listCourseOfferings> extends Promise<Array<infer ROW>> ? ROW : never;
export async function getCourseOffering(courseId: string, offeringId: string) {
    const [row] = await db
        .select({
            id: courseOfferings.id,
            semester: courseOfferings.semester,
            includeTheory: courseOfferings.includeTheory,
            includePractical: courseOfferings.includePractical,
            theoryCredits: courseOfferings.theoryCredits,
            practicalCredits: courseOfferings.practicalCredits,
            subject: {
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
            },
        })
        .from(courseOfferings)
        .innerJoin(subjects, eq(subjects.id, courseOfferings.subjectId))
        .where(and(
            eq(courseOfferings.courseId, courseId),
            eq(courseOfferings.id, offeringId),
            isNull(courseOfferings.deletedAt),
            isNull(subjects.deletedAt),
        ))
        .limit(1);
    return row ?? null;
}
