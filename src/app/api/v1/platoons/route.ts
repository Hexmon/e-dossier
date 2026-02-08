import { db } from '@/app/db/client';
import { platoons } from '@/app/db/schema/auth/platoons';
import { and, eq, isNull, or, sql } from 'drizzle-orm';
import { json, handleApiError } from '@/app/lib/http';
import { platoonCreateSchema } from '@/app/lib/validators';
import { requireAuth } from '@/app/lib/authz';
import {
  withAuditRoute,
  AuditEventType,
  AuditResourceType,
} from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

type PgError = { code?: string; detail?: string };

// GET /api/v1/platoons  (PUBLIC)
// Optional query: ?q=...  (matches key or name, case-insensitive)
// Optional query: ?includeDeleted=true
async function GETHandler(req: AuditNextRequest) {
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

        return json.ok({ message: 'Platoons retrieved successfully.', items: rows });
    } catch (err) {
        return handleApiError(err);
    }
}

// POST /api/v1/platoons  (ADMIN)
// { key, name, about? }
async function POSTHandler(req: AuditNextRequest) {
    try {
        const adminCtx = await requireAuth(req);

        const body = await req.json();
        const parsed = platoonCreateSchema.safeParse(body);
        if (!parsed.success) {
            return json.badRequest('Validation failed.', { issues: parsed.error.flatten() });
        }

        const data = parsed.data;
        const upKey = data.key.toUpperCase();
        const lcName = data.name.trim().toLowerCase();

        // Uniqueness checks (ignore soft-deleted)
        const [conflict] = await db
            .select({ id: platoons.id, key: platoons.key, name: platoons.name })
            .from(platoons)
            .where(
                and(
                    isNull(platoons.deletedAt),
                    or(
                        eq(platoons.key, upKey),
                        sql`lower(${platoons.name}) = ${lcName}`
                    )
                )
            )
            .limit(1);

        if (conflict) {
            const by = conflict.key === upKey ? 'key' : 'name';
            return json.conflict(`Platoon ${by} already exists.`, { [by]: by === 'key' ? upKey : data.name.trim() });
        }

        const [row] = await db
            .insert(platoons)
            .values({
                key: upKey,
                name: data.name.trim(),
                about: data.about ?? null,
            })
            .returning({
                id: platoons.id,
                key: platoons.key,
                name: platoons.name,
                about: platoons.about,
                createdAt: platoons.createdAt,
                updatedAt: platoons.updatedAt,
            });

        await req.audit.log({
            action: AuditEventType.PLATOON_CREATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.PLATOON, id: row.id },
            metadata: {
                platoonId: row.id,
                key: row.key,
                name: row.name,
                description: `Created platoon ${row.key}`,
            },
        });
        return json.created({ message: 'Platoon created successfully.', platoon: row });
    } catch (err) {
        return handleApiError(err);
    }
}


// DELETE /api/v1/platoons  (ADMIN)
// Soft-delete ALL platoons (sets deleted_at = now())
async function DELETEHandler(req: AuditNextRequest) {
    try {
        const adminCtx = await requireAuth(req);

        const now = new Date();
        const deleted = await db
            .update(platoons)
            .set({ deletedAt: now })
            .where(isNull(platoons.deletedAt))
            .returning({ id: platoons.id });

        await req.audit.log({
            action: AuditEventType.PLATOON_DELETED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.PLATOON, id: null },
            metadata: {
                bulk: true,
                count: deleted.length,
                description: 'Soft-deleted all platoons',
            },
        });
        return json.ok({ message: 'All platoons soft-deleted.', count: deleted.length });
    } catch (err) {
        return handleApiError(err);
    }
}
export const GET = withAuditRoute('GET', GETHandler);

export const POST = withAuditRoute('POST', POSTHandler);

export const DELETE = withAuditRoute('DELETE', DELETEHandler);
