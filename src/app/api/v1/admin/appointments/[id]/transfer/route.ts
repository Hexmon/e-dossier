// src/app/api/v1/admin/appointments/[id]/transfer/route.ts
import { NextRequest } from 'next/server';
import { db } from '@/app/db/client';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAdmin } from '@/app/lib/authz';
import { z } from 'zod';
import { appointments } from '@/app/db/schema/auth/appointments';
import { users } from '@/app/db/schema/auth/users';
import { positions } from '@/app/db/schema/auth/positions';
import { platoons } from '@/app/db/schema/auth/platoons';
import { eq, and, or, isNull, lte, gte } from 'drizzle-orm';
import { appointmentTransfers } from '@/app/db/schema/admin/appointmentTransfers';
import { appointmentCreateSchema, appointmentTransferBody } from '@/app/lib/validators';

const IdSchema = z.object({ id: z.string().uuid() });

export async function POST(req: NextRequest) {
    try {
        await requireAdmin(req);

        // 0) Parse JSON safely → give a nice error if body isn't valid JSON
        let body: unknown;
        try {
            body = await req.json();
        } catch {
            throw new ApiError(400, 'Invalid JSON body', 'bad_request', {
                hint: 'Ensure the request body is valid JSON (quote UUIDs/strings, use null not "null").',
            });
        }

        // 1) Zod validation (shape/format)
        const parsed = appointmentCreateSchema.safeParse(body);
        if (!parsed.success) {
            throw new ApiError(400, 'Validation failed', 'bad_request', parsed.error.flatten());
        }
        const p = parsed.data;

        // 2) Required semantic checks
        // 2a) user must exist
        {
            const [u] = await db.select({ id: users.id }).from(users).where(eq(users.id, p.userId)).limit(1);
            if (!u) {
                throw new ApiError(400, 'User not found', 'user_not_found', { userId: p.userId });
            }
        }

        // 2b) resolve/verify position
        let positionId = p.positionId ?? null;
        if (!positionId && p.positionKey) {
            const [pos] = await db
                .select({ id: positions.id, key: positions.key, defaultScope: positions.defaultScope })
                .from(positions)
                .where(eq(positions.key, p.positionKey))
                .limit(1);

            if (!pos) {
                throw new ApiError(400, 'Position not found', 'position_not_found', { positionKey: p.positionKey });
            }
            positionId = pos.id;
        }
        if (!positionId) {
            throw new ApiError(400, 'positionId or positionKey is required', 'missing_position');
        }

        // 2c) scope consistency + existence
        if (p.scopeType === 'GLOBAL') {
            if (p.scopeId !== null && p.scopeId !== undefined) {
                throw new ApiError(400, 'scopeId must be null when scopeType = GLOBAL', 'invalid_scope');
            }
        } else if (p.scopeType === 'PLATOON') {
            if (!p.scopeId) {
                throw new ApiError(400, 'scopeId is required when scopeType = PLATOON', 'missing_scope_id');
            }
            const [pl] = await db.select({ id: platoons.id, key: platoons.key }).from(platoons).where(eq(platoons.id, p.scopeId)).limit(1);
            if (!pl) {
                throw new ApiError(400, 'Platoon (scopeId) not found', 'scope_not_found', { scopeId: p.scopeId });
            }
        }

        // 2d) time sanity (DB also checks, but we give nicer message)
        if (p.endsAt && !(p.startsAt < p.endsAt)) {
            throw new ApiError(400, 'startsAt must be earlier than endsAt', 'invalid_time_window', {
                startsAt: p.startsAt,
                endsAt: p.endsAt,
            });
        }

        // 3) Business rule: only ONE active holder per (positionId, scopeType, scopeId) at the requested start time
        //    We proactively check overlap to give a clean 409 (in addition to the GiST EXCLUDE).
        {
            const startAt = p.startsAt;
            const overlap = await db
                .select({ id: appointments.id, userId: appointments.userId, startsAt: appointments.startsAt, endsAt: appointments.endsAt })
                .from(appointments)
                .where(
                    and(
                        eq(appointments.positionId, positionId),
                        eq(appointments.scopeType, p.scopeType),
                        p.scopeType === 'PLATOON' ? eq(appointments.scopeId, p.scopeId!) : isNull(appointments.scopeId),
                        isNull(appointments.deletedAt),
                        // active window at startsAt: startsAt <= newStart && (endsAt IS NULL OR endsAt >= newStart)
                        lte(appointments.startsAt, startAt),
                        or(isNull(appointments.endsAt), gte(appointments.endsAt, startAt))
                    )
                )
                .limit(1);

            if (overlap.length) {
                throw new ApiError(
                    409,
                    'Another active holder already exists for this position/scope at the requested start time',
                    'slot_conflict',
                    { conflictingAppointmentId: overlap[0].id, conflictingUserId: overlap[0].userId }
                );
            }
        }

        // 4) Insert
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
            })
            .returning();

        return json.created({ data: row });
    } catch (err) {
        // Map common constraint error codes to clear messages
        const any = err as any;
        if (any?.code === '23P01') {
            // exclusion constraint (GiST) → overlapping holder
            return json.conflict('Another active holder conflicts with this time window', {
                code: 'slot_conflict',
                detail: 'The (position, scope) slot already has a PRIMARY holder overlapping this time.',
            });
        }
        if (any?.code === '23503') {
            // FK violation
            return json.badRequest('Foreign key constraint failed', {
                code: 'foreign_key_violation',
                detail: any?.detail,
            });
        }
        if (any?.code === '23505') {
            // Unique violation (unlikely here but covered)
            return json.conflict('Unique constraint violated', { detail: any?.detail });
        }
        return handleApiError(err);
    }
}
