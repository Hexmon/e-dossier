import { db } from '@/app/db/client';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { instructors } from '@/app/db/schema/training/instructors';
import { courseOfferings, courseOfferingInstructors } from '@/app/db/schema/training/courseOfferings';

export type OfferingRow = typeof courseOfferings.$inferSelect;

export async function createOffering(opts: {
    courseId: string; subjectId: string; semester: number;
    includeTheory?: boolean; includePractical?: boolean;
    theoryCredits?: number | null; practicalCredits?: number | null;
}) {
    const [row] = await db
        .insert(courseOfferings)
        .values({
            courseId: opts.courseId,
            subjectId: opts.subjectId,
            semester: opts.semester,
            includeTheory: opts.includeTheory ?? true,
            includePractical: opts.includePractical ?? false,
            theoryCredits: opts.theoryCredits ?? null,
            practicalCredits: opts.practicalCredits ?? null,
        })
        .returning();
    return row;
}

export async function replaceOfferingInstructors(offeringId: string, list: Array<{
    instructorId?: string; userId?: string; name?: string; email?: string; phone?: string; role?: 'PRIMARY' | 'ASSISTANT';
}>) {
    // delete all then re-insert (simple)
    await db.delete(courseOfferingInstructors).where(eq(courseOfferingInstructors.offeringId, offeringId));

    if (!list?.length) return [];

    // build/ensure instructors (create externals on-the-fly when no instructorId/userId)
    const results: { id: string; role: string }[] = [];
    for (const item of list) {
        let instructorId = item.instructorId ?? null;
        if (!instructorId) {
            if (item.userId) {
                const [ins] = await db
                    .insert(instructors)
                    .values({ userId: item.userId, name: item.name ?? 'User Instructor', email: item.email ?? null, phone: item.phone ?? null })
                    .onConflictDoNothing({ target: instructors.userId })
                    .returning({ id: instructors.id });
                if (ins?.id) instructorId = ins.id;
                if (!instructorId) {
                    const [found] = await db.select({ id: instructors.id }).from(instructors).where(eq(instructors.userId, item.userId)).limit(1);
                    instructorId = found?.id ?? null;
                }
            } else {
                const [ins] = await db
                    .insert(instructors)
                    .values({ name: item.name ?? 'Guest Instructor', email: item.email ?? null, phone: item.phone ?? null })
                    .returning({ id: instructors.id });
                instructorId = ins.id;
            }
        }

        if (instructorId) {
            const [assign] = await db
                .insert(courseOfferingInstructors)
                .values({ offeringId, instructorId, role: item.role ?? 'PRIMARY' })
                .onConflictDoNothing()
                .returning({ id: courseOfferingInstructors.id });
            if (assign?.id) results.push({ id: assign.id, role: item.role ?? 'PRIMARY' });
        }
    }
    return results;
}

export async function updateOffering(
    offeringId: string,
    patch: Partial<typeof courseOfferings.$inferInsert>
): Promise<{ before: OfferingRow; after: OfferingRow } | null> {
    const [before] = await db.select().from(courseOfferings).where(eq(courseOfferings.id, offeringId)).limit(1);
    if (!before) return null;
    const [row] = await db
        .update(courseOfferings)
        .set(patch)
        .where(eq(courseOfferings.id, offeringId))
        .returning();
    return row ? { before, after: row } : null;
}

export async function softDeleteOffering(
    offeringId: string
): Promise<{ before: OfferingRow; after: OfferingRow } | null> {
    const [before] = await db.select().from(courseOfferings).where(eq(courseOfferings.id, offeringId)).limit(1);
    if (!before) return null;
    const [after] = await db
        .update(courseOfferings)
        .set({ deletedAt: new Date() })
        .where(eq(courseOfferings.id, offeringId))
        .returning();
    return after ? { before, after } : null;
}

export async function hardDeleteOffering(offeringId: string): Promise<{ before: OfferingRow } | null> {
    const [before] = await db.select().from(courseOfferings).where(eq(courseOfferings.id, offeringId)).limit(1);
    if (!before) return null;
    await db.delete(courseOfferings).where(eq(courseOfferings.id, offeringId));
    return { before };
}
