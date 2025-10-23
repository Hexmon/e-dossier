import { db } from '@/app/db/client';
import { instructors } from '@/app/db/schema/training/instructors';
import { and, eq, ilike, isNull } from 'drizzle-orm';

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
