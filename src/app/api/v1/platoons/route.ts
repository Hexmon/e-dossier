import { NextRequest } from 'next/server';
import { db } from '@/app/db/client';
import { platoons } from '@/app/db/schema/auth/platoons';
import { and, eq, isNull, or, sql } from 'drizzle-orm';
import { json, handleApiError } from '@/app/lib/http';
import { platoonCreateSchema } from '@/app/lib/validators';
import { requireAdmin } from '@/app/lib/authz';

type PgError = { code?: string; detail?: string };

// GET /api/v1/platoons  (PUBLIC)
// Optional query: ?q=...  (matches key or name, case-insensitive)
// Optional query: ?includeDeleted=true
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const q = (searchParams.get('q') || '').trim();
        const includeDeleted = (searchParams.get('includeDeleted') || '').toLowerCase() === 'true';

        const where = [];
        if (!includeDeleted) where.push(isNull(platoons.deletedAt));

        if (q) {
            const lc = q.toLowerCase();
            where.push(or(
                eq(platoons.key, q.toUpperCase()),
                sql`lower(${platoons.name}) = ${lc}`
            ));
        }

        const rows = await db
            .select({
                id: platoons.id,
                key: platoons.key,
                name: platoons.name,
                about: platoons.about,
                createdAt: platoons.createdAt,
                updatedAt: platoons.updatedAt,
                deletedAt: platoons.deletedAt,
            })
            .from(platoons)
            .where(where.length ? and(...where) : undefined)
            .orderBy(platoons.key);

        return json.ok({ items: rows });
    } catch (err) {
        return handleApiError(err);
    }
}

// POST /api/v1/platoons  (ADMIN)
// { key, name, about? }
export async function POST(req: NextRequest) {
    try {
        requireAdmin(req);

        const body = await req.json();
        const parsed = platoonCreateSchema.safeParse(body);
        if (!parsed.success) {
            return json.badRequest('Validation failed', { issues: parsed.error.flatten() });
        }

        const data = parsed.data;
        const [row] = await db.insert(platoons).values({
            key: data.key.toUpperCase(),
            name: data.name.trim(),
            about: data.about ?? null,
        }).returning({
            id: platoons.id,
            key: platoons.key,
            name: platoons.name,
            about: platoons.about,
            createdAt: platoons.createdAt,
            updatedAt: platoons.updatedAt,
        });

        return json.created({ platoon: row });
    } catch (err) {
        const e = err as PgError;
        if (e?.code === '23505') {
            return json.conflict('Platoon key already exists');
        }
        return handleApiError(err);
    }
}

// DELETE /api/v1/platoons  (ADMIN)
// Soft-delete ALL platoons (sets deleted_at = now())
export async function DELETE(req: NextRequest) {
    try {
        requireAdmin(req);

        const now = new Date();
        const deleted = await db
            .update(platoons)
            .set({ deletedAt: now })
            .where(isNull(platoons.deletedAt))
            .returning({ id: platoons.id });

        return json.ok({ message: 'All platoons soft-deleted', count: deleted.length });
    } catch (err) {
        return handleApiError(err);
    }
}
