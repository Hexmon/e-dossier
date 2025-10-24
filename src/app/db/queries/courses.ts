import { db } from '@/app/db/client';
import { courses } from '@/app/db/schema/training/courses';
import { courseOfferings } from '@/app/db/schema/training/courseOfferings';
import { subjects } from '@/app/db/schema/training/subjects';
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
    const [row] = await db
        .update(courses)
        .set({ deletedAt: new Date() })
        .where(eq(courses.id, id))
        .returning({ id: courses.id });
    return row ?? null;
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
            subjectId: subjects.id,
            subjectCode: subjects.code,
            subjectName: subjects.name,
            subjectBranch: subjects.branch,
        })
        .from(courseOfferings)
        .innerJoin(subjects, eq(subjects.id, courseOfferings.subjectId))
        .where(and(...wh))
        .orderBy(courseOfferings.semester);
}
