// src/app/api/v1/admin/positions/active-holder/route.ts
import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { requireAdmin } from '@/app/lib/authz';
import { db } from '@/app/db/client';
import { positions } from '@/app/db/schema/auth/positions';
import { appointments } from '@/app/db/schema/auth/appointments';
import { users } from '@/app/db/schema/auth/users';
import { and, or, eq, isNull, lte, gte } from 'drizzle-orm';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function GETHandler(req: NextRequest) {
    try {
        // must await (async validator)
        await requireAdmin(req);

        const url = new URL(req.url);
        const positionKey = url.searchParams.get('positionKey');
        const scopeType = (url.searchParams.get('scopeType') || 'GLOBAL') as 'GLOBAL' | 'PLATOON';
        const scopeId = url.searchParams.get('scopeId');

        if (!positionKey) return json.badRequest('positionKey is required.');
        if (scopeType === 'PLATOON' && !scopeId) return json.badRequest('scopeId required for PLATOON.');

        const [pos] = await db
            .select({ id: positions.id })
            .from(positions)
            .where(eq(positions.key, positionKey))
            .limit(1);

        if (!pos) return json.badRequest('Unknown positionKey.');

        // Active window: starts_at <= now AND (ends_at IS NULL OR ends_at >= now)
        const now = new Date();

        const scopePredicate =
            scopeType === 'PLATOON'
                ? eq(appointments.scopeId, scopeId!)
                : isNull(appointments.scopeId);

        const rows = await db
            .select({
                appointmentId: appointments.id,
                userId: appointments.userId,
                username: users.username,
                startsAt: appointments.startsAt,
                endsAt: appointments.endsAt,
            })
            .from(appointments)
            .innerJoin(users, eq(users.id, appointments.userId))
            .where(and(
                eq(appointments.positionId, pos.id),
                eq(appointments.assignment, 'PRIMARY'),     // enum value; stored as text in your schema
                eq(appointments.scopeType, scopeType),
                scopePredicate,
                isNull(appointments.deletedAt),
                lte(appointments.startsAt, now),
                or(isNull(appointments.endsAt), gte(appointments.endsAt, now)),
            ))
            .limit(1);

        await createAuditLog({
            actorUserId: null,
            eventType: AuditEventType.API_REQUEST,
            resourceType: AuditResourceType.POSITION,
            resourceId: pos.id,
            description: 'Fetched active position holder',
            metadata: {
                positionKey,
                scopeType,
                scopeId,
                found: Boolean(rows[0]),
            },
            request: req,
        });
        return json.ok({ message: 'Active holder retrieved successfully.', holder: rows[0] ?? null });
    } catch (err) {
        return handleApiError(err);
    }
}
export const GET = withRouteLogging('GET', GETHandler);
