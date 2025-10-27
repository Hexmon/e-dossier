// src/app/db/queries/signupRequests.ts
import { and, desc, eq, isNull, lte, gte, or } from 'drizzle-orm';
import { z } from 'zod';
import { grantSignupRequestSchema } from '@/app/lib/validators';
import { ApiError } from '@/app/lib/http';
import { db } from '@/app/db/client';
import { signupRequests } from '@/app/db/schema/auth/signupRequests';
import { users } from '@/app/db/schema/auth/users';
import { platoons } from '@/app/db/schema/auth/platoons';
import { appointments } from '@/app/db/schema/auth/appointments';
import { positions } from '@/app/db/schema/auth/positions';
import { auditLog } from './util.audit.ts';
import { IdSchema } from '@/app/lib/apiClient';

function nullIfBlank(v?: string | null) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

type ApproveDto = z.infer<typeof grantSignupRequestSchema>;

// -----------------------------------------------------------------------------
// Create a pending request (called from signup route)
// -----------------------------------------------------------------------------
export async function createSignupRequest(params: {
  userId: string;
  note?: string | null;
  payload?: unknown;
}) {
  const [row] = await db
    .insert(signupRequests)
    .values({
      userId: params.userId,
      note: nullIfBlank(params.note),
      status: 'pending',
      payload: (params.payload ?? null) as any,
    })
    .returning();
  return row;
}

// -----------------------------------------------------------------------------
// List requests (default = pending) with rich view
// -----------------------------------------------------------------------------
export async function listSignupRequests(
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' = 'pending'
) {
  return db
    .select({
      id: signupRequests.id,
      status: signupRequests.status,
      createdAt: signupRequests.createdAt,
      resolvedAt: signupRequests.resolvedAt,
      adminReason: signupRequests.adminReason,

      // requester
      userId: users.id,
      username: users.username,
      name: users.name,
      email: users.email,
      phone: users.phone,
      rank: users.rank,
      // desiredPlatoonName: platoons.name,

      note: signupRequests.note,
    })
    .from(signupRequests)
    .innerJoin(users, eq(users.id, signupRequests.userId))
    .where(eq(signupRequests.status, status))
    .orderBy(desc(signupRequests.createdAt));
}

// -----------------------------------------------------------------------------
// Utility lookups
// -----------------------------------------------------------------------------
export async function getSignupRequestWithUserById(id: string) {
  const { id: validId } = IdSchema.parse({ id });
  const rows = await db
    .select({
      id: signupRequests.id,
      status: signupRequests.status,
      userId: signupRequests.userId,
      username: users.username,
    })
    .from(signupRequests)
    .innerJoin(users, eq(users.id, signupRequests.userId))
    .where(eq(signupRequests.id, validId))
    .limit(1);
  return rows[0] ?? null;
}

export async function findPositionByKey(key: string) {
  const rows = await db
    .select({
      id: positions.id,
      key: positions.key,
      defaultScope: positions.defaultScope,
      singleton: positions.singleton,
    })
    .from(positions)
    .where(eq(positions.key, key))
    .limit(1);
  return rows[0] ?? null;
}

/** Active holder (if any) for (position, scope) at "now" – time-window logic. */
export async function activeHolder(
  positionId: string,
  scopeType: 'GLOBAL' | 'PLATOON',
  scopeId: string | null
) {
  const now = new Date();
  const rows = await db
    .select({
      apptId: appointments.id,
      userId: appointments.userId,
      username: users.username,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
    })
    .from(appointments)
    .innerJoin(users, eq(users.id, appointments.userId))
    .where(
      and(
        eq(appointments.positionId, positionId),
        eq(appointments.assignment, 'PRIMARY'),
        eq(appointments.scopeType, scopeType),
        scopeType === 'PLATOON' && scopeId ? eq(appointments.scopeId, scopeId) : isNull(appointments.scopeId),
        isNull(appointments.deletedAt),
        lte(appointments.startsAt, now),
        or(isNull(appointments.endsAt), gte(appointments.endsAt, now))
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Is there any active PRIMARY holder for (position, scope) at `at`? */
async function hasActivePrimaryHolderAt(
  positionId: string,
  scopeType: 'GLOBAL' | 'PLATOON',
  scopeId: string | null,
  at: Date
) {
  const rows = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.positionId, positionId),
        eq(appointments.assignment, 'PRIMARY'),
        eq(appointments.scopeType, scopeType),
        scopeType === 'PLATOON' ? eq(appointments.scopeId, scopeId!) : isNull(appointments.scopeId),
        isNull(appointments.deletedAt),
        lte(appointments.startsAt, at),
        or(isNull(appointments.endsAt), gte(appointments.endsAt, at))
      )
    )
    .limit(1);
  return rows.length > 0;
}

