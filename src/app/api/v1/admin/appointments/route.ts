import { db } from '@/app/db/client';
import { users } from '@/app/db/schema/auth/users';
import { positions } from '@/app/db/schema/auth/positions';
import { platoons } from '@/app/db/schema/auth/platoons';
import { appointments } from '@/app/db/schema/auth/appointments';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth } from '@/app/lib/authz';
import { appointmentCreateSchema, appointmentListQuerySchema } from '@/app/lib/validators';
import { and, eq, sql, isNull } from 'drizzle-orm';
import { withAuditRoute, AuditEventType, AuditResourceType } from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest) {
    try {
        const url = new URL(req.url);
        const qp = appointmentListQuerySchema.parse({
            active: url.searchParams.get('active') ?? undefined,   // 'true' | 'false' | undefined
            positionKey: url.searchParams.get('positionKey') ?? undefined,
            platoonKey: url.searchParams.get('platoonKey') ?? undefined,
            userId: url.searchParams.get('userId') ?? undefined,
            limit: url.searchParams.get('limit') ?? undefined,
            offset: url.searchParams.get('offset') ?? undefined,
        });

        const where: any[] = [];

        // ACTIVE FILTER:
        // - active=true  => ends_at IS NULL AND deleted_at IS NULL
        // - active=false => ends_at IS NOT NULL AND deleted_at IS NULL
        if (qp.active === 'true') {
            where.push(isNull(appointments.endsAt));
            where.push(isNull(appointments.deletedAt));
        } else if (qp.active === 'false') {
            where.push(sql`${appointments.endsAt} IS NOT NULL`);
            where.push(isNull(appointments.deletedAt));
        }

        if (qp.userId) where.push(eq(appointments.userId, qp.userId));
        if (qp.positionKey) where.push(eq(positions.key, qp.positionKey));
        if (qp.platoonKey) where.push(eq(platoons.key, qp.platoonKey));

        const rows = await db
            .select({
                id: appointments.id,
                userId: appointments.userId,
                username: users.username,
                positionId: appointments.positionId,
                positionKey: positions.key,
                positionName: positions.displayName,
                scopeType: appointments.scopeType,
                scopeId: appointments.scopeId,
                platoonKey: platoons.key,
                platoonName: platoons.name,
                startsAt: appointments.startsAt,
                endsAt: appointments.endsAt,
                reason: appointments.reason,
                deletedAt: appointments.deletedAt,
                createdAt: appointments.createdAt,
                updatedAt: appointments.updatedAt,
            })
            .from(appointments)
            .innerJoin(users, eq(users.id, appointments.userId))
            .innerJoin(positions, eq(positions.id, appointments.positionId))
            .leftJoin(platoons, eq(platoons.id, appointments.scopeId))
            .where(where.length ? and(...where) : undefined)
            .limit(qp.limit ?? 100)
            .offset(qp.offset ?? 0);

        return json.ok({ message: 'Appointments retrieved successfully.', data: rows });
    } catch (err) {
        return handleApiError(err);
    }
}


async function POSTHandler(req: AuditNextRequest) {
    try {
        const adminCtx = await requireAuth(req);

        const body = await req.json();
        const parsed = appointmentCreateSchema.safeParse(body);
        if (!parsed.success) throw new ApiError(400, 'Validation failed', 'bad_request', parsed.error.flatten());
        const p = parsed.data;

        // resolve positionId if caller sent positionKey
        let positionId = p.positionId ?? null;
        if (!positionId && p.positionKey) {
            const [pos] = await db.select().from(positions).where(eq(positions.key, p.positionKey)).limit(1);
            if (!pos) throw new ApiError(400, 'Unknown positionKey');
            positionId = pos.id;
        }
        if (!positionId) throw new ApiError(400, 'positionId or positionKey is required');

        // scope rules
        if (p.scopeType === 'PLATOON') {
            if (!p.scopeId) throw new ApiError(400, 'scopeId required for PLATOON scope');
            const [pl] = await db.select().from(platoons).where(eq(platoons.id, p.scopeId)).limit(1);
            if (!pl) throw new ApiError(400, 'Invalid platoon scopeId');
        } else {
            if (p.scopeId) throw new ApiError(400, 'scopeId must be null for GLOBAL scope');
        }

        // time sanity
        if (p.endsAt && !(p.startsAt < p.endsAt)) {
            throw new ApiError(400, 'startsAt must be earlier than endsAt', 'bad_request');
        }

        // --- SLOT EXCLUSIVITY CHECK (one active holder per (positionId, scopeType, scopeId)) ---
        // Overlap condition (without relying on generated range column):
        //   existing.starts_at <= COALESCE(new.ends_at, 'infinity')
        //   AND (existing.ends_at IS NULL OR existing.ends_at >= new.starts_at)
        //   AND existing.deleted_at IS NULL
        //   AND existing.assignment = 'PRIMARY'
        const overlap = await db
            .select({ id: appointments.id })
            .from(appointments)
            .where(and(
                eq(appointments.positionId, positionId),
                eq(appointments.scopeType, p.scopeType),
                (p.scopeType === 'PLATOON' && p.scopeId)
                    ? eq(appointments.scopeId, p.scopeId)
                    : sql`${appointments.scopeId} IS NULL`,
                eq(appointments.assignment, 'PRIMARY'),
                sql`${appointments.deletedAt} IS NULL`,
                // starts_at <= COALESCE(newEnd, 'infinity')
                sql`${appointments.startsAt} <= COALESCE(${p.endsAt ?? null}, 'infinity'::timestamptz)`,
                // (ends_at IS NULL OR ends_at >= newStart)
                sql`(${appointments.endsAt} IS NULL OR ${appointments.endsAt} >= ${p.startsAt})`,
            ))
            .limit(1);

        if (overlap.length) {
            throw new ApiError(
                409,
                'Another active/overlapping appointment already exists for this position & scope',
                'conflict',
                { positionId, scopeType: p.scopeType, scopeId: p.scopeId ?? null }
            );
        }

        // CREATE
        const [row] = await db
            .insert(appointments)
            .values({
                userId: p.userId,                    // user can hold multiple appointments -> allowed
                positionId,
                assignment: p.assignment ?? 'PRIMARY',
                scopeType: p.scopeType,
                scopeId: p.scopeType === 'PLATOON' ? p.scopeId! : null,
                startsAt: p.startsAt,
                endsAt: p.endsAt ?? null,
                reason: p.reason ?? null,
                // appointedBy: (optional) set from admin principal if desired
            })
            .returning();

        await req.audit.log({
            action: AuditEventType.APPOINTMENT_CREATED,
            outcome: 'SUCCESS',
            actor: { type: 'user', id: adminCtx.userId },
            target: { type: AuditResourceType.APPOINTMENT, id: row.id },
            metadata: {
                description: `Created appointment ${row.id} for user ${row.userId}`,
                appointmentId: row.id,
                userId: row.userId,
                positionId: row.positionId,
                scopeType: row.scopeType,
                scopeId: row.scopeId,
                startsAt: row.startsAt,
                endsAt: row.endsAt,
            },
            diff: { after: row },
        });

        return json.created({ message: 'Appointment created successfully.', data: row });
    } catch (err) {
        return handleApiError(err);
    }
}
export const GET = withAuditRoute('GET', GETHandler);

export const POST = withAuditRoute('POST', POSTHandler);
