import { db } from '@/app/db/client';
import { instructors } from '@/app/db/schema/training/instructors';
import { courseOfferingInstructors } from '@/app/db/schema/training/courseOfferings';
import { and, eq, ilike, inArray, isNull } from 'drizzle-orm';

export async function listInstructors(opts: { q?: string; includeDeleted?: boolean; limit?: number; offset?: number; }) {
    const wh: any[] = [];
    if (opts.q) wh.push(ilike(instructors.name, `%${opts.q}%`));
    if (!opts.includeDeleted) wh.push(isNull(instructors.deletedAt));

    return db
        .select({
            id: instructors.id,
            userId: instructors.userId,
            name: instructors.name,
            email: instructors.email,
            phone: instructors.phone,
            affiliation: instructors.affiliation,
            notes: instructors.notes,
            createdAt: instructors.createdAt,
            updatedAt: instructors.updatedAt,
            deletedAt: instructors.deletedAt,
        })
        .from(instructors)
        .where(wh.length ? and(...wh) : undefined)
        .orderBy(instructors.name)
        .limit(opts.limit ?? 100)
        .offset(opts.offset ?? 0);
}

export async function softDeleteInstructor(id: string) {
    const [before] = await db.select().from(instructors).where(eq(instructors.id, id)).limit(1);
    if (!before) return null;
    const [after] = await db
        .update(instructors)
        .set({ deletedAt: new Date() })
        .where(eq(instructors.id, id))
        .returning();
    return after ? { before, after } : null;
}

export async function hardDeleteInstructor(id: string) {
    return db.transaction(async (tx) => {
        const [before] = await tx.select().from(instructors).where(eq(instructors.id, id)).limit(1);
        if (!before) return null;
        await tx.delete(courseOfferingInstructors).where(eq(courseOfferingInstructors.instructorId, id));
        await tx.delete(instructors).where(eq(instructors.id, id));
        return { before };
    });
}

export async function findMissingInstructorIds(ids: string[]) {
    if (!ids.length) return [];
    const unique = Array.from(new Set(ids));
    const conditions = [inArray(instructors.id, unique), isNull(instructors.deletedAt)];
    const rows = await db
        .select({ id: instructors.id })
        .from(instructors)
        .where(and(...conditions));
    const found = new Set(rows.map((r) => r.id));
    return unique.filter((id) => !found.has(id));
}
