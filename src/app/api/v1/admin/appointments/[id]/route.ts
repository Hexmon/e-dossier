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

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
    try {
        await requireAuth(req);
        const { id } = await ctx.params;

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
                isActive: sql<boolean>`"appointments"."valid_during" @> now() AND "appointments"."deleted_at" IS NULL`.as('is_active'),
            })
            .from(appointments)
            .innerJoin(users, eq(users.id, appointments.userId))
            .innerJoin(positions, eq(positions.id, appointments.positionId))
            .leftJoin(platoons, eq(platoons.id, appointments.scopeId))
            .where(eq(appointments.id, id))
            .limit(1);

        if (!row) throw new ApiError(404, 'Appointment not found');
        return json.ok({ data: row });
    } catch (err) {
        return handleApiError(err);
    }
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
    try {
        await requireAdmin(req);
        const { id } = await ctx.params;
        const body = await req.json();
        const parsed = appointmentUpdateSchema.safeParse(body);
        if (!parsed.success) throw new ApiError(400, 'Validation failed', 'bad_request', parsed.error.flatten());
        const p = parsed.data;

        // scope consistency checks
        if (p.scopeType === 'PLATOON' && p.scopeId === null) {
            throw new ApiError(400, 'scopeId required when scopeType = PLATOON');
        }
        if (p.scopeType === 'GLOBAL' && p.scopeId) {
            throw new ApiError(400, 'scopeId must be null when scopeType = GLOBAL');
        }

        // optional: verify platoon exists if provided
        if (p.scopeType === 'PLATOON' && p.scopeId) {
            const [pl] = await db.select().from(platoons).where(eq(platoons.id, p.scopeId));
            if (!pl) throw new ApiError(400, 'Invalid platoon scopeId');
        }

        const [row] = await db
            .update(appointments)
            .set({
                ...(p.assignment !== undefined ? { assignment: p.assignment } : {}),
                ...(p.scopeType !== undefined ? { scopeType: p.scopeType } : {}),
                ...(p.scopeId !== undefined ? { scopeId: p.scopeId } : {}),
                ...(p.startsAt !== undefined ? { startsAt: p.startsAt } : {}),
                ...(p.endsAt !== undefined ? { endsAt: p.endsAt } : {}),
                ...(p.reason !== undefined ? { reason: p.reason } : {}),
                ...(p.deletedAt !== undefined ? { deletedAt: p.deletedAt } : {}),
            })
            .where(eq(appointments.id, id))
            .returning();

        if (!row) throw new ApiError(404, 'Appointment not found');
        return json.ok({ data: row });
    } catch (err) {
        return handleApiError(err);
    }
}

export async function DELETE(req: NextRequest, ctx: { params: { id: string } }) {
    try {
        await requireAdmin(req);
        const { id } = ctx.params;
        // Soft delete by setting deleted_at = now()
        const [row] = await db
            .update(appointments)
            .set({ deletedAt: sql`now()` })
            .where(eq(appointments.id, id))
            .returning();

        if (!row) throw new ApiError(404, 'Appointment not found');
        return json.ok({ message: 'Soft-deleted', data: row });
    } catch (err) {
        return handleApiError(err);
    }
}
