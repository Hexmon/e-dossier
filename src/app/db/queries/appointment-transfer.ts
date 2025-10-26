// src/app/db/queries/appointment-transfer.ts
import { db as defaultDb } from '@/app/db/client';
import { ApiError } from '@/app/lib/http';
import { appointments } from '@/app/db/schema/auth/appointments';
import { users } from '@/app/db/schema/auth/users';
import { positions } from '@/app/db/schema/auth/positions';
import { platoons } from '@/app/db/schema/auth/platoons';
import { and, eq, or, isNull, lte, gt } from 'drizzle-orm';
import { appointmentTransfers } from '../schema/admin/appointmentTransfers';

type DB = typeof defaultDb;

export interface TransferAppointmentParams {
    appointmentId: string;
    adminId: string;
    newUserId: string;
    prevEndsAt: Date;
    newStartsAt: Date;
    reason?: string | null;
}

export interface TransferAppointmentResult {
    ended: {
        id: string;
        userId: string;
        positionId: string;
        scopeType: 'GLOBAL' | 'PLATOON';
        scopeId: string | null;
        startsAt: Date;
        endsAt: Date | null;
    };
    next: {
        id: string;
        userId: string;
        positionId: string;
        scopeType: 'GLOBAL' | 'PLATOON';
        scopeId: string | null;
        startsAt: Date;
        endsAt: Date | null;
    };
    audit: {
        id: string;
        createdAt: Date;
    };
    /** present when prevEndsAt was auto-bumped to current.startsAt */
    adjustedPrevEndsAt?: Date;
}

/**
 * Performs an appointment transfer with all validations:
 * - validates appointment exists & not deleted
 * - bumps prevEndsAt to startsAt if needed
 * - validates new user exists & not deleted
 * - validates position/scope still exist
 * - checks overlapping active holder at newStartsAt (boundary handoff allowed)
 * - transactionally: end current, create next, write audit
 */
export async function transferAppointment(
    {
        appointmentId,
        adminId,
        newUserId,
        prevEndsAt,
        newStartsAt,
        reason,
    }: TransferAppointmentParams,
    db: DB = defaultDb
): Promise<TransferAppointmentResult> {
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
        .where(eq(appointments.id, appointmentId))
        .limit(1);

    if (!curr) throw new ApiError(404, 'Appointment not found', 'not_found');
    if (curr.deletedAt) throw new ApiError(409, 'Appointment is deleted', 'conflict');

    // 2) Time handling
    const requestedPrevEndsAt = new Date(prevEndsAt);
    const effectivePrevEndsAt = requestedPrevEndsAt < curr.startsAt ? curr.startsAt : requestedPrevEndsAt;

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
        .where(eq(users.id, newUserId))
        .limit(1);

    if (!targetUser) throw new ApiError(400, 'Invalid newUserId', 'bad_request');
    if (targetUser.deletedAt) {
        throw new ApiError(400, 'Target user is deleted', 'bad_request');
    }

    // 4) Defensive: ensure position & scope exist
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

    // 5) Ensure no active holder at newStartsAt (allow boundary: endsAt == newStartsAt)
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
                // strictly > newStartsAt so a handoff at the boundary is OK
                or(isNull(appointments.endsAt), gt(appointments.endsAt, newStartsAt))
            )
        );

    const conflicts = overlapping.filter((o) => o.id !== curr.id);
    if (conflicts.length) {
        throw new ApiError(
            409,
            'Another active holder exists at the newStartsAt time',
            'conflict',
            { conflictingAppointmentId: conflicts[0].id }
        );
    }

    // 6) Transaction: end current, create new, audit
    const res = await db.transaction(async (tx) => {
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
                userId: newUserId,
                positionId: ended.positionId,
                assignment: curr.assignment,
                scopeType: ended.scopeType,
                scopeId: ended.scopeId ?? null,
                startsAt: newStartsAt,
                endsAt: null,
                reason: reason ?? `Transferred from ${ended.userId} by ${adminId}`,
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
                reason: reason ?? null,
                transferredBy: adminId,
            })
            .returning({
                id: appointmentTransfers.id,
                createdAt: appointmentTransfers.createdAt,
            });

        return { ended, next, audit };
    });

    return {
        ended: res.ended,
        next: res.next,
        audit: res.audit,
        ...(requestedPrevEndsAt < curr.startsAt ? { adjustedPrevEndsAt: res.ended.endsAt! } : {}),
    };
}
