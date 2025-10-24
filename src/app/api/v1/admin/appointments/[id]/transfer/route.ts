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
import { appointmentTransfers } from '@/app/db/schema/admin/appointmentTransfers';

import { and, eq, or, isNull, lte, gt } from 'drizzle-orm';
import { appointmentTransferBody } from '@/app/lib/validators';

const IdSchema = z.object({ id: z.string().uuid() });

export async function POST(
    req: NextRequest,
    ctx: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
    try {
        const { userId: adminId } = await requireAdmin(req);

        const { id: raw } = await (ctx as any).params;
        const { id } = IdSchema.parse({ id: decodeURIComponent((raw ?? '')).trim() });

        // Parse body safely
        let body: unknown;
        try {
            body = await req.json();
        } catch {
            throw new ApiError(400, 'Invalid JSON body', 'bad_request', {
                hint: 'Ensure the request body is valid JSON (quote UUIDs/strings, use null not "null").',
            });
        }

        const parsed = appointmentTransferBody.safeParse(body);
        if (!parsed.success) {
            throw new ApiError(400, 'Validation failed', 'bad_request', parsed.error.flatten());
        }
        const dto = parsed.data;

        const requestedPrevEndsAt = new Date(dto.prevEndsAt);
        const newStartsAt = new Date(dto.newStartsAt);

        // 1) Load current appointment
        const [curr] = await db
            .select({
                id: appointments.id,
                userId: appointments.userId,
                positionId: appointments.positionId,
                assignment: appointments.assignment,
                scopeType: appointments.scopeType,
                scopeId: appointments.scopeId,
                startsAt: appointments.startsAt,
                endsAt: appointments.endsAt,
                deletedAt: appointments.deletedAt,
            })
            .from(appointments)
            .where(eq(appointments.id, id))
            .limit(1);

        if (!curr) throw new ApiError(404, 'Appointment not found', 'not_found');
        if (curr.deletedAt) throw new ApiError(409, 'Appointment is deleted', 'conflict');

        // 2) Time handling
        // If caller provided prevEndsAt earlier than startsAt, auto-bump to startsAt (DB requires starts_at < ends_at).
        const effectivePrevEndsAt =
            requestedPrevEndsAt < curr.startsAt ? curr.startsAt : requestedPrevEndsAt;

        // Your rule: newStartsAt must be same as or after effectivePrevEndsAt
        if (newStartsAt < effectivePrevEndsAt) {
            throw new ApiError(
                400,
                'newStartsAt must be the same as or after prevEndsAt',
                'bad_request',
                { effectivePrevEndsAt }
            );
        }

        // 3) Validate new user exists & not deleted
        const [targetUser] = await db
            .select({ id: users.id, deletedAt: users.deletedAt })
            .from(users)
            .where(eq(users.id, dto.newUserId))
            .limit(1);

        if (!targetUser) throw new ApiError(400, 'Invalid newUserId', 'bad_request');
        if (targetUser.deletedAt) throw new ApiError(400, 'Target user is deleted', 'bad_request');

        // Defensive: ensure position/scope still exist
        const [pos] = await db
            .select({ id: positions.id })
            .from(positions)
            .where(eq(positions.id, curr.positionId))
            .limit(1);
        if (!pos) {
            throw new ApiError(
                409,
                'Position for the current appointment no longer exists',
                'position_missing'
            );
        }
        if (curr.scopeType === 'PLATOON' && curr.scopeId) {
            const [pl] = await db
                .select({ id: platoons.id })
                .from(platoons)
                .where(eq(platoons.id, curr.scopeId))
                .limit(1);
            if (!pl) {
                throw new ApiError(
                    409,
                    'Platoon (scope) for the current appointment no longer exists',
                    'platoon_missing'
                );
            }
        }

        // 4) Ensure no active holder at newStartsAt (allow boundary: endsAt == newStartsAt)
        const overlapping = await db
            .select({ id: appointments.id })
            .from(appointments)
            .where(
                and(
                    eq(appointments.positionId, curr.positionId),
                    eq(appointments.scopeType, curr.scopeType),
                    curr.scopeType === 'PLATOON' && curr.scopeId
                        ? eq(appointments.scopeId, curr.scopeId)
                        : isNull(appointments.scopeId),
                    isNull(appointments.deletedAt),
                    lte(appointments.startsAt, newStartsAt),
                    // strictly greater-than so boundary handoff is allowed
                    or(isNull(appointments.endsAt), gt(appointments.endsAt, newStartsAt))
                )
            );

        const conflicts = overlapping.filter(o => o.id !== curr.id);
        if (conflicts.length) {
            throw new ApiError(
                409,
                'Another active holder exists at the newStartsAt time',
                'conflict',
                { conflictingAppointmentId: conflicts[0].id }
            );
        }

        // 5) Transaction: end current, create new, audit
        const result = await db.transaction(async (tx) => {
            const [ended] = await tx
                .update(appointments)
                .set({ endsAt: effectivePrevEndsAt })
                .where(eq(appointments.id, curr.id))
                .returning({
                    id: appointments.id,
                    userId: appointments.userId,
                    positionId: appointments.positionId,
                    scopeType: appointments.scopeType,
                    scopeId: appointments.scopeId,
                    startsAt: appointments.startsAt,
                    endsAt: appointments.endsAt,
                });

            if (!ended) throw new ApiError(404, 'Appointment not found during update', 'not_found');

            const [next] = await tx
                .insert(appointments)
                .values({
                    userId: dto.newUserId,
                    positionId: ended.positionId,
                    assignment: curr.assignment,
                    scopeType: ended.scopeType,
                    scopeId: ended.scopeId ?? null,
                    startsAt: newStartsAt,
                    endsAt: null,
                    reason: dto.reason ?? `Transferred from ${ended.userId} by ${adminId}`,
                    appointedBy: adminId,
                })
                .returning({
                    id: appointments.id,
                    userId: appointments.userId,
                    positionId: appointments.positionId,
                    scopeType: appointments.scopeType,
                    scopeId: appointments.scopeId,
                    startsAt: appointments.startsAt,
                    endsAt: appointments.endsAt,
                });

            const [audit] = await tx
                .insert(appointmentTransfers)
                .values({
                    fromAppointmentId: ended.id,
                    toAppointmentId: next.id,
                    fromUserId: ended.userId,
                    toUserId: next.userId,
                    positionId: next.positionId,
                    scopeType: String(next.scopeType),
                    scopeId: next.scopeId ?? null,
                    prevStartsAt: ended.startsAt,
                    prevEndsAt: ended.endsAt!, // set above
                    newStartsAt,
                    reason: dto.reason ?? null,
                    transferredBy: adminId,
                })
                .returning({ id: appointmentTransfers.id, createdAt: appointmentTransfers.createdAt });

            return { ended, next, audit };
        });

        return json.ok({
            message: 'Appointment transferred',
            ended_appointment: result.ended,
            new_appointment: result.next,
            transfer_audit: result.audit,
            // for visibility if we had to bump the end time
            ...(requestedPrevEndsAt < curr.startsAt
                ? { adjustedPrevEndsAt: result.ended.endsAt }
                : {}),
        });
    } catch (err) {
        return handleApiError(err);
    }
}