// -----------------------------------------------------------------------------
// Approve a signup request (assign appointment + resolve request)
//   NOTE: No role granting here. Authority flows from the position.
// -----------------------------------------------------------------------------
export async function approveSignupRequest(
  requestId: string,
  dto: ApproveDto,
  adminId?: string | null
) {
  const { id } = IdSchema.parse({ id: requestId });
  const now = dto.startsAt ? new Date(dto.startsAt) : new Date();

  // Load request + requester
  const reqRow = await getSignupRequestWithUserById(id);
  if (!reqRow) throw new ApiError(404, 'Signup request not found', 'not_found');
  if (reqRow.status !== 'pending') throw new ApiError(409, 'Request already resolved', 'conflict');

  // Resolve position
  let positionId: string | null = null;
  if (dto.positionKey) {
    const pos = await findPositionByKey(dto.positionKey);
    if (!pos) throw new ApiError(400, 'Invalid positionKey', 'bad_request', { positionKey: dto.positionKey });
    positionId = pos.id;

    // Optional singleton enforcement at "now"
    if (pos.singleton) {
      const overlap = await hasActivePrimaryHolderAt(
        pos.id,
        dto.scopeType,
        dto.scopeType === 'PLATOON' ? dto.scopeId! : null,
        now
      );
      if (overlap) throw new ApiError(409, 'Active holder already exists for this position/scope', 'conflict');
    }
  } else {
    throw new ApiError(400, 'positionKey is required when request lacks desiredPositionId', 'bad_request');
  }

  // Scope validation
  if (dto.scopeType === 'PLATOON' && !dto.scopeId) {
    throw new ApiError(400, 'scopeId required for PLATOON scope', 'bad_request');
  }

  // Approve in a transaction
  const result = await db.transaction(async (tx) => {
    // Create appointment
    const [appt] = await tx
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
        appointedBy: adminId ?? null
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

    // Mark request approved
    await tx
      .update(signupRequests)
      .set({
        status: 'approved',
        resolvedAt: new Date(),
        resolvedBy: adminId ?? null,
        adminReason: dto.reason ?? null,
      })
      .where(eq(signupRequests.id, reqRow.id));

    // Activate user & set helper pointer if present
    await tx
      .update(users)
      .set({
        isActive: true,
        // @ts-ignore if you added this helper column in the migration
        currentAppointmentId: appt.id,
      })
      .where(eq(users.id, reqRow.userId));

    await auditLog(tx, {
      actorUserId: adminId ?? null,
      eventType: 'signup.approve',
      resourceType: 'signup_request',
      resourceId: reqRow.id,
      description: 'Signup request approved and appointment assigned',
      metadata: {
        positionKey: dto.positionKey,
        scopeType: dto.scopeType,
        scopeId: dto.scopeId ?? null,
        apptId: appt.id,
      },
    });

    return { appointment: appt };
  });

  return result;
}

// -----------------------------------------------------------------------------
// Reject request (sets status, timestamps, reason, and audit)
// -----------------------------------------------------------------------------
export async function rejectSignupRequest(opts: { requestId: string; adminUserId: string; reason: string }) {
  const { id } = IdSchema.parse({ id: opts.requestId });

  return await db.transaction(async (tx) => {
    const [req] = await tx
      .select({ id: signupRequests.id, status: signupRequests.status })
      .from(signupRequests)
      .where(eq(signupRequests.id, id))
      .limit(1);

    if (!req) throw new ApiError(404, 'Signup request not found', 'not_found');
    if (req.status !== 'pending') throw new ApiError(409, 'Request already resolved', 'conflict');

    await tx
      .update(signupRequests)
      .set({
        status: 'rejected',
        resolvedAt: new Date(),
        resolvedBy: opts.adminUserId,
        adminReason: opts.reason,
      })
      .where(eq(signupRequests.id, id));

    await auditLog(tx, {
      actorUserId: opts.adminUserId,
      eventType: 'signup.reject',
      resourceType: 'signup_request',
      resourceId: id,
      description: 'Signup request rejected',
      metadata: { reason: opts.reason },
    });
  });
}

// -----------------------------------------------------------------------------
// Delete non-pending request (cleanup) + audit
// -----------------------------------------------------------------------------
export async function deleteSignupRequest(opts: { requestId: string; adminUserId: string }) {
  const { id } = IdSchema.parse({ id: opts.requestId });

  return await db.transaction(async (tx) => {
    const [req] = await tx
      .select({ id: signupRequests.id, status: signupRequests.status })
      .from(signupRequests)
      .where(eq(signupRequests.id, id))
      .limit(1);

    if (!req) throw new ApiError(404, 'Signup request not found', 'not_found');
    if (req.status === 'pending') throw new ApiError(409, 'cannot_delete_pending', 'conflict');

    await tx.delete(signupRequests).where(eq(signupRequests.id, id));

    await auditLog(tx, {
      actorUserId: opts.adminUserId,
      eventType: 'signup.delete_request',
      resourceType: 'signup_request',
      resourceId: id,
      description: 'Signup request deleted',
    });
  });
}
