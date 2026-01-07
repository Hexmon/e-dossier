import { db } from '@/app/db/client';
import { punishments } from '@/app/db/schema/admin/punishments';
import { and, eq, ilike, isNull } from 'drizzle-orm';

export type PunishmentRow = typeof punishments.$inferSelect;

export async function listPunishments(opts: { q?: string; includeDeleted?: boolean; limit?: number; offset?: number; }) {
    const wh: any[] = [];
    if (opts.q) wh.push(ilike(punishments.title, `%${opts.q}%`));
    if (!opts.includeDeleted) wh.push(isNull(punishments.deletedAt));

    return db
        .select({
            id: punishments.id,
            title: punishments.title,
            marksDeduction: punishments.marksDeduction,
            createdAt: punishments.createdAt,
            updatedAt: punishments.updatedAt,
            deletedAt: punishments.deletedAt,
        })
        .from(punishments)
        .where(wh.length ? and(...wh) : undefined)
        .orderBy(punishments.title)
        .limit(opts.limit ?? 100)
        .offset(opts.offset ?? 0);
}

export async function getPunishment(id: string) {
    const [row] = await db
        .select()
        .from(punishments)
        .where(eq(punishments.id, id))
        .limit(1);
    return row ?? null;
}

export async function createPunishment(data: { title: string; marksDeduction?: number | null; }) {
    const [row] = await db
        .insert(punishments)
        .values({
            title: data.title,
            marksDeduction: data.marksDeduction ?? null,
        })
        .returning();
    return row;
}

export async function updatePunishment(id: string, patch: Partial<typeof punishments.$inferInsert>) {
    const [row] = await db
        .update(punishments)
        .set(patch)
        .where(eq(punishments.id, id))
        .returning();
    return row ?? null;
}

export async function softDeletePunishment(id: string): Promise<{ before: PunishmentRow; after: PunishmentRow } | null> {
    const [before] = await db.select().from(punishments).where(eq(punishments.id, id)).limit(1);
    if (!before) return null;
    const [after] = await db
        .update(punishments)
        .set({ deletedAt: new Date() })
        .where(eq(punishments.id, id))
        .returning();
    return after ? { before, after } : null;
}

export async function hardDeletePunishment(id: string): Promise<{ before: PunishmentRow } | null> {
    return db.transaction(async (tx) => {
        const [before] = await tx.select().from(punishments).where(eq(punishments.id, id)).limit(1);
        if (!before) return null;
        await tx.delete(punishments).where(eq(punishments.id, id));
        return { before };
    });
}
