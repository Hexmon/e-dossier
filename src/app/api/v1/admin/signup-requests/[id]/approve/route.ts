// src/app/api/v1/admin/signup-requests/[id]/approve/route.ts
import { NextRequest } from 'next/server';
import { db } from '@/app/db/client';
import { json, handleApiError, ApiError } from '@/app/lib/http';
import { requireAdmin } from '@/app/lib/authz';
import { grantSignupRequestSchema } from '@/app/lib/validators';

import { signupRequests } from '@/app/db/schema/auth/signupRequests';
import { users } from '@/app/db/schema/auth/users';
import { appointments } from '@/app/db/schema/auth/appointments';
import { positions } from '@/app/db/schema/auth/positions';
import { roles, userRoles } from '@/app/db/schema/auth/rbac';

import { and, eq, isNull, lte, gte, or, inArray } from 'drizzle-orm';
import { z } from 'zod';

const IdSchema = z.object({ id: z.string().uuid() });

/**
 * POST /api/v1/admin/signup-requests/:id/approve
 * Body: grantSignupRequestSchema (positionKey, scopeType, scopeId?, startsAt?, reason?, roleKeys?)
 */
export async function POST(
    req: NextRequest,
    ctx: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
    try {
        // get admin principal (for resolvedBy if you track it)
        const { userId: adminId } = await requireAdmin(req);

        // await params once
        const { id: rawParam } = await (ctx as any).params;
        const { id } = IdSchema.parse({ id: decodeURIComponent((rawParam ?? '')).trim() });

        const body = await req.json();
        const dto = grantSignupRequestSchema.parse(body);
        const now = dto.startsAt ? new Date(dto.startsAt) : new Date();

        // 1) Load signup request + requester
        const [reqRow] = await db
            .select({
                id: signupRequests.id,
                status: signupRequests.status,
                userId: signupRequests.userId,
                username: users.username,
                desiredPositionId: signupRequests.desiredPositionId,
                desiredScopeType: signupRequests.desiredScopeType,
                desiredScopeId: signupRequests.desiredScopeId,
            })
            .from(signupRequests)
            .innerJoin(users, eq(users.id, signupRequests.userId))
            .where(eq(signupRequests.id, id))
            .limit(1);

        if (!reqRow) throw new ApiError(404, 'Signup request not found', 'not_found');
        if (reqRow.status !== 'pending') throw new ApiError(409, 'Request already resolved', 'conflict');

        // 2) Resolve position to id (prefer payload positionKey; fallback to request.desiredPositionId)
        let positionId: string | null = null;

        if (dto.positionKey) {
            const [pos] = await db
                .select({
                    id: positions.id,
                    key: positions.key,
                    defaultScope: positions.defaultScope,
                    singleton: positions.singleton,
                })
                .from(positions)
                .where(eq(positions.key, dto.positionKey))
                .limit(1);

            if (!pos) {
                throw new ApiError(400, 'Invalid positionKey', 'bad_request', { positionKey: dto.positionKey });
            }
            positionId = pos.id;

            // (Optional) enforce singleton: no overlapping active appointment for same (position, scope)
            if (pos.singleton) {
                const overlap = await db
                    .select({ id: appointments.id })
                    .from(appointments)
                    .where(
                        and(
                            eq(appointments.positionId, pos.id),
                            eq(appointments.scopeType, dto.scopeType),
                            dto.scopeType === 'PLATOON' ? eq(appointments.scopeId, dto.scopeId!) : isNull(appointments.scopeId),
                            isNull(appointments.deletedAt),
                            lte(appointments.startsAt, now),
                            or(isNull(appointments.endsAt), gte(appointments.endsAt, now))
                        )
                    )
                    .limit(1);

                if (overlap.length) {
                    throw new ApiError(409, 'Active holder already exists for this position/scope', 'conflict');
                }
            }
        } else if (reqRow.desiredPositionId) {
            positionId = reqRow.desiredPositionId;
        } else {
            throw new ApiError(400, 'positionKey is required when request lacks desiredPositionId', 'bad_request');
        }

        // 3) Scope validation
        if (dto.scopeType === 'PLATOON' && !dto.scopeId) {
            throw new ApiError(400, 'scopeId required for PLATOON scope', 'bad_request');
        }

        // 4) Approve in a transaction
        const result = await db.transaction(async (tx) => {
            // 4.1) Create appointment
            const [apt] = await tx
                .insert(appointments)
                .values({
                    userId: reqRow.userId,
                    positionId: positionId!,
                    assignment: 'PRIMARY',
                    scopeType: dto.scopeType,
                    scopeId: dto.scopeType === 'PLATOON' ? dto.scopeId! : null,
                    startsAt: now,
                    endsAt: null,
                    reason: dto.reason ?? null,
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

            // 4.2) Grant RBAC roles
            let keysToGrant = dto.roleKeys ?? [];
            if (keysToGrant.length === 0 && dto.positionKey) {
                // optional fallback: same-named role as positionKey
                keysToGrant = [dto.positionKey];
            }

            let granted: { id: string; key: string }[] = [];
            if (keysToGrant.length) {
                // ✅ Use inArray instead of ANY($1) to avoid malformed array literal
                const found = await tx
                    .select({ id: roles.id, key: roles.key })
                    .from(roles)
                    .where(inArray(roles.key, keysToGrant));

                if (found.length) {
                    await tx
                        .insert(userRoles)
                        .values(found.map((r) => ({ userId: reqRow.userId, roleId: r.id })))
                        .onConflictDoNothing();
                    granted = found;
                }
            }

            // 4.3) Mark request approved
            await tx
                .update(signupRequests)
                .set({
                    status: 'approved',
                    resolvedAt: new Date(),
                    resolvedBy: adminId ?? null, // if you want the acting admin recorded
                    adminReason: dto.reason ?? null,
                })
                .where(eq(signupRequests.id, reqRow.id));

            return { appointment: apt, grantedRoles: granted };
        });

        return json.ok({
            message: 'Signup request approved',
            appointment: result.appointment,
            granted_roles: result.grantedRoles, // [{ id, key }]
        });
    } catch (err) {
        return handleApiError(err);
    }
}
