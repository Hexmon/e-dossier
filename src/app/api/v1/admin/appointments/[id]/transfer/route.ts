// src/app/api/v1/admin/appointments/[id]/transfer/route.ts
import { NextRequest } from 'next/server';
import { db } from '@/app/db/client';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAdmin } from '@/app/lib/authz';
import { z } from 'zod';
import { appointments } from '@/app/db/schema/auth/appointments';
import { users } from '@/app/db/schema/auth/users';
import { eq, and, or, isNull, lte, gte } from 'drizzle-orm';
import { appointmentTransfers } from '@/app/db/schema/admin/appointmentTransfers';
import { appointmentTransferBody } from '@/app/lib/validators';

const IdSchema = z.object({ id: z.string().uuid() });

export async function POST(
    req: NextRequest,
    ctx: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
    try {
        const { userId: adminId } = await requireAdmin(req);

        // Next.js dyn params: await once
        const { id: raw } = await (ctx as any).params;
        const { id } = IdSchema.parse({ id: decodeURIComponent((raw ?? '')).trim() });

        const body = await req.json();
        const dto = appointmentTransferBody.parse(body);

        const prevEndsAt = new Date(dto.prevEndsAt);
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

        // 2) Validate windows
        if (prevEndsAt < curr.startsAt) {
            throw new ApiError(400, 'prevEndsAt cannot be earlier than the current appointment startsAt', 'bad_request');
        }
        if (!(newStartsAt > prevEndsAt)) {
            throw new ApiError(400, 'newStartsAt must be strictly after prevEndsAt (no overlap)', 'bad_request');
        }

        // 3) Validate new user exists
        const [targetUser] = await db.select({ id: users.id }).from(users).where(eq(users.id, dto.newUserId)).limit(1);
        if (!targetUser) throw new ApiError(400, 'Invalid newUserId', 'bad_request');

        // 4) Ensure no active holder exists for same (position/scope) at newStartsAt
        const overlapping = await db
            .select({ id: appointments.id })
            .from(appointments)
            .where(
                and(
                    eq(appointments.positionId, curr.positionId),
                    eq(appointments.scopeType, curr.scopeType),
                    curr.scopeType === 'PLATOON' && curr.scopeId ? eq(appointments.scopeId, curr.scopeId) : isNull(appointments.scopeId),
                    isNull(appointments.deletedAt),
                    lte(appointments.startsAt, newStartsAt),
                    or(isNull(appointments.endsAt), gte(appointments.endsAt, newStartsAt))
                )
            );

        // Allow the current appointment as long as it ends at/before prevEndsAt (we’re about to set that)
        const conflicts = overlapping.filter(o => o.id !== curr.id);
        if (conflicts.length) {
            throw new ApiError(409, 'Another active holder exists at the newStartsAt time', 'conflict');
        }

        // 5) Transaction: end current, create new, record transfer
        const result = await db.transaction(async (tx) => {
            // 5a) End current
            const [ended] = await tx
                .update(appointments)
                .set({ endsAt: prevEndsAt })
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

            // 5b) Create new appointment for the new user (same position/scope)
            const [next] = await tx
                .insert(appointments)
                .values({
                    userId: dto.newUserId,
                    positionId: ended.positionId,
                    assignment: curr.assignment, // keep the same assignment type
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

            // 5c) Persist audit record
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
                    prevEndsAt: ended.endsAt!,      // just set above
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
        });
    } catch (err) {
        return handleApiError(err);
    }
}
