import { NextRequest } from 'next/server';
import { db } from '@/app/db/client';
import { users } from '@/app/db/schema/auth/users';
import { positions } from '@/app/db/schema/auth/positions';
import { platoons } from '@/app/db/schema/auth/platoons';
import { appointments } from '@/app/db/schema/auth/appointments';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAuth, requireAdmin } from '@/app/lib/authz';
import { appointmentUpdateSchema } from '@/app/lib/validators';
import { and, eq, sql } from 'drizzle-orm';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await requireAuth(req);
        const { id } = await params;

        const [row] = await db
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
                isActive: sql<boolean>`
                    ${appointments.startsAt} <= now()
                    AND (${appointments.endsAt} IS NULL OR ${appointments.endsAt} > now())
                    AND ${appointments.deletedAt} IS NULL
                `.as('is_active'),
            })
            .from(appointments)
            .innerJoin(users, eq(users.id, appointments.userId))
            .innerJoin(positions, eq(positions.id, appointments.positionId))
            .leftJoin(platoons, eq(platoons.id, appointments.scopeId))
            .where(eq(appointments.id, id))
            .limit(1);

        if (!row) throw new ApiError(404, 'Appointment not found');
        return json.ok({ message: 'Appointment retrieved successfully.', data: row });
    } catch (err) {
        return handleApiError(err);
    }
}

async function PATCHHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const adminCtx = await requireAdmin(req);
        const { id } = await params;
        const body = await req.json();
        const parsed = appointmentUpdateSchema.safeParse(body);
        if (!parsed.success) throw new ApiError(400, 'Validation failed', 'bad_request', parsed.error.flatten());
        const updates = parsed.data;

        // scope consistency checks
        if (updates.scopeType === 'PLATOON' && updates.scopeId === null) {
            throw new ApiError(400, 'scopeId required when scopeType = PLATOON');
        }
        if (updates.scopeType === 'GLOBAL' && updates.scopeId) {
            throw new ApiError(400, 'scopeId must be null when scopeType = GLOBAL');
        }

        // optional: verify platoon exists if provided
        if (updates.scopeType === 'PLATOON' && updates.scopeId) {
            const [pl] = await db.select().from(platoons).where(eq(platoons.id, updates.scopeId));
            if (!pl) throw new ApiError(400, 'Invalid platoon scopeId');
        }

        const {
            username,
            positionName,
            ...appointmentFieldUpdates
        } = updates;

        const normalizedUsername = username?.trim();
        const normalizedPositionName = positionName?.trim();

        const txResult = await db.transaction(async (tx) => {
            const [previous] = await tx.select().from(appointments).where(eq(appointments.id, id)).limit(1);
            if (!previous) throw new ApiError(404, 'Appointment not found');

            const appointmentPatch = {
                ...(appointmentFieldUpdates.assignment !== undefined ? { assignment: appointmentFieldUpdates.assignment } : {}),
                ...(appointmentFieldUpdates.scopeType !== undefined ? { scopeType: appointmentFieldUpdates.scopeType } : {}),
                ...(appointmentFieldUpdates.scopeId !== undefined ? { scopeId: appointmentFieldUpdates.scopeId } : {}),
                ...(appointmentFieldUpdates.startsAt !== undefined ? { startsAt: appointmentFieldUpdates.startsAt } : {}),
                ...(appointmentFieldUpdates.endsAt !== undefined ? { endsAt: appointmentFieldUpdates.endsAt } : {}),
                ...(appointmentFieldUpdates.reason !== undefined ? { reason: appointmentFieldUpdates.reason } : {}),
                ...(appointmentFieldUpdates.deletedAt !== undefined ? { deletedAt: appointmentFieldUpdates.deletedAt } : {}),
            };

            let updatedAppointment = previous;
            if (Object.keys(appointmentPatch).length > 0) {
                const [row] = await tx
                    .update(appointments)
                    .set(appointmentPatch)
                    .where(eq(appointments.id, id))
                    .returning();
                if (!row) throw new ApiError(404, 'Appointment not found');
                updatedAppointment = row;
            }

            if (normalizedUsername !== undefined) {
                const [userRow] = await tx
                    .update(users)
                    .set({ username: normalizedUsername })
                    .where(eq(users.id, previous.userId))
                    .returning({ id: users.id, username: users.username });
                if (!userRow) throw new ApiError(404, 'User not found');
            }

            if (normalizedPositionName !== undefined) {
                const [positionRow] = await tx
                    .update(positions)
                    .set({ displayName: normalizedPositionName })
                    .where(eq(positions.id, previous.positionId))
                    .returning({ id: positions.id });
                if (!positionRow) throw new ApiError(404, 'Position not found');
            }

            return { previous, updatedAppointment };
        });

        const [row] = await db
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
                isActive: sql<boolean>`
                    ${appointments.startsAt} <= now()
                    AND (${appointments.endsAt} IS NULL OR ${appointments.endsAt} > now())
                    AND ${appointments.deletedAt} IS NULL
                `.as('is_active'),
            })
            .from(appointments)
            .innerJoin(users, eq(users.id, appointments.userId))
            .innerJoin(positions, eq(positions.id, appointments.positionId))
            .leftJoin(platoons, eq(platoons.id, appointments.scopeId))
            .where(eq(appointments.id, id))
            .limit(1);

        if (!row) throw new ApiError(404, 'Appointment not found');

        const changedFields = [
            ...Object.keys(appointmentFieldUpdates),
            ...(username !== undefined ? ['user.username'] : []),
            ...(positionName !== undefined ? ['position.displayName'] : []),
        ];

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.APPOINTMENT_UPDATED,
            resourceType: AuditResourceType.APPOINTMENT,
            resourceId: row.id,
            description: `Updated appointment ${row.id}`,
            metadata: {
                appointmentId: row.id,
                userId: row.userId,
                changes: changedFields,
                usernameUpdated: username !== undefined,
                positionNameUpdated: positionName !== undefined,
            },
            before: txResult.previous,
            after: txResult.updatedAppointment,
            changedFields,
            request: req,
            required: true,
        });
        return json.ok({ message: 'Appointment updated successfully.', data: row });
    } catch (err: any) {
        const code = err?.code ?? err?.cause?.code;
        if (code === '23505') {
            return json.conflict('Username already exists.', {
                field: 'username',
            });
        }
        return handleApiError(err);
    }
}

async function DELETEHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const adminCtx = await requireAdmin(req);
        const { id } = await params;
        // Soft delete by setting deleted_at = now()
        const [previous] = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
        if (!previous) throw new ApiError(404, 'Appointment not found');

        const [row] = await db
            .update(appointments)
            .set({ deletedAt: sql`now()` })
            .where(eq(appointments.id, id))
            .returning();

        if (!row) throw new ApiError(404, 'Appointment not found');

        await createAuditLog({
            actorUserId: adminCtx.userId,
            eventType: AuditEventType.APPOINTMENT_DELETED,
            resourceType: AuditResourceType.APPOINTMENT,
            resourceId: row.id,
            description: `Soft deleted appointment ${row.id}`,
            metadata: {
                appointmentId: row.id,
                userId: row.userId,
                softDeleted: true,
            },
            before: previous,
            after: row,
            changedFields: ['deletedAt'],
            request: req,
            required: true,
        });
        return json.ok({ message: 'Appointment soft-deleted.', data: row });
    } catch (err) {
        return handleApiError(err);
    }
}
export const GET = withRouteLogging('GET', GETHandler);

export const PATCH = withRouteLogging('PATCH', PATCHHandler);

export const DELETE = withRouteLogging('DELETE', DELETEHandler);
