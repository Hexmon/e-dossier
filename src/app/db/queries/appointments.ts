// src/db/queries/appointments.ts
import { db } from '../client';
import { appointments } from '../schema/auth/appointments';
import { and, eq, isNull, sql } from 'drizzle-orm';
import type { Position, ScopeType } from '../schema/auth/types';

export async function appointPrimary(params: {
  actorUserId: string;
  targetUserId: string;
  position: Position;
  scopeType?: ScopeType;
  scopeId?: string; // uuid if present
  startsAt: Date;
  endsAt?: Date | null;
  reason?: string;
}) {
  // DB EXCLUDE constraints enforce “only one active” windows.
  return db
    .insert(appointments)
    .values({
      userId: params.targetUserId,
      position: params.position,
      assignment: 'PRIMARY',
      scopeType: params.scopeType ?? 'GLOBAL',
      scopeId: params.scopeId ?? null,
      startsAt: params.startsAt,
      endsAt: params.endsAt ?? null,
      appointedBy: params.actorUserId,
      reason: params.reason ?? null,
    })
    .returning();
}

export async function currentPrimary(
  position: Position,
  scopeType?: ScopeType,
  scopeId?: string
) {
  const predicates = [
    eq(appointments.position, position),
    eq(appointments.assignment, 'PRIMARY'),
    isNull(appointments.deletedAt),
    sql`appointments.valid_during @> now()`, // use the generated range column
  ];
  if (scopeType) predicates.push(eq(appointments.scopeType, scopeType));
  if (scopeId) predicates.push(eq(appointments.scopeId, scopeId));

  const rows = await db
    .select()
    .from(appointments)
    .where(and(...predicates))
    .limit(1);

  return rows[0] ?? null;
}
