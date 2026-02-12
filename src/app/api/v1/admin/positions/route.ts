import { db } from '@/app/db/client';
import { positions } from '@/app/db/schema/auth/positions';
import { json, handleApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { positionCreateSchema } from '@/app/lib/validators';
import { asc, eq, isNull } from 'drizzle-orm';
import { platoons } from '@/app/db/schema/auth/platoons';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';
import { withAuthz } from '@/app/lib/acx/withAuthz';

export const runtime = 'nodejs';

async function GETHandler(req: AuditNextRequest) {
    try {
        let actor: { type: 'user' | 'anonymous'; id: string } = { type: 'anonymous', id: 'unknown' };
        try {
            const authCtx = await requireAuth(req);
            actor = { type: 'user', id: authCtx.userId };
        } catch {}

        const url = new URL(req.url);
        const includePlatoons =
            (url.searchParams.get('includePlatoons') || '').toLowerCase() === 'true';

        // 1) base positions
        const posRows = await db
            .select({
                id: positions.id,
                key: positions.key,
                displayName: positions.displayName,
                defaultScope: positions.defaultScope,
                singleton: positions.singleton,
                description: positions.description,
                createdAt: positions.createdAt,
            })
            .from(positions)
            .orderBy(asc(positions.key));

        if (!includePlatoons) {
            await req.audit.log({
                action: AuditEventType.API_REQUEST,
                outcome: 'SUCCESS',
                actor,
                target: { type: AuditResourceType.POSITION, id: 'collection' },
                metadata: {
                    description: 'Positions retrieved successfully.',
                    includePlatoons: false,
                    count: posRows.length,
                },
            });
            return json.ok({ message: 'Positions retrieved successfully.', data: posRows });
        }

        // 2) fetch all active platoons once
        const plRows = await db
            .select({
                id: platoons.id,
                key: platoons.key,
                name: platoons.name,
            })
            .from(platoons)
            .where(isNull(platoons.deletedAt))
            .orderBy(asc(platoons.key));

        // 3) attach slots to PLATOON-scoped positions
        const data = posRows.map((p) => {
            if (p.defaultScope === 'PLATOON') {
                return {
                    ...p,
                    slots: plRows.map((pl) => ({
                        scope: { type: 'PLATOON' as const, id: pl.id, key: pl.key, name: pl.name },
                    })),
                };
            }
            return p;
        });

        await req.audit.log({
            action: AuditEventType.API_REQUEST,
            outcome: 'SUCCESS',
            actor,
            target: { type: AuditResourceType.POSITION, id: 'collection' },
            metadata: {
                description: 'Positions retrieved successfully.',
                includePlatoons: true,
                count: data.length,
            },
        });

        return json.ok({ message: 'Positions retrieved successfully.', data });
    } catch (err) {
        return handleApiError(err);
    }
}


async function POSTHandler(req: AuditNextRequest) {
    try {
        const adminCtx = await requireAuth(req);

        const body = await req.json();
        const parsed = positionCreateSchema.safeParse(body);
        if (!parsed.success) {
            return json.badRequest('Validation failed.', { issues: parsed.error.flatten() });
        }

        const key = parsed.data.key.trim();
        const displayName = parsed.data.displayName?.trim() ?? null;

        // Uniqueness pre-checks: key and displayName (if provided)
        // 1) key
        const [keyExists] = await db
            .select({ id: positions.id })
            .from(positions)
            .where(eq(positions.key, key))
            .limit(1);

        if (keyExists) {
            return json.conflict('Position key already exists.', { field: 'key', value: key });
        }

        // 2) displayName (only if provided)
        if (displayName) {
            const [nameExists] = await db
                .select({ id: positions.id })
                .from(positions)
                .where(eq(positions.displayName, displayName))
                .limit(1);

            if (nameExists) {
                return json.conflict('Display name already exists.', { field: 'displayName', value: displayName });
            }
        }

        const [row] = await db
            .insert(positions)
            .values({
                key,
                displayName,
                defaultScope: parsed.data.defaultScope,
                singleton: parsed.data.singleton ?? true,
                description: parsed.data.description ?? null,
            })
            .returning();

        await req.audit.log({
            action: AuditEventType.POSITION_CREATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.POSITION, id: row.id },
            metadata: {
                description: `Created position ${row.key}`,
                positionId: row.id,
                key: row.key,
                displayName: row.displayName,
                defaultScope: row.defaultScope,
                singleton: row.singleton,
            },
        });

        return json.created({ message: 'Position created successfully.', data: row });
    } catch (err) {
        return handleApiError(err);
    }
}
export const GET = withAuditRoute('GET', withAuthz(GETHandler));

export const POST = withAuditRoute('POST', withAuthz(POSTHandler));
