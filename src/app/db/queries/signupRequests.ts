import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../client';
import { signupRequests } from '../schema/auth/signupRequests';
import { users } from '../schema/auth/users';
import { positions } from '../schema/auth/positions';
import { appointments } from '../schema/auth/appointments';
import { platoons } from '../schema/auth/platoons';
import { auditLog } from './util.audit.ts';

function nullIfBlank(v?: string | null) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

// Create a pending request (called from signup route)
export async function createSignupRequest(params: {
  userId: string;
  desiredPositionId?: string | null;
  desiredScopeType?: 'GLOBAL' | 'PLATOON';
  desiredScopeId?: string | null;
  note?: string | null;
  payload?: unknown;
}) {
  const [row] = await db.insert(signupRequests).values({
    userId: params.userId,
    desiredPositionId: nullIfBlank(params.desiredPositionId),
    desiredScopeType: (params.desiredScopeType ?? 'GLOBAL') as any,
    desiredScopeId: nullIfBlank(params.desiredScopeId),
    note: nullIfBlank(params.note),
    status: 'pending',
    payload: (params.payload ?? null) as any,
  }).returning();
  return row;
}

// List requests (default = pending) with rich view
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

      // desired post/scope
      desiredPositionId: signupRequests.desiredPositionId,
      desiredPositionKey: positions.key,
      desiredPositionName: positions.displayName,
      desiredScopeType: signupRequests.desiredScopeType,
      desiredScopeId: signupRequests.desiredScopeId,
      desiredPlatoonName: platoons.name,

      note: signupRequests.note,
    })
    .from(signupRequests)
    .innerJoin(users, eq(users.id, signupRequests.userId))
    .leftJoin(positions, eq(positions.id, signupRequests.desiredPositionId))
    .leftJoin(platoons, eq(platoons.id, signupRequests.desiredScopeId))
    .where(eq(signupRequests.status, status))
    .orderBy(desc(signupRequests.createdAt));
}

// Active holder (if any) for (position, scope) at "now"
export async function activeHolder(
  positionId: string,
  scopeType: 'GLOBAL' | 'PLATOON',
  scopeId: string | null
) {
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
    .where(and(
      eq(appointments.positionId, positionId),
      eq(appointments.assignment, 'PRIMARY'),
      eq(appointments.scopeType, scopeType),
      scopeType === 'PLATOON' && scopeId ? eq(appointments.scopeId, scopeId) : sql`true`,
      sql<boolean>`appointments.deleted_at IS NULL`,
      sql<boolean>`appointments.valid_during @> now()`
    ))
    .limit(1);
  return rows[0] ?? null;
}

// Approve (grant): MUST assign an appointment; fails if active holder exists
export async function approveSignupRequest(opts: {
  requestId: string;
  adminUserId: string;
  positionId: string;
  scopeType: 'GLOBAL' | 'PLATOON';
  scopeId?: string | null;
  startsAt?: Date;
  reason?: string | null;
}) {
  return await db.transaction(async (tx) => {
    // Load request
    const [req] = await tx.select().from(signupRequests).where(eq(signupRequests.id, opts.requestId)).limit(1);
    if (!req) throw new Error('request_not_found');
    if (req.status !== 'pending') throw new Error('request_not_pending');

    // Check no active holder now
    const [existing] = await tx
      .select({ id: appointments.id })
      .from(appointments)
      .where(and(
        eq(appointments.positionId, opts.positionId),
        eq(appointments.assignment, 'PRIMARY'),
        eq(appointments.scopeType, opts.scopeType),
        opts.scopeType === 'PLATOON' && (opts.scopeId ?? null)
          ? eq(appointments.scopeId, opts.scopeId!)
          : sql`true`,
        sql<boolean>`appointments.deleted_at IS NULL`,
        sql<boolean>`appointments.valid_during @> now()`
      ))
      .limit(1);
    if (existing) throw new Error('slot_occupied');

    // Create appointment (PRIMARY). EXCLUDE constraint protects uniqueness too.
    const [appt] = await tx.insert(appointments).values({
      userId: req.userId,
      positionId: opts.positionId,
      assignment: 'PRIMARY',
      scopeType: opts.scopeType,
      scopeId: opts.scopeType === 'PLATOON' ? (opts.scopeId ?? null) : null,
      startsAt: opts.startsAt ?? new Date(),
      endsAt: null,
      appointedBy: opts.adminUserId,
      reason: opts.reason ?? 'signup-approved',
    }).returning({ id: appointments.id });

    // Update request → approved
    await tx.update(signupRequests).set({
      status: 'approved',
      resolvedAt: new Date(),
      resolvedBy: opts.adminUserId,
      adminReason: opts.reason ?? null,
    }).where(eq(signupRequests.id, opts.requestId));

    // Activate account & (optionally) set helper pointer if you use that column
    await tx.update(users).set({
      isActive: true,
      // @ts-ignore: include only if your users table has this helper column
      currentAppointmentId: appt.id,
    }).where(eq(users.id, req.userId));

    await auditLog(tx, {
      actorUserId: opts.adminUserId,
      eventType: 'signup.approve',
      resourceType: 'signup_request',
      resourceId: req.id,
      description: 'Signup request approved and appointment assigned',
      metadata: { positionId: opts.positionId, scopeType: opts.scopeType, scopeId: opts.scopeId ?? null, apptId: appt.id },
    });

    return { appointmentId: appt.id, requestId: req.id };
  });
}

export async function rejectSignupRequest(opts: { requestId: string; adminUserId: string; reason: string }) {
  return await db.transaction(async (tx) => {
    const [req] = await tx.select().from(signupRequests).where(eq(signupRequests.id, opts.requestId)).limit(1);
    if (!req) throw new Error('request_not_found');
    if (req.status !== 'pending') throw new Error('request_not_pending');

    await tx.update(signupRequests).set({
      status: 'rejected',
      resolvedAt: new Date(),
      resolvedBy: opts.adminUserId,
      adminReason: opts.reason,
    }).where(eq(signupRequests.id, opts.requestId));

    await auditLog(tx, {
      actorUserId: opts.adminUserId,
      eventType: 'signup.reject',
      resourceType: 'signup_request',
      resourceId: req.id,
      description: 'Signup request rejected',
      metadata: { reason: opts.reason },
    });
  });
}

// Delete non-pending request (cleanup)
export async function deleteSignupRequest(opts: { requestId: string; adminUserId: string }) {
  return await db.transaction(async (tx) => {
    const [req] = await tx.select().from(signupRequests).where(eq(signupRequests.id, opts.requestId)).limit(1);
    if (!req) throw new Error('request_not_found');
    if (req.status === 'pending') throw new Error('cannot_delete_pending');

    await tx.delete(signupRequests).where(eq(signupRequests.id, opts.requestId));

    await auditLog(tx, {
      actorUserId: opts.adminUserId,
      eventType: 'signup.delete_request',
      resourceType: 'signup_request',
      resourceId: req.id,
      description: 'Signup request deleted',
    });
  });
}
