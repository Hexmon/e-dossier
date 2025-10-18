// src/app/db/queries/appointments.ts
import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../client';
import { appointments } from '../schema/auth/appointments';
import { users } from '../schema/auth/users';
import { positions } from '../schema/auth/positions';

// Match your scope enum values
type ScopeType = 'GLOBAL' | 'PLATOON';

/** Reusable “active now” predicate (does NOT require valid_during) */
const ACTIVE_NOW = and(
  isNull(appointments.deletedAt),
  sql`${appointments.startsAt} <= now()`,
  sql`${appointments.endsAt} IS NULL OR ${appointments.endsAt} > now()`
);

/**
 * Create a PRIMARY appointment (time-bound, optionally scoped).
 * DB EXCLUDE constraints enforce “only one active primary holder” per (position,scope) window.
 */
export async function appointPrimary(params: {
  actorUserId: string;
  targetUserId: string;
  positionId: string;       // FK to positions.id
  scopeType?: ScopeType;    // defaults to GLOBAL
  scopeId?: string | null;  // required if scopeType = 'PLATOON'
  startsAt: Date;
  endsAt?: Date | null;
  reason?: string | null;
}) {
  return db
    .insert(appointments)
    .values({
      userId: params.targetUserId,
      positionId: params.positionId,
      assignment: 'PRIMARY',
      scopeType: params.scopeType ?? 'GLOBAL',
      scopeId: params.scopeType === 'PLATOON' ? params.scopeId ?? null : null,
      startsAt: params.startsAt,
      endsAt: params.endsAt ?? null,
      appointedBy: params.actorUserId,
      reason: params.reason ?? null,
    })
    .returning();
}

/** Current PRIMARY holder by position **ID** (and optional scope). */
export async function currentPrimaryByPositionId(
  positionId: string,
  opts?: { scopeType?: ScopeType; scopeId?: string }
) {
  const preds = [
    eq(appointments.positionId, positionId),
    eq(appointments.assignment, 'PRIMARY'),
    ACTIVE_NOW, // <-- explicit window
  ];
  if (opts?.scopeType) preds.push(eq(appointments.scopeType, opts.scopeType));
  if (opts?.scopeId) preds.push(eq(appointments.scopeId, opts.scopeId));

  const rows = await db.select().from(appointments).where(and(...preds)).limit(1);
  return rows[0] ?? null;
}

/** Current PRIMARY holder by position **KEY** and optional scope. */
export async function currentPrimaryByPositionKey(
  positionKey: string,
  opts?: { scopeType?: ScopeType; scopeId?: string }
) {
  const preds = [
    eq(positions.key, positionKey),
    eq(appointments.assignment, 'PRIMARY'),
    ACTIVE_NOW, // <-- explicit window
  ];
  if (opts?.scopeType) preds.push(eq(appointments.scopeType, opts.scopeType));
  if (opts?.scopeId) preds.push(eq(appointments.scopeId, opts.scopeId));

  const rows = await db
    .select({
      id: appointments.id,
      userId: appointments.userId,
      positionId: appointments.positionId,
      scopeType: appointments.scopeType,
      scopeId: appointments.scopeId,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
    })
    .from(appointments)
    .innerJoin(positions, eq(positions.id, appointments.positionId))
    .where(and(...preds))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * ACTIVE appointment by id + holder info + position key.
 * Active = not soft-deleted AND starts_at <= now() AND (ends_at IS NULL OR ends_at > now()).
 */
export async function getActiveAppointmentWithHolder(appointmentId: string) {
  const rows = await db
    .select({
      id: appointments.id,
      positionId: appointments.positionId,
      positionKey: positions.key,
      scopeType: appointments.scopeType,
      scopeId: appointments.scopeId,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      userId: appointments.userId,
      username: users.username,
      passwordUpdatedAt: sql<Date>`
        (SELECT password_updated_at FROM credentials_local WHERE user_id = ${users.id})
      `,
    })
    .from(appointments)
    .innerJoin(users, eq(users.id, appointments.userId))
    .innerJoin(positions, eq(positions.id, appointments.positionId))
    .where(and(
      eq(appointments.id, appointmentId),
      ACTIVE_NOW // <-- explicit window instead of valid_during @> now()
    ))
    .limit(1);

  return rows[0] ?? null;
}

/** List all ACTIVE appointments for a user (now), incl. position keys. */
export async function listActiveAppointmentsForUser(userId: string) {
  const rows = await db
    .select({
      id: appointments.id,
      positionId: appointments.positionId,
      positionKey: positions.key,
      scopeType: appointments.scopeType,
      scopeId: appointments.scopeId,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
    })
    .from(appointments)
    .innerJoin(positions, eq(positions.id, appointments.positionId))
    .where(and(
      eq(appointments.userId, userId),
      ACTIVE_NOW // <-- explicit window
    ));

  return rows;
}
