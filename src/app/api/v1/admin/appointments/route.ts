import { NextRequest } from 'next/server';
import { db } from '@/app/db/client';
import { users } from '@/app/db/schema/auth/users';
import { positions } from '@/app/db/schema/auth/positions';
import { platoons } from '@/app/db/schema/auth/platoons';
import { appointments } from '@/app/db/schema/auth/appointments';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAdmin } from '@/app/lib/authz';
import { appointmentCreateSchema, appointmentListQuerySchema } from '@/app/lib/validators';
import { and, eq, sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const qp = appointmentListQuerySchema.parse({
            active: url.searchParams.get('active') ?? undefined,
            positionKey: url.searchParams.get('positionKey') ?? undefined,
            platoonKey: url.searchParams.get('platoonKey') ?? undefined,
            userId: url.searchParams.get('userId') ?? undefined,
            limit: url.searchParams.get('limit') ?? undefined,
            offset: url.searchParams.get('offset') ?? undefined,
        });

        const where = [];
        if (qp.active === 'true') {
            // use generated column without mapping: "appointments"."valid_during" @> now()
            where.push(sql`"appointments"."valid_during" @> now()`);
            where.push(sql`"appointments"."deleted_at" IS NULL`);
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

        return json.ok({ data: rows });
    } catch (err) {
        return handleApiError(err);
    }
}

export async function POST(req: NextRequest) {
    try {
        // appointment CRUD must be admin (safer per your notes)
        requireAdmin(req);

        const body = await req.json();
        const parsed = appointmentCreateSchema.safeParse(body);
        if (!parsed.success) throw new ApiError(400, 'Validation failed', 'bad_request', parsed.error.flatten());
        const p = parsed.data;

        // resolve positionId if caller sent positionKey
        let positionId = p.positionId ?? null;
        if (!positionId && p.positionKey) {
            const [pos] = await db.select().from(positions).where(eq(positions.key, p.positionKey));
            if (!pos) throw new ApiError(400, 'Unknown positionKey');
            positionId = pos.id;
        }
        if (!positionId) throw new ApiError(400, 'positionId or positionKey is required');

        // if PLATOON, scopeId must be provided and valid
        if (p.scopeType === 'PLATOON') {
            if (!p.scopeId) throw new ApiError(400, 'scopeId required for PLATOON scope');
            const [pl] = await db.select().from(platoons).where(eq(platoons.id, p.scopeId));
            if (!pl) throw new ApiError(400, 'Invalid platoon scopeId');
        } else {
            // GLOBAL -> scopeId must be NULL
            if (p.scopeId) throw new ApiError(400, 'scopeId must be null for GLOBAL scope');
        }

        const [row] = await db
            .insert(appointments)
            .values({
                userId: p.userId,
                positionId,
                assignment: p.assignment,
                scopeType: p.scopeType,
                scopeId: p.scopeType === 'PLATOON' ? p.scopeId! : null,
                startsAt: p.startsAt,
                endsAt: p.endsAt ?? null,
                reason: p.reason ?? null,
                // appointedBy: (optional) you can set from x-user-id if you want:
                // appointedBy: requireAdmin(req).userId,
            })
            .returning();

        // NOTE: GiST EXCLUDE will enforce “one primary per slot over time”.
        return json.created({ data: row });
    } catch (err) {
        return handleApiError(err);
    }
}
